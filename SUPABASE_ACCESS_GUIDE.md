# Supabase Database Access Guide

## Connecting Your Own Supabase Account

Since you've disabled Lovable Cloud, you now need to connect your own Supabase account to this project.

### Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Fill in your project details (name, database password, region)
4. Wait for the project to be created (takes ~2 minutes)

### Step 2: Get Your Project Credentials

Once your project is created, you need to get three pieces of information:

1. **Project URL**: 
   - Go to Project Settings → API
   - Copy the "Project URL" (looks like `https://xxxxxxxxxxxxx.supabase.co`)

2. **Anon/Public Key**:
   - Same page (Project Settings → API)
   - Copy the "anon" key under "Project API keys"

3. **Project ID**:
   - Go to Project Settings → General
   - Copy the "Reference ID"

### Step 3: Update Your Project Configuration

**IMPORTANT**: You need to enter these credentials in the `.env` file at the root of your project.

Open the `.env` file and replace the existing values with your own:

```
VITE_SUPABASE_PROJECT_ID="your-project-id-here"
VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-key-here"
VITE_SUPABASE_URL="https://your-project-id.supabase.co"
```

**Example**:
```
VITE_SUPABASE_PROJECT_ID="abcdefghijklmnop"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
VITE_SUPABASE_URL="https://abcdefghijklmnop.supabase.co"
```

### Step 4: Set Up Your Database Schema

You need to create the required tables in your Supabase database. Go to your Supabase dashboard → SQL Editor and run these commands:

```sql
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create trigger function for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signups
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
  ON public.user_roles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));
```

### Step 5: Create Your First Admin User

After setting up the database, you need to create an admin user:

1. Sign up through your app's signup page
2. Go to Supabase Dashboard → SQL Editor
3. Run this command (replace with your email):

```sql
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'your-email@example.com';
```

### Step 6: Restart Your Development Server

After updating the `.env` file, restart your development server for the changes to take effect.

## Accessing Your Supabase Dashboard

Once connected, you can access your database at:
`https://supabase.com/dashboard/project/YOUR-PROJECT-ID`

From there you can:
- View and edit database tables
- Manage authentication settings
- Configure storage buckets
- Write SQL queries
- Monitor your project

## Troubleshooting

**Error: "Invalid API key"**
- Double-check you copied the correct anon key from Project Settings → API

**Error: "Failed to fetch"**
- Verify the VITE_SUPABASE_URL is correct
- Make sure you restarted your development server after updating .env

**Can't login as admin**
- Make sure you ran the SQL command to grant admin role to your user
- Check the user_roles table in your Supabase dashboard to verify the role was added
