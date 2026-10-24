# Online Auction System — backend scaffold

Backend only, built fresh per the PRD. The existing MERN repo is reference only and is not forked here.

Stack: Node 20+, TypeScript, Fastify, WebSocket, in-memory rooms. Supabase Postgres schema is in `schema.sql` for the next step. Persistence is not wired in yet, so data resets on restart.

## Run

```bash
cp .env.example .env
npm install
npm run dev
```

Health check: `GET http://localhost:3000/health`

Demo auth is on only when `ALLOW_DEMO_AUTH=true` in `.env`. That is for local testing only. Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` to use real Google login tokens instead, and turn demo auth off.

## Test the bid flow

In a second terminal, with the server running:

```bash
node scripts/test-bid.mjs
```

Expected: create at Rs 100, countdown 2 seconds, Rs 150 accepted, Rs 140 rejected, Rs 155 accepted.

## REST

- `POST /api/auctions` — auth required, body: `title`, `startPricePaise`, optional `minIncrementPaise` (default 500), optional `countdownSeconds` (default 10)
- `GET /api/auctions`
- `GET /api/auctions/:id`
- `GET /api/auctions/:id/bids`
- `POST /api/auctions/:id/end` — auctioneer only

## WebSocket

Connect to `GET /ws`, then send JSON messages in order:

1. `{"type":"auth","token":"<supabase-jwt>"}` or, in demo mode only, `{"type":"auth","userId":"bidder-1","name":"Asha"}`
2. `{"type":"join","auctionId":"<id>"}`
3. `{"type":"place_bid","amountPaise":15500,"clientBidId":"<uuid>"}`
4. `{"type":"leave"}`

Server replies: `snapshot`, `tick`, `auction_started`, `bid_accepted`, `bid_result`, `auction_ended`, `presence_count`, `error`.

## Rules implemented

- Countdown first, no bids in countdown. Live after countdown.
- A bid must be at least current price plus minimum increment, default Rs 5.
- Auctioneer cannot bid on their own auction. Current leader cannot bid against themselves.
- One bid queue per auction, so same-time bids are decided in server order.
- Rejected bids go only to that bidder, never as a winner bubble.
- Live room cap is 100 sockets. The 101st gets `ROOM_FULL`.
- Auction ends on auctioneer End, or after 60 seconds with no higher bid. Each accepted bid resets that 60-second timer.
- Resending the same `clientBidId` returns the original result, it does not place a second bid.

## Still to do

- Wire `schema.sql` into Postgres via Supabase and replace the in-memory store.
- Frontend circle room on Cloudflare Pages.
- Render deployment config.
