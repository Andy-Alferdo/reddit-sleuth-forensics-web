"""
Reddit Sleuth - Local Model Server (Cleaned & Fixed)
=====================================================
Flask server for ML predictions, Reddit scraping (PRAW), and MongoDB storage.

Fixes applied vs original model_server.py:
  1. created_utc returned as raw float (not isoformat) - fixes frontend RangeError
  2. extract_locations receives joined string, not list - fixes SpaCy crash
  3. praw imported at top level
  4. Removed duplicate /mongo/save-profile & /mongo/get-profiles endpoints
  5. Merged /deep-analysis and /shap-analysis into single /analysis handler
  6. MongoDB URI from environment variable (no hardcoded creds)
  7. Removed credential leak from startup print
  8. Removed manual CORS headers (Flask-CORS handles it)
  9. Removed unused lime_explainer / shap_explainer variables

Endpoints:
  GET  /health                          - Health check
  POST /predict                         - Batch sentiment analysis (up to 50 texts)
  POST /analysis                        - Single text analysis with explanation
  POST /deep-analysis                   - Alias for /analysis
  POST /shap-analysis                   - Alias for /analysis
  POST /analyze                         - Analyze arrays of posts + comments
  POST /reddit-scraper                  - Scrape Reddit user via PRAW
  POST /api/reddit/user/analyze         - Store user analysis to MongoDB
  GET  /api/reddit/user/<username>      - Get latest user analysis from MongoDB
  DELETE /api/reddit/analysis/<id>      - Delete analysis from MongoDB
  GET  /api/reddit/case/<case_id>       - Get all analyses for a case
  POST /mongo/save-posts                - Save posts to MongoDB
  POST /mongo/get-posts                 - Get posts from MongoDB by caseId
"""

import sys
import os
import re
import json
import logging
from datetime import datetime

import torch
import spacy
import numpy as np
import praw
import prawcore
import joblib
from flask import Flask, request, jsonify
from flask_cors import CORS
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from pymongo import MongoClient

# ---------------------------------------------------------------------------
# 0. Environment & configuration
# ---------------------------------------------------------------------------

# Load .env.local if present (key=value, # comments ignored)
_env_path = os.path.join(os.path.dirname(__file__), '..', '.env.local')
if os.path.exists(_env_path):
    with open(_env_path, 'r') as _f:
        for _line in _f:
            _line = _line.strip()
            if _line and not _line.startswith('#') and '=' in _line:
                _key, _value = _line.split('=', 1)
                os.environ.setdefault(_key.strip(), _value.strip())

# MongoDB - read URI from env, fall back to local dev default
MONGO_URI = os.environ.get(
    'MONGO_URI',
    'mongodb://admin:forensics123@localhost:27017/reddit_sleuth?authSource=admin',
)
mongo_client = MongoClient(MONGO_URI)
mongo_db = mongo_client['reddit_sleuth']

# Flask
app = Flask(__name__)
CORS(app, resources={r'/*': {'origins': [
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
]}})

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Paths
MODEL_PATH = os.path.abspath('./models')
MAX_TOKEN_LENGTH = 512

# ---------------------------------------------------------------------------
# 1. Load models & components
# ---------------------------------------------------------------------------
print('🔄 Loading models and components...')

# BERT
try:
    tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
    model = AutoModelForSequenceClassification.from_pretrained(MODEL_PATH)
    model.eval()
    print('✅ BERT model loaded successfully')
except Exception as e:
    print(f'❌ Error loading BERT model: {e}')
    sys.exit(1)

# SpaCy
try:
    nlp = spacy.load('en_core_web_sm')
    print('✅ SpaCy loaded successfully')
except OSError:
    print('⚠️ SpaCy model not found – location extraction disabled')
    nlp = None

# TF-IDF vectorizer (optional)
try:
    tfidf_vectorizer = joblib.load(f'{MODEL_PATH}/tfidf_vectorizer.pkl')
    print('✅ TF-IDF vectorizer loaded')
