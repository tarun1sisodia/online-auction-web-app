import { addBid, bidsFor, newId, type Auction, type Bid, type User } from "./store.js";

export const MAX_BID_PAISE = 1000000000;

interface SocketLike {
  send(data: string): void;
  readyState: number;
}

type SocketEntry = { socket: SocketLike; user: User };

export class Room {
  auction: Auction;
  sockets = new Map<object, SocketEntry>();
  private queue: Promise<unknown> = Promise.resolve();
  private countdownTimer: ReturnType<typeof setTimeout> | null = null;
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private seenBids = new Map<string, { status: string; reason: string | null }>();

  constructor(auction: Auction) {
    this.auction = auction;
    this.startCountdown();
  }

  snapshot() {
    const now = Date.now();
    const countdownLeft = this.auction.status === "countdown"
      ? Math.max(0, Math.ceil((new Date(this.auction.countdownEndsAt).getTime() - now) / 1000))
      : 0;
    const liveLeft = this.auction.status === "live" && this.auction.endsAt
      ? Math.max(0, Math.ceil((new Date(this.auction.endsAt).getTime() - now) / 1000))
      : null;
    return {
      ...this.auction,
      countdownLeftSeconds: countdownLeft,
      liveLeftSeconds: liveLeft,
      minNextBidPaise: this.auction.currentPricePaise + this.auction.minIncrementPaise,
      participantCount: this.sockets.size,
    };
  }

  join(socket: SocketLike, user: User): { ok: boolean; reason?: string } {
    if (this.sockets.size >= 100) return { ok: false, reason: "ROOM_FULL" };
    this.sockets.set(socket as object, { socket, user });
    this.send(socket, { type: "snapshot", auction: this.snapshot(), bids: bidsFor(this.auction.id) });
    this.broadcast({ type: "presence_count", participantCount: this.sockets.size });
    return { ok: true };
  }

  leave(socket: SocketLike): void {
    if (!this.sockets.delete(socket as object)) return;
    this.broadcast({ type: "presence_count", participantCount: this.sockets.size });
  }

  placeBid(user: User, amountPaise: number, clientBidId: string | null): Promise<{ status: string; reason: string | null }> {
    const run = this.queue.then(() => this.applyBid(user, amountPaise, clientBidId));
    this.queue = run.catch(() => undefined);
    return run;
  }

  end(requesterId: string): { ok: boolean; reason?: string } {
    if (requesterId !== this.auction.auctioneerId) return { ok: false, reason: "NOT_AUCTIONEER" };
    if (this.auction.status === "ended") return { ok: false, reason: "ALREADY_ENDED" };
    this.finish();
    return { ok: true };
  }

  private applyBid(user: User, amountPaise: number, clientBidId: string | null) {
    if (clientBidId) {
      const key = `${user.id}:${clientBidId}`;
      const seen = this.seenBids.get(key);
      if (seen) return seen;
    }
    const reject = (reason: string) => {
      const bid: Bid = {
        id: newId("bid"),
        auctionId: this.auction.id,
        bidderId: user.id,
        bidderName: user.name,
        amountPaise,
        status: "rejected",
        reason,
        clientBidId,
        createdAt: new Date().toISOString(),
      };
      addBid(bid);
      const result = { status: "rejected", reason };
      if (clientBidId) this.seenBids.set(`${user.id}:${clientBidId}`, result);
      return result;
    };
    if (this.auction.status !== "live") return reject("NOT_LIVE");
    if (user.id === this.auction.auctioneerId) return reject("SELLER_BID");
    if (user.id === this.auction.currentLeaderId) return reject("ALREADY_LEADER");
    if (!Number.isSafeInteger(amountPaise) || amountPaise <= 0) return reject("INVALID_AMOUNT");
    if (amountPaise > MAX_BID_PAISE) return reject("AMOUNT_TOO_LARGE");
    if (amountPaise < this.auction.currentPricePaise + this.auction.minIncrementPaise) return reject("BELOW_INCREMENT");

    this.auction.currentPricePaise = amountPaise;
    this.auction.currentLeaderId = user.id;
    this.auction.currentLeaderName = user.name;
    this.auction.version += 1;
    this.auction.updatedAt = new Date().toISOString();
    this.auction.endsAt = new Date(Date.now() + 60 * 1000).toISOString();
    const bid: Bid = {
      id: newId("bid"),
      auctionId: this.auction.id,
      bidderId: user.id,
      bidderName: user.name,
      amountPaise,
      status: "accepted",
      reason: null,
      clientBidId,
      createdAt: new Date().toISOString(),
    };
    addBid(bid);
    const result = { status: "accepted", reason: null };
    if (clientBidId) this.seenBids.set(`${user.id}:${clientBidId}`, result);
    this.resetIdleTimer();
    this.broadcast({ type: "bid_accepted", bid, auction: this.snapshot() });
    return result;
  }

  private startCountdown(): void {
    this.clearTimers();
    const delay = Math.max(0, new Date(this.auction.countdownEndsAt).getTime() - Date.now());
    this.countdownTimer = setTimeout(() => {
      if (this.auction.status !== "countdown") return;
      this.auction.status = "live";
      this.auction.endsAt = new Date(Date.now() + 60 * 1000).toISOString();
      this.auction.updatedAt = new Date().toISOString();
      this.broadcast({ type: "auction_started", auction: this.snapshot() });
      this.resetIdleTimer();
      this.startTicks();
    }, delay);
    this.startTicks();
  }

  private startTicks(): void {
    if (this.tickTimer) return;
    this.tickTimer = setInterval(() => {
      if (this.auction.status === "ended" || this.auction.status === "cancelled") {
        this.clearTimers();
        return;
      }
      this.broadcast({ type: "tick", auction: this.snapshot() });
    }, 1000);
  }

  private resetIdleTimer(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      if (this.auction.status === "live") this.finish();
    }, 60 * 1000);
  }

  private finish(): void {
    this.auction.status = "ended";
    this.auction.winnerId = this.auction.currentLeaderId;
    this.auction.finalPricePaise = this.auction.currentLeaderId ? this.auction.currentPricePaise : null;
    this.auction.updatedAt = new Date().toISOString();
    this.clearTimers();
    this.broadcast({ type: "auction_ended", auction: this.snapshot() });
  }

  private clearTimers(): void {
    if (this.countdownTimer) clearTimeout(this.countdownTimer);
    if (this.tickTimer) clearInterval(this.tickTimer);
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.countdownTimer = null;
    this.tickTimer = null;
    this.idleTimer = null;
  }

  private send(socket: SocketLike, payload: unknown): void {
    try {
      if (socket.readyState === 1) socket.send(JSON.stringify(payload));
    } catch {
      return;
    }
  }

  private broadcast(payload: unknown): void {
    for (const entry of this.sockets.values()) this.send(entry.socket, payload);
  }
}
