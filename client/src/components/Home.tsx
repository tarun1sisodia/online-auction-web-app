import { useEffect, useState } from "react";
import { apiUrl, createAuction, fetchAuctions, rs, type AppUser, type AuctionSnapshot } from "../api";

interface Props {
  user: AppUser;
  onOpen: (id: string) => void;
}

export default function Home({ user, onOpen }: Props) {
  const [auctions, setAuctions] = useState<AuctionSnapshot[]>([]);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [startRs, setStartRs] = useState("100");
  const [incrementRs, setIncrementRs] = useState("5");
  const [creating, setCreating] = useState(false);

  const load = async () => {
    try {
      setAuctions(await fetchAuctions());
      setError("");
    } catch {
      setError("Backend is not reachable yet. Start the server, then refresh.");
    }
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const auction = await createAuction(user, {
        title: title.trim(),
        startPricePaise: Math.round(Number(startRs) * 100),
        minIncrementPaise: Math.round(Number(incrementRs) * 100),
        countdownSeconds: 10,
      });
      onOpen(auction.id);
    } catch {
      setError("Could not create the auction. Check the backend and your login.");
    } finally {
      setCreating(false);
    }
  };

  const backendMismatch = apiUrl.includes("localhost") && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1";
  return (
    <section className="home">
      {backendMismatch && (
        <p className="notice">Backend URL is not set for this deployment. Set VITE_API_URL to your Render backend URL in Cloudflare Pages and redeploy, otherwise this page cannot reach the backend.</p>
      )}
      <div className="hero">
        <p className="mono">01 / LIVE AUCTION · ONE CIRCLE, ONE PRICE</p>
        <h1 className="hero-title"><span>LIVE</span> AUCTION</h1>
        <p className="hero-sub">I BUILD REAL SYSTEMS — AND THIS ONE BIDS IN REAL TIME. One auctioneer starts it, everyone else tries to beat the price in the middle.</p>
        <div className="hero-stats">
          <div><strong>{auctions.length}</strong><span>rooms open</span></div>
          <div><strong>100</strong><span>max per room</span></div>
          <div><strong>10s</strong><span>countdown</span></div>
          <div><strong>₹5</strong><span>min. step</span></div>
        </div>
      </div>

      <div className="marquee" aria-hidden="true">
        <div className="marquee-track">
          {Array.from({ length: 2 }).map((_, i) => (
            <span key={i}>LIVE BIDDING ◆ REAL TIME ◆ HIGHEST WINS ◆ ONE CIRCLE ◆ NO SECOND CHANCES ◆&nbsp;</span>
          ))}
        </div>
      </div>

      <div className="home-grid">
        <form className="card create-card" onSubmit={submit}>
          <h2>Start an auction</h2>
          <p className="muted">You become the auctioneer. Bidding opens after a 10-second countdown.</p>
          <label className="field"><span className="mono">ITEM TITLE</span><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Vintage watch, signed bat…" required /></label>
          <div className="field-row">
            <label className="field"><span className="mono">START PRICE (₹)</span><input type="number" min="1" value={startRs} onChange={(e) => setStartRs(e.target.value)} required /></label>
            <label className="field"><span className="mono">MIN. STEP (₹)</span><input type="number" min="1" value={incrementRs} onChange={(e) => setIncrementRs(e.target.value)} required /></label>
          </div>
          <button className="primary" disabled={creating}>{creating ? "CREATING…" : "CREATE & OPEN ROOM"}</button>
          {error && <p className="notice">{error}</p>}
        </form>

        <div>
          <div className="list-head">
            <h2>Open rooms</h2>
            <button className="text-button" onClick={load}>Refresh</button>
          </div>
          {auctions.length === 0 && <p className="muted">No rooms yet. Create the first one.</p>}
          <div className="auction-list">
            {auctions.map((auction) => (
              <article key={auction.id} className="auction-card" onClick={() => onOpen(auction.id)}>
                <div>
                  <h3>{auction.title}</h3>
                  <p className="muted">{auction.auctioneerName} · {auction.participantCount}/100 · {auction.status.toUpperCase()}</p>
                </div>
                <div className="card-price">
                  <strong>{rs(auction.currentPricePaise)}</strong>
                  <span>{auction.currentLeaderName ?? "No bids yet"}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
