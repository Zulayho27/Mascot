"use client";

import { useState } from "react";
import { Eye, EyeOff, Loader2, LogIn, UserPlus } from "lucide-react";
import { FORMULA_STEPS, SECTIONS } from "@/data/cards";
import { useAuth } from "@/lib/auth-client";
import { cyrToLat } from "@/lib/translit";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Input } from "./ui/field";

/** Rivojlanish halqasi: 11 bo‘lim rangli yoy sifatida, markazda tahlil formulasi */
export function CycleMark({ size = 220, progress }: { size?: number; progress?: Record<string, number> }) {
  const sw = Math.max(3, Math.round(size * 0.065));
  const r = size / 2 - sw;
  const c = size / 2;
  const n = SECTIONS.length;
  const gap = 0.05;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden className="max-w-full">
      {SECTIONS.map((s, i) => {
        const a0 = (i / n) * Math.PI * 2 - Math.PI / 2 + gap;
        const a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2 - gap;
        const arc = (rad: number) => {
          const x0 = c + rad * Math.cos(a0);
          const y0 = c + rad * Math.sin(a0);
          const x1 = c + rad * Math.cos(a1);
          const y1 = c + rad * Math.sin(a1);
          return `M ${x0} ${y0} A ${rad} ${rad} 0 0 1 ${x1} ${y1}`;
        };
        const p = progress?.[s.id];
        return (
          <g key={s.id}>
            <path d={arc(r)} stroke={s.color} strokeOpacity={progress ? 0.22 : 1} strokeWidth={sw} strokeLinecap="round" fill="none" />
            {progress && p !== undefined && p > 0 && (
              <path d={arc(r)} stroke={s.color} strokeWidth={sw} strokeLinecap="round" fill="none" pathLength={1} strokeDasharray={`${p} 1`} />
            )}
          </g>
        );
      })}
    </svg>
  );
}

export function AuthScreen() {
  const mode = useAuth((s) => s.mode);
  const { login, register } = useAuth.getState();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ login: "", name: "", password: "", password2: "" });
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (tab === "register" && form.password !== form.password2) return setError("Parollar bir xil emas.");
    setBusy(true);
    const err = tab === "login" ? await login(form.login, form.password) : await register(form.login, form.name, form.password);
    setBusy(false);
    if (err) setError(err);
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-hero p-12 text-hero-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="font-serif text-sm font-semibold tracking-wide">Shaxsiy rivojlanish tizimi</div>
        <div className="relative flex items-center gap-10">
          <div className="relative shrink-0">
            <CycleMark size={260} />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 text-center text-[11px] font-medium opacity-80">
              {FORMULA_STEPS.map((s) => (
                <span key={s}>{cyrToLat(s)}</span>
              ))}
            </div>
          </div>
          <div>
            <h1 className="font-serif text-4xl leading-tight font-semibold">54 karta. 10 bo‘lim. Bitta sizning yo‘lingiz.</h1>
            <p className="mt-4 max-w-md text-base leading-relaxed opacity-80">
              «Menda nima noto‘g‘ri?» emas, balki «Nima sodir bo‘lyapti va bu yerda nimani rivojlantirish mumkin?»
            </p>
          </div>
        </div>
        <div className="text-xs opacity-60">Yozuvlaringiz faqat sizning akkauntingizga tegishli.</div>
      </section>

      <section className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="rise w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <CycleMark size={48} />
            <div className="font-serif text-base font-semibold">Shaxsiy rivojlanish tizimi</div>
          </div>
          <h2 className="font-serif text-2xl font-semibold">{tab === "login" ? "Xush kelibsiz" : "Akkaunt yaratish"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{tab === "login" ? "Ish daftaringizga kirish uchun login va parolni kiriting." : "Har bir ishtirokchining daftari alohida saqlanadi."}</p>

          <div className="mt-6 grid grid-cols-2 rounded-xl bg-muted p-1 text-sm font-semibold">
            {(["login", "register"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTab(t);
                  setError(null);
                }}
                className={cn("rounded-lg py-2 transition-colors", tab === t ? "bg-card shadow-sm" : "text-muted-foreground")}
              >
                {t === "login" ? "Kirish" : "Ro‘yxatdan o‘tish"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="mt-5 space-y-3">
            <Field label="Login">
              <Input id="auth-login" autoComplete="username" autoCapitalize="none" value={form.login} onChange={set("login")} placeholder="masalan: hamida" required className="h-11" />
            </Field>
            {tab === "register" && (
              <Field label="Ismingiz">
                <Input id="auth-name" autoComplete="name" value={form.name} onChange={set("name")} placeholder="Hamida" className="h-11" />
              </Field>
            )}
            <Field label="Parol">
              <div className="relative">
                <Input
                  id="auth-password"
                  type={show ? "text" : "password"}
                  autoComplete={tab === "login" ? "current-password" : "new-password"}
                  value={form.password}
                  onChange={set("password")}
                  required
                  className="h-11 pr-10"
                />
                <button type="button" onClick={() => setShow(!show)} className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-muted-foreground" aria-label="Parolni ko‘rsatish">
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </Field>
            {tab === "register" && (
              <Field label="Parolni takrorlang">
                <Input id="auth-password2" type={show ? "text" : "password"} autoComplete="new-password" value={form.password2} onChange={set("password2")} required className="h-11" />
              </Field>
            )}
            {error && <div className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}
            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : tab === "login" ? <LogIn /> : <UserPlus />}
              {tab === "login" ? "Kirish" : "Akkaunt yaratish"}
            </Button>
          </form>
          {mode === "local" && (
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              Namoyish rejimi: server ulanmagan, akkaunt faqat shu brauzerda saqlanadi.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
