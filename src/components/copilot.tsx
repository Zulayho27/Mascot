"use client";

import { useEffect, useRef, useState } from "react";
import { LifeBuoy, Loader2, Send, Sparkles, Trash2 } from "lucide-react";
import { CARDS, QUICK_GUIDE, SECTIONS, cardById } from "@/data/cards";
import { isFillable } from "@/data/types";
import { demoReply, detectSafety, QUICK_ACTIONS, SAFETY_MARKER, type QuickAction } from "@/lib/facilitator";
import { blockFill, cardProgress, cardToText } from "@/lib/progress";
import { useStore, type ChatMsg } from "@/lib/store";
import { tr } from "@/lib/translit";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Textarea } from "./ui/field";

const EMPTY: ChatMsg[] = [];

function generalContext() {
  const s = useStore.getState();
  const lines = SECTIONS.map((sec) => {
    const cards = CARDS.filter((c) => c.sectionId === sec.id);
    const started = cards.filter((c) => cardProgress(c, s.responses[c.id]) > 0).map((c) => `${c.number}. ${tr(c.title, "latin")}`);
    return `${sec.roman}. ${tr(sec.title, "latin")}: ${started.length ? "boshlangan kartalar: " + started.join("; ") : "hali boshlanmagan"}`;
  });
  return {
    cardTitle: "Umumiy suhbat (bosh sahifa)",
    cardContext: `Foydalanuvchi hozir aniq kartada emas, bosh sahifada. Maqsad: qaysi kartadan boshlashni yoki keyingi qadamni o‘zi tanlashiga yordam berish. Kartalarni nomi bilan tavsiya qilishingiz mumkin, lekin tanlovni o‘zi qilsin.\nTezkor yo‘l ko‘rsatkich: ${QUICK_GUIDE.map((q) => `${tr(q.question, "latin")} → ${cardById(q.cardId)!.number}-karta`).join("; ")}\n\nDaftar holati:\n${lines.join("\n")}`,
    emptyPrompts: ["Hozir sizni eng ko‘p nima o‘ylantiryapti", "Qaysi aniq vaziyat bilan ishlamoqchisiz"],
    filledSnippets: [] as string[],
  };
}

function collectContext(cardId: string | null) {
  if (!cardId) return generalContext();
  const s = useStore.getState();
  const card = cardById(cardId)!;
  const values = s.responses[cardId] ?? {};
  const emptyPrompts: string[] = [];
  const filledSnippets: string[] = [];
  for (const b of card.blocks) {
    if (!isFillable(b)) continue;
    const v = values[b.id];
    const [f] = blockFill(b, v);
    if (b.type === "text") (f ? filledSnippets.push(String(v).trim()) : emptyPrompts.push(tr(b.label, "latin").replace(/:$/, "")));
    if (b.type === "list" && Array.isArray(v)) (v as string[]).forEach((x) => x?.trim() && filledSnippets.push(x.trim()));
    if (b.type === "taggedList" && Array.isArray(v)) (v as { text?: string }[]).forEach((x) => x?.text?.trim() && filledSnippets.push(`Men ${x.text.trim()}`));
    if (b.type === "table" && v && typeof v === "object")
      Object.values(v as Record<string, Record<string, unknown>>).forEach((row) =>
        Object.values(row).forEach((x) => typeof x === "string" && x.trim() && filledSnippets.push(x.trim())),
      );
  }
  return {
    cardTitle: tr(card.title, "latin"),
    cardContext: cardToText(card, values, s.levels[cardId], "latin"),
    emptyPrompts,
    filledSnippets: filledSnippets.reverse(),
  };
}

async function* localDemo(text: string, action: QuickAction | undefined, ctx: ReturnType<typeof collectContext>) {
  const reply = demoReply({ message: text, action, cardTitle: ctx.cardTitle, emptyPrompts: ctx.emptyPrompts, filledSnippets: ctx.filledSnippets });
  for (const w of reply.split(/(?<=\s)/)) {
    await new Promise((r) => setTimeout(r, 16));
    yield w;
  }
}

