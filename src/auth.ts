import type { User } from "./store.js";

export async function userFromToken(token: string): Promise<User | null> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (supabaseUrl && anonKey) {
    const res = await fetch(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: anonKey },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { id: string; email?: string; user_metadata?: { full_name?: string; name?: string } };
    return { id: data.id, name: data.user_metadata?.full_name ?? data.user_metadata?.name ?? data.email ?? "Bidder", email: data.email };
  }
  return null;
}

export async function userFromHeaders(headers: Record<string, string | string[] | undefined>): Promise<User | null> {
  const auth = headers.authorization;
  if (typeof auth === "string" && auth.startsWith("Bearer ")) {
    const user = await userFromToken(auth.slice(7));
    if (user) return user;
  }
  if (process.env.ALLOW_DEMO_AUTH === "true") {
    const id = headers["x-demo-user-id"];
    const name = headers["x-demo-user-name"];
    if (typeof id === "string" && id) return { id, name: typeof name === "string" && name ? name : id };
  }
  return null;
}

export function demoEnabled(): boolean {
  return process.env.ALLOW_DEMO_AUTH === "true";
}
