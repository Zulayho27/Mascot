// Ish daftari kartalarining tuzilmasi. Matnlar asl daftardagidek kirill yozuvida saqlanadi
// va interfeysda tanlangan yozuvga (lotin/kirill) avtomatik o‘giriladi.

export type ColumnType = "text" | "scale" | "computed";

export interface TableColumn {
  key: string;
  label: string;
  type?: ColumnType;
  /** computed ustunlar uchun: qatordagi boshqa qiymatlardan hisoblanadi */
  compute?: (row: Record<string, unknown>) => number | null;
}

export type Block =
  | { type: "heading"; text: string }
  | { type: "text"; id: string; label: string; rows?: number }
  | { type: "list"; id: string; label?: string; count: number; itemLabel?: string }
  | {
      type: "taggedList";
      id: string;
      label: string;
      count: number;
      prefix?: string;
      tags: { key: string; label: string }[];
    }
  | {
      type: "checklist";
      id: string;
      label?: string;
      options: string[];
      columns?: 1 | 2 | 3;
      /** zinapoya: eng yuqori belgilangan pog‘ona hisoblanadi */
      ladder?: boolean;
    }
  | { type: "scale"; id: string; label: string; min?: number; max?: number }
  | {
      type: "table";
      id: string;
      label?: string;
      rowHeader: string;
      rows: string[];
      columns: TableColumn[];
    }
  | { type: "reference"; title?: string; headers: string[]; rows: string[][] }
  | { type: "callout"; tone: "info" | "warning" | "formula" | "check"; title: string; text: string }
  | { type: "formula"; id: string; parts: (string | { field: string })[] };

export interface Card {
  id: string;
  number: number;
  sectionId: string;
  title: string;
  intro?: string;
  blocks: Block[];
  /** jadval yoki taqqoslash interfeysi bor kartalar */
  interactive?: boolean;
}

export interface Section {
  id: string;
  roman: string;
  title: string;
  motto: string;
  /** bo‘limning o‘ziga xos rangi (navigatsiya, sarlavhalar, progress) */
  color: string;
}

export interface QuickGuideRow {
  question: string;
  sectionId: string;
  cardId: string;
  keywords: string[];
}

export type FillableBlock = Exclude<Block, { type: "heading" } | { type: "reference" } | { type: "callout" }>;

export function isFillable(b: Block): b is FillableBlock {
  return b.type !== "heading" && b.type !== "reference" && b.type !== "callout";
}
