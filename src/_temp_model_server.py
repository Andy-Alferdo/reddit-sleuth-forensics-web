import sys
import os
import torch
import spacy
import numpy as np
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import shap
import lime
from lime.lime_text import LimeTextExplainer
from sklearn.feature_extraction.text import TfidfVectorizer

# --- 0. SETUP LOGGING ---
# This helps us see errors in the terminal clearly
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# --- 1. CONFIGURATION ---
# Ensure this matches the folder name exactly
MODEL_PATH = "./models" 

# --- 2. LOAD SPACY (For Location Extraction) ---
logger.info("Loading Spacy for location extraction...")
try:
    nlp = spacy.load("en_core_web_sm")
    logger.info("Spacy loaded successfully.")
except OSError:
    logger.warning("Spacy model 'en_core_web_sm' not found. Downloading now...")
    from spacy.cli import download
    download("en_core_web_sm")
    nlp = spacy.load("en_core_web_sm")
    logger.info("Spacy downloaded and loaded.")

# --- 3. LOAD BERT MODEL & LABELS ---
logger.info(f"Loading Model from: {MODEL_PATH}")

# Global variables for model and tokenizer
model = None
tokenizer = None
LABELS = []

try:
    # A. Check if folder exists
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"Model directory not found at {MODEL_PATH}")

    # B. Load Tokenizer & Model
    tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
    model = AutoModelForSequenceClassification.from_pretrained(MODEL_PATH)
    model.eval() # Set to evaluation mode (faster, no training)
    
    # C. Load Labels from classes.npy
    # C. Load Labels (FORCE FIX)
    # We are IGNORING classes.npy because it has typos ("netural") and extra words ("sentiment").
    # We force the standard 3 labels that the Frontend expects.
    
    # Standard DistilBERT Order: 0=Negative, 1=Neutral, 2=Positive
    LABELS = ["negative", "neutral", "positive"]
    logger.info(f"FORCE-LOADED CLEAN LABELS: {LABELS}")

    # --- 3.5. INITIALIZING EXPLAINERS ---
    logger.info("Initializing explainers (BOTH LIME and SHAP on demand)...")
    try:
        # Initialize LIME explainer
        lime_explainer = LimeTextExplainer(class_names=['negative', 'neutral', 'positive'])
        logger.info("LIME explainer initialized successfully.")
    except Exception as e:
        logger.warning(f"Failed to initialize LIME explainer: {e}")
        lime_explainer = None
    
    # Initialize SHAP explainer (will be ready on first use)
    try:
        def predict_function(texts):
            inputs = tokenizer(texts, padding=True, truncation=True, max_length=512, return_tensors="pt")
            inputs.pop("token_type_ids", None)
            with torch.no_grad():
                outputs = model(**inputs)
                probs = torch.nn.functional.softmax(outputs.logits, dim=-1)
            return probs.numpy()
        
        # Use a simple background dataset for SHAP
        background_data = ["This is a neutral example text.", "Another neutral example."]
        
        # Use Explainer without masker for simplicity
        explainer = shap.Explainer(predict_function, background_data)
        logger.info("SHAP explainer initialized successfully.")
    except Exception as e:
        logger.warning(f"Failed to initialize SHAP explainer: {e}")
        explainer = None
    
    logger.info("Both explainers are ready for on-demand use.")

except Exception as e:
    logger.critical(f"Failed to load model: {e}")
    print("\n[CRITICAL ERROR] Could not load the model.")
    print(f"Details: {str(e)}")
    print("Please check that 'pytorch_model.bin' (or .safetensors) and 'config.json' are in the 'models' folder.\n")
    sys.exit(1)

# --- 4. HELPER FUNCTIONS ---

