import { prisma } from "@/lib/server/db";
import { createSession, rateLimited, verifyPassword } from "@/lib/server/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { login, password } = (await req.json().catch(() => ({}))) as Record<string, string>;
  const l = String(login ?? "").trim().toLowerCase();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  if (rateLimited(`${ip}:${l}`)) return Response.json({ error: "Juda ko‘p urinish. 15 daqiqadan keyin qayta urinib ko‘ring." }, { status: 429 });
  const user = await prisma.user.findUnique({ where: { login: l } });
  if (!user || !verifyPassword(String(password ?? ""), user.passwordHash))
    return Response.json({ error: "Login yoki parol noto‘g‘ri." }, { status: 401 });
  await createSession(user.id);
  return Response.json({ user: { id: user.id, login: user.login, name: user.name } });
}