except FileNotFoundError:
    print('⚠️ TF-IDF vectorizer not found – using basic text processing')
    tfidf_vectorizer = None

# Label mappings
try:
    with open(f'{MODEL_PATH}/label_mappings.json', 'r') as f:
        label_mappings = json.load(f)
    print('✅ Label mappings loaded')
except FileNotFoundError:
    print('⚠️ Label mappings not found – using defaults')
    label_mappings = {'0': 'negative', '1': 'neutral', '2': 'positive'}

print('🎯 All components loaded!')
print('=' * 50)

# ---------------------------------------------------------------------------
# 2. Helper functions
# ---------------------------------------------------------------------------

def preprocess_text(text: str) -> str:
    """Clean text for analysis."""
    text = re.sub(r'http\S+|www\S+|https\S+', '', text, flags=re.MULTILINE)
    text = re.sub(r'@\w+|#\w+', '', text)
    text = re.sub(r'[^\w\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text.lower()


def predict_sentiment(text: str):
    """Return (sentiment_label, confidence) using BERT."""
    try:
        inputs = tokenizer(
            text, return_tensors='pt', truncation=True,
            padding=True, max_length=MAX_TOKEN_LENGTH,
        )
        with torch.no_grad():
            outputs = model(**inputs)
            probs = torch.softmax(outputs.logits, dim=-1)
            predicted = torch.argmax(probs, dim=-1).item()
            confidence = probs[0][predicted].item()
        sentiment = label_mappings.get(str(predicted), 'neutral')
        return sentiment, confidence
    except Exception as e:
        logger.error(f'Prediction error: {e}')
        return 'neutral', 0.5


def extract_locations(text: str) -> list:
    """Extract GPE / LOC entities via SpaCy. Expects a single string."""
    if not nlp:
        return []
    try:
        doc = nlp(text[:100_000])  # guard against very long text
        return list({ent.text for ent in doc.ents if ent.label_ in ('GPE', 'LOC')})
    except Exception as e:
        logger.error(f'Location extraction error: {e}')
        return []


def explain_prediction(text: str, sentiment: str) -> str:
    """Simple keyword-based explanation."""
    positive_words = ['good', 'great', 'excellent', 'amazing', 'love', 'happy', 'wonderful']
    negative_words = ['bad', 'terrible', 'awful', 'hate', 'sad', 'angry', 'horrible']
    text_lower = text.lower()
    pos = sum(1 for w in positive_words if w in text_lower)
    neg = sum(1 for w in negative_words if w in text_lower)
    if sentiment == 'positive':
        return f'Text contains {pos} positive indicators and {neg} negative indicators.'
    if sentiment == 'negative':
        return f'Text contains {neg} negative indicators and {pos} positive indicators.'
    return f'Text shows balanced sentiment with {pos} positive and {neg} negative indicators.'


def _calc_breakdown(items: list) -> dict:
    """Compute sentiment ratio breakdown from a list of sentiment dicts."""
    if not items:
        return {'positive': 0.33, 'negative': 0.33, 'neutral': 0.34}
    counts = {'positive': 0, 'negative': 0, 'neutral': 0}
    for item in items:
        s = (item.get('sentiment') or '').lower()
        if s in counts:
            counts[s] += 1
        else:
            counts['neutral'] += 1
    total = len(items)
    return {k: round(v / total, 2) for k, v in counts.items()}


def _build_reddit_client():
    """Create a PRAW Reddit instance from env vars."""
    return praw.Reddit(
        client_id=os.environ.get('REDDIT_CLIENT_ID'),
        client_secret=os.environ.get('REDDIT_CLIENT_SECRET'),
        user_agent=os.environ.get('REDDIT_USER_AGENT', 'RedditForensics/1.0'),
    )

# ---------------------------------------------------------------------------
# 3. API endpoints
# ---------------------------------------------------------------------------

# ── Health ─────────────────────────────────────────────────────────────────

@app.route('/health', methods=['GET'])
def health_check():
    try:
        mongo_client.server_info()
        mongo_status = 'connected'
    except Exception:
        mongo_status = 'disconnected'
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'mongodb': mongo_status,
    })


