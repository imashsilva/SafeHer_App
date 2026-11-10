import { supabase } from "./supabase";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!API_BASE) throw new Error("NEXT_PUBLIC_API_BASE_URL is missing.");
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.access_token) throw new Error("Please sign in again.");
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${session.access_token}`);
  headers.set("Accept", "application/json");
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  let response: Response;
  try {
    response = await fetch(`${API_BASE.replace(/\/$/, "")}${path}`, { ...options, headers, cache: "no-store" });
  } catch {
    throw new Error("Cannot reach FastAPI. Check that the backend is running and CORS is configured.");
  }
  const result: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) throw new Error("Supabase session rejected by FastAPI (401). Compare both projects' URLs and anon keys, then sign out and sign in again.");
    const detail = result && typeof result === "object" && "detail" in result ? (result as { detail?: unknown }).detail : undefined;
    throw new Error(typeof detail === "string" ? detail : `API request failed (${response.status}).`);
  }
  return result as T;
}
