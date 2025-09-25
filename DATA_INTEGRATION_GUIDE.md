# Reddit Sleuth - Data Integration Guide

This guide explains how to replace the placeholder/mock data in Reddit Sleuth with real scraped data from Reddit.

## Overview

Currently, Reddit Sleuth uses mock data for demonstration purposes. To make it functional with real Reddit data, you'll need to:

1. Set up Reddit API access
2. Implement data scraping functions
3. Replace placeholder data with real API calls
4. Store data in a database (optional but recommended)

## 1. Reddit API Setup

### Get Reddit API Credentials
1. Go to https://www.reddit.com/prefs/apps
2. Create a new application (script type)
3. Note down your:
   - Client ID
   - Client Secret
   - User Agent

### Install Reddit API Library
```bash
npm install snoowrap
```

## 2. Files to Modify

### Pages with Mock Data:

#### `src/pages/UserProfiling.tsx`
**Current mock data:**
```javascript
const mockUserData = {
  username: "suspicious_user_123",
  accountAge: "2 years",
  karma: 15420,
  // ... more mock data
};
```

**Replace with:**
```javascript
const [userData, setUserData] = useState(null);

const fetchUserData = async (username) => {
  // Implement Reddit API call
  const response = await fetch(`/api/reddit/user/${username}`);
  const data = await response.json();
  setUserData(data);
};
```

#### `src/pages/CommunityAnalysis.tsx`
**Current mock data:**
```javascript
const mockSubredditData = {
  name: "r/technology",
  created: "January 25, 2008",
  // ... more mock data
};
```

**Replace with Reddit API calls to fetch:**
- Subreddit information (`/r/{subreddit}/about`)
- Recent posts (`/r/{subreddit}/new`)
- Moderator list
- Community stats

#### `src/pages/LinkAnalysis.tsx`
**Current mock data:**
```javascript
const mockLinkData = {
  url: "https://suspicious-site.com",
  // ... more mock data
};
```

**Replace with:**
- URL analysis API calls
- Cross-reference with Reddit posts
- Check for spam/malicious content

#### `src/pages/Monitoring.tsx`
**Current mock data:**
```javascript
const mockAlerts = [
  { id: 1, type: "keyword", message: "New mention of 'investigation keyword'" },
  // ... more alerts
];
```

**Replace with:**
- Real-time Reddit monitoring
- Keyword tracking
- Alert system integration

#### `src/pages/Analysis.tsx`
**Current mock data:**
```javascript
const mockAnalysisData = {
  totalPosts: 1247,
  totalComments: 3891,
  // ... more data
};
```

**Replace with:**
- Aggregated data from case investigations
- Real analytics from collected Reddit data

## 3. Backend Implementation

### Create API Routes

#### `/api/reddit/user/:username`
```javascript
// Fetch user profile, posts, comments, karma history
```

#### `/api/reddit/subreddit/:name`
```javascript
// Fetch subreddit info, recent posts, moderators
```

#### `/api/reddit/search`
```javascript
// Search posts and comments by keywords
```

#### `/api/reddit/monitor`
```javascript
// Set up monitoring for keywords/users/subreddits
```

### Database Schema (Recommended)

Create tables for:
- **Cases**: Store investigation cases
- **Users**: Cache Reddit user data
- **Posts**: Store relevant Reddit posts
- **Comments**: Store relevant comments
- **Alerts**: Store monitoring alerts
- **Keywords**: Track keywords per case

## 4. Environment Variables

Add to your `.env` file:
```
REDDIT_CLIENT_ID=your_client_id
REDDIT_CLIENT_SECRET=your_client_secret
REDDIT_USER_AGENT=YourApp/1.0.0
REDDIT_USERNAME=your_reddit_username
REDDIT_PASSWORD=your_reddit_password
```

## 5. Data Flow Example

### User Profiling Flow:
1. User enters a Reddit username
2. App calls `/api/reddit/user/:username`
3. Backend fetches data from Reddit API
4. Data is processed and returned to frontend
5. Charts and analytics are generated from real data

### Community Analysis Flow:
1. User enters a subreddit name
2. App calls `/api/reddit/subreddit/:name`
3. Backend fetches subreddit data, recent posts, moderators
4. Frontend displays real community information

## 6. Rate Limiting & Best Practices

- Reddit API has rate limits (60 requests per minute)
- Implement caching to avoid repeated API calls
- Use pagination for large datasets
- Store frequently accessed data in your database
- Implement error handling for API failures

## 7. Search Functionality

Replace mock search results with:
```javascript
const searchReddit = async (query, filters) => {
  const response = await fetch('/api/reddit/search', {
    method: 'POST',
    body: JSON.stringify({ query, filters })
  });
  return response.json();
};
```

## 8. Real-time Monitoring

Implement WebSocket or polling for:
- New posts matching keywords
- User activity updates
- Subreddit changes
- Alert notifications

## 9. Word Cloud Integration

Replace mock word cloud data with:
- Most frequent words from collected posts/comments
- Trending topics in monitored subreddits
- Keyword frequency analysis

## 10. Charts and Analytics

Update chart data sources to use:
- Real post engagement metrics
- User activity timelines
- Subreddit growth statistics
- Sentiment analysis results

## Getting Started

1. Choose your integration approach (direct API calls vs. database storage)
2. Set up Reddit API credentials
3. Start with one page (e.g., User Profiling)
4. Replace mock data step by step
5. Test thoroughly with rate limiting in mind
6. Implement caching and error handling
7. Expand to other pages

## Need Help?

- Reddit API Documentation: https://www.reddit.com/dev/api/
- SNOOWRAP Documentation: https://not-an-aardvark.github.io/snoowrap/
- Consider using Reddit's PRAW for Python backends

Remember to comply with Reddit's API terms of service and rate limits!