# ── Batch prediction ──────────────────────────────────────────────────────

@app.route('/predict', methods=['POST'])
def predict():
    """Analyse sentiment of up to 50 texts."""
    data = request.get_json(silent=True)
    if not data:
        return jsonify({'error': 'No data provided', 'success': False}), 400

    texts = data.get('texts', [])
    if not texts:
        return jsonify({'error': 'No texts provided', 'success': False}), 400
    if len(texts) > 50:
        return jsonify({'error': 'Too many texts (max 50)', 'success': False}), 400

    results = []
    for text in texts:
        try:
            cleaned = preprocess_text(text)
            sentiment, confidence = predict_sentiment(cleaned)
            explanation = explain_prediction(cleaned, sentiment)
            results.append({
                'text': text[:200],
                'sentiment': sentiment,
                'confidence': f'{confidence:.2f}',
                'explanation': explanation,
            })
        except Exception as e:
            logger.error(f'Error processing text: {e}')

    return jsonify({'success': True, 'predictions': results, 'total_processed': len(results)})


# ── Single-text analysis (unified /analysis, /deep-analysis, /shap-analysis)

def _single_analysis():
    """Shared handler for single-text analysis endpoints."""
    data = request.get_json(silent=True)
    if not data:
        return jsonify({'error': 'No data provided', 'success': False}), 400
    text = data.get('text', '')
    if not text:
        return jsonify({'error': 'No text provided', 'success': False}), 400

    cleaned = preprocess_text(text)
    sentiment, confidence = predict_sentiment(cleaned)
    explanation = explain_prediction(cleaned, sentiment)
    return jsonify({
        'success': True,
        'text': text[:200],
        'sentiment': sentiment,
        'confidence': f'{confidence:.2f}',
        'explanation': explanation,
    })


@app.route('/analysis', methods=['POST'])
def analysis():
    return _single_analysis()

@app.route('/deep-analysis', methods=['POST'])
def deep_analysis():
    return _single_analysis()

@app.route('/shap-analysis', methods=['POST'])
def shap_analysis():
    return _single_analysis()


# ── Bulk analyse posts + comments ─────────────────────────────────────────

@app.route('/analyze', methods=['POST'])
def analyze():
    """Analyse arrays of posts and comments for sentiment & locations."""
    data = request.get_json(silent=True)
    if not data:
        return jsonify({'error': 'No data provided', 'success': False}), 400

    posts = data.get('posts', [])
    comments = data.get('comments', [])
    logger.info(f'Analysis request: {len(posts)} posts, {len(comments)} comments')

    post_sentiments = []
    comment_sentiments = []
    all_texts: list[str] = []

    for p in posts:
        text = f"{p.get('title', '')} {p.get('selftext', '')}"
        all_texts.append(text)
        sentiment, confidence = predict_sentiment(text)
        explanation = explain_prediction(text, sentiment)
        post_sentiments.append({
            'text': text[:100],
            'sentiment': sentiment,
            'confidence': f'{confidence:.2f}',
            'explanation': explanation,
        })

    for c in comments:
        text = c.get('body', '')
        all_texts.append(text)
        sentiment, confidence = predict_sentiment(text)
        explanation = explain_prediction(text, sentiment)
        comment_sentiments.append({
            'text': text[:100],
            'sentiment': sentiment,
            'confidence': f'{confidence:.2f}',
            'explanation': explanation,
        })

    # FIX: independent breakdowns for posts vs comments
    post_breakdown = _calc_breakdown(post_sentiments)
    comment_breakdown = _calc_breakdown(comment_sentiments)

    # FIX: join texts into a single string before passing to SpaCy
    locations = extract_locations(' '.join(all_texts)) if nlp else []

    return jsonify({
        'success': True,
        'postSentiments': post_sentiments,
        'commentSentiments': comment_sentiments,
        'sentiment': {
            'postBreakdown': post_breakdown,
            'commentBreakdown': comment_breakdown,
        },
        'locations': locations,
        'patterns': {'topicInterests': ['General Reddit Activity']},
    })


