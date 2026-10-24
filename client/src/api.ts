import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface AppUser {
  id: string;
  name: string;
  token?: string;
  demo: boolean;
}

export interface AuctionSnapshot {
  id: string;
  auctioneerId: string;
  auctioneerName: string;
  title: string;
  startPricePaise: number;
  minIncrementPaise: number;
  currentPricePaise: number;
  currentLeaderId: string | null;
  currentLeaderName: string | null;
  status: "countdown" | "live" | "ended" | "cancelled";
  countdownSeconds: number;
  countdownEndsAt: string;
  endsAt: string | null;
  winnerId: string | null;
  finalPricePaise: number | null;
  version: number;
  countdownLeftSeconds: number;
  liveLeftSeconds: number | null;
  minNextBidPaise: number;
  participantCount: number;
}

export interface BidItem {
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

export const apiUrl = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:3000";
export const wsUrl = apiUrl.replace(/^http/, "ws") + "/ws";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const supabase: SupabaseClient | null = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export function rs(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function authHeaders(user: AppUser | null): Record<string, string> {
  if (!user) return {};
  if (user.token) return { Authorization: `Bearer ${user.token}` };
  return { "x-demo-user-id": user.id, "x-demo-user-name": user.name };
}

export async function fetchAuctions(): Promise<AuctionSnapshot[]> {
  const res = await fetch(`${apiUrl}/api/auctions`);
  if (!res.ok) throw new Error("Could not load auctions");
  const data = await res.json();
  return data.auctions as AuctionSnapshot[];
}

export async function createAuction(user: AppUser, input: { title: string; startPricePaise: number; minIncrementPaise: number; countdownSeconds: number }): Promise<AuctionSnapshot> {
  const res = await fetch(`${apiUrl}/api/auctions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(user) },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Could not create auction");
  const data = await res.json();
  return data.auction as AuctionSnapshot;
}

export async function endAuction(user: AppUser, id: string): Promise<AuctionSnapshot> {
  const res = await fetch(`${apiUrl}/api/auctions/${id}/end`, {
    method: "POST",
    headers: authHeaders(user),
  });
  if (!res.ok) throw new Error("Only the auctioneer can end this auction");
  const data = await res.json();
  return data.auction as AuctionSnapshot;
}

export function reasonText(reason: string | null): string {
  switch (reason) {
    case "NOT_LIVE":
      return "Bidding is not open yet, or this auction has ended.";
    case "SELLER_BID":
      return "The auctioneer cannot bid on their own auction.";
    case "ALREADY_LEADER":
      return "You are already leading. Wait for someone to outbid you.";
    case "BELOW_INCREMENT":
      return "Too low. Bid at least the minimum next bid.";
    case "ROOM_FULL":
      return "This room is full at 100 people.";
    case "INVALID_AMOUNT":
      return "Enter a valid amount.";
    default:
      return reason ?? "Bid rejected.";
  }
}
