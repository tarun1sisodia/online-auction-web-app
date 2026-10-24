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

## Deploy

Frontend is static and fits Cloudflare Pages: build command `npm run build`, output `dist`. Set `VITE_API_URL` to the Render backend URL. Backend stays on Render, it is not a Cloudflare Worker, because it holds WebSocket rooms in one process.

## Login

Demo login is only for local testing. For Google login, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, rebuild, and use the Google button. The backend must also have `SUPABASE_URL` and `SUPABASE_ANON_KEY` set, and demo auth turned off.