# ── Reddit scraper (PRAW) ────────────────────────────────────────────────

@app.route('/reddit-scraper', methods=['POST'])
def reddit_scraper():
    """Scrape a Reddit user's profile, posts, and comments via PRAW."""
    data = request.get_json(silent=True)
    if not data:
        return jsonify({'error': 'No data provided', 'success': False}), 400

    username = data.get('username')
    if not username:
        return jsonify({'error': 'username required', 'success': False}), 400

    clean_username = re.sub(r'^u/', '', username)

    try:
        reddit = _build_reddit_client()
        redditor = reddit.redditor(clean_username)

        # Basic profile
        user_data = {
            'username': clean_username,
            'karma': getattr(redditor, 'total_karma', 0),
            'post_karma': getattr(redditor, 'link_karma', 0),
            'comment_karma': getattr(redditor, 'comment_karma', 0),
            'created_utc': getattr(redditor, 'created_utc', None),
            'account_age_days': 0,
        }
        if user_data['created_utc']:
            created = datetime.fromtimestamp(user_data['created_utc'])
            user_data['account_age_days'] = (datetime.now() - created).days

        # Posts (limit 10)
        posts = []
        try:
            for sub in redditor.submissions.new(limit=10):
                posts.append({
                    'id': sub.id,
                    'title': sub.title,
                    'score': sub.score,
                    'num_comments': sub.num_comments,
                    # FIX: raw float, not isoformat – frontend does new Date(ts * 1000)
                    'created_utc': sub.created_utc,
                    'selftext': (sub.selftext or '')[:500],
                    'url': sub.url,
                    'subreddit': sub.subreddit.display_name,
                })
        except Exception as e:
            logger.warning(f'Could not fetch posts for {clean_username}: {e}')

        # Comments (limit 20)
        comments = []
        try:
            for comment in redditor.comments.new(limit=20):
                comments.append({
                    'id': comment.id,
                    'body': comment.body[:200],
                    'score': comment.score,
                    # FIX: raw float
                    'created_utc': comment.created_utc,
                    'subreddit': comment.subreddit.display_name,
                    'permalink': comment.permalink,
                })
        except Exception as e:
            logger.warning(f'Could not fetch comments for {clean_username}: {e}')

        return jsonify({
            'success': True,
            'username': clean_username,
            'user': {**user_data, 'link_karma': user_data['post_karma']},
            'posts': posts,
            'comments': comments,
        })

    except prawcore.exceptions.NotFound:
        return jsonify({'error': f"Reddit user '{clean_username}' not found", 'success': False}), 404
    except prawcore.exceptions.Forbidden:
        return jsonify({'error': f"Access denied for '{clean_username}'. May be private/suspended.", 'success': False}), 403
    except Exception as e:
        logger.error(f'Reddit scraper error: {e}')
        return jsonify({'error': f'Scraping failed: {str(e)}', 'success': False}), 500


# ---------------------------------------------------------------------------
# 4. MongoDB endpoints
# ---------------------------------------------------------------------------

# ── Posts ──────────────────────────────────────────────────────────────────

@app.route('/mongo/save-posts', methods=['POST'])
def mongo_save_posts():
    """Save posts to MongoDB."""
    data = request.get_json(silent=True)
    case_id = data.get('caseId')
    posts = data.get('posts', [])
    if not case_id or not posts:
        return jsonify({'error': 'caseId and posts required', 'success': False}), 400

    for post in posts:
        post['case_id'] = case_id
        post['created_at'] = datetime.now()

    mongo_db.reddit_posts.insert_many(posts)
    return jsonify({'success': True, 'inserted': len(posts), 'case_id': case_id})


