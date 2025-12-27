# Database Management Guide for Reddit Sleuth

This guide explains how to manage the Reddit Sleuth database, add scraped information, and access the database from other devices.

## Table of Contents
1. [Adding Scraped Reddit Data](#adding-scraped-reddit-data)
2. [Managing Database on Other Devices](#managing-database-on-other-devices)
3. [Database Schema Overview](#database-schema-overview)
4. [Admin Operations](#admin-operations)

---

## Adding Scraped Reddit Data

### Prerequisites
- Admin access to the Reddit Sleuth application
- Scraped Reddit data in a structured format (JSON, CSV, or direct API responses)

### Step 1: Access the Admin Dashboard
1. Navigate to the admin login page: `/admin/login`
2. Log in with your admin credentials
3. You'll be redirected to the admin dashboard at `/admin/dashboard`

### Step 2: Prepare Your Data
Ensure your scraped Reddit data follows these formats:

#### User Data Format
```json
{
  "username": "reddit_username",
  "account_created": "2024-01-01T00:00:00Z",
  "karma": {
    "post": 1234,
    "comment": 5678
  },
  "is_verified": false,
  "profile_data": {
    "bio": "User bio text",
    "avatar_url": "https://..."
  }
}
```

#### Post Data Format
```json
{
  "post_id": "unique_post_id",
  "author": "reddit_username",
  "subreddit": "subreddit_name",
  "title": "Post title",
  "content": "Post content",
  "created_at": "2024-01-01T00:00:00Z",
  "score": 123,
  "num_comments": 45,
  "url": "https://reddit.com/..."
}
```

#### Comment Data Format
```json
{
  "comment_id": "unique_comment_id",
  "post_id": "parent_post_id",
  "author": "reddit_username",
  "content": "Comment text",
  "created_at": "2024-01-01T00:00:00Z",
  "score": 10,
  "parent_id": "parent_comment_id_or_null"
}
```

### Step 3: Insert Data via Backend
The application uses Lovable Cloud for data storage. To insert scraped data:

#### Option 1: Using the Application Interface (Recommended)
1. Create an investigation case from the Home page
2. Use User Profiling to analyze and save Reddit user data
3. Use Community Analysis to analyze and save subreddit data
4. All data is automatically linked to the active case

#### Option 2: Using the Data Store Edge Function
```typescript
import { supabase } from "@/integrations/supabase/client";

// Save posts
const { data, error } = await supabase.functions.invoke('data-store', {
  body: {
    operation: 'savePosts',
    caseId: 'your-case-uuid',
    posts: [/* array of posts */]
  }
});

// Save comments
const { data, error } = await supabase.functions.invoke('data-store', {
  body: {
    operation: 'saveComments',
    caseId: 'your-case-uuid',
    comments: [/* array of comments */]
  }
});

// Save user profile analysis
const { data, error } = await supabase.functions.invoke('data-store', {
  body: {
    operation: 'saveUserProfile',
    caseId: 'your-case-uuid',
    profile: {
      username: 'target_user',
      account_age: '2 years',
      total_karma: 12345,
      // ... other profile fields
    }
  }
});
```

---

## Managing Database on Other Devices

### Accessing the Database Remotely

#### Method 1: Using the Web Interface
1. **Access the Application**: Navigate to your Reddit Sleuth deployment URL from any device
2. **Login**: Go to `/login` and authenticate with your credentials
3. **View Data**: Use the application interface to view and manage data

#### Method 2: Direct Database Access (Advanced)
The database is hosted on Lovable Cloud. To access it from external tools:

##### Get Your Credentials
For direct database access, you'll need:
- Database URL
- Database password
- Service role key (for API access)

**Note**: Direct database access is typically not needed. Use the application interface or edge functions for data operations.

##### Using Supabase Client Libraries
For programmatic access from other applications:

**JavaScript/TypeScript:**
```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'YOUR_SUPABASE_URL',
  'YOUR_SUPABASE_KEY'
);

// Query data
const { data, error } = await supabase
  .from('user_profiles_analyzed')
  .select('*')
  .eq('username', 'target_user');
```

**Python:**
```python
from supabase import create_client, Client

url = "YOUR_SUPABASE_URL"
key = "YOUR_SUPABASE_KEY"
supabase: Client = create_client(url, key)

# Query data
response = supabase.table('user_profiles_analyzed').select("*").eq('username', 'target_user').execute()
```

### Mobile Access
1. Use the web interface from a mobile browser
2. The application is fully responsive and works on mobile devices
3. For native mobile apps, implement Supabase client in your mobile app

---

## Database Schema Overview

### Tables

#### `profiles`
Stores user profile information for application users (not Reddit users).
- `id` (UUID): Primary key, linked to auth.users
- `email` (TEXT): User email
- `full_name` (TEXT): User full name
- `created_at`, `updated_at`: Timestamps

#### `user_roles`
Manages user roles and permissions.
- `id` (UUID): Primary key
- `user_id` (UUID): Reference to profiles
- `role` (ENUM): User role (admin, user)
- `created_at`: Timestamp

#### `user_invites`
Stores pending user invitations.
- `id` (UUID): Primary key
- `email` (TEXT): Invited email
- `invite_token` (TEXT): Unique invitation token
- `role` (ENUM): Assigned role
- `expires_at`: Expiration timestamp
- `used_at`: When invitation was used
- `created_by`: Admin who created the invite

#### `audit_logs`
Tracks system actions for compliance.
- `id` (UUID): Primary key
- `user_id` (UUID): User who performed action
- `action_type` (TEXT): Type of action
- `resource_type` (TEXT): Type of resource affected
- `resource_id` (UUID): ID of resource
- `details` (JSONB): Additional details
- `ip_address` (TEXT): Client IP address
- `created_at`: Timestamp

#### `investigation_cases`
Stores investigation case data.
- `id` (UUID): Primary key
- `case_number` (TEXT): Unique case number
- `case_name` (TEXT): Case name
- `description` (TEXT): Case description
- `status` (TEXT): Case status
- `priority` (TEXT): Priority level
- `department` (TEXT): Assigned department
- `lead_investigator` (TEXT): Lead investigator name
- `is_sensitive` (BOOLEAN): Whether case is sensitive
- `case_password_hash` (TEXT): Password hash for sensitive cases
- `cache_duration_days` (INTEGER): Data cache duration
- `created_by` (UUID): Creator reference
- `created_at`, `updated_at`: Timestamps

#### `reddit_posts`
Stores Reddit posts with sentiment analysis.
- `id` (UUID): Primary key
- `post_id` (TEXT): Reddit post ID
- `case_id` (UUID): Reference to investigation case
- `author` (TEXT): Post author
- `subreddit` (TEXT): Subreddit name
- `title` (TEXT): Post title
- `content` (TEXT): Post content
- `score` (INTEGER): Post score
- `num_comments` (INTEGER): Comment count
- `permalink` (TEXT): Reddit URL
- `created_utc` (TIMESTAMP): Post creation time
- `collected_at` (TIMESTAMP): When collected
- `sentiment` (TEXT): Sentiment classification
- `sentiment_explanation` (TEXT): XAI explanation
- `metadata` (JSONB): Additional metadata

#### `reddit_comments`
Stores Reddit comments with sentiment analysis.
- Similar structure to reddit_posts
- `body` (TEXT): Comment text
- `link_title` (TEXT): Parent post title

#### `user_profiles_analyzed`
Stores analyzed Reddit user profiles.
- `id` (UUID): Primary key
- `case_id` (UUID): Reference to investigation case
- `username` (TEXT): Reddit username
- `account_age` (TEXT): Account age string
- `total_karma`, `post_karma`, `comment_karma` (INTEGER): Karma values
- `active_subreddits` (JSONB): List of active subreddits
- `activity_pattern` (JSONB): Activity pattern data
- `sentiment_analysis` (JSONB): Overall sentiment
- `post_sentiments`, `comment_sentiments` (JSONB): Individual sentiments
- `location_indicators` (JSONB): Detected locations
- `behavior_patterns` (JSONB): Identified patterns
- `word_cloud` (JSONB): Word cloud data
- `analyzed_at` (TIMESTAMP): Analysis timestamp

#### `analysis_results`
Stores general analysis results.
- `id` (UUID): Primary key
- `case_id` (UUID): Reference to investigation case
- `analysis_type` (TEXT): Type of analysis
- `target` (TEXT): Analysis target
- `result_data`, `sentiment_data` (JSONB): Results
- `analyzed_at` (TIMESTAMP): Timestamp

#### `monitoring_sessions`
Stores real-time monitoring session data.
- `id` (UUID): Primary key
- `case_id` (UUID): Reference to investigation case
- `target_name` (TEXT): Monitored target
- `search_type` (TEXT): Type of monitoring
- `profile_data` (JSONB): Profile snapshot
- `activities` (JSONB): Captured activities
- `word_cloud_data` (JSONB): Word cloud
- `new_activity_count` (INTEGER): New activity count
- `started_at`, `ended_at` (TIMESTAMP): Session duration

#### `investigation_reports`
Stores generated reports.
- `id` (UUID): Primary key
- `case_id` (UUID): Reference to investigation case
- `report_type` (TEXT): Report type
- `report_data` (JSONB): Report content
- `selected_modules` (JSONB): Included modules
- `export_format` (TEXT): Export format (PDF/HTML)
- `generated_by` (UUID): Creator reference
- `generated_at` (TIMESTAMP): Generation timestamp

### Security
All tables use Row-Level Security (RLS) policies to ensure:
- Users can only see their own data
- Users can only access data from their own cases
- Admins can see all data
- Proper authentication is required for all operations

### Backup and Export
1. **Automatic Backups**: The database is automatically backed up by Lovable Cloud
2. **Manual Export**: Use the Report feature to export investigation data
3. **Data Store Function**: Use the `getCaseFullData` operation to export all case data

---

## Admin Operations

### Creating New Users
Admins can create new users from the Admin Dashboard:
1. Navigate to `/admin/dashboard`
2. Use the "Create User" form
3. Enter email, password, name, and role
4. User will be created and can log in immediately

### Sending Invitations
1. From the Admin Dashboard, use "Send Invitation"
2. Enter email and select role
3. User receives email with invitation link
4. Link expires after the configured duration

### Resetting Passwords
1. From the Admin Dashboard, find the user
2. Click "Reset Password"
3. Enter new password
4. User's password is updated immediately

### Viewing Audit Logs
All admin actions are logged in the `audit_logs` table:
- User creation
- Password resets
- Role changes
- Invitation sends

---

## Best Practices

1. **Data Validation**: Always validate scraped data before insertion
2. **Rate Limiting**: Respect Reddit's API rate limits when scraping
3. **Privacy**: Ensure compliance with data protection regulations
4. **Regular Backups**: Export important data regularly via reports
5. **Access Control**: Only grant admin access to authorized personnel
6. **Monitoring**: Review audit logs regularly for unusual activity

## Troubleshooting

### Cannot Connect to Database
- Verify your credentials are correct
- Check your internet connection
- Ensure you're using the correct Supabase URL

### Data Not Appearing
- Check RLS policies are correctly configured
- Verify you're querying the correct table
- Ensure you have the necessary permissions
- Confirm the case_id is correct

### Performance Issues
- Use pagination for large datasets
- Optimize queries with proper indexes
- Consider archiving old data

## Support
For additional help, refer to the technical documentation or contact your system administrator.
