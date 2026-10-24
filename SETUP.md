# Setup Guide

This guide covers setting up the Online Auction Web App for development and production deployment.

## Table of Contents

- [Local Development Setup](#local-development-setup)
- [Deploy Backend to Render](#deploy-backend-to-render)
- [Deploy Frontend to Cloudflare Pages](#deploy-frontend-to-cloudflare-pages)
- [Environment Variables Reference](#environment-variables-reference)

---

## Local Development Setup

### Prerequisites

- Node.js 20+ installed
- npm or pnpm package manager

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd online-auction-web-app
```

### Step 2: Install Dependencies

```bash
# Install root dependencies (concurrently for running both apps)
npm install

# Install backend dependencies
cd backend && npm install && cd ..

# Install frontend dependencies
cd frontend && npm install && cd ..
```

### Step 3: Configure Environment Variables

#### Backend (.env)

Copy the example file and configure:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```env
# Development mode
NODE_ENV=development

# Demo authentication (for local testing only)
ALLOW_DEMO_AUTH=true

# Supabase configuration (optional, for production)
# SUPABASE_URL=your-supabase-url
# SUPABASE_ANON_KEY=your-supabase-anon-key

# CORS origin for frontend
CORS_ORIGIN=http://localhost:5173
```

#### Frontend (.env)

Copy the example file and configure:

```bash
cp frontend/.env.example frontend/.env
```

Edit `frontend/.env`:

```env
# Backend API URL
VITE_API_URL=http://localhost:3000

# Supabase configuration (optional)
# VITE_SUPABASE_URL=your-supabase-url
# VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Step 4: Run the Application

**Option 1: Run both together**
```bash
npm run dev
```

**Option 2: Run separately in different terminals**

Terminal 1 - Backend:
```bash
npm run dev:backend
```

Terminal 2 - Frontend:
```bash
npm run dev:frontend
```

The frontend will be available at `http://localhost:5173` and the backend API at `http://localhost:3000`.

### Step 5: Verify Installation

Open your browser and visit:
- Frontend: `http://localhost:5173`
- Backend Health: `http://localhost:3000/health`

Expected health check response:
```json
{
  "ok": true,
  "demoAuth": true
}
```

---

## Deploy Backend to Render

### Prerequisites

- Render account ([sign up](https://render.com))
- GitHub repository with your code
- Supabase account (optional, for production database)

### Step 1: Create a Render Web Service

1. Go to [render.com](https://render.com) and sign in
2. Click **New** → **Web Service**
3. Connect your GitHub repository

### Step 2: Configure Build Settings

In the Render dashboard:

| Setting | Value |
|---------|-------|
| **Environment** | Node |
| **Build Command** | `cd backend && npm install && npm run build` |
| **Start Command** | `cd backend && npm start` |
| **Instance Type** | Free or Basic (depending on your needs) |

### Step 3: Set Environment Variables

In the Render dashboard, go to **Environment** tab and add:

| Variable | Value | Description |
|----------|-------|-------------|
| `NODE_ENV` | `production` | Production mode |
| `ALLOW_DEMO_AUTH` | `false` | Disable demo auth in production |
| `SUPABASE_URL` | *your-supabase-url* | Supabase project URL (optional) |
| `SUPABASE_ANON_KEY` | *your-supabase-anon-key* | Supabase anon key (optional) |
| `CORS_ORIGIN` | *your-cloudflare-pages-url* | Cloudflare Pages URL (e.g., `https://auction.yourdomain.pages.dev`) |

### Step 4: Set Up Supabase (Optional)

If you want to use Supabase for authentication and database:

1. Go to [supabase.com](https://supabase.com) and create a project
2. Run the SQL from `backend/schema.sql` in the SQL Editor
3. Copy the database URL and API key
4. Add them to your Render environment variables

### Step 5: Deploy

1. Click **Create Web Service**
2. Render will automatically build and deploy your backend
3. Copy the generated URL (e.g., `https://your-app.onrender.com`)

---

## Deploy Frontend to Cloudflare Pages

### Prerequisites

- Cloudflare account ([sign up](https://cloudflare.com))
- GitHub repository with your code
- Backend deployed to Render (or another hosting service)

### Step 1: Create a Cloudflare Pages Project

1. Go to [cloudflare.com](https://cloudflare.com) and sign in
2. Navigate to **Workers & Pages** → **Create application** → **Pages**
3. Click **Connect to Git**
4. Select your GitHub repository

### Step 2: Configure Build Settings

In the Cloudflare Pages setup:

| Setting | Value |
|---------|-------|
| **Production branch** | `main` (or your branch) |
| **Build command** | `cd frontend && npm run build` |
| **Build output directory** | `../backend/public` |

### Step 3: Set Environment Variables

In the Cloudflare Pages dashboard:

1. Go to **Settings** → **Environment variables**
2. Add the following variables:

| Variable | Value | Description |
|----------|-------|-------------|
| `VITE_API_URL` | *your-render-backend-url* | Render backend URL (e.g., `https://your-app.onrender.com`) |
| `VITE_SUPABASE_URL` | *your-supabase-url* | Supabase project URL (optional) |
| `VITE_SUPABASE_ANON_KEY` | *your-supabase-anon-key* | Supabase anon key (optional) |

### Step 4: Configure Custom Domain (Optional)

1. Go to **Custom domains**
2. Click **Set up a custom domain**
3. Enter your domain (e.g., `auction.yourdomain.com`)
4. Update DNS records as instructed

### Step 5: Deploy

1. Click **Save and Deploy**
2. Cloudflare will automatically build and deploy your frontend
3. Your frontend will be available at `https://your-app.pages.dev`

---

## Environment Variables Reference

### Backend (.env)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | Environment mode |
| `ALLOW_DEMO_AUTH` | No | `false` | Enable demo authentication |
| `SUPABASE_URL` | No | - | Supabase project URL |
| `SUPABASE_ANON_KEY` | No | - | Supabase anon key |
| `CORS_ORIGIN` | Yes (production) | - | Frontend URL for CORS |

### Frontend (.env)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | Yes | - | Backend API URL |
| `VITE_SUPABASE_URL` | No | - | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | No | - | Supabase anon key |

---

## Troubleshooting

### Backend Deployment Issues

| Issue | Solution |
|-------|----------|
| Build fails | Ensure `package.json` exists in `backend/` directory |
| App crashes | Check environment variables are set correctly |
| CORS errors | Update `CORS_ORIGIN` to include your Cloudflare Pages URL |
| WebSocket not working | Ensure `@fastify/websocket` is installed |

### Frontend Deployment Issues

| Issue | Solution |
|-------|----------|
| Build fails | Ensure `package.json` exists in `frontend/` directory |
| API not reachable | Verify `VITE_API_URL` points to your Render backend |
| Auth not working | Set up Supabase environment variables |
| Build output not found | Ensure `../backend/public` is set as build output directory |

### Local Development Issues

| Issue | Solution |
|-------|----------|
| Port already in use | Change port in `backend/src/server.ts` or `frontend/vite.config.ts` |
| CORS errors | Ensure `CORS_ORIGIN` matches frontend URL exactly |
| WebSocket connection failed | Verify backend is running and accessible |

---

## Quick Start Commands

```bash
# Install all dependencies
npm install && cd backend && npm install && cd .. && cd frontend && npm install && cd ..

# Configure environment
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Run development
npm run dev

# Build for production
npm run build
```
