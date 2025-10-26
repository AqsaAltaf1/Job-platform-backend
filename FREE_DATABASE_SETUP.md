# Free Database Setup Guide for Render

## Option 1: Supabase (Recommended)

### Step 1: Create Supabase Account
1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign up with GitHub (recommended)
4. Click "New Project"

### Step 2: Create Database Project
1. **Organization:** Choose your organization (or create one)
2. **Project Name:** `job-portal-db`
3. **Database Password:** Create a strong password (save this!)
4. **Region:** Choose closest to your users (e.g., US East for US users)
5. Click "Create new project"
6. Wait 2-3 minutes for setup to complete

### Step 3: Get Connection String
1. Go to **Settings** → **Database**
2. Scroll down to **"Connection string"**
3. Copy the **"URI"** connection string
4. It should look like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres
   ```

### Step 4: Add to Render
1. Go to your Render dashboard
2. Select your service
3. Click **"Environment"** tab
4. Click **"Add Environment Variable"**
5. **Key:** `DATABASE_URL`
6. **Value:** Paste the connection string from Supabase
7. Click **"Save Changes"**

### Step 5: Redeploy
1. Render will automatically redeploy with new environment variables
2. Check the logs to see if database connection is successful
3. Visit your health endpoint: `https://your-app.onrender.com/health`

## Option 2: Render PostgreSQL (Alternative)

### Step 1: Create Database
1. In Render dashboard, click **"New +"** → **"PostgreSQL"**
2. **Name:** `job-portal-db`
3. **Database:** `job_portal`
4. **User:** `job_portal_user`
5. **Region:** Same as your service
6. Click **"Create Database"**

### Step 2: Get Connection String
1. Go to your database settings
2. Copy the **"External Database URL"**
3. It should look like:
   ```
   postgresql://job_portal_user:password@host:port/job_portal
   ```

### Step 3: Add to Service
1. Go to your service settings
2. Click **"Environment"** tab
3. Add `DATABASE_URL` with the connection string
4. Save and redeploy

## Testing Your Setup

Once you've added the DATABASE_URL:

1. **Check Health Endpoint:**
   ```
   https://your-app.onrender.com/health
   ```
   Should return: `{"message":"Database connected successfully! ✅","status":"healthy"}`

2. **Check Logs:**
   - Go to your service logs in Render
   - Look for: `✅ Database connected successfully`

## Troubleshooting

### If you see "Tenant or user not found":
- Double-check the DATABASE_URL format
- Ensure the password is correct
- Verify the database exists and is accessible

### If connection times out:
- Check if the database is in the same region
- Verify firewall settings
- Try the connection string from a different source

### If tables don't exist:
- The app will create tables automatically on first run
- Check the logs for any migration errors

## Free Tier Limits

### Supabase:
- 500MB database storage
- 2GB bandwidth
- No time limits
- Perfect for development and small production apps

### Render PostgreSQL:
- 1GB storage
- Database sleeps after 90 days of inactivity
- May need manual wake-up

## Next Steps

After setting up the database:
1. Your app will automatically create all necessary tables
2. You can start using the API endpoints
3. Test registration and login functionality
4. Set up additional environment variables as needed
