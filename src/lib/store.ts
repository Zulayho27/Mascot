"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Script } from "./translit";

export interface ChatMsg {
  role: "user" | "assistant";
  content: string;
  ts: number;
  safety?: boolean;
}

export type View =
  | { kind: "dashboard" }
  | { kind: "section"; id: string }
  | { kind: "card"; id: string }
  | { kind: "export" }
  | { kind: "guide" };

type Responses = Record<string, Record<string, unknown>>;

interface State {
  script: Script;
  profile: { name: string; startDate: string };
  responses: Responses;
  levels: Record<string, number>;
  sectionNotes: Record<string, string>;
  updatedAt: Record<string, number>;
  chats: Record<string, ChatMsg[]>;
  usage: Record<string, number>; // kun -> daqiqa
  safetyStop: { active: boolean; at: number | null };
  view: View;
  copilotOpen: boolean;
  hydrated: boolean;

  setScript: (s: Script) => void;
  setProfile: (p: Partial<State["profile"]>) => void;
  setValue: (cardId: string, blockId: string, value: unknown) => void;
  setLevel: (cardId: string, level: number | null) => void;
  setSectionNote: (sectionId: string, text: string) => void;
  resetCard: (cardId: string) => void;
  pushChat: (cardId: string, msg: ChatMsg) => void;
  updateLastAssistant: (cardId: string, content: string) => void;
  clearChat: (cardId: string) => void;
  tickUsage: (minutes: number) => void;
  triggerSafetyStop: () => void;
  clearSafetyStop: () => void;
  navigate: (v: View) => void;
  setCopilotOpen: (open: boolean) => void;
  importData: (data: Partial<ExportShape>) => void;
  wipeAll: () => void;
}

export interface ExportShape {
  app: "hamida-ai-fasilitator";
  version: 1;
  exportedAt: string;
  profile: State["profile"];
  responses: Responses;
  levels: State["levels"];
  sectionNotes: State["sectionNotes"];
  updatedAt: State["updatedAt"];
}

const LEGACY_KEY = "hamida-ish-daftari-v1";
const userKey = (id: string) => `${LEGACY_KEY}:${id}`;

const today = () => new Date().toISOString().slice(0, 10);

export const useStore = create<State>()(
  persist(
    (set) => ({
      script: "latin",
      profile: { name: "", startDate: today() },
      responses: {},
      levels: {},
      sectionNotes: {},
      updatedAt: {},
      chats: {},
      usage: {},
      safetyStop: { active: false, at: null },
      view: { kind: "dashboard" },
      copilotOpen: false,
      hydrated: false,

      setScript: (script) => set({ script }),
      setProfile: (p) => set((s) => ({ profile: { ...s.profile, ...p } })),
      setValue: (cardId, blockId, value) =>
        set((s) => ({
          responses: { ...s.responses, [cardId]: { ...(s.responses[cardId] ?? {}), [blockId]: value } },
          updatedAt: { ...s.updatedAt, [cardId]: Date.now() },
        })),
      setLevel: (cardId, level) =>
        set((s) => {
          const levels = { ...s.levels };
          if (level === null) delete levels[cardId];
          else levels[cardId] = level;
          return { levels, updatedAt: { ...s.updatedAt, [cardId]: Date.now() } };
        }),
      setSectionNote: (sectionId, text) => set((s) => ({ sectionNotes: { ...s.sectionNotes, [sectionId]: text } })),
      resetCard: (cardId) =>
        set((s) => {
          const responses = { ...s.responses };
          const levels = { ...s.levels };
          delete responses[cardId];
          delete levels[cardId];
          return { responses, levels };
        }),
      pushChat: (cardId, msg) => set((s) => ({ chats: { ...s.chats, [cardId]: [...(s.chats[cardId] ?? []), msg] } })),
      updateLastAssistant: (cardId, content) =>
        set((s) => {
          const msgs = [...(s.chats[cardId] ?? [])];
          const last = msgs[msgs.length - 1];
          if (last && last.role === "assistant") msgs[msgs.length - 1] = { ...last, content };
          return { chats: { ...s.chats, [cardId]: msgs } };
        }),
      clearChat: (cardId) => set((s) => ({ chats: { ...s.chats, [cardId]: [] } })),
      tickUsage: (minutes) => set((s) => ({ usage: { ...s.usage, [today()]: (s.usage[today()] ?? 0) + minutes } })),
      triggerSafetyStop: () => set({ safetyStop: { active: true, at: Date.now() } }),
      clearSafetyStop: () => set({ safetyStop: { active: false, at: null } }),
      navigate: (view) => {
        set({ view });
        if (typeof window !== "undefined") {
          const hash = view.kind === "card" || view.kind === "section" ? `#${view.kind}=${view.id}` : view.kind === "dashboard" ? "#" : `#${view.kind}`;
          if (window.location.hash !== hash) history.replaceState(null, "", hash || "#");
          window.scrollTo({ top: 0 });
        }
      },
      setCopilotOpen: (copilotOpen) => set({ copilotOpen }),
      importData: (d) =>
        set((s) => ({
          profile: d.profile ?? s.profile,
          responses: d.responses ?? s.responses,
          levels: d.levels ?? s.levels,
          sectionNotes: d.sectionNotes ?? s.sectionNotes,
          updatedAt: d.updatedAt ?? s.updatedAt,
        })),
      wipeAll: () =>
        set({ responses: {}, levels: {}, sectionNotes: {}, updatedAt: {}, chats: {}, safetyStop: { active: false, at: null } }),
    }),
    {
      name: LEGACY_KEY,
      skipHydration: true,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        script: s.script,
        profile: s.profile,
        responses: s.responses,
        levels: s.levels,
        sectionNotes: s.sectionNotes,
        updatedAt: s.updatedAt,
        chats: s.chats,
        usage: s.usage,
        safetyStop: s.safetyStop,
      }),
    },
  ),
);

