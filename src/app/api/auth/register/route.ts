import { prisma } from "@/lib/server/db";
import { createSession, hashPassword, LOGIN_RE } from "@/lib/server/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { login, name, password } = (await req.json().catch(() => ({}))) as Record<string, string>;
  const l = String(login ?? "").trim().toLowerCase();
  if (!LOGIN_RE.test(l)) return Response.json({ error: "Login 3-32 ta lotin harfi, raqam yoki . _ - belgilaridan iborat bo‘lsin." }, { status: 400 });
  if (String(password ?? "").length < 8) return Response.json({ error: "Parol kamida 8 belgidan iborat bo‘lsin." }, { status: 400 });
  if (await prisma.user.findUnique({ where: { login: l } })) return Response.json({ error: "Bu login band. Boshqasini tanlang." }, { status: 409 });
  const user = await prisma.user.create({
    data: { login: l, name: String(name ?? "").trim().slice(0, 80) || l, passwordHash: hashPassword(password) },
    select: { id: true, login: true, name: true },
  });
  await createSession(user.id);
  return Response.json({ user });
}
