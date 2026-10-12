import { prisma } from "@/lib/server/db";
import { currentUser } from "@/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Foydalanuvchining ish daftari (kartalar, darajalar, qaydlar) serverda saqlanadi.
export async function GET() {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Kirish talab qilinadi" }, { status: 401 });
  const wb = await prisma.workbook.findUnique({ where: { userId: user.id } });
  return Response.json({ data: wb ? JSON.parse(wb.data) : null });
}

export async function PUT(req: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Kirish talab qilinadi" }, { status: 401 });
  const text = await req.text();
  if (text.length > 2_000_000) return Response.json({ error: "Ma'lumot hajmi juda katta" }, { status: 413 });
  JSON.parse(text);
  await prisma.workbook.upsert({ where: { userId: user.id }, create: { userId: user.id, data: text }, update: { data: text } });
  return Response.json({ ok: true });
}
