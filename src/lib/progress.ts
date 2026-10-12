import { CARDS, DEV_SCALE, SECTIONS, sectionById } from "@/data/cards";
import type { Block, Card } from "@/data/types";
import { isFillable } from "@/data/types";
import { tr, type Script } from "./translit";

export type CardValues = Record<string, unknown>;
type TableValue = Record<string, Record<string, string | number>>;
type Tagged = { text?: string; tag?: string }[];

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const has = (v: unknown) => (typeof v === "number" ? true : str(v).length > 0);

/** Blokdagi to‘ldirilgan / umumiy birliklar soni */
export function blockFill(b: Block, v: unknown): [number, number] {
  switch (b.type) {
    case "text":
      return [has(v) ? 1 : 0, 1];
    case "scale":
      return [typeof v === "number" ? 1 : 0, 1];
    case "list": {
      const arr = (Array.isArray(v) ? v : []) as string[];
      return [Math.min(arr.filter(has).length, b.count), b.count];
    }
    case "taggedList": {
      const arr = (Array.isArray(v) ? v : []) as Tagged;
      return [Math.min(arr.filter((x) => has(x?.text)).length, b.count), b.count];
    }
    case "checklist": {
      const arr = (Array.isArray(v) ? v : []) as boolean[];
      return [arr.some(Boolean) ? 1 : 0, 1];
    }
    case "table": {
      const t = (v ?? {}) as TableValue;
      const editable = b.columns.filter((c) => c.type !== "computed");
      let filled = 0;
      b.rows.forEach((_, ri) => editable.forEach((c) => has(t[ri]?.[c.key]) && filled++));
      return [filled, b.rows.length * editable.length];
    }
    case "formula": {
      const f = (v ?? {}) as Record<string, string>;
      const fields = b.parts.filter((p) => typeof p !== "string") as { field: string }[];
      return [fields.filter((p) => has(f[p.field])).length, fields.length];
    }
    default:
      return [0, 0];
  }
}

export function cardProgress(card: Card, values: CardValues | undefined): number {
  let f = 0;
  let total = 0;
  for (const b of card.blocks) {
    if (!isFillable(b)) continue;
    const [a, t] = blockFill(b, values?.[b.id]);
    f += a;
    total += t;
  }
  return total ? f / total : 0;
}

export type CardStatus = "empty" | "started" | "done";
export const statusOf = (p: number): CardStatus => (p === 0 ? "empty" : p >= 0.8 ? "done" : "started");

/** Avtomatik hisoblashlar (kirill matnlar tr() orqali o‘giriladi) */
export interface Metric {
  label: string;
  value: string;
  hint?: string;
}

