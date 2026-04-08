# Deployment Guide

## Overview

| Component | Hosting  | Free Tier                         |
| --------- | -------- | --------------------------------- |
| Frontend  | Netlify  | 100 GB bandwidth, 300 build min   |
| Backend   | Render / Railway | Render: 750h/mo auto-sleep; Railway: $5 credit trial |
| Database  | Render / Railway | Render: 90-day Free; Railway: Managed Postgres |

## Frontend — Netlify

### Initial Setup

1. Push the repo to GitHub
2. Go to [app.netlify.com](https://app.netlify.com) and click "Add new site" > "Import an existing project"
3. Connect your GitHub repo
4. Configure build settings:
   - **Base directory**: `client`
   - **Build command**: `pnpm run build`
   - **Publish directory**: `client/dist`
   - **Node version**: Set `NODE_VERSION=20` in environment variables
5. Add environment variable:
   - `VITE_API_URL` = `https://your-render-app.onrender.com/api`
6. Deploy

The `netlify.toml` at the repo root pre-configures these settings, so Netlify should auto-detect them.

### How It Works

- Netlify builds the React app into static files
- The `[[redirects]]` rule in `netlify.toml` sends all routes to `index.html` (required for client-side routing)
- Environment variables prefixed with `VITE_` are embedded at build time

## Backend — Render

### Option A: Blueprint (Recommended)

1. Push the repo to GitHub
2. Go to [dashboard.render.com](https://dashboard.render.com) and click "New" > "Blueprint"
3. Connect your GitHub repo
4. Render reads `render.yaml` and auto-creates:
   - A **Web Service** for the server
   - A **PostgreSQL database**
5. Set the `CLIENT_URL` environment variable to your Netlify URL (e.g., `https://your-app.netlify.app`)
6. Deploy

### Option B: Manual Setup

1. **Create a PostgreSQL database**:
   - Go to Render dashboard > "New" > "PostgreSQL"
   - Name: `ai-diary-db`
   - Plan: Free
   - Copy the **Internal Database URL**

2. **Create a Web Service**:
   - Go to "New" > "Web Service"
   - Connect your GitHub repo
   - Configure:
     - **Name**: `ai-diary-server`
     - **Root Directory**: `server`
     - **Build Command**: `pnpm install && pnpm run db:generate && pnpm run build`
     - **Start Command**: `pnpm run start`
     - **Plan**: Free
   - Add environment variables:
     - `NODE_ENV` = `production`
     - `DATABASE_URL` = (paste the Internal Database URL)
     - `CLIENT_URL` = `https://your-app.netlify.app`
     - `JWT_SECRET` = (generate a strong random string, min 32 chars)
     - `ADMIN_SEED_PASSWORD` = (choose a strong password for the initial admin)
     - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` = (optional, for Google OAuth)
     - `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET` = (optional, for Microsoft OAuth)
     - `GOOGLE_CALLBACK_URL` = `https://your-server.onrender.com/api/auth/google/callback`
     - `MICROSOFT_CALLBACK_URL` = `https://your-server.onrender.com/api/auth/microsoft/callback`

### Database Migrations & Seeding

After deploying, run via Render Shell:

```bash
cd server && pnpm run db:push && pnpm run db:seed
```

This creates the schema and seeds default roles, permissions, and the admin user.

## Backend — Railway (Alternative)

### Automated Setup

1. Push the repo to GitHub
2. Go to [railway.app](https://railway.app) and click "New Project" > "Deploy from GitHub repo"
3. Select your repo
4. Railway will detect `railway.json` and configure:
   - **Build Command**: `pnpm build:server && cd server && pnpm db:generate`
   - **Start Command**: `cd server && npx prisma db push && pnpm db:seed && pnpm start`
5. **Add a Database**:
   - In your Railway project, click "Add" > "Database" > "Add PostgreSQL"
   - Railway automatically injects the `DATABASE_URL` into your service
6. Set other environment variables in the service settings:
   - `NODE_ENV` = `production`
   - `CLIENT_URL` = `https://your-app.netlify.app`
   - `JWT_SECRET` = (generate a strong random string)
   - `ADMIN_SEED_PASSWORD` = (your admin password)
7. Deploy

### Why Railway?

- **No auto-sleep**: Unlike Render's free tier, Railway services don't sleep (until you run out of credits).
- **Faster builds**: Railway's Nixpacks builder is optimized for monorepos.
- **Easy Postgres**: One-click database addition with automatic connection string handling.

## Post-Deployment Checklist

- [ ] Backend health check works: `GET https://your-server.onrender.com/api/health`
- [ ] Frontend loads at your Netlify URL
- [ ] Frontend can reach the backend API (check browser console for CORS errors)
- [ ] `CLIENT_URL` on Render matches your exact Netlify URL (no trailing slash)
- [ ] `VITE_API_URL` on Netlify matches your exact Render URL + `/api`
- [ ] `JWT_SECRET` is set on Render (required — server won't start without it)
- [ ] Login works with admin credentials (`admin@diary.app`)
- [ ] OAuth callback URLs match the Render server URL (if OAuth is configured)
- [ ] Admin panel loads at `/admin/users` after login

## Free Tier Limitations

### Netlify
- 100 GB bandwidth/month
- 300 build minutes/month
- Unlimited static sites

### Render
- Web services spin down after 15 minutes of inactivity (first request after sleep takes ~30 seconds)
- Free PostgreSQL databases expire after 90 days (you can recreate and re-migrate)
- 750 free instance hours/month

## Custom Domain (Optional)

### Netlify
1. Go to Site settings > Domain management > Add custom domain
2. Update DNS records as instructed
3. Netlify auto-provisions HTTPS via Let's Encrypt

### Render
1. Go to your Web Service > Settings > Custom Domains
2. Add your domain and update DNS
3. Render auto-provisions HTTPS
