import { useEffect, useMemo, useRef, useState } from "react";
import { endAuction, reasonText, rs, wsUrl, type AppUser, type AuctionSnapshot, type BidItem } from "../api";

interface Props {
  auctionId: string;
  user: AppUser;
  onBack: () => void;
}

export default function Room({ auctionId, user, onBack }: Props) {
  const [auction, setAuction] = useState<AuctionSnapshot | null>(null);
  const [bids, setBids] = useState<BidItem[]>([]);
  const [amount, setAmount] = useState("");
  const [amountEdited, setAmountEdited] = useState(false);
  const [notice, setNotice] = useState("");
  const [connected, setConnected] = useState(false);
  const [priceKey, setPriceKey] = useState(0);
  const [burstKey, setBurstKey] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef(0);
  const magnetRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    let closed = false;
    let timer: ReturnType<typeof setTimeout>;
    const connect = () => {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.onopen = () => {
        if (user.token) ws.send(JSON.stringify({ type: "auth", token: user.token }));
        else ws.send(JSON.stringify({ type: "auth", userId: user.id, name: user.name }));
      };
      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === "authed") {
          setConnected(true);
          reconnectRef.current = 0;
          ws.send(JSON.stringify({ type: "join", auctionId }));
        }
        if (msg.type === "snapshot") {
          setAuction(msg.auction);
          setBids(msg.bids ?? []);
          if (!amountEdited) setAmount(String(msg.auction.minNextBidPaise / 100));
        }
        if (msg.type === "tick" || msg.type === "auction_started" || msg.type === "auction_ended") {
          setAuction(msg.auction);
        }
        if (msg.type === "bid_accepted") {
          setAuction(msg.auction);
          setBids((old) => [msg.bid, ...old].slice(0, 30));
          setPriceKey((k) => k + 1);
          setBurstKey((k) => k + 1);
          setAmount(String(msg.auction.minNextBidPaise / 100));
          setAmountEdited(false);
        }
        if (msg.type === "bid_result") {
          setAuction(msg.auction);
          if (msg.status === "rejected") setNotice(reasonText(msg.reason));
          else setNotice("");
        }
        if (msg.type === "presence_count") {
          setAuction((old) => (old ? { ...old, participantCount: msg.participantCount } : old));
        }
        if (msg.type === "error") setNotice(reasonText(msg.error));
      };
      ws.onclose = () => {
        setConnected(false);
        if (!closed) {
          reconnectRef.current += 1;
          timer = setTimeout(connect, Math.min(3000, 500 * reconnectRef.current));
        }
      };
    };
    connect();
    return () => {
      closed = true;
      clearTimeout(timer);
      wsRef.current?.close();
    };
  }, [auctionId, user]);

  const orbitBids = useMemo(() => bids.filter((b) => b.status === "accepted").slice(0, 8), [bids]);
  const isAuctioneer = auction?.auctioneerId === user.id;
  const isLeader = auction?.currentLeaderId === user.id;
  const minNext = auction?.minNextBidPaise ?? 0;
  const amountPaise = Math.round((Number(amount) || 0) * 100);
  const canBid = !!auction && auction.status === "live" && !isAuctioneer && !isLeader && amountPaise >= minNext;
  const ringTotal = auction?.status === "countdown" ? auction.countdownSeconds : 60;
  const ringLeft = auction?.status === "countdown" ? auction.countdownLeftSeconds : auction?.liveLeftSeconds ?? 0;
  const ringPct = ringTotal > 0 ? Math.max(0, Math.min(1, ringLeft / ringTotal)) : 0;
  const ringDash = 2 * Math.PI * 158;

  const placeBid = () => {
    if (!canBid || !wsRef.current) return;
    const clientBidId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    wsRef.current.send(JSON.stringify({ type: "place_bid", amountPaise, clientBidId }));
  };

  const onMagnet = (e: React.MouseEvent<HTMLButtonElement>) => {
    const el = magnetRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - (rect.left + rect.width / 2);
    const y = e.clientY - (rect.top + rect.height / 2);
    el.style.transform = `translate(${x * 0.12}px, ${y * 0.12}px)`;
  };

  if (!auction) return <div className="room-loading">Connecting to the room…</div>;

  return (
    <section className="room">
      <button className="back" onClick={onBack}>← All auctions</button>
      <div className="room-head">
        <div>
          <p className="mono">01 / LIVE ROOM · {connected ? "CONNECTED" : "RECONNECTING…"}</p>
          <h1 className="room-title">{auction.title}</h1>
          <p className="muted">Auctioneer {auction.auctioneerName} · {auction.participantCount}/100 in the room</p>
        </div>
        <span className={`status status-${auction.status}`}>{auction.status.toUpperCase()}</span>
      </div>

      <div className="circle-stage">
        <div className="earth" key={burstKey}>
          <svg className="ring" viewBox="0 0 360 360" aria-hidden="true">
            <circle cx="180" cy="180" r="158" className="ring-track" />
            <circle cx="180" cy="180" r="158" className="ring-progress" strokeDasharray={ringDash} strokeDashoffset={ringDash * (1 - ringPct)} />
          </svg>
          <div className="earth-globe" />
          {orbitBids.map((bid, i) => {
            const angle = (i / Math.max(orbitBids.length, 1)) * Math.PI * 2 - Math.PI / 2;
            const left = 50 + Math.cos(angle) * 48;
            const top = 50 + Math.sin(angle) * 48;
            return (
              <div key={bid.id} className={`orbit-bubble ${i === 0 ? "latest" : ""}`} style={{ left: `${left}%`, top: `${top}%` }}>
                <strong>{rs(bid.amountPaise)}</strong>
                <span>{bid.bidderName.slice(0, 2).toUpperCase()}</span>
              </div>
            );
          })}
          {burstKey > 0 && (
            <div className="dust" aria-hidden="true">
              {Array.from({ length: 10 }).map((_, i) => (
                <span key={i} style={{ "--dx": `${Math.cos((i / 10) * Math.PI * 2) * 90}px`, "--dy": `${Math.sin((i / 10) * Math.PI * 2) * 90}px` } as React.CSSProperties} />
              ))}
            </div>
          )}
          <div className="centre" key={priceKey}>
            <span className="mono centre-label">{auction.status === "countdown" ? "BIDDING STARTS IN" : auction.status === "live" ? "CURRENT PRICE" : "WINNING PRICE"}</span>
            <strong className="centre-price">{rs(auction.currentPricePaise)}</strong>
            <span className="centre-sub">
              {auction.status === "countdown" ? `${auction.countdownLeftSeconds}s` : auction.status === "live" ? `${auction.liveLeftSeconds ?? 0}s left · ${auction.currentLeaderName ?? "No bids yet"}` : auction.currentLeaderName ? `Winner: ${auction.currentLeaderName}` : "No bids"}
            </span>
          </div>
        </div>
      </div>

      <div className="bid-panel">
        <div className="bid-row">
          <label className="field">
            <span className="mono">YOUR BID (₹)</span>
            <input
              type="number"
              min={minNext / 100}
              step="1"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setAmountEdited(true); }}
              disabled={auction.status !== "live"}
            />
          </label>
          <div className="quick">
            {[5, 10, 50].map((v) => (
              <button key={v} type="button" onClick={() => { setAmount(String((auction.currentPricePaise / 100) + v)); setAmountEdited(true); }}>+₹{v}</button>
            ))}
          </div>
        </div>
        <p className="muted">Minimum next bid is {rs(minNext)}. {isLeader ? "You are leading right now." : isAuctioneer ? "You are the auctioneer." : ""}</p>
        <button
          ref={magnetRef}
          className="bid-button"
          disabled={!canBid}
          onMouseMove={onMagnet}
          onMouseLeave={() => { if (magnetRef.current) magnetRef.current.style.transform = ""; }}
          onClick={placeBid}
        >
          {auction.status === "countdown" ? `WAIT ${auction.countdownLeftSeconds}s` : auction.status === "ended" ? "AUCTION ENDED" : "PLACE BID"}
        </button>
        {notice && <p className="notice">{notice}</p>}
        {isAuctioneer && auction.status !== "ended" && (
          <button className="end-button" onClick={async () => { try { setAuction(await endAuction(user, auction.id)); } catch { setNotice("Could not end the auction."); } }}>
            End auction now
          </button>
        )}
      </div>

      <div className="feed">
        <h2 className="mono">BID FEED</h2>
        {bids.length === 0 && <p className="muted">No bids yet. Be the first after the countdown.</p>}
        {bids.map((bid) => (
          <div key={bid.id} className={`feed-item ${bid.status}`}>
            <strong>{rs(bid.amountPaise)}</strong>
            <span>{bid.bidderName}</span>
            <span className="mono">{bid.status === "accepted" ? "ACCEPTED" : `REJECTED · ${bid.reason ?? ""}`}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