export function buildExport(): ExportShape {
  const s = useStore.getState();
  return {
    app: "hamida-ai-fasilitator",
    version: 1,
    exportedAt: new Date().toISOString(),
    profile: s.profile,
    responses: s.responses,
    levels: s.levels,
    sectionNotes: s.sectionNotes,
    updatedAt: s.updatedAt,
  };
}

// ---- Har bir foydalanuvchi uchun alohida saqlash ---------------------------------
const EMPTY_DATA = () => ({
  profile: { name: "", startDate: today() },
  responses: {},
  levels: {},
  sectionNotes: {},
  updatedAt: {},
  chats: {},
  usage: {},
  safetyStop: { active: false, at: null },
});

let unsubscribeSync: (() => void) | null = null;

/** Foydalanuvchi almashganda: holatni tozalash va uning shaxsiy saqlovchisini yuklash */
export async function switchUser(user: { id: string; name: string } | null, serverSync: boolean) {
  unsubscribeSync?.();
  unsubscribeSync = null;
  useStore.setState({ ...EMPTY_DATA(), hydrated: false, view: { kind: "dashboard" }, copilotOpen: false });
  if (!user) {
    if (typeof window !== "undefined") history.replaceState(null, "", "#");
    return;
  }

  const key = userKey(user.id);
  let hadLocal = false;
  try {
    hadLocal = localStorage.getItem(key) !== null;
    // Login joriy etilishidan oldingi (umumiy) yozuvlarni birinchi akkauntga o‘tkazish
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (!hadLocal && legacy) {
      localStorage.setItem(key, legacy);
      localStorage.removeItem(LEGACY_KEY);
      hadLocal = true;
    }
  } catch {
    /* LocalStorage yopiq */
  }
  useStore.persist.setOptions({ name: key });
  await useStore.persist.rehydrate();
  if (!useStore.getState().profile.name) useStore.getState().setProfile({ name: user.name });

  if (serverSync) {
    try {
      const res = await fetch("/api/data");
      const { data } = (await res.json()) as { data: (ExportShape & { savedAt?: number }) | null };
      const localLatest = Math.max(0, ...Object.values(useStore.getState().updatedAt));
      if (data && (!hadLocal || (data.savedAt ?? 0) > localLatest)) useStore.getState().importData(data);
    } catch {
      /* oflayn: lokal nusxa bilan davom etamiz */
    }
    let timer: ReturnType<typeof setTimeout> | null = null;
    unsubscribeSync = useStore.subscribe((s, prev) => {
      if (s.responses === prev.responses && s.levels === prev.levels && s.sectionNotes === prev.sectionNotes && s.profile === prev.profile) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const body = JSON.stringify({ ...buildExport(), savedAt: Date.now() });
        fetch("/api/data", { method: "PUT", headers: { "Content-Type": "application/json" }, body }).catch(() => undefined);
      }, 1500);
    });
  }
  useStore.setState({ hydrated: true });
}
