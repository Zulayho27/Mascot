"use client";

import { useEffect, useState } from "react";
import { BookMarked, Download, Home, LogOut, Menu, Sparkles } from "lucide-react";
import { CARDS, SECTIONS, cardsInSection } from "@/data/cards";
import { useAuth } from "@/lib/auth-client";
import { cardProgress, statusOf } from "@/lib/progress";
import { switchUser, useStore, type View } from "@/lib/store";
import { tr } from "@/lib/translit";
import { cn } from "@/lib/utils";
import { AuthScreen, CycleMark } from "./auth-screen";
import { CardView, SectionView } from "./card-view";
import { Copilot } from "./copilot";
import { Dashboard, GuideView } from "./dashboard";
import { ExportView } from "./export-view";
import { Button } from "./ui/button";
import { Sheet } from "./ui/sheet";

function parseHash(): View {
  const h = typeof window !== "undefined" ? window.location.hash.slice(1) : "";
  const [k, id] = h.split("=");
  if (k === "card" && CARDS.some((c) => c.id === id)) return { kind: "card", id };
  if (k === "section" && SECTIONS.some((s) => s.id === id)) return { kind: "section", id };
  if (k === "export") return { kind: "export" };
  if (k === "guide") return { kind: "guide" };
  return { kind: "dashboard" };
}

export function App() {
  const status = useAuth((s) => s.status);
  const user = useAuth((s) => s.user);
  const mode = useAuth((s) => s.mode);

  useEffect(() => {
    useAuth.getState().init();
  }, []);

  // Har bir foydalanuvchining daftari alohida yuklanadi
  useEffect(() => {
    if (status === "loading") return;
    switchUser(user ? { id: user.id, name: user.name } : null, mode === "server").then(() => {
      if (user) useStore.setState({ view: parseHash() });
    });
  }, [status, user, mode]);

  if (status === "loading") return <Splash />;
  if (status === "anon") return <AuthScreen />;
  return <Workspace />;
}

function Splash() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <div className="animate-pulse">
        <CycleMark size={72} />
      </div>
    </div>
  );
}

function Workspace() {
  const hydrated = useStore((s) => s.hydrated);
  const view = useStore((s) => s.view);
  const copilotOpen = useStore((s) => s.copilotOpen);
  const setCopilotOpen = useStore((s) => s.setCopilotOpen);
  const [navOpen, setNavOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const onHash = () => useStore.setState({ view: parseHash() });
    window.addEventListener("hashchange", onHash);
    const mq = window.matchMedia("(min-width: 1280px)");
    const onMq = () => setIsDesktop(mq.matches);
    onMq();
    mq.addEventListener("change", onMq);
    // 9-qoida: kunlik ish vaqtini hisoblash (faqat sahifa ko‘rinib turganda)
    const timer = setInterval(() => document.visibilityState === "visible" && useStore.getState().tickUsage(1), 60_000);
    return () => {
      window.removeEventListener("hashchange", onHash);
      mq.removeEventListener("change", onMq);
      clearInterval(timer);
    };
  }, []);

  useEffect(() => setNavOpen(false), [view]);

  const cardId = view.kind === "card" ? view.id : null;

  return (
    <div className="flex min-h-dvh">
      <aside className="no-print sticky top-0 hidden h-dvh w-72 shrink-0 border-r border-border bg-card lg:flex lg:flex-col">
        <Nav />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMenu={() => setNavOpen(true)} />
        <main className="print-area mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-6 lg:py-8">
          {!hydrated ? (
            <div className="py-20 text-center text-sm text-muted-foreground">Yuklanmoqda…</div>
          ) : view.kind === "card" ? (
            <CardView id={view.id} />
          ) : view.kind === "section" ? (
            <SectionView id={view.id} />
          ) : view.kind === "export" ? (
            <ExportView />
          ) : view.kind === "guide" ? (
            <GuideView />
          ) : (
            <Dashboard />
          )}
        </main>
      </div>

      {isDesktop && copilotOpen && (
        <aside className="no-print sticky top-0 h-dvh w-[400px] shrink-0 border-l border-border bg-background">
          <Copilot cardId={cardId} />
        </aside>
      )}
      {!isDesktop && (
        <Sheet open={copilotOpen} onOpenChange={setCopilotOpen} title="AI Maslahatchi">
          <Copilot cardId={cardId} />
        </Sheet>
      )}
      <Sheet open={navOpen} onOpenChange={setNavOpen} title="Bo‘limlar va kartalar" side="left" className="max-w-xs">
        <Nav />
      </Sheet>

      {!copilotOpen && (
        <Button onClick={() => setCopilotOpen(true)} className="no-print fixed right-4 bottom-4 z-30 h-12 rounded-full px-5 shadow-lg" aria-label="AI Maslahatchini ochish">
          <Sparkles /> AI Maslahatchi
        </Button>
      )}
    </div>
  );
}

