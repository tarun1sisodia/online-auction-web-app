# Online Auction Web App

A real-time online auction system with WebSocket support for live bidding. Built with a monorepo structure separating frontend and backend.

## Project Structure

```
online-auction-web-app/
├── backend/              # Fastify-based backend server
│   ├── src/             # TypeScript source code
│   │   ├── server.ts    # Main server entry point
│   │   ├── auth.ts      # Authentication logic
│   │   ├── room.ts      # Auction room management
│   │   ├── store.ts     # In-memory data store
│   │   └── ...
│   ├── scripts/         # Utility scripts
│   ├── public/          # Static files (frontend build output)
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── frontend/            # React + Vite frontend application
│   ├── src/
│   │   ├── components/  # React components
│   │   │   ├── Home.tsx
│   │   │   └── Room.tsx
│   │   ├── api.ts       # API client utilities
│   │   ├── App.tsx      # Main app component
│   │   └── main.tsx     # Entry point
│   ├── public/          # Static assets
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── .env.example
├── package.json         # Root package.json (monorepo scripts)
├── schema.sql           # Supabase Postgres schema
├── .env.example         # Root environment template
└── README.md
```

## Tech Stack

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Fastify
- **Language**: TypeScript
- **Real-time**: WebSocket (@fastify/websocket)
- **CORS**: @fastify/cors

### Frontend
- **Framework**: React 19
- **Build Tool**: Vite
- **Language**: TypeScript
- **State**: React Hooks
- **Styling**: CSS (custom properties)

## Getting Started

### Prerequisites

- Node.js 20+ installed
- npm or pnpm package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd online-auction-web-app
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install

   # Install backend dependencies
   cd backend && npm install && cd ..

   # Install frontend dependencies
   cd frontend && npm install && cd ..
   ```

3. **Configure environment variables**

   Copy the example environment files:
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

   Edit `backend/.env` with your configuration:
   ```env
   # Development mode
   NODE_ENV=development

   # Demo authentication (for local testing)
   ALLOW_DEMO_AUTH=true

   # Supabase configuration (optional, for production)
   # SUPABASE_URL=your-supabase-url
   # SUPABASE_ANON_KEY=your-supabase-anon-key

   # CORS origin for frontend
   CORS_ORIGIN=http://localhost:5173
   ```

   Edit `frontend/.env` with your configuration:
   ```env
   # Backend API URL
   VITE_API_URL=http://localhost:3000

   # Supabase configuration (optional)
   # VITE_SUPABASE_URL=your-supabase-url
   # VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

## Development

### Running the Application

**Option 1: Run both frontend and backend together**
```bash
npm run dev
```

**Option 2: Run separately in different terminals**

Terminal 1 - Backend:
```bash
npm run dev:backend
# or
cd backend && npm run dev
```

Terminal 2 - Frontend:
```bash
npm run dev:frontend
# or
cd frontend && npm run dev
```

The frontend will be available at `http://localhost:5173` and the backend API at `http://localhost:3000`.

### Health Check

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "ok": true,
  "demoAuth": true
}
```

## Building for Production

### Build both frontend and backend
```bash
npm run build
```

### Build separately
```bash
# Build backend only
npm run build:backend

# Build frontend only
npm run build:frontend
```

### Running the production build
```bash
npm start
```

The production server will serve the frontend from `backend/public/` and run the API on port 3000.

## API Documentation

### REST Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/health` | Health check | No |
| POST | `/api/auctions` | Create a new auction | Yes |
| GET | `/api/auctions` | List all auctions | No |
| GET | `/api/auctions/:id` | Get auction details | No |
| GET | `/api/auctions/:id/bids` | Get auction bids | No |
| POST | `/api/auctions/:id/end` | End an auction | Yes (auctioneer only) |

### WebSocket API

Connect to `ws://localhost:3000/ws` (or your production URL).

#### Client → Server Messages

1. **Auth**: `{"type":"auth","token":"<jwt-token>"}` or `{"type":"auth","userId":"<id>","name":"<name>"}`
2. **Join**: `{"type":"join","auctionId":"<id>"}`
3. **Place Bid**: `{"type":"place_bid","amountPaise":15500,"clientBidId":"<uuid>"}`
4. **Leave**: `{"type":"leave"}`
5. **Ping**: `{"type":"ping"}`

#### Server → Client Messages

- `{"type":"authed"}` - Authentication successful
- `{"type":"snapshot","auction":{...},"bids":[...]}` - Initial state snapshot
- `{"type":"tick","auction":{...}}` - Countdown update
- `{"type":"auction_started","auction":{...}}` - Auction started
- `{"type":"bid_accepted","auction":{...},"bid":{...}}` - Bid accepted
- `{"type":"bid_result","auction":{...},"status":"accepted|rejected","reason":null|string}` - Bid result
- `{"type":"auction_ended","auction":{...}}` - Auction ended
- `{"type":"presence_count","participantCount":5}` - Current room participants
- `{"type":"error","error":"<error-code>"}` - Error message

