# Shaxsiy rivojlanish tizimi · AI Fasilitator

Ishtirokchining ish daftari (10 bo‘lim, 54 karta) asosidagi Next.js veb-ilova.

## Ishga tushirish

```bash
npm install
cp .env.example .env         # AUTH_SECRET va (ixtiyoriy) AI kalitini kiriting
docker compose up -d         # lokal PostgreSQL
npm run db:push              # jadvallarni yaratish
npm run dev                  # http://localhost:3000
```

Har bir foydalanuvchi o‘z login va paroli bilan kiradi. Parollar scrypt bilan xeshlanadi, sessiya imzolangan httpOnly cookie’da (30 kun). Ish daftari serverda (`Workbook` jadvali) va brauzerda saqlanadi, boshqa qurilmadan kirganda ham ochiladi.

API kaliti bo‘lmasa, AI Maslahatchi **oflayn rejimda** ishlaydi: qoidalarga asoslangan sokratik savollar beradi.
`AI_PROVIDER` = `openai` | `gemini` | `anthropic`. Kalitlar faqat serverda (`/api/chat`) ishlatiladi.

Statik ko‘rinish (serversiz, AI oflayn): `src/app/api` ni vaqtincha olib tashlab `STATIC_EXPORT=1 npm run build`.

## Tuzilma

| Fayl | Vazifasi |
| --- | --- |
| `src/data/cards.ts` | 54 karta, 10+1 bo‘lim, tezkor yo‘l ko‘rsatkich, shkala va qoidalar (asl kirill matni) |
| `src/lib/translit.ts` | Kirill → lotin avtomatik o‘girish (Lotin / Кирилл almashtirgich) |
| `src/lib/store.ts` | Zustand + LocalStorage avtosaqlash, progress, suhbatlar, import/eksport |
| `src/lib/progress.ts` | To‘ldirilganlik, avtomatik hisoblashlar, Markdown/matn eksport |
| `src/lib/facilitator.ts` | 10 oltin qoida, system prompt, xavfsizlik detektori, tezkor tugmalar, oflayn fasilitator |
| `src/app/api/chat/route.ts` | SSE streaming: OpenAI / Gemini / Anthropic yoki demo |
| `src/components/*` | Dashboard, karta formalari, AI yon paneli, eksport |

## Xavfsizlik protokoli (8-qoida)

Ikki qatlam: (1) foydalanuvchi xabari brauzerda va serverda kalit so‘zlar bo‘yicha tekshiriladi (lotin, kirill, rus, ingliz) va xavf belgisi bo‘lsa model chaqirilmaydi, seans to‘xtatiladi; (2) model o‘zi xavfni sezsa `[[XAVFSIZLIK]]` belgisi bilan javob beradi va ilova seansni to‘xtatadi. Yordam raqamlari: 103, 102.

## Keyingi qadamlar

- Parolni tiklash (email orqali) hali yo‘q.
- Xavfsizlik kalit so‘zlari ro‘yxatini mutaxassis bilan ko‘rib chiqish va mahalliy ishonch telefonlarini qo‘shish.
- Real AI provayder bilan javob sifatini sinash.

## Deploy (Vercel + Neon)

1. Kodni GitHub repozitoriyga joylang.
2. vercel.com da **Add New → Project** orqali shu repozitoriyni import qiling.
3. Loyihada **Storage → Neon (Postgres)** ni ulang: `DATABASE_URL` avtomatik qo‘shiladi.
4. **Settings → Environment Variables** ga qo‘shing: `AUTH_SECRET` (kamida 32 belgi), `AI_PROVIDER` va tegishli API kaliti (`OPENAI_API_KEY` yoki `GEMINI_API_KEY`).
5. Deploy. Build vaqtida `prisma db push` jadvallarni o‘zi yaratadi.
