"use client";

import { useRef, useState } from "react";
import { FileJson, FileText, Printer, Trash2, Upload } from "lucide-react";
import { CARDS, SECTIONS } from "@/data/cards";
import { cardProgress, cardToText, workbookToMarkdown } from "@/lib/progress";
import { buildExport, useStore, type ExportShape } from "@/lib/store";
import { tr } from "@/lib/translit";
import { download } from "@/lib/utils";
import { Button } from "./ui/button";
import { Panel } from "./ui/misc";

export function ExportView() {
  const script = useStore((s) => s.script);
  const responses = useStore((s) => s.responses);
  const levels = useStore((s) => s.levels);
  const notes = useStore((s) => s.sectionNotes);
  const profile = useStore((s) => s.profile);
  const { importData, wipeAll } = useStore.getState();
  const [onlyFilled, setOnlyFilled] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const stamp = new Date().toISOString().slice(0, 10);

  const printable = CARDS.filter((c) => !onlyFilled || cardProgress(c, responses[c.id]) > 0 || levels[c.id] !== undefined);

  return (
    <div className="space-y-6">
      <div className="no-print">
        <h1 className="font-serif text-3xl font-semibold">Eksport va zaxira</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Barcha yozuvlar avtomatik ravishda shu brauzerda (LocalStorage) saqlanadi. Boshqa qurilmaga o‘tkazish yoki zaxira uchun JSON faylni yuklab oling.
        </p>
      </div>

      <Panel className="no-print space-y-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={onlyFilled} onChange={(e) => setOnlyFilled(e.target.checked)} className="size-4 accent-[var(--primary)]" />
          Faqat to‘ldirilgan kartalar ({printable.length} ta)
        </label>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => download(`ish-daftari-${stamp}.json`, JSON.stringify(buildExport(), null, 2), "application/json")}>
            <FileJson /> JSON (strukturaviy)
          </Button>
          <Button
            variant="secondary"
            onClick={() => download(`ish-daftari-${stamp}.md`, workbookToMarkdown(responses, levels, notes, profile, script, onlyFilled), "text/markdown;charset=utf-8")}
          >
            <FileText /> Markdown
          </Button>
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer /> PDF (chop etish orqali)
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">PDF uchun ochilgan oynada «Saqlash: PDF» ni tanlang. Quyidagi ko‘rinish aynan PDF ga tushadi.</p>
        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                const data = JSON.parse(await f.text()) as ExportShape;
                if (data.app !== "hamida-ai-fasilitator") throw new Error();
                importData(data);
                setMsg("Ma'lumotlar tiklandi.");
              } catch {
                setMsg("Fayl formati noto‘g‘ri.");
              }
              e.target.value = "";
            }}
          />
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload /> JSON dan tiklash
          </Button>
          <Button variant="ghost" className="text-danger" onClick={() => confirm("Barcha kartalar, qaydlar va suhbatlar o‘chirilsinmi? Buni qaytarib bo‘lmaydi.") && wipeAll()}>
            <Trash2 /> Hammasini o‘chirish
          </Button>
          {msg && <span className="self-center text-sm text-primary">{msg}</span>}
        </div>
      </Panel>

      {/* Chop etish / PDF ko‘rinishi */}
      <div className="rounded-2xl border border-border bg-card p-6 print:border-0 print:p-0">
        <h2 className="font-serif text-2xl font-semibold">{script === "latin" ? "Ishtirokchining ish daftari" : "Иштирокчининг иш дафтари"}</h2>
        <p className="text-sm text-muted-foreground">
          {profile.name || "—"} · {profile.startDate}
        </p>
        {SECTIONS.map((s) => {
          const cards = printable.filter((c) => c.sectionId === s.id);
          if (!cards.length && !notes[s.id]?.trim()) return null;
          return (
            <section key={s.id} className="mt-6">
              <h3 className="border-b border-border pb-1 font-serif text-lg font-semibold text-primary">
                {s.roman}. {tr(s.title, script)}
              </h3>
              {cards.map((c) => (
                <div key={c.id} className="mt-4 break-inside-avoid-page">
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{cardToText(c, responses[c.id], levels[c.id], script)}</pre>
                </div>
              ))}
              {notes[s.id]?.trim() && (
                <div className="mt-3 text-sm">
                  <b>{script === "latin" ? "Mening qaydlarim" : "Менинг қайдларим"}:</b>
                  <p className="whitespace-pre-wrap">{notes[s.id]}</p>
                </div>
              )}
            </section>
          );
        })}
        {printable.length === 0 && <p className="mt-6 text-sm text-muted-foreground">Hali to‘ldirilgan karta yo‘q.</p>}
      </div>
    </div>
  );
}
