"use client";

import { create } from "zustand";

export interface AuthUser {
  id: string;
  login: string;
  name: string;
}

type Mode = "server" | "local";

interface AuthState {
  status: "loading" | "anon" | "authed";
  mode: Mode;
  user: AuthUser | null;
  init: () => Promise<void>;
  login: (login: string, password: string) => Promise<string | null>;
  register: (login: string, name: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
}

// ---- Lokal rejim (server yo‘q, masalan statik ko‘rinish) ----------------------------
// Akkauntlar shu brauzerda saqlanadi; parol PBKDF2 bilan xeshlanadi.
const ACCOUNTS = "hamida-accounts";
const LOCAL_SESSION = "hamida-local-session";

type LocalAccount = { id: string; name: string; salt: string; hash: string };

const ls = {
  get<T>(k: string, fallback: T): T {
    try {
      const v = localStorage.getItem(k);
      return v ? (JSON.parse(v) as T) : fallback;
    } catch {
      return fallback;
    }
  },
  set(k: string, v: unknown) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {
      /* saqlash imkonsiz */
    }
  },
  del(k: string) {
    try {
      localStorage.removeItem(k);
    } catch {
      /* */
    }
  },
};

const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");

async function pbkdf2(password: string, salt: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: new TextEncoder().encode(salt), iterations: 150_000, hash: "SHA-256" }, key, 256);
  return hex(bits);
}

const LOGIN_RE = /^[a-z0-9_.-]{3,32}$/;

function validate(login: string, password: string) {
  if (!LOGIN_RE.test(login)) return "Login 3-32 ta lotin harfi, raqam yoki . _ - belgilaridan iborat bo‘lsin.";
  if (password.length < 8) return "Parol kamida 8 belgidan iborat bo‘lsin.";
  return null;
}

async function api(path: string, body?: unknown) {
  const res = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = (await res.json()) as { user?: AuthUser | null; error?: string };
  return { ok: res.ok, ...json };
}

export const useAuth = create<AuthState>()((set, get) => ({
  status: "loading",
  mode: "server",
  user: null,

  init: async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (!res.ok || !res.headers.get("content-type")?.includes("json")) throw new Error("no server");
      const { user } = (await res.json()) as { user: AuthUser | null };
      set({ mode: "server", user, status: user ? "authed" : "anon" });
    } catch {
      const login = ls.get<string | null>(LOCAL_SESSION, null);
      const acc = login ? ls.get<Record<string, LocalAccount>>(ACCOUNTS, {})[login] : undefined;
      set({ mode: "local", user: acc && login ? { id: acc.id, login, name: acc.name } : null, status: acc ? "authed" : "anon" });
    }
  },

  login: async (login, password) => {
    const l = login.trim().toLowerCase();
    if (get().mode === "server") {
      const r = await api("/api/auth/login", { login: l, password }).catch(() => ({ ok: false, error: "Server bilan aloqa yo‘q.", user: null }));
      if (!r.ok || !r.user) return r.error ?? "Kirib bo‘lmadi.";
      set({ user: r.user, status: "authed" });
      return null;
    }
    const acc = ls.get<Record<string, LocalAccount>>(ACCOUNTS, {})[l];
    if (!acc || (await pbkdf2(password, acc.salt)) !== acc.hash) return "Login yoki parol noto‘g‘ri.";
    ls.set(LOCAL_SESSION, l);
    set({ user: { id: acc.id, login: l, name: acc.name }, status: "authed" });
    return null;
  },

  register: async (login, name, password) => {
    const l = login.trim().toLowerCase();
    const err = validate(l, password);
    if (err) return err;
    if (get().mode === "server") {
      const r = await api("/api/auth/register", { login: l, name, password }).catch(() => ({ ok: false, error: "Server bilan aloqa yo‘q.", user: null }));
      if (!r.ok || !r.user) return r.error ?? "Ro‘yxatdan o‘tib bo‘lmadi.";
      set({ user: r.user, status: "authed" });
      return null;
    }
    const accounts = ls.get<Record<string, LocalAccount>>(ACCOUNTS, {});
    if (accounts[l]) return "Bu login band. Boshqasini tanlang.";
    const salt = hex(crypto.getRandomValues(new Uint8Array(16)).buffer);
    const id = `local_${hex(crypto.getRandomValues(new Uint8Array(8)).buffer)}`;
    accounts[l] = { id, name: name.trim() || l, salt, hash: await pbkdf2(password, salt) };
    ls.set(ACCOUNTS, accounts);
    ls.set(LOCAL_SESSION, l);
    set({ user: { id, login: l, name: accounts[l].name }, status: "authed" });
    return null;
  },

  logout: async () => {
    if (get().mode === "server") await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    else ls.del(LOCAL_SESSION);
    set({ user: null, status: "anon" });
  },
}));
