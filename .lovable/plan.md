

# Plan: Add MongoDB for Unstructured Data (Local Development)

## Overview

This plan introduces MongoDB as a secondary database for storing **unstructured Reddit data** (posts, comments, user profiles analyzed, monitoring sessions, analysis results) while keeping **Supabase/PostgreSQL** for structured data (authentication, user accounts, cases, roles, audit logs, reports, invites).

This is a **local development setup only** -- the deployed Lovable Cloud version continues using Supabase for everything.

---

## Data Split Strategy

**Stays in Supabase (PostgreSQL):**
- `profiles` -- user account data
- `user_roles` -- role assignments
- `investigation_cases` -- case metadata (structured)
- `investigation_reports` -- report metadata
- `user_invites` -- invite tokens
- `audit_logs` -- audit trail

**Moves to MongoDB:**
- `reddit_posts` -- scraped Reddit posts (unstructured JSONB)
- `reddit_comments` -- scraped Reddit comments (unstructured JSONB)
- `user_profiles_analyzed` -- analyzed user profiles (heavy JSONB)
- `monitoring_sessions` -- monitoring data (heavy JSONB)
- `analysis_results` -- analysis outputs (heavy JSONB)

---

## Architecture (Local Mode)

```text
+------------------+       +------------------+       +------------------+
|  React Frontend  | ----> | Express.js       | ----> | MongoDB          |
|  (Vite)          |       | Backend Server   |       | (posts, comments |
|                  |       | (localhost:3000)  |       |  profiles, etc.) |
+------------------+       +--------+---------+       +------------------+
                                    |
                                    v
                           +------------------+
                           | Local Supabase   |
                           | (PostgreSQL/Auth) |
                           | (cases, users,   |
                           |  roles, reports) |
                           +------------------+
```

---

## Implementation Steps

### 1. Create MongoDB Data Layer (`server/mongodb.js`)
- Connect to local MongoDB using the `mongodb` Node.js driver
- Create collections: `reddit_posts`, `reddit_comments`, `user_profiles_analyzed`, `monitoring_sessions`, `analysis_results`
- Each document stores `case_id` (string matching the Supabase case UUID) for cross-referencing
- Create indexes on `case_id`, `author`, `subreddit`, `post_id`, `comment_id`

### 2. Update Express.js Backend (`server/index.js`)
- Add MongoDB connection initialization at startup
- Modify the `data-store` equivalent routes:
  - `savePosts`, `getPosts` --> MongoDB `reddit_posts` collection
  - `saveComments`, `getComments` --> MongoDB `reddit_comments` collection
  - `saveUserProfile`, `getUserProfiles` --> MongoDB `user_profiles_analyzed` collection
  - `saveMonitoringSession`, `getMonitoringSessions` --> MongoDB `monitoring_sessions` collection
  - `saveAnalysis`, `getAnalyses` --> MongoDB `analysis_results` collection
  - `saveReport`, `getReports` --> keep in Supabase PostgreSQL
  - `createCase`, `getCases`, `getCase`, `updateCase` --> keep in Supabase PostgreSQL
  - `getCaseFullData` --> query both MongoDB and PostgreSQL, merge results

### 3. Create Database Abstraction Layer (`src/lib/dataLayer.ts`)
- Create an abstraction that detects whether the app is running locally (with MongoDB) or on Lovable Cloud (Supabase only)
- Uses environment variable `VITE_USE_MONGODB=true` to toggle
- When MongoDB mode is on, routes unstructured data calls to the Express backend (`http://localhost:3000/api/...`) instead of the `data-store` edge function
- When off (default), uses existing `supabase.functions.invoke('data-store', ...)` path

### 4. Update `InvestigationContext.tsx`
- Replace direct `supabase.functions.invoke('data-store', ...)` calls with the new `dataLayer` abstraction
- The context API remains identical -- no changes needed in any page components

### 5. Update Environment Configuration
- Add to `.env.local` documentation:
  ```
  VITE_USE_MONGODB=true
  MONGODB_URI=mongodb://localhost:27017/reddit_sleuth
  ```

### 6. Update `LOCAL_SETUP_GUIDE.md`
- Add MongoDB installation instructions (Windows/macOS/Linux)
- Add MongoDB collection setup and index creation commands
- Document the `VITE_USE_MONGODB` toggle
- Add `npm install mongodb` to local backend dependencies
- Update the Express.js backend section with MongoDB integration code

### 7. New Files Created

| File | Purpose |
|------|---------|
| `server/mongodb.js` | MongoDB connection and collection helpers |
| `server/index.js` | Updated Express backend with MongoDB routes |
| `src/lib/dataLayer.ts` | Abstraction to switch between Supabase and MongoDB |

### 8. Modified Files

| File | Change |
|------|--------|
| `src/contexts/InvestigationContext.tsx` | Use `dataLayer` instead of direct edge function calls |
| `LOCAL_SETUP_GUIDE.md` | Add MongoDB setup section |
| `README.md` | Document hybrid architecture option |
| `INFRASTRUCTURE_SETUP.md` | Note MongoDB as local alternative |

---

## Technical Details

**MongoDB Collection Schemas:**

```text
reddit_posts:
  _id: ObjectId (auto)
  case_id: String (Supabase UUID)
  post_id: String (unique)
  author, subreddit, title, content: String
  score, num_comments: Number
  permalink: String
  created_utc: Date
  collected_at: Date
  sentiment, sentiment_explanation: String
  metadata: Object (flexible)

reddit_comments:
  _id: ObjectId (auto)
  case_id: String
  comment_id: String (unique)
  author, subreddit, body: String
  score: Number
  link_title, permalink: String
  created_utc, collected_at: Date
  sentiment, sentiment_explanation: String
  metadata: Object

user_profiles_analyzed:
  _id: ObjectId (auto)
  case_id: String
  username: String
  account_age: String
  total_karma, post_karma, comment_karma: Number
  active_subreddits, activity_pattern, sentiment_analysis: Object
  post_sentiments, comment_sentiments: Array
  location_indicators, behavior_patterns: Array
  word_cloud: Array
  analyzed_at: Date

analysis_results:
  _id: ObjectId (auto)
  case_id: String
  analysis_type: String
  target: String
  result_data, sentiment_data: Object
  analyzed_at: Date

monitoring_sessions:
  _id: ObjectId (auto)
  case_id: String
  target_name, search_type: String
  profile_data, activities, word_cloud_data: Object/Array
  new_activity_count: Number
  started_at, ended_at: Date
```

**Data Layer Toggle Logic:**

```text
if VITE_USE_MONGODB === "true"
  unstructured data --> fetch("http://localhost:3000/api/data-store", ...)
  structured data   --> supabase.functions.invoke('data-store', ...) OR direct supabase client
else
  everything --> supabase.functions.invoke('data-store', ...)
```

This ensures zero changes to page components -- only the data transport layer switches.