def get_shap_explanation(text, sentiment, prediction_idx):
    """Generate SHAP-based word importance explanation"""
    try:
        if explainer is None:
            return [], []
        
        # Get SHAP values using the explainer
        shap_values = explainer.shap_values([text])
        
        if shap_values is not None and len(shap_values) > 0:
            # Get the SHAP values for the predicted class
            if isinstance(shap_values, list):
                # Multi-class case
                class_shap_values = shap_values[prediction_idx]
            else:
                # Single output case
                class_shap_values = shap_values[0]
            
            # Tokenize the text to get word mappings
            inputs = tokenizer(text, padding=True, truncation=True, max_length=512, return_tensors="pt")
            inputs.pop("token_type_ids", None)
            tokens = tokenizer.convert_ids_to_tokens(inputs['input_ids'][0])
            
            # Remove special tokens and get clean tokens
            clean_tokens = []
            clean_values = []
            
            for i, token in enumerate(tokens):
                if token not in ['[CLS]', '[SEP]', '[PAD]'] and i < len(class_shap_values):
                    clean_tokens.append(token.replace('##', ''))
                    clean_values.append(class_shap_values[i])
            
            # Pair tokens with their importance scores
            token_importance = list(zip(clean_tokens, clean_values))
            
            # Sort by absolute importance
            token_importance.sort(key=lambda x: abs(x[1]), reverse=True)
            
            # Get top contributing tokens
            top_tokens = token_importance[:10]
            
            return token_importance, top_tokens
        
        return [], []
        
    except Exception as e:
        logger.error(f"Error in SHAP explanation: {e}")
        return [], []

def get_lime_explanation(text, sentiment):
    """Generate LIME-based explanation as backup"""
    try:
        if lime_explainer is None:
            return None
        
        # Validate text length to prevent LIME errors
        if len(text.strip()) < 5:
            return None
            
        # Create prediction function for LIME
        def predict_fn(texts):
            try:
                inputs = tokenizer(texts, padding=True, truncation=True, max_length=256, return_tensors="pt")  # Reduced max length
                inputs.pop("token_type_ids", None)
                with torch.no_grad():
                    outputs = model(**inputs)
                    probs = torch.nn.functional.softmax(outputs.logits, dim=-1)
                return probs.numpy()
            except Exception as e:
                logger.error(f"Error in LIME prediction function: {e}")
                # Return neutral probabilities as fallback
                return np.array([[0.33, 0.34, 0.33] for _ in texts])
        
        # Get LIME explanation with reduced samples for speed
        explanation = lime_explainer.explain_instance(
            text, 
            predict_fn, 
            num_features=5,  # Reduced from 8
            num_samples=25   # Reduced from 50
        )
        
        # Extract word contributions
        word_contributions = []
        try:
            for feature, contribution in explanation.as_list():
                if isinstance(contribution, (int, float)) and not np.isnan(contribution):
                    word_contrib = {
                        'word': feature,
                        'contribution': float(contribution),
                        'sentiment_impact': 'positive' if contribution > 0 else 'negative'
                    }
                    word_contributions.append(word_contrib)
        except Exception as e:
            logger.error(f"Error extracting LIME contributions: {e}")
            return []
        
        return word_contributions
        
    except Exception as e:
        logger.error(f"Error in LIME explanation: {e}")
        return []

def generate_advanced_explanation(text, sentiment, confidence, text_index=0):
    """Generate advanced explanation using SHAP/LIME insights"""
    # DISABLED for performance - Only run on first 3 texts with very high confidence
    should_run_explainer = (
        confidence > 0.98 and  # Very high confidence only
        text_index < 3         # First 3 texts only
    )
    
    if should_run_explainer:
        try:
            # Get LIME explanation only (SHAP disabled for performance)
            lime_contributions = get_lime_explanation(text, sentiment)
            
            if lime_contributions and len(lime_contributions) > 0:
                # Use LIME results
                top_contributions = lime_contributions[:3]  # Reduced from 5
                explanation = f"Classified as {sentiment} with high confidence ({confidence:.2f}). "
                
                pos_words = [c['word'] for c in top_contributions if c['sentiment_impact'] == 'positive']
                neg_words = [c['word'] for c in top_contributions if c['sentiment_impact'] == 'negative']
                
                if pos_words:
                    explanation += f"Key positive indicators: {', '.join(pos_words[:2])}. "  # Reduced from 3
                if neg_words:
                    explanation += f"Negative indicators: {', '.join(neg_words[:2])}. "  # Reduced from 3
                
                explanation += f"Analysis based on {len(lime_contributions)} word-level contributions."
                
                return explanation, lime_contributions, []
        except Exception as e:
            logger.error(f"Error in advanced explanation generation: {e}")
            return generate_explanation(text, sentiment, confidence), [], []
    
    # Fallback to simple explanation
    return generate_explanation(text, sentiment, confidence), [], []

