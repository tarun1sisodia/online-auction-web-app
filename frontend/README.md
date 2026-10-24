# Online Auction — frontend

Vite + React + TypeScript, vanilla CSS only. Theme and motion are borrowed from Tarun's own portfolio at me-seven-delta-16.vercel.app: dark `#06060B` with burnt orange `#ff6b35`, light sand `#F5EBD0` with wine `#7F011F`, Space Grotesk display type, JetBrains Mono labels, tilted marquee, magnetic bid button, dust burst on a new bid, and a motion toggle.

## Run with the backend

Terminal 1, backend:

```bash
cd ../
cp .env.example .env
npm install
npm run dev
```

Terminal 2, frontend:

```bash
cd client
cp .env.example .env
npm install
npm run dev
```

Open http://localhost:5173, enter a name, continue as a demo bidder, create an auction, then open a second browser window with a different name and join the same room to bid against yourself.

## Deploy on Cloudflare Pages

This frontend is a static Vite build. It does not run on Cloudflare Workers, and the backend does not run on Cloudflare either, because the backend holds WebSocket rooms in one process on Render.

Cloudflare Pages project settings, using the GitHub repo:

- Repository: `tarun1sisodia/online-auction-web-app`
- Framework preset: Vite
- Root directory: `client`
- Build command: `npm run build`
- Build output directory: `dist`
- Environment variables in Pages:
  - `VITE_API_URL` = your Render backend URL, for example `https://online-auction-server.onrender.com` — replace this with your actual Render URL
  - `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` only if you want Google login

Vite bakes `VITE_API_URL` into the build, so changing it requires a Pages redeploy. If it is left as localhost, the deployed page shows a warning banner instead of silently failing.

Backend on Render, from the repo root `render.yaml`:

- Service: `online-auction-server`, build `npm install && npm run build`, start `node dist/server.js`, health check `/health`
- Render environment variables: `CORS_ORIGIN` = your Cloudflare Pages URL, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `ALLOW_DEMO_AUTH` = `false` in production

SPA routing is handled by `public/_redirects`, which Pages copies to the output root: every path falls back to `index.html` with a 200, so refreshing a room link does not 404.

## Login

Demo login is only for local testing. For Google login, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, rebuild, and use the Google button. The backend must also have `SUPABASE_URL` and `SUPABASE_ANON_KEY` set, and demo auth turned off.
