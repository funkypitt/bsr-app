import * as SecureStore from "expo-secure-store";
import type {
  AuthTokens,
  Book,
  Loan,
  OPDSFeed,
  OPDSLink,
  OPDSPublication,
} from "../types";

const BASE = "https://lausanne.ebibliomedia.ch";
const API = `${BASE}/v1`;

let tokens: AuthTokens | null = null;

function headers(): Record<string, string> {
  const h: Record<string, string> = {
    Accept: "application/opds+json, application/json",
  };
  if (tokens) h["Authorization"] = `Bearer ${tokens.access_token}`;
  return h;
}

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: headers() });
  if (res.status === 401) {
    const refreshed = await refreshToken();
    if (refreshed) {
      const retry = await fetch(url, { headers: headers() });
      if (!retry.ok) throw new Error(`HTTP ${retry.status}`);
      return retry.json();
    }
    throw new Error("Session expired");
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// --- Auth ---

export async function login(
  username: string,
  password: string
): Promise<boolean> {
  const res = await fetch(`${BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "password",
      username,
      password,
    }).toString(),
  });
  if (!res.ok) return false;
  tokens = await res.json();
  if (tokens) {
    await SecureStore.setItemAsync("auth_tokens", JSON.stringify(tokens));
  }
  return true;
}

async function refreshToken(): Promise<boolean> {
  if (!tokens?.refresh_token) return false;
  try {
    const res = await fetch(`${BASE}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: tokens.refresh_token,
      }).toString(),
    });
    if (!res.ok) return false;
    tokens = await res.json();
    if (tokens) {
      await SecureStore.setItemAsync("auth_tokens", JSON.stringify(tokens));
    }
    return true;
  } catch {
    return false;
  }
}

export async function restoreSession(): Promise<boolean> {
  try {
    const stored = await SecureStore.getItemAsync("auth_tokens");
    if (!stored) return false;
    tokens = JSON.parse(stored);
    const res = await fetch(`${API}/my_profile.opds2`, { headers: headers() });
    if (res.ok) return true;
    return refreshToken();
  } catch {
    return false;
  }
}

export async function logout(): Promise<void> {
  tokens = null;
  await SecureStore.deleteItemAsync("auth_tokens");
}

export function isAuthenticated(): boolean {
  return tokens !== null;
}

// --- Helpers ---

function extractId(links: OPDSLink[]): string {
  for (const l of links) {
    if (l.rel === "alternate" || l.rel === "self") {
      const m = l.href?.match(/resources\/([a-f0-9]+)/);
      if (m) return m[1];
    }
  }
  return "";
}

export function pubToBook(pub: OPDSPublication): Book {
  const m = pub.metadata;
  const links = pub.links ?? [];

  // Stream link: text/html with drm=none (only available for active loans)
  const streamLink = links.find(
    (l) =>
      l.rel?.includes("acquisition") &&
      l.type === "text/html" &&
      l.href?.includes("drm=none")
  );

  const sampleLink = links.find((l) => l.rel?.includes("sample"));

  // Borrow link: rel contains "borrow"
  const borrowLink = links.find((l) => l.rel?.includes("borrow"));

  // Return/revoke link: rel contains "revoke"
  const revokeLink = links.find((l) => l.rel?.includes("revoke"));

  const progressionLink = links.find((l) =>
    l.rel?.includes("progression")
  );

  // Get availability from any acquisition link
  const availability =
    streamLink?.properties?.availability ??
    borrowLink?.properties?.availability ??
    links.find((l) => l.properties?.availability)?.properties?.availability;

  return {
    id: extractId(links) || m.identifier || "",
    title: m.title || "",
    author: m.author?.map((a) => a.name).join(", ") ?? "",
    narrator: m.narrator?.map((n) => n.name).join(", ") ?? "",
    duration: m.duration ?? 0,
    coverUrl: pub.images?.[0]?.href ?? "",
    description: m.description ?? "",
    isAudiobook: m["@type"]?.includes("Audiobook") ?? false,
    subjects: m.subject?.map((s) => s.name) ?? [],
    publishedDate: m.published ?? "",
    streamUrl: streamLink?.href ?? "",
    sampleUrl: sampleLink?.href ?? "",
    borrowUrl: borrowLink?.href ?? "",
    returnUrl: revokeLink?.href ?? "",
    progressionUrl: progressionLink?.href ?? "",
    availability: availability
      ? { state: availability.state, until: availability.until }
      : undefined,
  };
}

// --- Catalog ---

export async function search(
  query: string,
  audioOnly = false
): Promise<Book[]> {
  let url = `${API}/resources.opds2?query=${encodeURIComponent(query)}`;
  if (audioOnly) url += "&formats%5B%5D=audiobook";
  const feed = await fetchJSON<OPDSFeed>(url);
  return (feed.publications ?? []).map(pubToBook);
}

export async function getBook(id: string): Promise<Book | null> {
  try {
    const pub = await fetchJSON<OPDSPublication>(
      `${API}/resources/${id}.opds2`
    );
    return pubToBook(pub);
  } catch {
    return null;
  }
}

// --- Loans ---

export async function getLoans(): Promise<Loan[]> {
  const feed = await fetchJSON<OPDSFeed>(
    `${API}/my_profile/activity.opds2`
  );
  const loans: Loan[] = [];
  for (const group of feed.groups ?? []) {
    for (const pub of group.publications ?? []) {
      const book = pubToBook(pub);
      // Include all loans (audiobooks), even without stream URL yet
      const acqLink = pub.links?.find(
        (l) => l.properties?.availability?.until
      );
      loans.push({
        ...book,
        loanUntil: acqLink?.properties?.availability?.until ?? "",
        streamUrl: book.streamUrl,
      });
    }
  }
  return loans;
}

export async function borrowBook(borrowUrl: string): Promise<boolean> {
  try {
    const res = await fetch(borrowUrl, {
      method: "POST",
      headers: headers(),
    });
    return res.ok || res.status === 201 || res.status === 302;
  } catch {
    return false;
  }
}

export async function returnBook(returnUrl: string): Promise<boolean> {
  try {
    const res = await fetch(returnUrl, {
      method: "PUT",
      headers: headers(),
    });
    return res.ok || res.status === 204;
  } catch {
    return false;
  }
}

// --- Progression ---

export async function getProgression(
  resourceId: string
): Promise<number | null> {
  try {
    const data = await fetchJSON<{ position?: number }>(
      `${API}/resources/${resourceId}/progression.opds2`
    );
    return data.position ?? null;
  } catch {
    return null;
  }
}

export async function saveProgression(
  resourceId: string,
  position: number
): Promise<void> {
  try {
    await fetch(`${API}/resources/${resourceId}/progression.opds2`, {
      method: "PUT",
      headers: { ...headers(), "Content-Type": "application/json" },
      body: JSON.stringify({ position }),
    });
  } catch {
    // Silently fail - local storage is primary
  }
}