export function cardMetrics(card: Card, values: CardValues | undefined, script: Script): Metric[] {
  const out: Metric[] = [];
  const v = values ?? {};
  for (const b of card.blocks) {
    if (b.type === "checklist") {
      const arr = (Array.isArray(v[b.id]) ? v[b.id] : []) as boolean[];
      const n = arr.filter(Boolean).length;
      if (b.ladder) {
        let top = -1;
        arr.forEach((x, i) => x && (top = i));
        out.push({
          label: "Avtonomiya zinapoyasi",
          value: top >= 0 ? `${top + 1} / ${b.options.length}` : "—",
          hint: top >= 0 ? tr(b.options[top], script) : "Hozircha belgilanmagan",
        });
      } else {
        out.push({ label: b.label ? tr(b.label, script) : "Belgilangan mezonlar", value: `${n} / ${b.options.length}` });
      }
    }
    if (b.type === "taggedList") {
      const arr = (Array.isArray(v[b.id]) ? v[b.id] : []) as Tagged;
      const counts: Record<string, number> = {};
      arr.forEach((x) => x?.tag && (counts[x.tag] = (counts[x.tag] ?? 0) + 1));
      const filled = arr.filter((x) => has(x?.text)).length;
      out.push({ label: "To‘ldirilgan jumlalar", value: `${filled} / ${b.count}` });
      const parts = b.tags.filter((t) => counts[t.key]).map((t) => `${tr(t.label.split(" - ")[0], script)}: ${counts[t.key]}`);
      if (parts.length) out.push({ label: "Belgilar taqsimoti", value: parts.join(" · ") });
      const fact = counts.F ?? 0;
      const interp = (counts.T ?? 0) + (counts.B ?? 0);
      if (fact + interp > 0)
        out.push({
          label: "Fakt / talqin+baho nisbati",
          value: `${fact} : ${interp}`,
          hint: interp > fact ? "Talqinlar faktlardan ko‘p. Qaysi biri kuzatiladigan dalil bilan tasdiqlanadi?" : undefined,
        });
    }
    if (b.type === "scale" && typeof v[b.id] === "number") {
      out.push({ label: tr(b.label.replace(/:$/, ""), script), value: `${v[b.id]} / ${b.max ?? 10}` });
    }
    if (b.type === "table") {
      const t = (v[b.id] ?? {}) as TableValue;
      for (const c of b.columns) {
        if (c.type !== "scale" && c.type !== "computed") continue;
        const nums: number[] = [];
        b.rows.forEach((_, ri) => {
          const row = t[ri] ?? {};
          const val = c.type === "computed" ? c.compute?.(row) : row[c.key];
          if (typeof val === "number") nums.push(val);
        });
        if (!nums.length) continue;
        const avg = nums.reduce((a, x) => a + x, 0) / nums.length;
        out.push({
          label: `${tr(c.label, script)} · o‘rtacha`,
          value: `${avg > 0 && c.type === "computed" ? "+" : ""}${avg.toFixed(1)}`,
          hint: `${nums.length} ta qiymat`,
        });
        if (card.id === "c11" && c.key === "score") {
          const max = Math.max(...nums);
          const idx = b.rows.findIndex((_, ri) => t[ri]?.score === max);
          out.push({ label: "Eng yuqori parametr", value: `${tr(b.rows[idx], script)} (${max})`, hint: "Shaxs emas, aniq bir reaksiya baholanmoqda." });
        }
        if (card.id === "c20" && c.key === "delta") {
          let best = -Infinity;
          let bestDay = "";
          b.rows.forEach((d, ri) => {
            const val = c.compute?.(t[ri] ?? {});
            if (typeof val === "number" && val > best) {
              best = val;
              bestDay = d;
            }
          });
          if (bestDay) out.push({ label: "Eng ko‘p tiklangan kun", value: `${tr(bestDay, script)} (${best > 0 ? "+" : ""}${best})` });
        }
      }
    }
  }
  return out;
}

// ---- Matn ko‘rinishiga o‘tkazish (AI konteksti va Markdown eksport uchun) ----
function blockToLines(b: Block, v: unknown, script: Script, md: boolean): string[] {
  const T = (s: string) => tr(s, script);
  const lines: string[] = [];
  const empty = md ? "_—_" : "(bo‘sh)";
  switch (b.type) {
    case "heading":
      lines.push(md ? `\n#### ${T(b.text)}` : `\n[${T(b.text)}]`);
      break;
    case "text":
      lines.push(md ? `**${T(b.label)}**  \n${str(v) || empty}\n` : `${T(b.label)} ${str(v) || empty}`);
      break;
    case "scale":
      lines.push(`${md ? "**" : ""}${T(b.label)}${md ? "**" : ""} ${typeof v === "number" ? `${v}/${b.max ?? 10}` : empty}`);
      break;
    case "list": {
      const arr = (Array.isArray(v) ? v : []) as string[];
      if (b.label) lines.push(md ? `**${T(b.label)}**` : T(b.label));
      for (let i = 0; i < b.count; i++) lines.push(`${i + 1}. ${b.itemLabel ? T(b.itemLabel) + ": " : ""}${str(arr[i]) || empty}`);
      if (md) lines.push("");
      break;
    }
    case "taggedList": {
      const arr = (Array.isArray(v) ? v : []) as Tagged;
      lines.push(md ? `**${T(b.label)}**` : T(b.label));
      for (let i = 0; i < b.count; i++) {
        const it = arr[i];
        if (!has(it?.text)) continue;
        const tag = b.tags.find((t) => t.key === it?.tag);
        lines.push(`${i + 1}. ${T(b.prefix ?? "")} ${str(it?.text)}${tag ? ` [${T(tag.label)}]` : ""}`);
      }
      if (md) lines.push("");
      break;
    }
    case "checklist": {
      const arr = (Array.isArray(v) ? v : []) as boolean[];
      if (b.label) lines.push(md ? `**${T(b.label)}**` : T(b.label));
      b.options.forEach((o, i) => lines.push(`${md ? "- " : ""}[${arr[i] ? "x" : " "}] ${T(o)}`));
      if (md) lines.push("");
      break;
    }
    case "table": {
      const t = (v ?? {}) as TableValue;
      if (b.label) lines.push(md ? `**${T(b.label)}**\n` : T(b.label));
      const header = [T(b.rowHeader), ...b.columns.map((c) => T(c.label))];
      if (md) {
        lines.push(`| ${header.join(" | ")} |`, `| ${header.map(() => "---").join(" | ")} |`);
      }
      b.rows.forEach((r, ri) => {
        const row = t[ri] ?? {};
        const cells = b.columns.map((c) => {
          const val = c.type === "computed" ? c.compute?.(row) : row[c.key];
          return val === undefined || val === null || val === "" ? (md ? " " : "—") : String(val).replace(/\n/g, " ");
        });
        lines.push(md ? `| ${T(r)} | ${cells.join(" | ")} |` : `${T(r)}: ${b.columns.map((c, i) => `${T(c.label)}=${cells[i]}`).join("; ")}`);
      });
      if (md) lines.push("");
      break;
    }
    case "formula": {
      const f = (v ?? {}) as Record<string, string>;
      lines.push(b.parts.map((p) => (typeof p === "string" ? T(p) : str(f[p.field]) || "____")).join(""));
      if (md) lines.push("");
      break;
    }
    case "callout":
      if (md) lines.push(`> **${T(b.title)}.** ${T(b.text)}\n`);
      break;
    case "reference":
      if (md) {
        lines.push(`| ${b.headers.map(T).join(" | ")} |`, `| ${b.headers.map(() => "---").join(" | ")} |`);
        b.rows.forEach((r) => lines.push(`| ${r.map(T).join(" | ")} |`));
        lines.push("");
      }
      break;
  }
  return lines;
}

