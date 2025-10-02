# Database Management Guide for Reddit Sleuth

This guide explains how to manage the Reddit Sleuth database, add scraped information, and access the database from other devices.

## Table of Contents
1. [Adding Scraped Reddit Data](#adding-scraped-reddit-data)
2. [Managing Database on Other Devices](#managing-database-on-other-devices)
3. [Database Schema Overview](#database-schema-overview)

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
The application uses Lovable Cloud (powered by Supabase) for data storage. To insert scraped data:

#### Option 1: Using the Admin Interface (Recommended for non-technical users)
1. In the admin dashboard, use the "Add Data" forms
2. Fill in the required fields
3. Click "Submit" to add the data

#### Option 2: Direct Database Insert (For technical users)
Access the backend interface and run SQL insert statements:

```sql
-- Insert user data
INSERT INTO reddit_users (username, account_created, post_karma, comment_karma, is_verified, profile_data)
VALUES ('username', '2024-01-01', 1234, 5678, false, '{"bio": "text"}');

-- Insert post data
INSERT INTO reddit_posts (post_id, author, subreddit, title, content, created_at, score, num_comments)
VALUES ('post123', 'username', 'subreddit', 'Title', 'Content', '2024-01-01', 123, 45);

-- Insert comment data
INSERT INTO reddit_comments (comment_id, post_id, author, content, created_at, score)
VALUES ('comment123', 'post123', 'username', 'Comment text', '2024-01-01', 10);
```

### Step 4: Bulk Import from CSV/JSON
For large datasets:

1. Export your scraped data to CSV format
2. Access the backend interface
3. Use the "Import Data" feature to upload your CSV
4. Map the CSV columns to database fields
5. Execute the import

---

## Managing Database on Other Devices

### Accessing the Database Remotely

#### Method 1: Using the Web Interface
1. **Access the Application**: Navigate to your Reddit Sleuth deployment URL from any device
2. **Admin Login**: Go to `/admin/login` and authenticate
3. **View Backend**: From the admin dashboard, you can view and manage data

#### Method 2: Direct Database Access (Advanced)
The database is hosted on Lovable Cloud (Supabase). To access it from external tools:

##### Get Your Credentials
1. Contact your system administrator for:
   - Database URL
   - Database password
   - Service role key (for API access)

##### Using PostgreSQL Client (e.g., pgAdmin, DBeaver)
1. **Install a PostgreSQL client** on your device
2. **Create a new connection** with these settings:
   - Host: `[provided by admin]`
   - Port: `5432`
   - Database: `postgres`
   - Username: `postgres`
   - Password: `[provided by admin]`
   - SSL Mode: `require`

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
  .from('reddit_users')
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
response = supabase.table('reddit_users').select("*").eq('username', 'target_user').execute()
```

### Mobile Access
1. Use the web interface from a mobile browser
2. For native mobile apps, implement Supabase client in your mobile app
3. Use the same authentication and API keys

---

## Database Schema Overview

### Tables

#### `profiles`
Stores user profile information for the application users (not Reddit users).
- `id` (UUID): Primary key
- `email` (TEXT): User email
- `full_name` (TEXT): User full name
- `created_at`, `updated_at`: Timestamps

#### `user_roles`
Manages user roles and permissions.
- `id` (UUID): Primary key
- `user_id` (UUID): Foreign key to profiles
- `role` (ENUM): User role (admin, moderator, user)

#### Future Tables (To be created based on scraped data needs)
- `reddit_users`: Stores Reddit user profiles
- `reddit_posts`: Stores Reddit posts
- `reddit_comments`: Stores Reddit comments
- `cases`: Stores investigation cases
- `alerts`: Stores monitoring alerts
- `keywords`: Stores monitored keywords

### Security
All tables use Row-Level Security (RLS) policies to ensure:
- Users can only see their own data
- Admins can see all data
- Proper authentication is required for all operations

### Backup and Export
1. **Automatic Backups**: The database is automatically backed up by Lovable Cloud
2. **Manual Export**: Use the backend interface to export data as CSV/JSON
3. **Restore**: Contact support for database restoration from backups

---

## Best Practices

1. **Data Validation**: Always validate scraped data before insertion
2. **Rate Limiting**: Respect Reddit's API rate limits when scraping
3. **Privacy**: Ensure compliance with data protection regulations
4. **Regular Backups**: Export important data regularly
5. **Access Control**: Only grant database access to authorized personnel
6. **Monitoring**: Set up alerts for unusual database activity

## Troubleshooting

### Cannot Connect to Database
- Verify your credentials are correct
- Check your internet connection
- Ensure your IP is not blocked by firewall rules

### Data Not Appearing
- Check RLS policies are correctly configured
- Verify you're querying the correct table
- Ensure you have the necessary permissions

### Performance Issues
- Add indexes on frequently queried columns
- Optimize large queries with pagination
- Consider archiving old data

## Support
For additional help, contact your system administrator or refer to the technical documentation.
