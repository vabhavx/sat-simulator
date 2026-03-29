# SAT Simulator - Vercel Deployment Guide

## ✅ Completed Steps

1. **GitHub Repository Created**: https://github.com/vabhavx/sat-simulator
2. **Code Pushed**: All source files are now on GitHub

## 🚀 Deployment Steps

### Step 1: Sign up/Login to Vercel
1. Go to https://vercel.com/signup
2. Sign up using your **GitHub account** (recommended for easy integration)

### Step 2: Import Project
1. Click **"Add New Project"**
2. Select **"Import Git Repository"**
3. Find and select `vabhavx/sat-simulator`
4. Click **"Import"**

### Step 3: Configure Project Settings

**Framework Preset**: Next.js (should auto-detect)

**Root Directory**: `./` (default)

**Build Command**: `next build` (default)

**Environment Variables** - Add these:

```
NEXT_PUBLIC_SUPABASE_URL=https://ionvtznvhgljrnimhayz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvbnZ0em52aGdsanJuaW1oYXl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3MTE1NzQsImV4cCI6MjA5MDI4NzU3NH0.i1Q-Oea1bF1Tz1miWcjhkSXhANPlWBh8tRqsDKpzzEA
```

5. Click **"Deploy"**

### Step 4: Configure Custom Domain (jonlick.com)

1. Wait for the initial deployment to complete
2. Go to **Project Settings** → **Domains**
3. Enter `jonlick.com` and click **"Add"**
4. Vercel will provide DNS configuration options:

**Option A: Nameservers (Recommended)**
- Change your domain's nameservers at your registrar to Vercel's nameservers:
  - `ns1.vercel-dns.com`
  - `ns2.vercel-dns.com`

**Option B: A Record + CNAME**
- Add an A record pointing to `76.76.21.21`
- Add a CNAME record for `www` pointing to `cname.vercel-dns.com`

### Step 5: Enable HTTPS
- Vercel automatically provisions SSL certificates for custom domains

## 📋 Quick Reference

| Setting | Value |
|---------|-------|
| Repository | https://github.com/vabhavx/sat-simulator |
| Framework | Next.js 15 |
| Node Version | 18+ |
| Required Env Vars | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |

## 🔧 Post-Deployment

Once deployed, your site will be live at:
- **Production**: https://jonlick.com
- **Vercel Preview**: https://sat-simulator-[random].vercel.app

## 📝 Notes

- The app uses Supabase for authentication and data storage
- Large PDF files (50MB+) are included in the repository
- The app supports both Reading & Writing and Math sections
- Real-time scoring and analytics are enabled

## 🆘 Troubleshooting

**Build fails?**
- Check that environment variables are correctly set
- Ensure Node.js version is 18 or higher

**Domain not working?**
- DNS propagation can take up to 48 hours
- Verify DNS records are correctly configured at your registrar

**Supabase connection errors?**
- Verify the Supabase URL and Anon Key are correct
- Check Supabase project is active