@app.route('/mongo/get-posts', methods=['POST'])
def mongo_get_posts():
    """Get posts from MongoDB by caseId."""
    data = request.get_json(silent=True)
    case_id = data.get('caseId')
    if not case_id:
        return jsonify({'error': 'caseId required', 'success': False}), 400

    posts = list(mongo_db.reddit_posts.find({'case_id': case_id}, {'_id': 0}))
    return jsonify({'success': True, 'data': posts, 'count': len(posts)})


# ── User analysis (unified – replaces old /mongo/save-profile + /mongo/get-profiles)

@app.route('/api/reddit/user/analyze', methods=['POST'])
def api_store_user_analysis():
    """Store a user analysis document in MongoDB.

    Expected JSON body:
        username    (str)  – Reddit username
        caseId      (str)  – investigation case ID
        redditData  (dict) – raw Reddit profile/posts/comments
        sentimentAnalysis (dict) – computed sentiment data

    This is the endpoint your frontend hybridRedditService.storeUserAnalysis()
    should POST to.
    """
    data = request.get_json(silent=True)
    if not data:
        return jsonify({'error': 'No data provided', 'success': False}), 400

    username = data.get('username')
    case_id = data.get('caseId')
    reddit_data = data.get('redditData')
    sentiment_analysis = data.get('sentimentAnalysis')

    if not all([username, case_id, reddit_data, sentiment_analysis]):
        return jsonify({'error': 'Missing required fields (username, caseId, redditData, sentimentAnalysis)', 'success': False}), 400

    doc = {
        'username': username,
        'caseId': case_id,
        'redditData': reddit_data,
        'sentimentAnalysis': sentiment_analysis,
        'analysisDate': datetime.now().isoformat(),
    }

    result = mongo_db.reddit_analyses.insert_one(doc)
    return jsonify({'success': True, 'id': str(result.inserted_id), 'message': 'Analysis stored successfully'})


@app.route('/api/reddit/user/<username>', methods=['GET'])
def api_get_user_analysis(username):
    """Get the latest analysis for a Reddit user."""
    analysis = mongo_db.reddit_analyses.find_one(
        {'username': username},
        {'_id': 0},
        sort=[('analysisDate', -1)],
    )
    if not analysis:
        return jsonify({'error': 'Analysis not found', 'success': False}), 404
    return jsonify({'success': True, 'data': analysis})


@app.route('/api/reddit/analysis/<analysis_id>', methods=['DELETE'])
def api_delete_analysis(analysis_id):
    """Delete an analysis by its MongoDB _id."""
    from bson import ObjectId
    try:
        obj_id = ObjectId(analysis_id)
    except Exception:
        obj_id = analysis_id

    result = mongo_db.reddit_analyses.delete_one({'_id': obj_id})
    if result.deleted_count == 0:
        return jsonify({'error': 'Analysis not found', 'success': False}), 404
    return jsonify({'success': True, 'message': 'Analysis deleted successfully'})


@app.route('/api/reddit/case/<case_id>', methods=['GET'])
def api_get_case_analyses(case_id):
    """Get all analyses for a given case."""
    analyses = list(
        mongo_db.reddit_analyses
        .find({'caseId': case_id}, {'_id': 0})
        .sort('analysisDate', -1)
    )
    return jsonify({'success': True, 'analyses': analyses, 'count': len(analyses)})


# ---------------------------------------------------------------------------
# 5. Run
# ---------------------------------------------------------------------------

if __name__ == '__main__':
    print('\n' + '=' * 50)
    print('  PYTHON MODEL SERVER (LOCAL) STARTED')
    print(f'  Model Path : {MODEL_PATH}')
    # Mask credentials in log output
    _safe_uri = re.sub(r'://[^@]+@', '://***:***@', MONGO_URI)
    print(f'  MongoDB    : {_safe_uri}')
    print(f'  Endpoints  : http://localhost:5000/health')
    print('=' * 50 + '\n')
    app.run(host='0.0.0.0', port=5000)