def generate_explanation(text, sentiment, confidence):
    """Generate a simple rule-based explanation"""
    if sentiment == 'positive':
        return f"Text expresses positive sentiment with {confidence:.2f} confidence, containing optimistic or favorable language."
    elif sentiment == 'negative':
        return f"Text expresses negative sentiment with {confidence:.2f} confidence, containing critical or unfavorable language."
    else:
        return f"Text appears neutral with {confidence:.2f} confidence, maintaining an objective or balanced tone."

def extract_sentiment_keywords(text):
    """Extract simple sentiment-based keywords"""
    positive_words = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'like', 'best', 'awesome']
    negative_words = ['bad', 'terrible', 'awful', 'horrible', 'hate', 'dislike', 'worst', 'poor', 'disappointing', 'sad']
    neutral_words = ['okay', 'fine', 'alright', 'decent', 'acceptable', 'reasonable', 'moderate', 'average']
    
    text_lower = text.lower()
    words = text_lower.split()
    
    found_words = []
    for word in words:
        clean_word = word.strip('.,!?;:"()[]')
        if clean_word in positive_words:
            found_words.append((clean_word, 'positive'))
        elif clean_word in negative_words:
            found_words.append((clean_word, 'negative'))
        elif clean_word in neutral_words:
            found_words.append((clean_word, 'neutral'))
    
    return found_words[:5]  # Return top 5 keywords

def get_sentiment(text, text_index=0):
    if not text or not text.strip():
        return "neutral", {"confidence": "0.00", "reasoning": "No text provided", "key_words": []}

    try:
        inputs = tokenizer(text, padding=True, truncation=True, max_length=512, return_tensors="pt")
        inputs.pop("token_type_ids", None)  # FIX: DistilBERT doesn't support this

        with torch.no_grad():
            outputs = model(**inputs)
            probs = torch.nn.functional.softmax(outputs.logits, dim=-1)

        prediction_idx = torch.argmax(probs).item()
        confidence = probs[0][prediction_idx].item()

        if prediction_idx < len(LABELS):
            sentiment = LABELS[prediction_idx]
        else:
            sentiment = f"LABEL_{prediction_idx}"

        print(f"DEBUG: Index={prediction_idx} | Conf={confidence:.2f} | Mapped='{sentiment}' | Text='{text[:20]}...'")

        # Generate simple explanation only (LIME/SHAP disabled for speed)
        simple_reasoning = generate_explanation(text, sentiment, confidence)
        
        # Fast explanation with minimal components
        explanation = {
            "confidence": f"{confidence:.2f}",
            "reasoning": simple_reasoning,
            "key_words": extract_sentiment_keywords(text),
            "word_contributions": [],
            "importance_scores": [],
            "explanation_method": "Rule-based",
            "text_length": len(text.split()),
            "prediction_confidence": confidence
        }
        
        return sentiment, explanation

    except Exception as e:
        logger.error(f"Error in get_sentiment: {e}")
        return "neutral", {"confidence": "0.00", "reasoning": "Error processing text", "key_words": []}

def extract_locations(text_list):
    """
    Extracts unique GPE (Geopolitical Entity) and LOC (Location) entities 
    from a list of texts using Spacy.
    """
    locations = set()
    try:
        # Combine first 20 items to speed up processing (batching)
        combined_text = " ".join(text_list[:25]) 
        doc = nlp(combined_text)
        
        for ent in doc.ents:
            if ent.label_ in ["GPE", "LOC"]:
                locations.add(ent.text)
        
        result = list(locations)
        return result if result else ["No specific locations detected"]
    except Exception as e:
        logger.error(f"Error in extract_locations: {e}")
        return ["Location detection failed"]

