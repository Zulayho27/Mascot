import { currentUser } from "@/lib/server/auth";
import { buildSystemPrompt, demoReply, detectSafety, SAFETY_MARKER, type QuickAction } from "@/lib/facilitator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  messages: { role: "user" | "assistant"; content: string }[];
  cardContext: string;
  cardTitle: string;
  emptyPrompts?: string[];
  filledSnippets?: string[];
  action?: QuickAction;
  script?: "latin" | "cyrillic";
}

type Provider = "openai" | "gemini" | "anthropic" | "demo";

function pickProvider(): Provider {
  const p = (process.env.AI_PROVIDER ?? "").toLowerCase();
  if (p === "openai" && process.env.OPENAI_API_KEY) return "openai";
  if (p === "gemini" && process.env.GEMINI_API_KEY) return "gemini";
  if (p === "anthropic" && process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return "demo";
}

const enc = new TextEncoder();
const sse = (obj: unknown) => enc.encode(`data: ${JSON.stringify(obj)}\n\n`);

/** Provayderning SSE oqimini o‘qib, har bir matn bo‘lagini `onText` ga uzatadi */
async function pumpSSE(res: Response, extract: (json: any) => string | undefined, onText: (t: string) => void) {
  if (!res.ok || !res.body) throw new Error(`AI provayder xatosi: ${res.status} ${await res.text().catch(() => "")}`);
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 1);
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      try {
        const t = extract(JSON.parse(data));
        if (t) onText(t);
      } catch {
        /* to‘liq bo‘lmagan bo‘lak */
      }
    }
  }
}

async function streamProvider(provider: Provider, system: string, messages: Body["messages"], onText: (t: string) => void, signal: AbortSignal) {
  if (provider === "openai") {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        stream: true,
        temperature: 0.5,
        messages: [{ role: "system", content: system }, ...messages],
      }),
    });
    return pumpSSE(res, (j) => j.choices?.[0]?.delta?.content, onText);
  }
  if (provider === "gemini") {
    const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
          generationConfig: { temperature: 0.5 },
        }),
      },
    );
    return pumpSSE(res, (j) => j.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join(""), onText);
  }
  if (provider === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
        max_tokens: 600,
        stream: true,
        system,
        messages,
      }),
    });
    return pumpSSE(res, (j) => (j.type === "content_block_delta" ? j.delta?.text : undefined), onText);
  }
}

export async function POST(req: Request) {
  if (!(await currentUser())) return Response.json({ error: "Kirish talab qilinadi" }, { status: 401 });
  const body = (await req.json()) as Body;
  const messages = (body.messages ?? []).filter((m) => m.content?.trim()).slice(-16);
  const last = messages[messages.length - 1]?.content ?? "";
  const provider = pickProvider();

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(sse({ mode: provider }));

      // 8-qoida: xavf belgilari bo‘lsa, model chaqirilmaydi, seans to‘xtatiladi.
      const level = detectSafety(last);
      if (level) {
        controller.enqueue(sse({ safety: level }));
        controller.enqueue(enc.encode("data: [DONE]\n\n"));
        controller.close();
        return;
      }

      try {
        if (provider === "demo") {
          const text = demoReply({
            message: last,
            action: body.action,
            cardTitle: body.cardTitle,
            emptyPrompts: body.emptyPrompts ?? [],
            filledSnippets: body.filledSnippets ?? [],
          });
          for (const word of text.split(/(?<=\s)/)) {
            controller.enqueue(sse({ t: word }));
            await new Promise((r) => setTimeout(r, 18));
          }
        } else {
          let acc = "";
          let flagged = false;
          await streamProvider(provider, buildSystemPrompt(body.cardContext, body.script ?? "latin"), messages, (t) => {
            acc += t;
            if (!flagged && acc.includes(SAFETY_MARKER)) {
              flagged = true;
              controller.enqueue(sse({ safety: "model" }));
            }
            controller.enqueue(sse({ t }));
          }, req.signal);
        }
      } catch (e) {
        controller.enqueue(sse({ error: e instanceof Error ? e.message : String(e) }));
      }
      controller.enqueue(enc.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" },
  });
}
