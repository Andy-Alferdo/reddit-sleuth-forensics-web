import sys
import os
import torch
import spacy
import numpy as np
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import joblib
import pandas as pd
import re
import json
from pymongo import MongoClient
from datetime import datetime

# Load environment variables from .env.local
env_path = os.path.join(os.path.dirname(__file__), '..', '.env.local')
if os.path.exists(env_path):
    with open(env_path, 'r') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                os.environ[key] = value.strip()

# MongoDB Connection with authentication
MONGO_URI = "mongodb://admin:forensics123@localhost:27017/reddit_sleuth?authSource=admin"
mongo_client = MongoClient(MONGO_URI)
mongo_db = mongo_client["reddit_sleuth"]

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": ["http://localhost:8080", "http://127.0.0.1:8080", "null"]}})

# --- 0. SETUP LOGGING ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- 1. CONFIGURATION ---
MODEL_PATH = os.path.abspath("./models")
MAX_TOKEN_LENGTH = 512

# --- 2. LOAD MODELS AND COMPONENTS ---
print("🔄 Loading models and components...")

# Load BERT model and tokenizer
try:
    tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
    model = AutoModelForSequenceClassification.from_pretrained(MODEL_PATH)
    model.eval()
    print("✅ BERT model loaded successfully")
except Exception as e:
    print(f"❌ Error loading BERT model: {e}")
    sys.exit(1)

# Load Spacy for location extraction
try:
    nlp = spacy.load("en_core_web_sm")
    print("✅ Spacy loaded successfully")
except OSError:
    print("⚠️ Spacy model not found, location extraction will be disabled")
    nlp = None

# Load TF-IDF vectorizer
try:
    tfidf_vectorizer = joblib.load(f"{MODEL_PATH}/tfidf_vectorizer.pkl")
    print("✅ TF-IDF vectorizer loaded")
except FileNotFoundError:
    print("⚠️ TF-IDF vectorizer not found, using basic text processing")
    tfidf_vectorizer = None

# Load label mappings
try:
    with open(f"{MODEL_PATH}/label_mappings.json", "r") as f:
        label_mappings = json.load(f)
    print("✅ Label mappings loaded")
except FileNotFoundError:
    print("⚠️ Label mappings not found, using defaults")
    label_mappings = {"0": "negative", "1": "neutral", "2": "positive"}

# Initialize explainers
lime_explainer = None
shap_explainer = None

print("🎯 All components loaded successfully!")
print("="*50)

# --- 3. HELPER FUNCTIONS ---

def preprocess_text(text):
    """Clean and preprocess text for analysis"""
    # Remove URLs
    text = re.sub(r'http\S+|www\S+|https\S+', '', text, flags=re.MULTILINE)
    # Remove user mentions and hashtags
    text = re.sub(r'@\w+|#\w+', '', text)
    # Remove special characters and extra whitespace
    text = re.sub(r'[^\w\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text.lower()

def predict_sentiment(text):
    """Predict sentiment using BERT model"""
    try:
        # Tokenize and prepare input
        inputs = tokenizer(text, return_tensors="pt", truncation=True, 
                          padding=True, max_length=MAX_TOKEN_LENGTH)
        
        # Get prediction
        with torch.no_grad():
            outputs = model(**inputs)
            logits = outputs.logits
            probabilities = torch.softmax(logits, dim=-1)
            predicted_class = torch.argmax(probabilities, dim=-1).item()
            confidence = probabilities[0][predicted_class].item()
        
        # Map to sentiment labels
        sentiment = label_mappings.get(str(predicted_class), "neutral")
        
        return sentiment, confidence
        
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        return "neutral", 0.5

def extract_locations(text):
    """Extract location entities using Spacy"""
    if not nlp:
        return []
    
    try:
        doc = nlp(text)
        locations = [ent.text for ent in doc.ents if ent.label_ in ["GPE", "LOC"]]
        return list(set(locations))  # Remove duplicates
    except Exception as e:
        logger.error(f"Location extraction error: {e}")
        return []

def explain_prediction(text, sentiment):
    """Generate basic explanation for prediction"""
    try:
        # Simple keyword-based explanation
        positive_words = ["good", "great", "excellent", "amazing", "love", "happy", "wonderful"]
        negative_words = ["bad", "terrible", "awful", "hate", "sad", "angry", "horrible"]
        
        text_lower = text.lower()
        pos_count = sum(1 for word in positive_words if word in text_lower)
        neg_count = sum(1 for word in negative_words if word in text_lower)
        
        if sentiment == "positive":
            explanation = f"Text contains {pos_count} positive indicators and {neg_count} negative indicators."
        elif sentiment == "negative":
            explanation = f"Text contains {neg_count} negative indicators and {pos_count} positive indicators."
        else:
            explanation = f"Text shows balanced sentiment with {pos_count} positive and {neg_count} negative indicators."
        
        return explanation
        
    except Exception as e:
        logger.error(f"Explanation error: {e}")
        return f"Sentiment classified as {sentiment} based on text analysis."

# --- 4. API ENDPOINTS ---

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        mongo_client.server_info()
        mongo_status = "connected"
    except Exception:
        mongo_status = "disconnected"

    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "mongodb": mongo_status
    })

