# 🔐 Satark-AI Credentials Setup Guide

Follow these steps to generate the necessary API keys for the project.

## 1. Clerk Authentication (For User Login)

1.  Go to [dashboard.clerk.com](https://dashboard.clerk.com/) and **Sign Up/Login**.
2.  Click **"Create Application"**.
3.  Name it `Satark-AI` (or any name you prefer).
4.  In "How will your users sign in?", select **"Email"**, **"Google"**, and any other providers you want.
5.  Click **"Create Application"**.
6.  You will land on the "Api Keys" page. Copy the following:
    - **Publishable Key** (starts with `pk_test_...`)
    - **Secret Key** (starts with `sk_test_...`)

## 2. Supabase Database (For Storing Scan Results)

1.  Go to [supabase.com](https://supabase.com/) and **Sign Up/Login**.
2.  Click **"New Project"**.
3.  Select your Organization.
4.  **Name**: `Satark-DB`
5.  **Database Password**: Create a strong password (and **save it**, you will need it!).
6.  **Region**: Select a region close to you (e.g., Mumbai/Singapore).
7.  Click **"Create new project"** and wait a moment for it to set up.
8.  Once ready, go to **Project Settings (Gear Icon) -> Database**.
9.  Scroll down to **Connection String**.
10. Click on **URI** (toggle from "Transaction" to "Session" if available, but for now just copy the URI).
11. Copy the URL. It looks like:
    `postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`
    - _Important:_ Replace `[password]` in the URL with the password you created in step 5!

---

## 📝 Next Steps

Once you have these 3 values, paste them in the chat like this:

```
Clerk Publishable: pk_test_xxxx...
Clerk Secret: sk_test_xxxx...
Supabase URL: postgresql://postgres....
```

I will automatically key them into your `.env` files and restart the server! 🚀