function Header({ onMenu }: { onMenu: () => void }) {
  const script = useStore((s) => s.script);
  const setScript = useStore((s) => s.setScript);
  const navigate = useStore((s) => s.navigate);
  const copilotOpen = useStore((s) => s.copilotOpen);
  const setCopilotOpen = useStore((s) => s.setCopilotOpen);
  const user = useAuth((s) => s.user);
  const [menu, setMenu] = useState(false);

  return (
    <header className="no-print sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border bg-background/85 px-3 backdrop-blur sm:px-4">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenu} aria-label="Menyu">
        <Menu />
      </Button>
      <div className="ml-auto flex items-center gap-1">
        <div className="flex rounded-lg bg-muted p-0.5 text-xs font-semibold" role="group" aria-label="Yozuv">
          {(["latin", "cyrillic"] as const).map((s) => (
            <button key={s} onClick={() => setScript(s)} className={cn("rounded-md px-2 py-1", script === s ? "bg-card shadow-sm" : "text-muted-foreground")}>
              {s === "latin" ? "Lotin" : "Кирилл"}
            </button>
          ))}
        </div>
        <Button variant="ghost" size="icon" title="Qoidalar va shkala" onClick={() => navigate({ kind: "guide" })}>
          <BookMarked />
        </Button>
        <Button variant="ghost" size="icon" title="Eksport" onClick={() => navigate({ kind: "export" })}>
          <Download />
        </Button>
        <Button variant={copilotOpen ? "secondary" : "outline"} size="sm" className="h-9" title="AI Maslahatchi" onClick={() => setCopilotOpen(!copilotOpen)}>
          <Sparkles /> <span className="hidden sm:inline">AI Maslahatchi</span>
        </Button>
        <div className="relative">
          <button
            onClick={() => setMenu(!menu)}
            className="ml-1 flex size-9 items-center justify-center rounded-full bg-primary font-serif text-sm font-semibold text-primary-foreground"
            aria-label="Akkaunt"
          >
            {(user?.name || user?.login || "?").slice(0, 1).toUpperCase()}
          </button>
          {menu && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-card p-2 shadow-lg">
              <div className="px-2 py-1.5">
                <div className="text-sm font-semibold">{user?.name}</div>
                <div className="text-xs text-muted-foreground">@{user?.login}</div>
              </div>
              <button
                onClick={() => {
                  setMenu(false);
                  useAuth.getState().logout();
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-danger hover:bg-muted"
              >
                <LogOut className="size-4" /> Chiqish
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function Nav() {
  const script = useStore((s) => s.script);
  const responses = useStore((s) => s.responses);
  const view = useStore((s) => s.view);
  const navigate = useStore((s) => s.navigate);
  const activeCard = view.kind === "card" ? view.id : null;
  const activeSection = view.kind === "section" ? view.id : activeCard ? CARDS.find((c) => c.id === activeCard)?.sectionId : null;
  const [open, setOpen] = useState<string | null>(activeSection ?? null);
  useEffect(() => setOpen(activeSection ?? null), [activeSection]);

  return (
    <nav className="flex h-full flex-col overflow-y-auto px-3 py-4 text-sm">
      <button onClick={() => navigate({ kind: "dashboard" })} className="mb-4 flex items-center gap-2.5 px-2 text-left">
        <CycleMark size={30} />
        <span className="font-serif text-[13px] leading-tight font-semibold">Shaxsiy rivojlanish tizimi</span>
      </button>
      <button
        onClick={() => navigate({ kind: "dashboard" })}
        className={cn("mb-2 flex w-full items-center gap-2 rounded-lg px-2 py-2 font-semibold hover:bg-muted", view.kind === "dashboard" && "bg-muted")}
      >
        <Home className="size-4" /> Bosh sahifa
      </button>
      {SECTIONS.map((s) => {
        const cards = cardsInSection(s.id);
        const done = cards.filter((c) => statusOf(cardProgress(c, responses[c.id])) !== "empty").length;
        const isOpen = open === s.id;
        return (
          <div key={s.id} className="mb-0.5" style={{ "--sec": s.color } as React.CSSProperties}>
            <button
              onClick={() => {
                setOpen(isOpen ? null : s.id);
                navigate({ kind: "section", id: s.id });
              }}
              className={cn("flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-muted", activeSection === s.id && "sec-tint")}
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-[var(--sec)] text-[10px] font-bold text-white">{s.roman}</span>
              <span className="flex-1 leading-snug">{tr(s.title, script)}</span>
              <span className="text-[11px] tabular-nums text-muted-foreground">
                {done}/{cards.length}
              </span>
            </button>
            {isOpen && (
              <div className="mt-0.5 mb-2 ml-5 space-y-0.5 border-l-2 border-[var(--sec)]/40 pl-2.5">
                {cards.map((c) => {
                  const st = statusOf(cardProgress(c, responses[c.id]));
                  return (
                    <button
                      key={c.id}
                      onClick={() => navigate({ kind: "card", id: c.id })}
                      className={cn("flex w-full items-start gap-2 rounded-md px-2 py-1 text-left text-[13px] hover:bg-muted", activeCard === c.id && "sec-tint font-semibold")}
                    >
                      <span className={cn("mt-1.5 size-2 shrink-0 rounded-full border-2 border-[var(--sec)]", st === "done" && "bg-[var(--sec)]", st === "started" && "bg-[var(--sec)]/40")} />
                      <span className="leading-snug">
                        {c.number}. {tr(c.title, script)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