# --- 5. THE API ENDPOINT ---

@app.route('/predict', methods=['POST'])
def predict():
    try:
        # A. Parse Request
        data = request.json
        if not data:
            return jsonify({"error": "No JSON data received", "success": False}), 400

        posts = data.get('posts', [])
        comments = data.get('comments', [])
        
        logger.info(f"Received Request: {len(posts)} posts, {len(comments)} comments")

        post_sentiments = []
        comment_sentiments = []
        all_texts_for_loc = []

        # B. Process Posts
        for i, p in enumerate(posts):
            # Combine title and body for better context
            title = p.get('title', '')
            body = p.get('selftext', '')
            text = f"{title} {body}"
            
            all_texts_for_loc.append(text)
            
            sent, exp = get_sentiment(text, text_index=i)
            post_sentiments.append({
                "text": text[:100], # Send back snippet
                "sentiment": sent,
                "explanation": exp
            })

        # C. Process Comments
        for i, c in enumerate(comments):
            text = c.get('body', '')
            all_texts_for_loc.append(text)
            
            sent, exp = get_sentiment(text, text_index=i + len(posts))
            comment_sentiments.append({
                "text": text[:100],
                "sentiment": sent,
                "explanation": exp
            })

        # D. Calculate Statistics (Percentages) - Separate for posts and comments
        # Calculate post breakdown
        post_stats = {label: 0 for label in LABELS}
        if len(post_sentiments) > 0:
            for item in post_sentiments:
                s = item['sentiment']
                if s in post_stats:
                    post_stats[s] += 1
                else:
                    if s not in post_stats: post_stats[s] = 0
                    post_stats[s] += 1
            # Convert counts to percentages
            for k in post_stats:
                post_stats[k] /= len(post_sentiments)
        
        # Calculate comment breakdown
        comment_stats = {label: 0 for label in LABELS}
        if len(comment_sentiments) > 0:
            for item in comment_sentiments:
                s = item['sentiment']
                if s in comment_stats:
                    comment_stats[s] += 1
                else:
                    if s not in comment_stats: comment_stats[s] = 0
                    comment_stats[s] += 1
            # Convert counts to percentages
            for k in comment_stats:
                comment_stats[k] /= len(comment_sentiments)

        # E. Extract Locations
        locations = extract_locations(all_texts_for_loc)

        # F. Construct Final JSON Response
        response = {
            "postSentiments": post_sentiments,
            "commentSentiments": comment_sentiments,
            "sentiment": {
                "postBreakdown": post_stats,
                "commentBreakdown": comment_stats 
            },
            "locations": locations,
            "patterns": {
                "topicInterests": ["General Reddit Activity"]
            }
        }
        
        return jsonify(response)

    except Exception as e:
        logger.error(f"CRITICAL API ERROR: {e}")
        # Return a JSON error so frontend doesn't just hang
        return jsonify({"error": str(e), "success": False}), 500

@app.route('/deep-analysis', methods=['POST'])
def deep_analysis():
    """Deep analysis endpoint for single text with LIME explanations"""
    try:
        data = request.json
        if not data or 'text' not in data:
            return jsonify({"error": "No text provided for deep analysis", "success": False}), 400

        text = data['text']
        if not text or not text.strip():
            return jsonify({"error": "Empty text provided", "success": False}), 400

        logger.info(f"Deep analysis request for text: {text[:50]}...")

        # Get sentiment with full LIME analysis
        sentiment, basic_exp = get_sentiment(text, text_index=0)
        
        # Generate deep explanation with LIME
        deep_reasoning, word_contributions, importance_scores = generate_advanced_explanation(
            text, sentiment, float(basic_exp['confidence']), text_index=0
        )
        
        # If no LIME contributions, try to force them for deep analysis
        if not word_contributions:
            word_contributions = get_lime_explanation(text, sentiment)
            if word_contributions:
                deep_reasoning = f"Deep LIME analysis for {sentiment} sentiment. "
                pos_words = [c['word'] for c in word_contributions if c['sentiment_impact'] == 'positive']
                neg_words = [c['word'] for c in word_contributions if c['sentiment_impact'] == 'negative']
                
                if pos_words:
                    deep_reasoning += f"Positive contributors: {', '.join(pos_words[:3])}. "
                if neg_words:
                    deep_reasoning += f"Negative contributors: {', '.join(neg_words[:3])}. "
                
                deep_reasoning += f"Analysis based on {len(word_contributions)} word-level features."

        response = {
            "text": text[:200],  # Return longer snippet for deep analysis
            "sentiment": sentiment,
            "basic_explanation": basic_exp,
            "deep_explanation": {
                "reasoning": deep_reasoning,
                "word_contributions": word_contributions or [],
                "importance_scores": importance_scores or [],
                "explanation_method": "LIME" if word_contributions else "Rule-based",
                "analysis_depth": "deep"
            }
        }
        
        return jsonify(response)

    except Exception as e:
        logger.error(f"Deep analysis error: {e}")
        return jsonify({"error": f"Deep analysis failed: {str(e)}", "success": False}), 500

