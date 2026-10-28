import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import { MAX_BID_PAISE, Room } from "./room.js";
import { auctions, bidsFor, createAuction, type User } from "./store.js";
import { demoEnabled, userFromHeaders, userFromToken } from "./auth.js";

const app = Fastify({ logger: true });
await app.register(cors, { origin: process.env.CORS_ORIGIN ?? "http://localhost:5173" });
await app.register(websocket);

const rooms = new Map<string, Room>();

function getRoom(id: string): Room | null {
  const auction = auctions.get(id);
  if (!auction) return null;
  let room = rooms.get(id);
  if (!room) {
    room = new Room(auction);
    rooms.set(id, room);
  }
  return room;
}

function positiveInt(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : fallback;
}

app.get("/health", async () => ({ ok: true, demoAuth: demoEnabled() }));

app.post("/api/auctions", async (req, reply) => {
  const user = await userFromHeaders(req.headers);
  if (!user) return reply.code(401).send({ error: "UNAUTHORIZED" });
  const body = (req.body ?? {}) as Record<string, unknown>;
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const startPricePaise = positiveInt(body.startPricePaise, 0);
  const minIncrementPaise = positiveInt(body.minIncrementPaise, 500);
  if (!title || !startPricePaise || startPricePaise > MAX_BID_PAISE || minIncrementPaise > MAX_BID_PAISE) return reply.code(400).send({ error: "INVALID_INPUT" });
  const auction = createAuction(
    {
      title,
      startPricePaise,
      minIncrementPaise,
      countdownSeconds: positiveInt(body.countdownSeconds, 10),
    },
    user,
  );
  const room = getRoom(auction.id);
  return reply.code(201).send({ auction: room?.snapshot() ?? auction });
});

app.get("/api/auctions", async () => {
  return { auctions: [...auctions.values()].map((auction) => getRoom(auction.id)?.snapshot() ?? auction) };
});

app.get("/api/auctions/:id", async (req, reply) => {
  const room = getRoom((req.params as { id: string }).id);
  if (!room) return reply.code(404).send({ error: "NOT_FOUND" });
  return { auction: room.snapshot() };
});

app.get("/api/auctions/:id/bids", async (req, reply) => {
  const id = (req.params as { id: string }).id;
  if (!auctions.get(id)) return reply.code(404).send({ error: "NOT_FOUND" });
  return { bids: bidsFor(id) };
});

app.post("/api/auctions/:id/end", async (req, reply) => {
  const user = await userFromHeaders(req.headers);
  if (!user) return reply.code(401).send({ error: "UNAUTHORIZED" });
  const room = getRoom((req.params as { id: string }).id);
  if (!room) return reply.code(404).send({ error: "NOT_FOUND" });
  const result = room.end(user.id);
  if (!result.ok) return reply.code(403).send({ error: result.reason });
  return { auction: room.snapshot() };
});

app.get("/ws", { websocket: true }, (socket) => {
  let user: User | null = null;
  let room: Room | null = null;
  let authed = false;
  const authTimer = setTimeout(() => {
    if (!authed) {
      try {
        socket.close(4401, "auth required");
      } catch {
        return;
      }
    }
  }, 5000);

  socket.on("message", async (raw: Buffer) => {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(raw.toString()) as Record<string, unknown>;
    } catch {
      socket.send(JSON.stringify({ type: "error", error: "INVALID_JSON" }));
      return;
    }
    if (msg.type === "ping") {
      socket.send(JSON.stringify({ type: "pong" }));
      return;
    }
    if (msg.type === "auth") {
      if (typeof msg.token === "string") user = await userFromToken(msg.token);
      if (!user && demoEnabled() && typeof msg.userId === "string") {
        user = { id: msg.userId, name: typeof msg.name === "string" ? msg.name : msg.userId };
      }
      if (!user) {
        socket.send(JSON.stringify({ type: "error", error: "UNAUTHORIZED" }));
        return;
      }
      authed = true;
      clearTimeout(authTimer);
      socket.send(JSON.stringify({ type: "authed", user }));
      return;
    }
    if (!authed || !user) {
      socket.send(JSON.stringify({ type: "error", error: "UNAUTHORIZED" }));
      return;
    }
    if (msg.type === "join" && typeof msg.auctionId === "string") {
      const next = getRoom(msg.auctionId);
      if (!next) {
        socket.send(JSON.stringify({ type: "error", error: "NOT_FOUND" }));
        return;
      }
      if (room) room.leave(socket as never);
      room = next;
      const joined = room.join(socket as never, user);
      if (!joined.ok) {
        socket.send(JSON.stringify({ type: "error", error: joined.reason }));
        room = null;
      }
      return;
    }
    if (msg.type === "leave") {
      if (room) room.leave(socket as never);
      room = null;
      return;
    }
    if (msg.type === "place_bid" && room) {
      const amount = typeof msg.amountPaise === "number" ? msg.amountPaise : NaN;
      const clientBidId = typeof msg.clientBidId === "string" ? msg.clientBidId : null;
      const result = await room.placeBid(user, amount, clientBidId);
      socket.send(JSON.stringify({ type: "bid_result", ...result, auction: room.snapshot() }));
      return;
    }
  });

  socket.on("close", () => {
    clearTimeout(authTimer);
    if (room) room.leave(socket as never);
  });
});

const port = Number(process.env.PORT ?? 3000);
await app.listen({ port, host: "0.0.0.0" });