## Auction Rules

1. **Countdown Phase**: Bidding is not allowed during the countdown period.
2. **Live Phase**: Bidding is open after countdown ends.
3. **Minimum Bid**: Each bid must be at least the current price plus the minimum increment (default ₹5).
4. **Seller Protection**: The auctioneer cannot bid on their own auction.
5. **Leader Protection**: The current leader cannot bid against themselves.
6. **Single Queue**: Bids are processed in server order for same-time bids.
7. **Rejected Bids**: Only the bidder receives notification of rejected bids.
8. **Room Capacity**: Maximum 100 participants per auction room.
9. **Auto-End**: Auction ends after 60 seconds with no higher bid (resets on each accepted bid).
10. **Duplicate Prevention**: Re-sending the same `clientBidId` returns the original result.

## Testing the Bid Flow

In a second terminal, with the server running:

```bash
cd backend
node scripts/test-bid.mjs
```

Expected: Create auction at ₹100, countdown 2 seconds, ₹150 accepted, ₹140 rejected, ₹155 accepted.

## Deployment

### Deploy Backend to Render

1. **Create a Render account** at [render.com](https://render.com)

2. **Create a new Web Service**:
   - Connect your GitHub repository
   - Set **Build Command**: `cd backend && npm install && npm run build`
   - Set **Start Command**: `cd backend && npm start`
   - Set **Environment**: `Node` (Node 20+)

3. **Configure Environment Variables** in Render:
   ```
   NODE_ENV=production
   ALLOW_DEMO_AUTH=false
   SUPABASE_URL=your-supabase-url
   SUPABASE_ANON_KEY=your-supabase-anon-key
   CORS_ORIGIN=https://your-cloudflare-pages-domain.pages.dev
   ```

4. **Set Up Database** (optional):
   - Create a Supabase project at [supabase.com](https://supabase.com)
   - Run the SQL from `backend/schema.sql`
   - Copy the database URL and API key to your environment variables

5. **Deploy**:
   - Click "Create Web Service"
   - Render will automatically build and deploy your backend

### Deploy Frontend to Cloudflare Pages

1. **Create a Cloudflare account** at [cloudflare.com](https://cloudflare.com)

2. **Create a new Pages project**:
   - Go to Workers & Pages → Create application → Pages
   - Connect to Git
   - Select your repository

3. **Configure Build Settings**:
   - **Production branch**: `main` (or your branch)
   - **Build command**: `cd frontend && npm run build`
   - **Build output directory**: `../backend/public`

4. **Configure Environment Variables** in Cloudflare Pages:
   ```
   VITE_API_URL=https://your-render-backend-url.onrender.com
   VITE_SUPABASE_URL=your-supabase-url (optional)
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key (optional)
   ```

5. **Set Up Custom Domain** (optional):
   - Go to Pages → Your Project → Custom Domains
   - Add your domain (e.g., `auction.yourdomain.com`)
   - Update DNS records as instructed

6. **Deploy**:
   - Click "Save and Deploy"
   - Cloudflare will automatically build and deploy your frontend

### Environment Variable Reference

#### Backend (.env)
| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | Environment mode (development/production) | No |
| `ALLOW_DEMO_AUTH` | Enable demo authentication | No |
| `SUPABASE_URL` | Supabase project URL | No |
| `SUPABASE_ANON_KEY` | Supabase anon key | No |
| `CORS_ORIGIN` | Frontend URL for CORS | Yes (production) |

#### Frontend (.env)
| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_API_URL` | Backend API URL | Yes |
| `VITE_SUPABASE_URL` | Supabase project URL | No |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key | No |

## Troubleshooting

### Port Already in Use

If port 3000 or 5173 is already in use, you can modify:
- Backend port in `backend/src/server.ts`
- Frontend port in `frontend/vite.config.ts`

### CORS Errors

Ensure `CORS_ORIGIN` in `backend/.env` matches your frontend URL exactly (including protocol).

### WebSocket Connection Failed

Verify the backend is running and accessible. Check that `VITE_API_URL` in `frontend/.env` points to the correct backend URL.

### Render Deployment Issues

- **Build fails**: Ensure `package.json` exists in `backend/` directory
- **App crashes**: Check environment variables are set correctly
- **CORS errors**: Update `CORS_ORIGIN` to include your Cloudflare Pages URL

### Cloudflare Pages Deployment Issues

- **Build fails**: Ensure `package.json` exists in `frontend/` directory
- **API not reachable**: Verify `VITE_API_URL` points to your Render backend
- **Auth not working**: Set up Supabase environment variables

## License

MIT