export function cardToText(card: Card, values: CardValues | undefined, level: number | undefined, script: Script, md = false): string {
  const sec = sectionById(card.sectionId);
  const head = md
    ? [`### ${card.number}-${script === "latin" ? "karta" : "карта"}. ${tr(card.title, script)}`, sec ? `_${tr(sec.roman + ". " + sec.title, script)}_\n` : ""]
    : [`${card.number}-karta. ${tr(card.title, script)} (${sec ? tr(sec.roman + ". " + sec.title, script) : ""})`];
  const body = card.blocks.flatMap((b) => blockToLines(b, "id" in b ? values?.[b.id] : undefined, script, md));
  const lvl =
    typeof level === "number"
      ? [`${md ? "**" : ""}Rivojlanish shkalasi:${md ? "**" : ""} ${level} — ${tr(DEV_SCALE[level].label, script)}`]
      : [];
  return [...head, ...body, ...lvl].join("\n");
}

export function workbookToMarkdown(
  responses: Record<string, CardValues>,
  levels: Record<string, number>,
  notes: Record<string, string>,
  profile: { name: string; startDate: string },
  script: Script,
  onlyFilled: boolean,
): string {
  const out: string[] = [
    `# ${script === "latin" ? "Ishtirokchining ish daftari" : "Иштирокчининг иш дафтари"}`,
    "",
    `**${script === "latin" ? "Ishtirokchi" : "Иштирокчи"}:** ${profile.name || "—"}  `,
    `**${script === "latin" ? "Boshlangan sana" : "Бошланган сана"}:** ${profile.startDate || "—"}  `,
    `**Eksport:** ${new Date().toLocaleString("uz-UZ")}`,
    "",
  ];
  for (const s of SECTIONS) {
    const cards = CARDS.filter((c) => c.sectionId === s.id && (!onlyFilled || cardProgress(c, responses[c.id]) > 0 || levels[c.id] !== undefined));
    if (!cards.length && !notes[s.id]) continue;
    out.push(`## ${tr(s.roman + ". " + s.title, script)}`, "");
    for (const c of cards) out.push(cardToText(c, responses[c.id], levels[c.id], script, true), "", "---", "");
    if (notes[s.id]?.trim()) out.push(`#### ${script === "latin" ? "Mening qaydlarim" : "Менинг қайдларим"}`, "", notes[s.id], "");
  }
  return out.join("\n");
}