@app.route('/predict', methods=['POST'])
def predict():
    """Analyze sentiment of multiple texts"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided", "success": False}), 400

        texts = data.get('texts', [])
        if not texts:
            return jsonify({"error": "No texts provided", "success": False}), 400

        # Validate input
        if len(texts) > 50:
            return jsonify({"error": "Too many texts (max 50)", "success": False}), 400

        # Process each text
        results = []
        for i, text in enumerate(texts):
            try:
                # Preprocess text
                cleaned_text = preprocess_text(text)

                # Predict sentiment
                sentiment, confidence = predict_sentiment(cleaned_text)
                
                # Get explanation
                explanation = explain_prediction(cleaned_text, sentiment)
                
                results.append({
                    "text": text[:200],  # Truncate for display
                    "sentiment": sentiment,
                    "confidence": f"{confidence:.2f}",
                    "explanation": explanation
                })
            except Exception as e:
                logger.error(f"Error processing text {i}: {e}")
                continue

        return jsonify({
            "success": True,
            "predictions": results,
            "total_processed": len(texts)
        })

    except Exception as e:
        logger.error(f"Prediction error: {e}")
        return jsonify({"error": str(e), "success": False}), 500

@app.route('/deep-analysis', methods=['POST'])
def deep_analysis():
    """Deep analysis endpoint for single text"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided", "success": False}), 400

        text = data.get('text', '')
        if not text:
            return jsonify({"error": "No text provided", "success": False}), 400

        # Preprocess text
        cleaned_text = preprocess_text(text)

        # Predict sentiment
        sentiment, confidence = predict_sentiment(cleaned_text)
        
        # Get explanation
        explanation = explain_prediction(cleaned_text, sentiment)
        
        return jsonify({
            "success": True,
            "text": text[:200],
            "sentiment": sentiment,
            "confidence": f"{confidence:.2f}",
            "explanation": explanation
        })

    except Exception as e:
        logger.error(f"Deep analysis error: {e}")
        return jsonify({"error": f"Deep analysis failed: {str(e)}", "success": False}), 500

