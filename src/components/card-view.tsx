"use client";

import { ArrowLeft, ArrowRight, Calculator, FileDown, RotateCcw, Sparkles, TableProperties } from "lucide-react";
import { CARDS, DEV_SCALE, FORMULA_STEPS, cardById, cardsInSection, sectionById } from "@/data/cards";
import { cardMetrics, cardProgress, cardToText, statusOf } from "@/lib/progress";
import { useStore } from "@/lib/store";
import { tr } from "@/lib/translit";
import { cn, download } from "@/lib/utils";
import { BlockView } from "./card-blocks";
import { Button } from "./ui/button";
import { Textarea } from "./ui/field";
import { Badge, Panel } from "./ui/misc";

export function FormulaStrip({ className }: { className?: string }) {
  const script = useStore((s) => s.script);
  return (
    <div className={cn("flex flex-wrap items-center gap-1 text-xs text-muted-foreground", className)}>
      {FORMULA_STEPS.map((s, i) => (
        <span key={s} className="flex items-center gap-1">
          <span className="rounded-md bg-muted px-2 py-0.5 font-medium">{tr(s, script)}</span>
          {i < FORMULA_STEPS.length - 1 && <span>→</span>}
        </span>
      ))}
    </div>
  );
}

export function DevLevelPicker({ cardId }: { cardId: string }) {
  const script = useStore((s) => s.script);
  const level = useStore((s) => s.levels[cardId]);
  const setLevel = useStore((s) => s.setLevel);
  return (
    <Panel>
      <div className="mb-1 text-sm font-semibold">Rivojlanish shkalasi</div>
      <p className="mb-3 text-xs text-muted-foreground">
        Shu karta mashq qildirayotgan ko‘nikma bo‘yicha hozir qayerdasiz? Bu psixometrik test emas, faqat vaqt davomida o‘zingizni o‘zingiz bilan solishtirish uchun.
      </p>
      <div className="grid grid-cols-6 gap-1.5">
        {DEV_SCALE.map((d) => (
          <button
            key={d.level}
            onClick={() => setLevel(cardId, level === d.level ? null : d.level)}
            title={tr(d.label, script)}
            className={cn(
              "h-10 rounded-lg border text-sm font-semibold tabular-nums transition-colors",
              level === d.level ? "border-[var(--sec)] bg-[var(--sec)] text-white" : "border-border hover:bg-muted",
            )}
          >
            {d.level}
          </button>
        ))}
      </div>
      <div className="mt-2 min-h-5 text-sm">{typeof level === "number" ? tr(DEV_SCALE[level].label, script) : <span className="text-muted-foreground">Darajani tanlang</span>}</div>
    </Panel>
  );
}

