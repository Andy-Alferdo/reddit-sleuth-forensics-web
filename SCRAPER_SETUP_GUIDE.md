# Reddit Sock Puppet Scraper Setup Guide

This guide explains how to set up and run the local Reddit web scraper that uses Selenium and BeautifulSoup to scrape Reddit data without requiring API keys.

## 🎯 Overview

The sock puppet scraper is the **only method** for fetching Reddit data in this application. It mimics real browser behavior to extract data from Reddit:

- Uses Selenium with headless Chrome to render JavaScript
- Parses HTML with BeautifulSoup from old.reddit.com
- Includes **enhanced anti-detection measures** (session rotation, random delays, human simulation)
- No Reddit API keys required

## ⚠️ Important Warnings

1. **Terms of Service**: Web scraping Reddit may violate their Terms of Service
2. **Rate Limiting**: Reddit blocks IPs making too many requests
3. **Detection Risk**: Reddit actively blocks automated scrapers
4. **HTML Changes**: Reddit can change their HTML structure at any time
5. **No Private Data**: Can only access public content

## 📋 Prerequisites

- **Python 3.9+** installed
- **Google Chrome** browser installed
- **ChromeDriver** (auto-installed by webdriver-manager)

## 🚀 Quick Start

### 1. Create Virtual Environment

```bash
cd server
python -m venv venv

# Activate (Linux/macOS)
source venv/bin/activate

# Activate (Windows)
venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install selenium beautifulsoup4 flask flask-cors webdriver-manager fake-useragent lxml requests
```

Or install all requirements:

```bash
pip install -r requirements.txt
```

### 3. Run the Scraper Server

```bash
python reddit_scraper_server.py
```

The server will start on `http://localhost:5001`

### 4. Configure Frontend (Optional)

Create or update your `.env.local` file:

```bash
VITE_SCRAPER_URL=http://localhost:5001
```

### 5. Start the Frontend

```bash
npm run dev
```

## ⚠️ Server Required

**The Python scraper server MUST be running for Reddit data fetching to work.** If the server is not running, users will see an error message asking them to start it.

## 📁 Project Structure

```
server/
├── reddit_scraper_server.py  # Main Flask server with Selenium scraper
├── venv/                     # Python virtual environment
└── requirements.txt          # Python dependencies

src/lib/api/
└── redditScraper.ts         # Frontend API client
```

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_SCRAPER_URL` | `http://localhost:5001` | URL of the local scraper server |
| `SCRAPER_PORT` | `5001` | Port for the Python Flask server |
| `SCRAPER_PROXY` | (none) | Optional HTTP proxy for scraping |

### Anti-Blocking Settings (in server code)

```python
# Session rotation
max_requests_before_rotation = 50  # Rotate browser every 50 requests

# Anti-detection delays (seconds)
MIN_DELAY = 2.0
MAX_DELAY = 6.0

# Pagination limits
MAX_PAGES = 5  # Max pages to scrape per request
POST_LIMIT = 100  # Max posts/comments to return
```

## 🖥️ Multi-Terminal Setup

Run these in separate terminals:

| Terminal | Command | Purpose |
|----------|---------|---------|
| 1 | `npm run dev` | Frontend (Vite) |
| 2 | `python server/reddit_scraper_server.py` | **Sock Puppet Scraper (REQUIRED)** |
| 3 | `supabase functions serve` | Edge Functions (analyze-content) |

## 🛡️ Anti-Detection Measures

The scraper includes enhanced measures to avoid detection:

### Automatic Features

1. **Session Rotation**: Browser restarts every 50 requests
2. **Random User Agents**: Rotates between 8 different browser signatures
3. **Random Delays**: 2-6 seconds between requests
4. **Random Viewport Sizes**: Different screen sizes to avoid patterns
5. **Human Behavior Simulation**: Random scrolling and pauses
6. **Retry with Exponential Backoff**: Auto-retry with increasing delays if blocked
7. **Block Detection**: Detects rate limits, captchas, and access denied pages
8. **Cookie Management**: Clears and accepts cookies properly
9. **Stealth Scripts**: Masks `navigator.webdriver` and other automation indicators

### Optional Proxy Support

```bash
# Set proxy via environment variable
SCRAPER_PROXY=http://proxy:port python server/reddit_scraper_server.py
```

### Advanced Protection

For production use, consider using `undetected-chromedriver`:

```python
# Install
pip install undetected-chromedriver

# In your code
import undetected_chromedriver as uc
driver = uc.Chrome(options=options)
```

## 🔌 API Endpoints

### Health Check

```bash
GET http://localhost:5001/health
```

Response:
```json
{"status": "healthy", "service": "reddit-scraper"}
```

### Scrape Reddit

```bash
POST http://localhost:5001/scrape
Content-Type: application/json
```

#### User Scraping

```json
{
  "type": "user",
  "username": "spez"
}
```

Response:
```json
{
  "user": {
    "name": "spez",
    "link_karma": 123456,
    "comment_karma": 654321,
    "created_utc": 1118030400
  },
  "posts": [...],
  "comments": [...],
  "communityRelations": []
}
```

#### Community Scraping

```json
{
  "type": "community",
  "subreddit": "technology"
}
```

Response:
```json
{
  "subreddit": {
    "display_name": "technology",
    "subscribers": 15000000,
    "accounts_active": 5000,
    "public_description": "..."
  },
  "posts": [...],
  "weeklyVisitors": 5000,
  "activeUsers": 5000
}
```

#### Search

```json
{
  "type": "search",
  "keyword": "artificial intelligence"
}
```

Response:
```json
{
  "posts": [...],
  "keyword": "artificial intelligence"
}
```

### Force Session Rotation

```bash
POST http://localhost:5001/rotate
```

Response:
```json
{"status": "rotated"}
```

### Close Scraper

```bash
POST http://localhost:5001/close
```

Response:
```json
{"status": "closed"}
```

## 🔍 Troubleshooting

### ChromeDriver Version Mismatch

```bash
# The webdriver-manager should handle this automatically
# If issues persist, manually install matching ChromeDriver
pip install --upgrade webdriver-manager
```

### Port Already in Use

```bash
# Check what's using port 5001
lsof -i :5001

# Use a different port
SCRAPER_PORT=5002 python server/reddit_scraper_server.py
```

### Chrome Not Found

```bash
# Install Chrome
# Ubuntu/Debian
sudo apt-get install google-chrome-stable

# macOS
brew install --cask google-chrome

# Windows - Download from google.com/chrome
```

### Blocked by Reddit

If you get blocked:
1. Force rotate the session: `POST /rotate`
2. Increase delays in the code (MIN_DELAY = 5, MAX_DELAY = 10)
3. Use a proxy: `SCRAPER_PROXY=http://proxy:port`
4. Wait 24 hours before retrying
5. Restart the scraper server

### Memory Issues

```bash
# Chrome in headless mode can use lots of RAM
# Restart the scraper periodically
POST http://localhost:5001/close
```

Then restart the server.

## 📊 Performance Notes

| Metric | Value |
|--------|-------|
| Speed | ~10-15 requests/min (with delays) |
| Session Rotation | Every 50 requests |
| Retry Attempts | 3 with exponential backoff |
| Page Limit | 5 pages per request |

## 📝 Requirements.txt

Create `server/requirements.txt`:

```
selenium>=4.15.0
beautifulsoup4>=4.12.0
webdriver-manager>=4.0.0
flask>=2.3.0
flask-cors>=4.0.0
lxml>=4.9.0
requests>=2.31.0
fake-useragent>=1.4.0
```

## 🎮 Testing the Scraper

```bash
# Test health
curl http://localhost:5001/health

# Test user scraping
curl -X POST http://localhost:5001/scrape \
  -H "Content-Type: application/json" \
  -d '{"type": "user", "username": "spez"}'

# Test community scraping
curl -X POST http://localhost:5001/scrape \
  -H "Content-Type: application/json" \
  -d '{"type": "community", "subreddit": "technology"}'

# Test search
curl -X POST http://localhost:5001/scrape \
  -H "Content-Type: application/json" \
  -d '{"type": "search", "keyword": "python programming"}'

# Force session rotation
curl -X POST http://localhost:5001/rotate
```

## 📚 Related Documentation

- [LOCAL_SETUP_GUIDE.md](./LOCAL_SETUP_GUIDE.md) - Full local development setup
- [DATA_INTEGRATION_GUIDE.md](./DATA_INTEGRATION_GUIDE.md) - Data structures and integration
- [Selenium Documentation](https://www.selenium.dev/documentation/)
- [BeautifulSoup Documentation](https://www.crummy.com/software/BeautifulSoup/bs4/doc/)
