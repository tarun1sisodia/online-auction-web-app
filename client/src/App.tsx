import { useEffect, useState } from "react";
import Home from "./components/Home";
import Room from "./components/Room";
import { supabase, type AppUser } from "./api";
import "./styles.css";

function roomIdFromHash(): string | null {
  const match = window.location.hash.match(/^#\/room\/(.+)$/);
  return match ? match[1] : null;
}

export default function App() {
  const [user, setUser] = useState<AppUser | null>(() => {
    try {
      const saved = localStorage.getItem("auction-demo-user");
      return saved ? (JSON.parse(saved) as AppUser) : null;
    } catch {
      return null;
    }
  });
  const [name, setName] = useState("");
  const [roomId, setRoomId] = useState<string | null>(roomIdFromHash);
  const [theme, setTheme] = useState(() => document.documentElement.getAttribute("data-theme") ?? "dark");
  const [motion, setMotion] = useState(() => !document.documentElement.classList.contains("no-motion"));
  const [loading, setLoading] = useState(true);
  const [authNote, setAuthNote] = useState("");

  useEffect(() => {
    const onHash = () => setRoomId(roomIdFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      const session = data.session;
      if (session) {
        setUser({ id: session.user.id, name: session.user.user_metadata?.full_name ?? session.user.email ?? "Bidder", token: session.access_token, demo: false });
      }
    });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), motion ? 900 : 0);
    return () => clearTimeout(timer);
  }, [motion]);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("auction-theme", next);
  };

  const toggleMotion = () => {
    const next = !motion;
    setMotion(next);
    document.documentElement.classList.toggle("no-motion", !next);
    localStorage.setItem("auction-motion", next ? "on" : "off");
    setLoading(false);
  };

  const signInDemo = () => {
    const clean = name.trim();
    if (!clean) return;
    const demo: AppUser = { id: `demo-${clean.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Math.random().toString(36).slice(2, 6)}`, name: clean, demo: true };
    setUser(demo);
    localStorage.setItem("auction-demo-user", JSON.stringify(demo));
  };

  const signInGoogle = async () => {
    if (!supabase) {
      setAuthNote("Google login needs Supabase. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then rebuild. Demo login works for now.");
      return;
    }
    await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
  };

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    localStorage.removeItem("auction-demo-user");
  };

  const openRoom = (id: string) => {
    window.location.hash = `#/room/${id}`;
    setRoomId(id);
  };

  if (loading) {
    return (
      <div className="loader" role="status" aria-label="Loading live auction">
        <p className="mono">LIVE AUCTION // CONNECTING</p>
        <div className="loader-bar"><span /></div>
        <p className="muted">One circle. One price. Highest wins.</p>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <button className="theme-pill" onClick={toggleTheme}>{theme === "dark" ? "☀ LIGHT" : "● DARK"}</button>
        <a className="brand" href="#/" onClick={() => setRoomId(null)}>AUCTION<span>·LIVE</span></a>
        <div className="top-actions">
          {user ? (
            <>
              <span className="user-chip">{user.name}</span>
              <button className="text-button" onClick={signOut}>Sign out</button>
            </>
          ) : (
            <span className="mono">NOT SIGNED IN</span>
          )}
        </div>
      </header>

      {!user ? (
        <section className="signin">
          <p className="mono">02 / SIGN IN TO BID</p>
          <h1>Your name,<br />then the circle.</h1>
          <p className="muted">Google login is the real path in the PRD. Demo login is only for testing this frontend against the local backend.</p>
          <div className="signin-row">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name, e.g. Asha" onKeyDown={(e) => { if (e.key === "Enter") signInDemo(); }} />
            <button className="primary" onClick={signInDemo}>Continue as demo bidder</button>
          </div>
          <button className="google-button" onClick={signInGoogle}>Sign in with Google</button>
          {authNote && <p className="notice">{authNote}</p>}
        </section>
      ) : roomId ? (
        <Room auctionId={roomId} user={user} onBack={() => { window.location.hash = "#/"; setRoomId(null); }} />
      ) : (
        <Home user={user} onOpen={openRoom} />
      )}

      <button className="motion-toggle" onClick={toggleMotion}>{motion ? "MOTION: ON" : "MOTION: OFF"}</button>
      <footer className="footer">
        <span className="mono">BUILT FRESH PER PRD · RENDER + CLOUDFLARE PAGES · SUPABASE GOOGLE LOGIN</span>
        <span>@tarun1sisodia — everywhere</span>
      </footer>
    </div>
  );
}