export function CardView({ id }: { id: string }) {
  const card = cardById(id)!;
  const script = useStore((s) => s.script);
  const values = useStore((s) => s.responses[id]);
  const level = useStore((s) => s.levels[id]);
  const updatedAt = useStore((s) => s.updatedAt[id]);
  const { navigate, resetCard, setCopilotOpen } = useStore.getState();
  const section = sectionById(card.sectionId)!;
  const idx = CARDS.findIndex((c) => c.id === id);
  const prev = CARDS[idx - 1];
  const next = CARDS[idx + 1];
  const progress = cardProgress(card, values);
  const metrics = cardMetrics(card, values, script);
  const T = (x: string) => tr(x, script);

  return (
    <article className="rise space-y-6" style={{ "--sec": section.color } as React.CSSProperties}>
      <div className="sec-tint -mx-4 rounded-none px-4 py-5 sm:mx-0 sm:rounded-3xl sm:p-6">
        <button onClick={() => navigate({ kind: "section", id: section.id })} className="no-print mb-3 inline-flex items-center gap-1.5 text-xs font-semibold sec-text hover:underline">
          <span className="flex size-5 items-center justify-center rounded bg-[var(--sec)] text-[9px] font-bold text-white">{section.roman}</span>
          {T(section.title)}
        </button>
        <div className="flex items-start gap-4">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--sec)] font-serif text-2xl font-bold text-white shadow-sm">{card.number}</span>
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {card.number}-karta
              {card.interactive && (
                <Badge className="gap-1 border-accent/40 text-accent normal-case tracking-normal">
                  <TableProperties className="size-3" /> interaktiv
                </Badge>
              )}
            </div>
            <h1 className="font-serif text-xl font-semibold leading-tight sm:text-2xl">{T(card.title)}</h1>
            {card.intro && <p className="mt-2 text-sm italic text-muted-foreground">{T(card.intro)}</p>}
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <div className="h-1.5 w-full max-w-48 overflow-hidden rounded-full bg-card/70">
            <div className="h-full rounded-full bg-[var(--sec)] transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          <span className="text-xs tabular-nums text-muted-foreground">
            {Math.round(progress * 100)}% · {updatedAt ? `saqlandi ${new Date(updatedAt).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}` : "avtosaqlash yoqilgan"}
          </span>
        </div>
      </div>

      <Panel className="space-y-5 p-4 sm:p-6">
        {card.blocks.map((b, i) => (
          <BlockView key={("id" in b ? b.id : "") + i} cardId={id} block={b} />
        ))}
      </Panel>

      {metrics.length > 0 && (
        <Panel>
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Calculator className="size-4 text-primary" /> Avtomatik hisoblash
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {metrics.map((m, i) => (
              <div key={i} className="rounded-xl bg-muted/60 p-3">
                <div className="text-xs text-muted-foreground">{m.label}</div>
                <div className="text-lg font-semibold tabular-nums">{m.value}</div>
                {m.hint && <div className="mt-0.5 text-xs text-muted-foreground">{m.hint}</div>}
              </div>
            ))}
          </div>
        </Panel>
      )}

      <DevLevelPicker cardId={id} />

      <div className="no-print flex flex-wrap items-center gap-2">
        <Button variant="secondary" onClick={() => setCopilotOpen(true)}>
          <Sparkles /> AI Maslahatchi
        </Button>
        <Button
          variant="outline"
          onClick={() => download(`karta-${card.number}.md`, cardToText(card, values, level, script, true), "text/markdown;charset=utf-8")}
        >
          <FileDown /> Markdown
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            download(
              `karta-${card.number}.json`,
              JSON.stringify({ card: card.id, number: card.number, title: card.title, level: level ?? null, progress, values: values ?? {} }, null, 2),
              "application/json",
            )
          }
        >
          <FileDown /> JSON
        </Button>
        <Button
          variant="ghost"
          className="text-danger"
          onClick={() => confirm("Shu kartadagi barcha yozuvlar o‘chirilsinmi?") && resetCard(id)}
        >
          <RotateCcw /> Tozalash
        </Button>
      </div>

      <div className="no-print flex justify-between gap-2 border-t border-border pt-4">
        {prev ? (
          <Button variant="ghost" onClick={() => navigate({ kind: "card", id: prev.id })} className="max-w-[48%] justify-start">
            <ArrowLeft /> <span className="truncate">{prev.number}. {T(prev.title)}</span>
          </Button>
        ) : (
          <span />
        )}
        {next && (
          <Button variant="ghost" onClick={() => navigate({ kind: "card", id: next.id })} className="max-w-[48%] justify-end">
            <span className="truncate">{next.number}. {T(next.title)}</span> <ArrowRight />
          </Button>
        )}
      </div>
    </article>
  );
}

export function SectionView({ id }: { id: string }) {
  const section = sectionById(id)!;
  const script = useStore((s) => s.script);
  const responses = useStore((s) => s.responses);
  const levels = useStore((s) => s.levels);
  const note = useStore((s) => s.sectionNotes[id] ?? "");
  const { navigate, setSectionNote } = useStore.getState();
  const cards = cardsInSection(id);
  const T = (x: string) => tr(x, script);

  return (
    <div className="rise space-y-6" style={{ "--sec": section.color } as React.CSSProperties}>
      <div className="sec-tint rounded-3xl p-6">
        <div className="font-serif text-sm font-semibold sec-text">{section.roman === "★" ? "" : `${section.roman} ${script === "latin" ? "BO‘LIM" : "БЎЛИМ"}`}</div>
        <h1 className="mt-1 font-serif text-2xl font-semibold sm:text-3xl">{T(section.title)}</h1>
        <p className="mt-2 italic text-muted-foreground">{T(section.motto)}</p>
        <FormulaStrip className="mt-4" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((c) => {
          const p = cardProgress(c, responses[c.id]);
          const st = statusOf(p);
          return (
            <button
              key={c.id}
              onClick={() => navigate({ kind: "card", id: c.id })}
              className="group rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-[var(--sec)]"
            >
              <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-semibold uppercase tracking-wider">{c.number}-karta</span>
                <span className="flex items-center gap-2">
                  {typeof levels[c.id] === "number" && <Badge>daraja {levels[c.id]}</Badge>}
                  <span className={cn(st !== "empty" && "font-semibold sec-text")}>
                    {st === "done" ? "bajarildi" : st === "started" ? "boshlangan" : "yangi"}
                  </span>
                </span>
              </div>
              <div className="font-semibold leading-snug">{T(c.title)}</div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-[var(--sec)]" style={{ width: `${Math.round(p * 100)}%` }} />
              </div>
            </button>
          );
        })}
      </div>
      <Panel>
        <div className="mb-2 text-sm font-semibold">{script === "latin" ? "Mening qaydlarim" : "Менинг қайдларим"}</div>
        <Textarea rows={5} value={note} onChange={(e) => setSectionNote(id, e.target.value)} placeholder="Bo‘lim bo‘yicha erkin qaydlar..." />
      </Panel>
    </div>
  );
}