export function Copilot({ cardId }: { cardId: string | null }) {
  const script = useStore((s) => s.script);
  const chatKey = cardId ?? "general";
  const messages = useStore((s) => s.chats[chatKey] ?? EMPTY);
  const safety = useStore((s) => s.safetyStop);
  const { pushChat, updateLastAssistant, clearChat, triggerSafetyStop } = useStore.getState();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), [messages]);

  const card = cardId ? cardById(cardId)! : null;

  async function send(text: string, action?: QuickAction) {
    if (busy || !text.trim()) return;
    setInput("");
    pushChat(chatKey, { role: "user", content: text, ts: Date.now() });

    // 8-qoida: xavf belgilari aniqlansa, seans darhol to‘xtatiladi.
    if (detectSafety(text)) {
      triggerSafetyStop();
      return;
    }

    setBusy(true);
    pushChat(chatKey, { role: "assistant", content: "", ts: Date.now() });
    const ctx = collectContext(cardId);
    const history = [...(useStore.getState().chats[chatKey] ?? [])].slice(0, -1).map((m) => ({ role: m.role, content: m.content.replace(SAFETY_MARKER, "").trim() }));
    let acc = "";
    const append = (t: string) => {
      acc += t;
      updateLastAssistant(chatKey, acc);
      if (acc.includes(SAFETY_MARKER)) triggerSafetyStop();
    };

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, action, script, cardTitle: ctx.cardTitle, cardContext: ctx.cardContext, emptyPrompts: ctx.emptyPrompts, filledSnippets: ctx.filledSnippets }),
      });
      if (res.status === 401) {
        append("Sessiya tugagan. Iltimos, qaytadan kiring.");
        return;
      }
      if (!res.ok || !res.body || !res.headers.get("content-type")?.includes("text/event-stream")) throw new Error("offline");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const p of parts) {
          const data = p.replace(/^data:\s*/, "").trim();
          if (!data || data === "[DONE]") continue;
          const ev = JSON.parse(data) as { t?: string; mode?: string; safety?: string; error?: string };
          if (ev.mode) setMode(ev.mode);
          if (ev.safety) triggerSafetyStop();
          if (ev.t) append(ev.t);
          if (ev.error) append(`\n\n(Ulanishda xato: ${ev.error})`);
        }
      }
    } catch {
      // Server yoki API yo‘q (masalan, statik ko‘rinish): oflayn fasilitator ishlaydi.
      setMode("offline");
      for await (const w of localDemo(text, action, ctx)) append(w);
    } finally {
      setBusy(false);
    }
  }

  const modeLabel =
    mode === "demo" || mode === "offline" ? "Oflayn rejim (API kaliti ulanmagan)" : mode ? `Model: ${mode}` : "Kartaga bog‘langan";

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-sm font-semibold">
              <Sparkles className="size-4 text-primary" /> AI Maslahatchi
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {card ? `${card.number}-karta · ${tr(card.title, script)}` : "Umumiy suhbat · kartani tanlashda yordam"}
            </div>
          </div>
          <Button variant="ghost" size="icon" title="Suhbatni tozalash" onClick={() => clearChat(chatKey)}>
            <Trash2 />
          </Button>
        </div>
        <div className="mt-1 text-[11px] text-muted-foreground">{modeLabel}</div>
      </div>

      {safety.active ? (
        <SafetyPanel />
      ) : (
        <>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 && (
              <div className="rounded-xl bg-muted/60 p-3 text-sm leading-relaxed text-muted-foreground">
                {card ? "Men sizning o‘rningizga javob bermayman, savollar beraman. Kartani to‘ldirayotganda pastdagi tugmalardan birini bosing yoki o‘z savolingizni yozing." : "Hozir sizni nima o‘ylantiryapti? Yozing, qaysi kartadan boshlashni birga topamiz. Kartani ochsangiz, undagi yozuvlaringizni ham ko‘raman."}
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[88%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                    m.role === "user" ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm border border-border bg-card",
                  )}
                >
                  {m.content.replace(SAFETY_MARKER, "").trim() || (busy && i === messages.length - 1 ? <Loader2 className="size-4 animate-spin" /> : "")}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          <div className="border-t border-border p-3">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {QUICK_ACTIONS.map((a) => (
                <button
                  key={a.id}
                  disabled={busy}
                  onClick={() => send(a.prompt, a.id)}
                  className="rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
                >
                  {a.label}
                </button>
              ))}
            </div>
            <form
              className="flex items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
            >
              <Textarea
                rows={2}
                value={input}
                placeholder="Savolingizni yozing..."
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                className="min-h-[44px] resize-none"
              />
              <Button type="submit" size="icon" disabled={busy || !input.trim()} aria-label="Yuborish">
                {busy ? <Loader2 className="animate-spin" /> : <Send />}
              </Button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

export function SafetyPanel() {
  const clear = useStore((s) => s.clearSafetyStop);
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="rounded-2xl border border-danger/40 bg-danger/5 p-4">
        <div className="mb-2 flex items-center gap-2 font-semibold text-danger">
          <LifeBuoy className="size-5" /> Seans to‘xtatildi
        </div>
        <p className="text-sm leading-relaxed">
          Yozganlaringizda xavfsizlik yoki jiddiy qiyinchilik belgilari bor. Bunday holatda ish daftari va AI yordamchi yetarli emas, jonli mutaxassis yordami muhim. Siz yolg‘iz emassiz.
        </p>
        <ul className="mt-3 space-y-1.5 text-sm">
          <li>
            <b>Hozir xavf bo‘lsa:</b> 103 (tez tibbiy yordam) yoki 102 (politsiya).
          </li>
          <li>
            <b>Mutaxassis:</b> psixolog, psixoterapevt yoki psixiatr; yaqin poliklinika yoki ruhiy salomatlik markazi.
          </li>
          <li>
            <b>Ishonchli odam:</b> hozir yoningizda bo‘lishi mumkin bo‘lgan yaqin insonga qo‘ng‘iroq qiling.
          </li>
        </ul>
      </div>
      <div className="mt-4 space-y-2 text-sm">
        {!confirm ? (
          <Button variant="outline" className="w-full" onClick={() => setConfirm(true)}>
            Men hozir xavfsizman
          </Button>
        ) : (
          <div className="space-y-2 rounded-xl border border-border p-3">
            <p className="text-muted-foreground">Davom etishdan oldin: xavf o‘tib ketganini va kerak bo‘lsa mutaxassisga murojaat qilishingizni tasdiqlaysizmi?</p>
            <Button className="w-full" onClick={clear}>
              Tasdiqlayman, mashqqa qaytish
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
