"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Coffee, Compass, Search } from "lucide-react";
import { CARDS, DEV_SCALE, QUICK_GUIDE, RULES, SECTIONS, cardById, cardsInSection, sectionById } from "@/data/cards";
import { GOLDEN_RULES } from "@/lib/facilitator";
import { cardProgress } from "@/lib/progress";
import { useStore } from "@/lib/store";
import { cyrToLat, tr } from "@/lib/translit";
import { cn } from "@/lib/utils";
import { CycleMark } from "./auth-screen";
import { FormulaStrip } from "./card-view";
import { Button } from "./ui/button";
import { Input } from "./ui/field";
import { Panel } from "./ui/misc";

const norm = (s: string) => cyrToLat(s).toLowerCase().replace(/[‘’ʻʼ`´]/g, "'");
const secStyle = (color: string) => ({ "--sec": color }) as React.CSSProperties;

export function Dashboard() {
  const script = useStore((s) => s.script);
  const responses = useStore((s) => s.responses);
  const updatedAt = useStore((s) => s.updatedAt);
  const profile = useStore((s) => s.profile);
  const usageToday = useStore((s) => s.usage[new Date().toISOString().slice(0, 10)] ?? 0);
  const navigate = useStore((s) => s.navigate);
  const [query, setQuery] = useState("");
  const [restDismissed, setRestDismissed] = useState(false);
  const [allChips, setAllChips] = useState(false);
  const T = (x: string) => tr(x, script);

  const sectionProgress = Object.fromEntries(
    SECTIONS.map((s) => {
      const cards = cardsInSection(s.id);
      return [s.id, cards.reduce((a, c) => a + cardProgress(c, responses[c.id]), 0) / cards.length];
    }),
  );
  const overall = CARDS.reduce((a, c) => a + cardProgress(c, responses[c.id]), 0) / CARDS.length;
  const lastCardId = Object.entries(updatedAt).sort((a, b) => b[1] - a[1])[0]?.[0];
  const nextCard = (lastCardId && cardById(lastCardId)) || CARDS[0];
  const firstName = profile.name.split(" ")[0];

  const matches = useMemo(() => {
    const q = norm(query);
    if (q.trim().length < 3) return [];
    const scored = QUICK_GUIDE.map((r) => ({ r, score: r.keywords.filter((k) => q.includes(norm(k))).length })).filter((x) => x.score > 0);
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 3).map((x) => x.r);
  }, [query]);

  return (
    <div className="space-y-6">
      {/* Salomlashish va davom ettirish */}
      <section className="rise relative overflow-hidden rounded-3xl bg-hero p-6 text-hero-foreground sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="relative mx-auto shrink-0 sm:mx-0">
            <CycleMark size={150} progress={sectionProgress} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-serif text-3xl font-semibold tabular-nums">{Math.round(overall * 100)}%</span>
              <span className="text-[11px] opacity-70">daftar</span>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-serif text-2xl font-semibold sm:text-3xl">{firstName ? `Salom, ${firstName}!` : "Salom!"}</h1>
            <p className="mt-2 max-w-lg text-sm leading-relaxed opacity-80">Bugun nima sodir bo‘lyapti va bu yerda nimani rivojlantirish mumkin?</p>
            <button
              onClick={() => navigate({ kind: "card", id: nextCard.id })}
              className="mt-5 flex w-full max-w-md items-center gap-3 rounded-2xl bg-white/10 p-3 text-left transition-colors hover:bg-white/15"
              style={secStyle(sectionById(nextCard.sectionId)!.color)}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--sec)] font-serif text-sm font-bold text-white">{nextCard.number}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] opacity-70">{lastCardId ? "Davom ettirish" : "Boshlash"}</span>
                <span className="block truncate font-semibold">{T(nextCard.title)}</span>
              </span>
              <ArrowRight className="size-5 shrink-0" />
            </button>
          </div>
        </div>
      </section>

      {usageToday >= 60 && !restDismissed && (
        <div className="flex items-start gap-3 rounded-2xl border border-accent/40 bg-accent/10 p-4 text-sm">
          <Coffee className="mt-0.5 size-5 shrink-0 text-accent" />
          <div className="flex-1">
            <b>Bugun {usageToday} daqiqa ishladingiz.</b> Endi hayotda bitta kichik tajriba qilib ko‘rish va daftarga ertaga qaytish foydaliroq bo‘lishi mumkin.
          </div>
          <button className="text-xs text-muted-foreground hover:underline" onClick={() => setRestDismissed(true)}>
            Yopish
          </button>
        </div>
      )}

      {/* Tezkor yo‘l ko‘rsatkich */}
      <Panel className="p-5 sm:p-6">
        <div className="flex items-center gap-2 font-serif text-base font-semibold">
          <Compass className="size-5 text-accent" /> Qayerdan boshlay?
        </div>
        <div className="relative mt-3">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input id="guide-query" className="h-11 pl-9" placeholder="Holatingizni yozing: «bilaman, lekin qilmayman»" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        {query.trim().length >= 3 && (
          <div className="mt-3 space-y-2">
            {(matches.length ? matches : [QUICK_GUIDE[9]]).map((r) => {
              const c = cardById(r.cardId)!;
              const s = sectionById(r.sectionId)!;
              return (
                <button
                  key={r.cardId}
                  onClick={() => navigate({ kind: "card", id: c.id })}
                  style={secStyle(s.color)}
                  className="sec-tint flex w-full items-center gap-3 rounded-xl p-3 text-left text-sm transition-transform hover:translate-x-0.5"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--sec)] text-xs font-bold text-white">{c.number}</span>
                  <span className="flex-1">
                    <span className="block text-xs text-muted-foreground">{T(s.title)}</span>
                    <span className="block font-semibold">{T(c.title)}</span>
                  </span>
                  <ArrowRight className="size-4" />
                </button>
              );
            })}
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {(allChips ? QUICK_GUIDE : QUICK_GUIDE.slice(0, 4)).map((r) => (
            <button
              key={r.cardId}
              onClick={() => navigate({ kind: "card", id: r.cardId })}
              style={secStyle(sectionById(r.sectionId)!.color)}
              className="rounded-full border border-[var(--sec)]/50 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[var(--sec)]/15"
            >
              {T(r.question).replace(/[«»]/g, "")}
            </button>
          ))}
          {!allChips && (
            <button onClick={() => setAllChips(true)} className="rounded-full px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted">
              yana {QUICK_GUIDE.length - 4} ta
            </button>
          )}
        </div>
      </Panel>

      {/* Bo‘limlar */}
      <div>
        <h2 className="mb-3 font-serif text-base font-semibold">Bo‘limlar</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {SECTIONS.map((s) => {
            const p = sectionProgress[s.id];
            const n = cardsInSection(s.id).length;
            return (
              <button
                key={s.id}
                onClick={() => navigate({ kind: "section", id: s.id })}
                style={secStyle(s.color)}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className="absolute inset-x-0 top-0 h-1 bg-[var(--sec)]" />
                <span className="font-serif text-2xl font-bold text-[var(--sec)]">{s.roman}</span>
                <span className="mt-1 flex-1 text-sm leading-snug font-semibold">{T(s.title)}</span>
                <span className="mt-3 flex items-center gap-2">
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <span className="block h-full rounded-full bg-[var(--sec)]" style={{ width: `${Math.round(p * 100)}%` }} />
                  </span>
                  <span className="text-[11px] tabular-nums text-muted-foreground">{n} karta</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Qoidalar, shkala va AI tamoyillari: bosh sahifadan alohida sahifaga ko‘chirildi */
export function GuideView() {
  const script = useStore((s) => s.script);
  const profile = useStore((s) => s.profile);
  const setProfile = useStore((s) => s.setProfile);
  const navigate = useStore((s) => s.navigate);
  const T = (x: string) => tr(x, script);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold sm:text-3xl">Qoidalar va shkala</h1>
        <blockquote className="mt-3 border-l-4 border-accent pl-4 text-base leading-snug">
          «Menda nima noto‘g‘ri?» emas, balki «Nima sodir bo‘lyapti va bu yerda nimani rivojlantirish mumkin?»
        </blockquote>
        <FormulaStrip className="mt-4" />
      </div>

      <Panel>
        <div className="mb-3 font-serif text-sm font-semibold">Ishlashning 10 qoidasi</div>
        <ol className="space-y-2 text-sm">
          {RULES.map((r, i) => (
            <li key={i} className="flex gap-3">
              <span className="w-5 shrink-0 text-right font-bold text-accent tabular-nums">{i + 1}</span>
              <span className="leading-snug">{T(r)}</span>
            </li>
          ))}
        </ol>
      </Panel>

      <Panel>
        <div className="mb-3 font-serif text-sm font-semibold">Ko‘nikma rivojlanishining umumiy shkalasi</div>
        <div className="space-y-2">
          {DEV_SCALE.map((d) => (
            <div key={d.level} className="flex items-start gap-3 text-sm">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary font-serif text-xs font-bold text-primary-foreground">{d.level}</span>
              <span className="leading-snug">{T(d.label)}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Bu shkala psixometrik test emas. Uni faqat vaqt davomida o‘zingizni o‘zingiz bilan taqqoslash uchun ishlating.</p>
      </Panel>

      <Panel>
        <div className="mb-3 font-serif text-sm font-semibold">AI Maslahatchi amal qiladigan tamoyillar</div>
        <div className="grid gap-2 sm:grid-cols-2">
          {GOLDEN_RULES.map((r, i) => (
            <div key={i} className={cn("rounded-xl bg-muted/60 p-3 text-sm", i === 7 && "bg-danger/10")}>
              <div className="font-semibold">
                {i + 1}. {r.title}
              </div>
              <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{r.text}</div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel>
        <div className="mb-3 font-serif text-sm font-semibold">Profil</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-muted-foreground">
            Ism
            <Input id="profile-name" className="mt-1" value={profile.name} onChange={(e) => setProfile({ name: e.target.value })} />
          </label>
          <label className="text-xs font-semibold text-muted-foreground">
            Boshlangan sana
            <Input id="profile-date" type="date" className="mt-1" value={profile.startDate} onChange={(e) => setProfile({ startDate: e.target.value })} />
          </label>
        </div>
      </Panel>

      <Button onClick={() => navigate({ kind: "dashboard" })} variant="outline">
        Bosh sahifaga qaytish
      </Button>
    </div>
  );
}