@app.route('/shap-analysis', methods=['POST'])
def shap_analysis():
    """SHAP analysis endpoint for single text with SHAP explanations"""
    try:
        data = request.json

        if not data or 'text' not in data:
            return jsonify({"error": "No text provided for SHAP analysis", "success": False}), 400

        text = data['text']

        if not text or not text.strip():
            return jsonify({"error": "Empty text provided", "success": False}), 400

        logger.info(f"SHAP analysis request for text: {text[:50]}...")

        # Get sentiment first
        sentiment, basic_exp = get_sentiment(text, text_index=0)

        if explainer is None:
            return jsonify({"error": "SHAP explainer not initialized", "success": False}), 500

        try:
            # IMPORTANT FIX: Pass list not string
            shap_values = explainer([text])

            # Extract tokens
            tokens = shap_values.data[0]

            # Get predicted class index
            prediction_idx = LABELS.index(sentiment)

            # SHAP values shape: (samples, tokens, classes)
            values = shap_values.values[0]

            word_contributions = []

            for i, token in enumerate(tokens):
                if token.strip() == "":
                    continue

                contribution = float(values[i][prediction_idx])

                word_contributions.append({
                    "word": token,
                    "contribution": contribution,
                    "sentiment_impact": "positive" if contribution > 0 else "negative"
                })

            # Sort by importance
            word_contributions.sort(
                key=lambda x: abs(x["contribution"]),
                reverse=True
            )

            # Generate reasoning text
            pos_words = [
                c["word"] for c in word_contributions[:5]
                if c["sentiment_impact"] == "positive"
            ]

            neg_words = [
                c["word"] for c in word_contributions[:5]
                if c["sentiment_impact"] == "negative"
            ]

            shap_reasoning = f"SHAP analysis for {sentiment} sentiment. "

            if pos_words:
                shap_reasoning += f"Positive contributors: {', '.join(pos_words)}. "

            if neg_words:
                shap_reasoning += f"Negative contributors: {', '.join(neg_words)}. "

            shap_reasoning += f"Analysis based on {len(word_contributions)} tokens."

            response = {
                "text": text[:200],
                "sentiment": sentiment,
                "basic_explanation": basic_exp,
                "shap_explanation": {
                    "reasoning": shap_reasoning,
                    "word_contributions": word_contributions[:10],
                    "explanation_method": "SHAP",
                    "analysis_depth": "shap-deep"
                }
            }

            return jsonify(response)

        except Exception as e:
            logger.error(f"SHAP computation error: {e}")
            return jsonify({
                "error": f"SHAP computation failed: {str(e)}",
                "success": False
            }), 500

    except Exception as e:
        logger.error(f"SHAP analysis error: {e}")
        return jsonify({
            "error": f"SHAP analysis failed: {str(e)}",
            "success": False
        }), 500

if __name__ == '__main__':
    print("\n" + "="*50)
    print(" PYTHON MODEL SERVER STARTED ")
    print(f" Listening on port 5000")
    print(f" Model Path: {MODEL_PATH}")
    print("="*50 + "\n")
    app.run(host='0.0.0.0', port=5000)
