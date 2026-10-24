export type AuctionStatus = "countdown" | "live" | "ended" | "cancelled";

export interface User {
  id: string;
  name: string;
  email?: string;
}

export interface Auction {
  id: string;
  auctioneerId: string;
  auctioneerName: string;
  title: string;
  startPricePaise: number;
  minIncrementPaise: number;
  currentPricePaise: number;
  currentLeaderId: string | null;
  currentLeaderName: string | null;
  status: AuctionStatus;
  countdownSeconds: number;
  countdownEndsAt: string;
  endsAt: string | null;
  winnerId: string | null;
  finalPricePaise: number | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface Bid {
  id: string;
  auctionId: string;
  bidderId: string;
  bidderName: string;
  amountPaise: number;
  status: "accepted" | "rejected";
  reason: string | null;
  clientBidId: string | null;
  createdAt: string;
}

export interface CreateAuctionInput {
  title: string;
  startPricePaise: number;
  minIncrementPaise: number;
  countdownSeconds: number;
}

let counter = 0;

export function newId(prefix: string): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export const auctions = new Map<string, Auction>();
export const bidsByAuction = new Map<string, Bid[]>();

export function createAuction(input: CreateAuctionInput, auctioneer: User): Auction {
  const now = new Date();
  const auction: Auction = {
    id: newId("auc"),
    auctioneerId: auctioneer.id,
    auctioneerName: auctioneer.name,
    title: input.title,
    startPricePaise: input.startPricePaise,
    minIncrementPaise: input.minIncrementPaise,
    currentPricePaise: input.startPricePaise,
    currentLeaderId: null,
    currentLeaderName: null,
    status: "countdown",
    countdownSeconds: input.countdownSeconds,
    countdownEndsAt: new Date(now.getTime() + input.countdownSeconds * 1000).toISOString(),
    endsAt: null,
    winnerId: null,
    finalPricePaise: null,
    version: 1,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  auctions.set(auction.id, auction);
  bidsByAuction.set(auction.id, []);
  return auction;
}

export function addBid(bid: Bid): void {
  const list = bidsByAuction.get(bid.auctionId) ?? [];
  list.push(bid);
  bidsByAuction.set(bid.auctionId, list);
}

export function bidsFor(auctionId: string): Bid[] {
  return [...(bidsByAuction.get(auctionId) ?? [])].reverse();
}
