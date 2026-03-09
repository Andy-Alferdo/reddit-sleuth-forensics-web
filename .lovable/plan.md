

# Plan: Create `model_server_local.py` with all fixes applied

## What this file is
A clean, corrected version of your local Python Flask server that handles ML predictions, Reddit scraping via PRAW, and MongoDB storage. Saved at `python_ml/model_server_local.py` so you can copy it.

## Fixes applied

1. **`created_utc` returned as raw float** (not `.isoformat()`) -- fixes the `RangeError: Invalid time value` in the frontend
2. **`extract_locations` receives a joined string** instead of a list -- fixes SpaCy crash
3. **`praw` imported at top level** instead of inside every request
4. **Removed duplicate endpoints** -- merged `/mongo/save-profile` and `/api/reddit/user/analyze` into one unified set under `/api/reddit/...`
5. **Merged `/deep-analysis` and `/shap-analysis`** into a single `/analysis` endpoint (kept both routes as aliases for backward compatibility)
6. **MongoDB URI from environment variable** with fallback, no longer hardcoded credentials
7. **Removed credential leak** from startup print
8. **Removed manual CORS headers** in OPTIONS handlers (Flask-CORS handles it)
9. **Removed unused `lime_explainer` / `shap_explainer` variables**
10. **Added `storeUserAnalysis` endpoint** clearly documented so your frontend `hybridRedditService` can call it

## File location
`python_ml/model_server_local.py`

## Technical details

### Endpoint summary (cleaned up)

| Endpoint | Method | Purpose |
|---|---|---|
| `/health` | GET | Health check |
| `/predict` | POST | Batch sentiment analysis |
| `/analysis` | POST | Single text deep/SHAP analysis |
| `/deep-analysis` | POST | Alias for `/analysis` |
| `/shap-analysis` | POST | Alias for `/analysis` |
| `/analyze` | POST | Analyze posts + comments |
| `/reddit-scraper` | POST | Scrape Reddit user via PRAW |
| `/api/reddit/user/analyze` | POST | Store user analysis to MongoDB |
| `/api/reddit/user/<username>` | GET | Get user analysis from MongoDB |
| `/api/reddit/analysis/<id>` | DELETE | Delete analysis |
| `/api/reddit/case/<case_id>` | GET | Get all analyses for a case |
| `/mongo/save-posts` | POST | Save posts to MongoDB |
| `/mongo/get-posts` | POST | Get posts from MongoDB |

### Key fix: `created_utc`
```python
# BEFORE (broken): 
"created_utc": datetime.fromtimestamp(submission.created_utc).isoformat()

# AFTER (correct - frontend expects raw Unix timestamp):
"created_utc": submission.created_utc
```

### Key fix: `extract_locations`
```python
# BEFORE (broken - passes list to nlp()):
locations = extract_locations(all_texts_for_loc)

# AFTER (correct - joins into single string):
locations = extract_locations(" ".join(all_texts_for_loc))
```

