# Supabase Database Access Guide

## Current Setup

This project is currently connected to **Lovable Cloud**, which automatically provisions a Supabase backend for you. This means you already have a fully functional Supabase database without needing to create a separate Supabase account.

## Project Connection Details

Your project is already connected to Supabase with the following details (found in `.env`):

- **Project ID**: `djcdnudwnyhajnzwykoq`
- **Supabase URL**: `https://djcdnudwnyhajnzwykoq.supabase.co`
- **Anon Key**: Available in `.env` file

## Accessing Your Database

### Option 1: Through Lovable (Recommended)
You can access your database, tables, authentication, and all backend features directly through the Lovable interface:
1. Click on the backend/database icon in Lovable
2. You'll have full access to:
   - Database tables and data
   - Authentication settings and users
   - Storage buckets
   - Edge functions
   - Secrets management

### Option 2: Direct Supabase Access
If you want to access the Supabase dashboard directly:

**Note**: This project is managed through Lovable Cloud, so you won't be able to access it through a personal Supabase account. The project is owned by Lovable's infrastructure.

## Important Notes

1. **Cannot Link Personal Supabase Account**: Since this project uses Lovable Cloud, it cannot be linked to a separate personal Supabase account. The Supabase project is automatically managed by Lovable.

2. **Cannot Disconnect from Lovable Cloud**: Once Lovable Cloud is enabled on a project, it cannot be disconnected or migrated to a personal Supabase account.

3. **Full Backend Access**: Despite not having a personal Supabase account, you have full access to all backend features through Lovable's interface - this includes all the capabilities you would have with a personal Supabase account.

## If You Need a Personal Supabase Account

If you want to use your own Supabase account for future projects:
1. Go to Settings → Tools in Lovable
2. Disable Lovable Cloud for future projects
3. New projects can then be connected to your personal Supabase account

However, this current project will remain on Lovable Cloud and cannot be migrated.

## Database Connection in Code

Your application connects to the database using the Supabase client at `src/integrations/supabase/client.ts`. The connection details are automatically configured from the `.env` file.

## Existing Database Tables

Current tables in your database:
- `profiles` - User profile information
- `user_roles` - User role assignments (admin, moderator, user)

## Need Help?

All database management, viewing data, and configuration can be done through the Lovable backend interface. You have the same capabilities as managing a personal Supabase project, just through Lovable's integrated interface.
