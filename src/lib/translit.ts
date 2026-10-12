// O‘zbek kirill yozuvidan lotin yozuviga o‘girish (1995-yilgi rasmiy alifbo qoidalari asosida).

const VOWELS = "аеёиоуэюяўАЕЁИОУЭЮЯЎ";
const BASE: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", ё: "yo", ж: "j", з: "z", и: "i", й: "y", к: "k", л: "l",
  м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "x", ч: "ch", ш: "sh",
  щ: "sh", ъ: "’", ы: "i", ь: "", э: "e", ю: "yu", я: "ya", ў: "o‘", қ: "q", ғ: "g‘", ҳ: "h",
};

const isCyr = (ch: string) => /[Ѐ-ӿ]/.test(ch);
const isUpper = (ch: string) => ch !== ch.toLowerCase();

function convertWord(word: string): string {
  const letters = [...word].filter((c) => /\p{L}/u.test(c));
  const allCaps = letters.length > 1 && letters.every((c) => !/\p{L}/u.test(c) || isUpper(c));
  let out = "";
  const chars = [...word];
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (!isCyr(ch)) {
      out += ch;
      continue;
    }
    const lower = ch.toLowerCase();
    const prev = i > 0 ? chars[i - 1] : "";
    let lat: string;
    if (lower === "е") {
      const start = i === 0 || !isCyr(prev);
      lat = start || VOWELS.includes(prev) || prev === "ъ" || prev === "Ъ" || prev === "ь" ? "ye" : "e";
    } else if (lower === "ц") {
      const start = i === 0 || !isCyr(prev);
      lat = !start && VOWELS.includes(prev) ? "ts" : "s";
    } else {
      lat = BASE[lower] ?? ch;
    }
    if (isUpper(ch) && lat) {
      lat = allCaps ? lat.toUpperCase() : lat[0].toUpperCase() + lat.slice(1);
    }
    out += lat;
  }
  return out;
}

export function cyrToLat(text: string): string {
  if (!text || !/[Ѐ-ӿ]/.test(text)) return text;
  return text.replace(/[\p{L}’ʼ']+/gu, (w) => convertWord(w));
}

export type Script = "latin" | "cyrillic";

export const tr = (text: string, script: Script) => (script === "latin" ? cyrToLat(text) : text);