@app.route('/shap-analysis', methods=['POST'])
def shap_analysis():
    """SHAP analysis endpoint for single text"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided", "success": False}), 400

        text = data.get('text', '')
        if not text:
            return jsonify({"error": "No text provided", "success": False}), 400

        # Preprocess text
        cleaned_text = preprocess_text(text)

        # Predict sentiment
        sentiment, confidence = predict_sentiment(cleaned_text)
        
        # Get explanation
        explanation = explain_prediction(cleaned_text, sentiment)
        
        return jsonify({
            "success": True,
            "text": text[:200],
            "sentiment": sentiment,
            "confidence": f"{confidence:.2f}",
            "explanation": explanation
        })

    except Exception as e:
        logger.error(f"SHAP analysis error: {e}")
        return jsonify({"error": f"SHAP analysis failed: {str(e)}", "success": False}), 500

@app.route('/analyze', methods=['POST', 'OPTIONS'])
def analyze():
    """Analyze posts and comments for sentiment and locations"""
    if request.method == 'OPTIONS':
        return '', 200
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided", "success": False}), 400

        posts = data.get('posts', [])
        comments = data.get('comments', [])
        
        logger.info(f"Analysis request: {len(posts)} posts, {len(comments)} comments")

        post_sentiments = []
        comment_sentiments = []
        all_texts_for_loc = []

        # Process posts
        for i, p in enumerate(posts):
            title = p.get('title', '')
            body = p.get('selftext', '')
            text = f"{title} {body}"
            
            all_texts_for_loc.append(text)
            
            sentiment, confidence = predict_sentiment(text)
            explanation = explain_prediction(text, sentiment)
            
            post_sentiments.append({
                "text": text[:100],
                "sentiment": sentiment,
                "confidence": f"{confidence:.2f}",
                "explanation": explanation
            })

        # Process comments
        for i, c in enumerate(comments):
            text = c.get('body', '')
            all_texts_for_loc.append(text)
            
            sentiment, confidence = predict_sentiment(text)
            explanation = explain_prediction(text, sentiment)
            
            comment_sentiments.append({
                "text": text[:100],
                "sentiment": sentiment,
                "confidence": f"{confidence:.2f}",
                "explanation": explanation
            })

        # Calculate statistics
        all_sentiments = [item['sentiment'] for item in post_sentiments + comment_sentiments]
        sentiment_counts = {}
        for sentiment in all_sentiments:
            sentiment_counts[sentiment] = sentiment_counts.get(sentiment, 0) + 1
        
        total = len(all_sentiments)
        if total > 0:
            sentiment_breakdown = {k: v/total for k, v in sentiment_counts.items()}
        else:
            sentiment_breakdown = {"positive": 0, "neutral": 0, "negative": 0}

        # Extract locations
        locations = extract_locations(all_texts_for_loc) if nlp else []

        response = {
            "success": True,
            "postSentiments": post_sentiments,
            "commentSentiments": comment_sentiments,
            "sentiment": {
                "postBreakdown": sentiment_breakdown,
                "commentBreakdown": sentiment_breakdown 
            },
            "locations": locations,
            "patterns": {
                "topicInterests": ["General Reddit Activity"]
            }
        }
        
        return jsonify(response)

    except Exception as e:
        logger.error(f"Analysis error: {e}")
        return jsonify({"error": f"Analysis failed: {str(e)}", "success": False}), 500

@app.route('/reddit-scraper', methods=['POST', 'OPTIONS'])
def reddit_scraper():
    """Reddit data scraper endpoint"""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        return response
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided", "success": False}), 400
        
        username = data.get('username')
        scrape_type = data.get('type', 'user')
        
        if not username:
            return jsonify({"error": "username required", "success": False}), 400
        
        # Clean username
        clean_username = re.sub(r'^u/', '', username)
        
        # Import praw for Reddit scraping
        try:
            import praw
            import prawcore
            
            # Reddit API credentials from environment
            reddit = praw.Reddit(
                client_id=os.environ.get('REDDIT_CLIENT_ID'),
                client_secret=os.environ.get('REDDIT_CLIENT_SECRET'),
                user_agent=os.environ.get('REDDIT_USER_AGENT', 'RedditForensics/1.0')
            )
            
            # Get Reddit user
            redditor = reddit.redditor(clean_username)
            
            # Fetch user data
            user_data = {
                "username": clean_username,
                "karma": getattr(redditor, 'total_karma', 0),
                "account_age_days": 0,  # Calculate from created_utc
                "post_karma": getattr(redditor, 'link_karma', 0),
                "comment_karma": getattr(redditor, 'comment_karma', 0),
                "created_utc": getattr(redditor, 'created_utc', None)
            }
            
            # Calculate account age in days
            if user_data['created_utc']:
                from datetime import datetime
                created_time = datetime.fromtimestamp(user_data['created_utc'])
                current_time = datetime.now()
                user_data['account_age_days'] = (current_time - created_time).days
            
            # Fetch recent posts (limit to 10 for performance)
            posts = []
            try:
                for submission in redditor.submissions.new(limit=10):
                    posts.append({
                        "id": submission.id,
                        "title": submission.title,
                        "score": submission.score,
                        "num_comments": submission.num_comments,
                        "created_utc": datetime.fromtimestamp(submission.created_utc).isoformat(),
                        "selftext": submission.selftext[:500] if submission.selftext else "",  # Limit text length
                        "url": submission.url,
                        "subreddit": submission.subreddit.display_name
                    })
            except Exception as e:
                logger.warning(f"Could not fetch posts for {clean_username}: {e}")
            
            # Fetch recent comments (limit to 20 for performance)
            comments = []
            try:
                for comment in redditor.comments.new(limit=20):
                    comments.append({
                        "id": comment.id,
                        "body": comment.body[:200],  # Limit comment length
                        "score": comment.score,
                        "created_utc": datetime.fromtimestamp(comment.created_utc).isoformat(),
                        "subreddit": comment.subreddit.display_name,
                        "permalink": comment.permalink
                    })
            except Exception as e:
                logger.warning(f"Could not fetch comments for {clean_username}: {e}")
            
            return jsonify({
            "success": True,
            "username": clean_username,
            "user": {
                **user_data,
                "link_karma": user_data.get("post_karma", 0),
            },
            "posts": posts,
            "comments": comments
            })
            
        except ImportError:
            # Fallback if praw is not installed
            logger.error("PRAW library not installed. Install with: pip install praw")
            return jsonify({
                "error": "Reddit scraping library not available. Install PRAW library.",
                "success": False
            }), 500
        except prawcore.exceptions.NotFound:
            return jsonify({
                "error": f"Reddit user '{clean_username}' not found",
                "success": False
            }), 404
        except prawcore.exceptions.Forbidden:
            return jsonify({
                "error": f"Access denied for user '{clean_username}'. User may be private or suspended.",
                "success": False
            }), 403
        except Exception as e:
            logger.error(f"Reddit API error: {e}")
            return jsonify({
                "error": f"Reddit API error: {str(e)}",
                "success": False
            }), 500
        
    except Exception as e:
        logger.error(f"Reddit scraper error: {e}")
        return jsonify({"error": f"Scraping failed: {str(e)}", "success": False}), 500

# --- 5. MONGODB ENDPOINTS ---

@app.route('/mongo/save-posts', methods=['POST', 'OPTIONS'])
def mongo_save_posts():
    """Save posts to MongoDB"""
    if request.method == 'OPTIONS':
        return '', 200
    try:
        data = request.get_json()
        case_id = data.get('caseId')
        posts = data.get('posts', [])
        
        if not case_id or not posts:
            return jsonify({"error": "caseId and posts required", "success": False}), 400
        
        # Add case_id to each post
        for post in posts:
            post['case_id'] = case_id
            post['created_at'] = datetime.now()
        
        # Insert into MongoDB
        result = mongo_db.reddit_posts.insert_many(posts)
        
        return jsonify({
            "success": True,
            "inserted": len(posts),
            "case_id": case_id
        })

    except Exception as e:
        logger.error(f"MongoDB save posts error: {e}")
        return jsonify({"error": f"Failed to save posts: {str(e)}", "success": False}), 500

@app.route('/mongo/get-posts', methods=['POST', 'OPTIONS'])
def mongo_get_posts():
    """Get posts from MongoDB"""
    if request.method == 'OPTIONS':
        return '', 200
    try:
        data = request.get_json()
        case_id = data.get('caseId')
        
        if not case_id:
            return jsonify({"error": "caseId required", "success": False}), 400
        
        # Query MongoDB
        query = {"case_id": case_id} if case_id else {}
        posts = list(mongo_db.reddit_posts.find(query, {"_id": 0}))
        
        return jsonify({
            "success": True,
            "data": posts,
            "count": len(posts)
        })

    except Exception as e:
        logger.error(f"MongoDB get posts error: {e}")
        return jsonify({"error": f"Failed to get posts: {str(e)}", "success": False}), 500

@app.route('/mongo/save-profile', methods=['POST', 'OPTIONS'])
def mongo_save_profile():
    """Save user profile to MongoDB"""
    if request.method == 'OPTIONS':
        return '', 200
    try:
        data = request.get_json()
        
        required_fields = ['username', 'caseId', 'redditData', 'sentimentAnalysis']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"{field} required", "success": False}), 400
        
        # Add metadata
        data['created_at'] = datetime.now()
        data['metadata'] = {
            "source": "frontend",
            "processedAt": datetime.now().isoformat()
        }
        
        # Insert into MongoDB
        result = mongo_db.user_profiles_analyzed.insert_one(data)
        
        return jsonify({
            "success": True,
            "inserted_id": str(result.inserted_id),
            "case_id": data.get('caseId')
        })

    except Exception as e:
        logger.error(f"MongoDB save profile error: {e}")
        return jsonify({"error": f"Failed to save profile: {str(e)}", "success": False}), 500

@app.route('/mongo/get-profiles', methods=['POST', 'OPTIONS'])
def mongo_get_profiles():
    """Get user profiles from MongoDB"""
    if request.method == 'OPTIONS':
        return '', 200
    try:
        data = request.get_json()
        case_id = data.get('caseId')
        
        # Query MongoDB
        query = {"caseId": case_id} if case_id else {}
        profiles = list(mongo_db.user_profiles_analyzed.find(query, {"_id": 0}))
        
        return jsonify({
            "success": True,
            "data": profiles,
            "count": len(profiles)
        })

    except Exception as e:
        logger.error(f"MongoDB get profiles error: {e}")
        return jsonify({"error": f"Failed to get profiles: {str(e)}", "success": False}), 500

# --- 6. REDDIT ANALYSIS ENDPOINTS FOR HYBRID SERVICE ---

@app.route('/api/reddit/user/analyze', methods=['POST', 'OPTIONS'])
def api_store_user_analysis():
    """Store Reddit user analysis in MongoDB"""
    if request.method == 'OPTIONS':
        return '', 200
    try:
        data = request.get_json()
        username = data.get('username')
        case_id = data.get('caseId')
        reddit_data = data.get('redditData')
        sentiment_analysis = data.get('sentimentAnalysis')
        
        if not all([username, case_id, reddit_data, sentiment_analysis]):
            return jsonify({"error": "Missing required fields", "success": False}), 400
        
        # Create document to store
        analysis_doc = {
            "username": username,
            "caseId": case_id,
            "redditData": reddit_data,
            "sentimentAnalysis": sentiment_analysis,
            "analysisDate": datetime.now().isoformat(),
            "id": str(datetime.now().timestamp())  # Simple ID generation
        }
        
        # Store in MongoDB
        result = mongo_db.reddit_analyses.insert_one(analysis_doc)
        
        return jsonify({
            "success": True,
            "id": str(result.inserted_id),
            "message": "Analysis stored successfully"
        })
        
    except Exception as e:
        logger.error(f"Store user analysis error: {e}")
        return jsonify({"error": f"Failed to store analysis: {str(e)}", "success": False}), 500

@app.route('/api/reddit/user/<username>', methods=['GET'])
def api_get_user_analysis(username):
    """Get Reddit user analysis from MongoDB"""
    try:
        # Query MongoDB for the user's latest analysis
        analysis = mongo_db.reddit_analyses.find_one(
            {"username": username}, 
            {"_id": 0},
            sort=[("analysisDate", -1)]
        )
        
        if not analysis:
            return jsonify({"error": "Analysis not found", "success": False}), 404
        
        return jsonify({
            "success": True,
            "data": analysis
        })
        
    except Exception as e:
        logger.error(f"Get user analysis error: {e}")
        return jsonify({"error": f"Failed to get analysis: {str(e)}", "success": False}), 500

@app.route('/api/reddit/analysis/<analysis_id>', methods=['DELETE'])
def api_delete_analysis(analysis_id):
    """Delete Reddit analysis from MongoDB"""
    try:
        # Convert string ID to ObjectId if needed
        from bson import ObjectId
        try:
            obj_id = ObjectId(analysis_id)
        except:
            # If not a valid ObjectId, try to find by string id
            obj_id = analysis_id
        
        # Delete from MongoDB
        result = mongo_db.reddit_analyses.delete_one({"_id": obj_id})
        
        if result.deleted_count == 0:
            return jsonify({"error": "Analysis not found", "success": False}), 404
        
        return jsonify({
            "success": True,
            "message": "Analysis deleted successfully"
        })
        
    except Exception as e:
        logger.error(f"Delete analysis error: {e}")
        return jsonify({"error": f"Failed to delete analysis: {str(e)}", "success": False}), 500

@app.route('/api/reddit/case/<case_id>', methods=['GET'])
def api_get_case_analyses(case_id):
    """Get all Reddit analyses for a case from MongoDB"""
    try:
        # Query MongoDB for all analyses in this case
        analyses = list(mongo_db.reddit_analyses.find(
            {"caseId": case_id}, 
            {"_id": 0}
        ).sort("analysisDate", -1))
        
        return jsonify({
            "success": True,
            "analyses": analyses,
            "count": len(analyses)
        })
        
    except Exception as e:
        logger.error(f"Get case analyses error: {e}")
        return jsonify({"error": f"Failed to get case analyses: {str(e)}", "success": False}), 500

if __name__ == '__main__':
    print("\n" + "="*50)
    print(" PYTHON MODEL SERVER STARTED ")
    print(f" Model Path: {MODEL_PATH}")
    print(f" MongoDB Connected: {MONGO_URI}")
    print(f" API Documentation: http://localhost:5000/docs")
    print("="*50 + "\n")
    app.run(host='0.0.0.0', port=5000)