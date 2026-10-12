"use client";

import { AlertTriangle, CheckCircle2, Info, Sigma } from "lucide-react";
import type { Block } from "@/data/types";
import { useStore } from "@/lib/store";
import { tr } from "@/lib/translit";
import { cn } from "@/lib/utils";
import { Checkbox } from "./ui/checkbox";
import { Input, Textarea } from "./ui/field";
import { Slider } from "./ui/slider";

type TableValue = Record<string, Record<string, string | number>>;

function Label({ children }: { children: React.ReactNode }) {
  return <div className="mb-1.5 text-sm font-medium leading-snug">{children}</div>;
}

const autoGrow = (e: React.FormEvent<HTMLTextAreaElement>) => {
  const el = e.currentTarget;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight + 2}px`;
};

export function BlockView({ cardId, block }: { cardId: string; block: Block }) {
  const script = useStore((s) => s.script);
  const value = useStore((s) => ("id" in block ? s.responses[cardId]?.[block.id] : undefined));
  const setValue = useStore((s) => s.setValue);
  const T = (x: string) => tr(x, script);
  const set = (v: unknown) => "id" in block && setValue(cardId, block.id, v);

  switch (block.type) {
    case "heading":
      return <h3 className="pt-3 font-serif text-base font-semibold tracking-wide text-primary uppercase">{T(block.text)}</h3>;

    case "text":
      return (
        <div>
          <Label>{T(block.label)}</Label>
          <Textarea
            rows={block.rows ?? 2}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => set(e.target.value)}
            onInput={autoGrow}
          />
        </div>
      );

    case "scale":
      return (
        <div>
          <Label>{T(block.label)}</Label>
          <Slider value={typeof value === "number" ? value : undefined} onChange={set} min={block.min ?? 0} max={block.max ?? 10} label={T(block.label)} />
        </div>
      );

    case "list": {
      const arr = (Array.isArray(value) ? value : []) as string[];
      return (
        <div>
          {block.label && <Label>{T(block.label)}</Label>}
          <div className="space-y-2">
            {Array.from({ length: block.count }, (_, i) => {
              const lbl = block.itemLabel
                ? /^[а-ӿ]/.test(block.itemLabel)
                  ? `${i + 1}-${T(block.itemLabel)}`
                  : `${i + 1}. ${T(block.itemLabel)}`
                : `${i + 1}.`;
              return (
                <div key={i} className="flex items-start gap-2">
                  <span className="mt-2 min-w-6 shrink-0 text-sm text-muted-foreground">{lbl}</span>
                  <Textarea
                    rows={1}
                    value={arr[i] ?? ""}
                    onInput={autoGrow}
                    onChange={(e) => {
                      const next = [...arr];
                      next[i] = e.target.value;
                      set(next);
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    case "taggedList": {
      const arr = (Array.isArray(value) ? value : []) as { text?: string; tag?: string }[];
      const update = (i: number, patch: { text?: string; tag?: string }) => {
        const next = [...arr];
        next[i] = { ...(next[i] ?? {}), ...patch };
        set(next);
      };
      return (
        <div>
          <Label>{T(block.label)}</Label>
          <div className="mb-3 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
            {block.tags.map((t) => (
              <span key={t.key} className="rounded-md bg-muted px-2 py-0.5">{T(t.label)}</span>
            ))}
          </div>
          <div className="space-y-2">
            {Array.from({ length: block.count }, (_, i) => (
              <div key={i} className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
                <div className="flex flex-1 items-center gap-2">
                  <span className="w-6 shrink-0 text-right text-xs text-muted-foreground">{i + 1}.</span>
                  <span className="shrink-0 text-sm font-medium">{T(block.prefix ?? "")}</span>
                  <Input value={arr[i]?.text ?? ""} onChange={(e) => update(i, { text: e.target.value })} placeholder="..." />
                </div>
                <div className="flex flex-wrap gap-1 pl-8 sm:pl-0">
                  {block.tags.map((t) => {
                    const on = arr[i]?.tag === t.key;
                    return (
                      <button
                        key={t.key}
                        type="button"
                        title={T(t.label)}
                        onClick={() => update(i, { tag: on ? undefined : t.key })}
                        className={cn(
                          "h-7 min-w-7 rounded-md border px-1.5 text-xs font-semibold transition-colors",
                          on ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-muted",
                        )}
                      >
                        {T(t.label.split(" - ")[0])}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case "checklist": {
      const arr = (Array.isArray(value) ? value : []) as boolean[];
      return (
        <div>
          {block.label && <Label>{T(block.label)}</Label>}
          <div className={cn("grid gap-2", block.columns === 2 && "sm:grid-cols-2", block.columns === 3 && "grid-cols-2 sm:grid-cols-3")}>
            {block.options.map((o, i) => (
              <div key={i} className={cn(block.ladder && "flex items-center gap-2")}>
                {block.ladder && <span className="w-6 shrink-0 text-right text-xs font-semibold text-muted-foreground">{i + 1}</span>}
                <div className="flex-1">
                  <Checkbox
                    checked={!!arr[i]}
                    label={T(o)}
                    onChange={(v) => {
                      const next = [...arr];
                      next[i] = v;
                      set(next);
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case "table": {
      const t = (value ?? {}) as TableValue;
      const setCell = (ri: number, key: string, v: string | number | undefined) => {
        const row = { ...(t[ri] ?? {}) };
        if (v === undefined || v === "") delete row[key];
        else row[key] = v;
        set({ ...t, [ri]: row });
      };
      return (
        <div>
          {block.label && <Label>{T(block.label)}</Label>}
          {/* Desktop: jadval */}
          <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/70">
                <tr>
                  <th className="w-40 px-3 py-2 text-left font-semibold">{T(block.rowHeader)}</th>
                  {block.columns.map((c) => (
                    <th key={c.key} className={cn("px-3 py-2 text-left font-semibold", c.type === "computed" && "w-20 text-center")}>
                      {T(c.label)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((r, ri) => (
                  <tr key={ri} className="border-t border-border align-top">
                    <td className="px-3 py-2 font-medium">{T(r)}</td>
                    {block.columns.map((c) => (
                      <td key={c.key} className="px-2 py-1.5">
                        <Cell column={c} row={t[ri] ?? {}} onChange={(v) => setCell(ri, c.key, v)} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobil: kartochkalar */}
          <div className="space-y-3 md:hidden">
            {block.rows.map((r, ri) => (
              <div key={ri} className="rounded-xl border border-border p-3">
                <div className="mb-2 text-sm font-semibold">
                  {block.rowHeader && <span className="text-muted-foreground">{T(block.rowHeader)}: </span>}
                  {T(r)}
                </div>
                <div className="space-y-2">
                  {block.columns.map((c) => (
                    <div key={c.key}>
                      <div className="mb-1 text-xs text-muted-foreground">{T(c.label)}</div>
                      <Cell column={c} row={t[ri] ?? {}} onChange={(v) => setCell(ri, c.key, v)} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case "formula": {
      const f = (value ?? {}) as Record<string, string>;
      return (
        <div className="rounded-xl border border-accent/40 bg-accent/5 p-4">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-accent">
            <Sigma className="size-3.5" /> Formula
          </div>
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2 font-serif text-[15px] leading-relaxed">
            {block.parts.map((p, i) =>
              typeof p === "string" ? (
                <span key={i}>{T(p)}</span>
              ) : (
                <input
                  key={i}
                  value={f[p.field] ?? ""}
                  onChange={(e) => set({ ...f, [p.field]: e.target.value })}
                  className="min-w-40 flex-1 border-b-2 border-dashed border-accent/60 bg-transparent px-1 py-0.5 font-sans text-sm focus:border-accent focus:outline-none"
                />
              ),
            )}
          </div>
        </div>
      );
    }

    case "callout": {
      const Icon = block.tone === "warning" ? AlertTriangle : block.tone === "check" ? CheckCircle2 : block.tone === "formula" ? Sigma : Info;
      return (
        <div
          className={cn(
            "flex gap-3 rounded-xl border p-4 text-sm",
            block.tone === "warning" ? "border-warn/40 bg-warn/5" : block.tone === "formula" ? "border-accent/40 bg-accent/5" : "border-primary/30 bg-primary/5",
          )}
        >
          <Icon className={cn("mt-0.5 size-4 shrink-0", block.tone === "warning" ? "text-warn" : block.tone === "formula" ? "text-accent" : "text-primary")} />
          <div>
            <div className="mb-0.5 text-xs font-semibold uppercase tracking-wide">{T(block.title)}</div>
            <div className="leading-relaxed">{T(block.text)}</div>
          </div>
        </div>
      );
    }

    case "reference":
      return (
        <div className="overflow-hidden rounded-xl border border-border">
          {block.title && <div className="bg-muted/70 px-3 py-2 text-xs font-semibold uppercase tracking-wide">{T(block.title)}</div>}
          <table className="w-full text-sm">
            <tbody>
              {block.rows.map((r, i) => (
                <tr key={i} className="border-t border-border">
                  {r.map((c, j) => (
                    <td key={j} className={cn("px-3 py-2", j === 0 && "w-1/3 font-semibold")}>{T(c)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

function Cell({
  column,
  row,
  onChange,
}: {
  column: import("@/data/types").TableColumn;
  row: Record<string, string | number>;
  onChange: (v: string | number | undefined) => void;
}) {
  if (column.type === "computed") {
    const v = column.compute?.(row);
    return (
      <div className={cn("py-1.5 text-center font-semibold tabular-nums", typeof v === "number" && (v > 0 ? "text-primary" : v < 0 ? "text-danger" : ""))}>
        {typeof v === "number" ? `${v > 0 ? "+" : ""}${v}` : "—"}
      </div>
    );
  }
  if (column.type === "scale") {
    const v = row[column.key];
    return <Slider value={typeof v === "number" ? v : undefined} onChange={onChange} label={column.label} />;
  }
  const v = row[column.key];
  return <Textarea rows={1} className="min-h-9 py-1.5" value={typeof v === "string" ? v : ""} onInput={autoGrow} onChange={(e) => onChange(e.target.value)} />;
}
