import { useEffect, useState } from 'react';
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Link, Route, Router as WouterRouter, Switch, useLocation, useParams } from 'wouter';
import {
  ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, ChevronRight, CircleHelp,
  Clock3, FileCheck2, Flag, GraduationCap, LayoutDashboard, ListChecks, LockKeyhole,
  Menu, PencilLine, Play, RotateCcw, Send, Sparkles, Target, TimerReset, TrendingUp,
  X, Zap,
} from 'lucide-react';
import {
  getGetAdminSessionQueryKey, getGetAdminSummaryQueryKey, getGetAttemptQueryKey, getGetDashboardQueryKey,
  getGetExamQueryKey, getGetResultQueryKey, getListAdminExamsQueryKey,
  getListExamsQueryKey, getListResultsQueryKey, useGetAdminSummary, useGetAttempt,
  useAdminLogin, useAdminLogout, useGetAdminSession, useGetDashboard, useGetExam,
  useGetResult, useListAdminExams, useListExams, useListResults, useSaveAttempt,
  useStartAttempt, useSubmitAttempt, useUpdateAdminExam,
} from '@workspace/api-client-react';
import type { AdminExam, ExamSummary, Question, ResultSummary } from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import NotFound from '@/pages/not-found';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import './index.css';

const queryClient = new QueryClient();

function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className={`flex items-center gap-2.5 focus-ring rounded-lg ${light ? 'text-sidebar-foreground' : 'text-foreground'}`} data-testid="link-logo">
      <span className={`grid h-9 w-9 place-items-center rounded-[11px] ${light ? 'bg-accent text-primary' : 'bg-primary text-primary-foreground'}`}>
        <span className="font-mono text-sm font-medium tracking-tighter">Ex</span>
      </span>
      <span className="text-lg font-bold tracking-[-.04em]">examio</span>
    </Link>
  );
}

function Button({ children, variant = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'quiet' | 'outline' | 'danger' }) {
  const styles = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_4px_0_hsl(var(--primary)/.18)]',
    quiet: 'bg-muted text-foreground hover:bg-muted/70',
    outline: 'border border-border bg-card text-foreground hover:border-secondary-foreground/40 hover:bg-secondary/40',
    danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  };
  return <button className={`focus-ring inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:pointer-events-none disabled:opacity-50 ${styles[variant]} ${className}`} {...props}>{children}</button>;
}

function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'mint' | 'yellow' | 'coral' | 'navy' }) {
  const tones = {
    neutral: 'bg-muted text-muted-foreground',
    mint: 'bg-secondary text-secondary-foreground',
    yellow: 'bg-accent text-accent-foreground',
    coral: 'bg-destructive/10 text-destructive',
    navy: 'bg-primary text-primary-foreground',
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide ${tones[tone]}`}>{children}</span>;
}

function Card({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-2xl border border-card-border bg-card shadow-[0_10px_30px_hsl(var(--primary)/.04)] ${className}`} {...props}>{children}</div>;
}

function LoadingState({ label = 'Laddar innehåll' }: { label?: string }) {
  return <div className="space-y-4 py-6" data-testid="status-loading">
    <div className="h-6 w-44 animate-pulse rounded-lg bg-muted" />
    <div className="h-24 animate-pulse rounded-2xl bg-muted" />
    <div className="h-24 animate-pulse rounded-2xl bg-muted" />
    <p className="font-mono text-xs text-muted-foreground">{label} ...</p>
  </div>;
}

function ErrorState({ retry }: { retry: () => void }) {
  return <Card className="border-destructive/20 bg-destructive/5 p-6" data-testid="status-error">
    <div className="flex items-start gap-4">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-destructive/10 text-destructive"><X size={18} /></div>
      <div><h2 className="font-semibold">Något gick snett</h2><p className="mt-1 text-sm text-muted-foreground">Vi kunde inte hämta informationen just nu.</p><Button variant="outline" className="mt-4" onClick={retry} data-testid="button-retry">Försök igen</Button></div>
    </div>
  </Card>;
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return <Card className="grid min-h-48 place-items-center p-8 text-center" data-testid="status-empty">
    <div><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-secondary text-secondary-foreground"><BookOpen size={21} /></div><h2 className="mt-4 font-semibold">{title}</h2><p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{text}</p></div>
  </Card>;
}

function useDisplayName() {
  const [displayName, setDisplayName] = useState('');
  useEffect(() => {
    const read = () => setDisplayName(window.localStorage.getItem('examio_display_name') ?? '');
    const update = () => read();
    read();
    window.addEventListener('examio-display-name-change', update);
    return () => window.removeEventListener('examio-display-name-change', update);
  }, []);
  const saveDisplayName = (name: string) => {
    const value = name.trim().slice(0, 60);
    if (!value) return;
    window.localStorage.setItem('examio_display_name', value);
    setDisplayName(value);
    window.dispatchEvent(new Event('examio-display-name-change'));
  };
  return { displayName, saveDisplayName };
}

function DisplayNameSetup() {
  const { saveDisplayName } = useDisplayName();
  const [name, setName] = useState('');
  return <Card className="mb-8 border-secondary-foreground/20 bg-secondary/25 p-5 sm:p-6" data-testid="card-display-name-setup">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div><p className="font-mono text-[10px] uppercase tracking-[.18em] text-secondary-foreground">Personlig översikt</p><h2 className="mt-1 text-lg font-semibold">Vad vill du bli kallad?</h2><p className="mt-1 text-sm text-muted-foreground">Namnet sparas bara på den här enheten och kräver inget konto.</p></div>
      <form className="flex w-full gap-2 sm:max-w-sm" onSubmit={(event) => { event.preventDefault(); saveDisplayName(name); }}><input value={name} onChange={(event) => setName(event.target.value)} maxLength={60} placeholder="Ditt namn" className="focus-ring min-w-0 flex-1 rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none" aria-label="Ditt visningsnamn" data-testid="input-display-name" /><Button type="submit" disabled={!name.trim()} data-testid="button-save-display-name">Spara</Button></form>
    </div>
  </Card>;
}

function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();
  const { displayName } = useDisplayName();
  const initials = displayName ? displayName.slice(0, 1).toUpperCase() : '?';
  const nav = [
    { href: '/dashboard', label: 'Översikt', icon: LayoutDashboard },
    { href: '/results', label: 'Mina resultat', icon: TrendingUp },
    { href: '/admin', label: 'Administration', icon: PencilLine },
  ];
  return <div className="paper-grain min-h-[100dvh] bg-background">
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-sidebar px-5 py-6 text-sidebar-foreground transition-transform duration-300 md:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex items-center justify-between"><Logo light /><button className="rounded-lg p-2 text-sidebar-foreground/70 hover:bg-sidebar-accent md:hidden" onClick={() => setOpen(false)} aria-label="Stäng meny" data-testid="button-close-menu"><X size={18} /></button></div>
      <div className="mt-12"><p className="mb-3 px-3 font-mono text-[10px] uppercase tracking-[.18em] text-sidebar-foreground/45">Arbetsyta</p><nav className="space-y-1">{nav.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setOpen(false)} className={`focus-ring flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${location === href ? 'bg-sidebar-accent text-sidebar-foreground' : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground'}`} data-testid={`link-nav-${label.toLowerCase().replace(' ', '-')}`}><Icon size={17} strokeWidth={1.8} /><span>{label}</span>{location === href && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" />}</Link>)}</nav></div>
      <div className="mt-auto rounded-2xl border border-sidebar-border bg-sidebar-accent/50 p-4"><div className="flex items-center gap-2 text-accent"><Sparkles size={15} /><span className="text-xs font-semibold">Lärande före betyg</span></div><p className="mt-2 text-xs leading-relaxed text-sidebar-foreground/55">Examio hjälper dig se nästa steg. Det här är övning, inte ett officiellt betyg.</p></div>
       <div className="mt-5 flex items-center gap-3 border-t border-sidebar-border pt-5"><div className="grid h-9 w-9 place-items-center rounded-full bg-accent font-semibold text-primary">{initials}</div><div><p className="text-sm font-semibold">{displayName || 'Ditt namn'}</p><p className="font-mono text-[10px] text-sidebar-foreground/45">ÅRSKURS 8</p></div></div>
    </aside>
    {open && <button className="fixed inset-0 z-30 bg-primary/30 md:hidden" onClick={() => setOpen(false)} aria-label="Stäng meny" data-testid="button-menu-overlay" />}
     <main className="min-h-[100dvh] md:pl-64"><header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border/70 bg-background/90 px-5 backdrop-blur md:px-10"><button className="rounded-lg p-2 text-muted-foreground hover:bg-muted md:hidden" onClick={() => setOpen(true)} aria-label="Öppna meny" data-testid="button-open-menu"><Menu size={21} /></button><div className="hidden md:block"><p className="font-mono text-[10px] uppercase tracking-[.2em] text-muted-foreground">Examio / lär dig på vägen</p></div><div className="flex items-center gap-3"><div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex"><span className="h-2 w-2 rounded-full bg-secondary-foreground" /> Allt sparas automatiskt</div><div className="grid h-8 w-8 place-items-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">{initials}</div></div></header>{children}</main>
  </div>;
}

function Landing() {
  return <div className="min-h-[100dvh] overflow-hidden bg-background">
    <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10"><Logo /><div className="flex items-center gap-2"><Link href="/admin/login" className="focus-ring rounded-xl border border-border px-4 py-2 text-sm font-semibold transition hover:border-primary" data-testid="link-admin-login">Admininloggning <LockKeyhole size={14} className="ml-1 inline" /></Link></div></header>
    <section className="relative mx-auto grid max-w-7xl gap-12 px-6 pb-20 pt-16 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:px-10 lg:pb-32 lg:pt-24"><div className="absolute -right-28 -top-32 h-96 w-96 rounded-full bg-accent/20 blur-3xl" /><div className="relative rise-in"><Badge tone="mint">ÖVNING FÖR ÅRSKURS 8</Badge><h1 className="mt-6 max-w-2xl text-balance text-5xl font-bold leading-[.98] tracking-[-.065em] text-primary sm:text-7xl">Prova. Förstå.<br /><span className="text-secondary-foreground">Kom vidare.</span></h1><p className="mt-7 max-w-lg text-lg leading-relaxed text-muted-foreground">Examio är platsen där du tränar inför prov och får veta mer än bara rätt eller fel. Se vad du redan kan — och vad som blir ditt nästa steg.</p><div className="mt-9 flex flex-wrap gap-3"><Link href="/dashboard" className="focus-ring inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground shadow-[0_5px_0_hsl(var(--primary)/.2)] transition hover:-translate-y-0.5" data-testid="link-start-learning">Börja träna <ArrowRight size={16} /></Link><a href="#sa-fungerar-det" className="focus-ring inline-flex items-center gap-2 rounded-xl px-5 py-3.5 text-sm font-semibold text-foreground hover:bg-muted" data-testid="link-how-it-works">Så fungerar det <ChevronRight size={16} /></a></div><p className="mt-6 flex items-center gap-2 text-xs text-muted-foreground"><LockKeyhole size={13} /> Dina svar är privata och till för ditt lärande.</p></div><div className="relative rise-in-delay"><div className="grid-paper relative mx-auto max-w-[480px] rounded-[2rem] border border-border bg-card p-4 shadow-[0_30px_80px_hsl(var(--primary)/.12)] sm:p-6"><div className="rounded-[1.4rem] bg-primary p-6 text-primary-foreground sm:p-8"><div className="flex items-start justify-between"><span className="font-mono text-[10px] uppercase tracking-[.2em] text-primary-foreground/60">Din översikt</span><Target size={18} className="text-accent" /></div><h2 className="mt-10 text-3xl font-semibold tracking-tight">Dina riktiga resultat samlas här.</h2><p className="mt-4 text-sm leading-relaxed text-primary-foreground/65">Gör ett övningsprov för att få personlig återkoppling och se vad du vill träna vidare på.</p><div className="mt-8 flex items-center gap-3 rounded-xl bg-primary-foreground/10 p-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-primary"><Check size={17} /></span><span className="text-sm">Börja med ett prov i din egen takt.</span></div></div><div className="flex items-center justify-between px-3 pb-2 pt-5"><div><p className="font-mono text-[10px] uppercase tracking-[.16em] text-muted-foreground">Nästa steg</p><p className="mt-1 text-sm font-semibold">Välj ett ämne att träna på</p></div><span className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-secondary-foreground"><ArrowRight size={17} /></span></div></div></div></section>
    <section id="sa-fungerar-det" className="border-y border-border bg-card"><div className="mx-auto grid max-w-7xl gap-8 px-6 py-16 lg:grid-cols-3 lg:px-10 lg:py-20">{[['01','Gör ett prov','Välj ett område och testa dina kunskaper i din egen takt.'],['02','Få syn på hur du lär','Varje svar blir en ledtråd — inte bara en poäng.'],['03','Välj ditt nästa steg','Få konkret återkoppling att ta med till nästa försök.']].map(([n, t, d]) => <div key={n} className="rise-in-delay-2 border-l-2 border-accent pl-5"><span className="font-mono text-xs text-secondary-foreground">{n}</span><h2 className="mt-4 text-xl font-semibold tracking-tight">{t}</h2><p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">{d}</p></div>)}</div></section>
    <section className="mx-auto max-w-7xl px-6 py-20 lg:px-10"><div className="grid items-center gap-10 lg:grid-cols-[.8fr_1.2fr]"><div><span className="font-mono text-xs uppercase tracking-[.18em] text-secondary-foreground">Mer än ett resultat</span><h2 className="mt-4 max-w-md text-4xl font-bold leading-tight tracking-[-.05em] text-primary">Rätt svar visar var du är. Återkoppling visar vägen.</h2></div><div className="grid gap-4 sm:grid-cols-2"><Card className="p-6"><CircleHelp className="text-secondary-foreground" size={22} /><h3 className="mt-6 font-semibold">Förklarar dina mönster</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Se om du behöver träna på begrepp, resonemang eller metod — inte bara hur många rätt du fick.</p></Card><Card className="bg-accent p-6"><Zap className="text-primary" size={22} /><h3 className="mt-6 font-semibold text-primary">Bygger självförtroende</h3><p className="mt-2 text-sm leading-relaxed text-primary/70">Små, tydliga framsteg gör det lättare att fortsätta när något känns svårt.</p></Card></div></div></section>
    <footer className="border-t border-border px-6 py-8 lg:px-10"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 text-xs text-muted-foreground sm:flex-row"><span>© Examio — övning för att förstå mer.</span><span>Detta är en övningsbedömning, inte ett officiellt betyg.</span></div></footer>
  </div>;
}

function PageHeading({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return <div className="rise-in"><p className="font-mono text-[10px] uppercase tracking-[.2em] text-secondary-foreground">{eyebrow}</p><h1 className="mt-3 text-4xl font-bold tracking-[-.055em] text-primary sm:text-5xl">{title}</h1>{text && <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">{text}</p>}</div>;
}

function ExamCard({ exam }: { exam: ExamSummary }) {
  return <Card className="group flex h-full flex-col p-5 transition duration-300 hover:-translate-y-1 hover:shadow-[0_16px_35px_hsl(var(--primary)/.1)]" data-testid={`card-exam-${exam.id}`}><div className="flex items-center justify-between"><Badge tone={exam.subject.toLowerCase().includes('mat') ? 'yellow' : 'mint'}>{exam.subject}</Badge><span className="font-mono text-[10px] text-muted-foreground">{exam.gradeLevel}</span></div><h3 className="mt-5 text-xl font-semibold tracking-tight">{exam.title}</h3><p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{exam.description}</p><div className="mt-auto flex items-center gap-4 border-t border-border pt-5 mt-6 text-xs text-muted-foreground"><span className="flex items-center gap-1.5"><ListChecks size={14} /> {exam.questionCount} frågor</span>{exam.durationMinutes && <span className="flex items-center gap-1.5"><Clock3 size={14} /> {exam.durationMinutes} min</span>}<Link href={`/exam/${exam.id}`} className="focus-ring ml-auto inline-flex items-center gap-1 font-semibold text-secondary-foreground hover:underline" data-testid={`link-exam-${exam.id}`}>Öppna <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" /></Link></div></Card>;
}

function ResultRow({ result }: { result: ResultSummary }) {
  return <Link href={`/result/${result.id}`} className="focus-ring flex items-center gap-4 rounded-xl px-3 py-3 transition hover:bg-muted" data-testid={`link-result-${result.id}`}><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-sm font-bold text-secondary-foreground">{Math.round(result.scorePercent)}%</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{result.examTitle}</p><p className="mt-0.5 text-xs text-muted-foreground">{result.subject} · {new Date(result.completedAt).toLocaleDateString('sv-SE')}</p></div><ChevronRight size={17} className="text-muted-foreground" /></Link>;
}

function Dashboard() {
  const dashboard = useGetDashboard({ query: { queryKey: getGetDashboardQueryKey() } });
  const exams = useListExams({ query: { queryKey: getListExamsQueryKey() } });
  const { displayName } = useDisplayName();
  if (dashboard.isLoading) return <div className="mx-auto max-w-6xl px-5 py-10"><LoadingState label="Förbereder din översikt" /></div>;
  if (dashboard.isError || !dashboard.data) return <div className="mx-auto max-w-6xl px-5 py-10"><ErrorState retry={() => dashboard.refetch()} /></div>;
  const data = dashboard.data;
  return <div className="mx-auto max-w-6xl px-5 py-10 lg:px-10">{!displayName && <DisplayNameSetup />}<PageHeading eyebrow="Din översikt" title={displayName ? `Hej ${displayName}.` : 'Vad vill du träna på idag?'} text="Välj ett prov och träna i din egen takt — ett prov i taget." /><div className="mt-10"><section><div className="mb-4 flex items-end justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">Att träna på</p><h2 className="mt-1 text-xl font-semibold">Tillgängliga prov</h2></div><Link href="/results" className="focus-ring text-sm font-semibold text-secondary-foreground hover:underline" data-testid="link-see-all-results">Se resultat <ArrowRight size={14} className="ml-1 inline" /></Link></div>{exams.isLoading ? <LoadingState /> : exams.isError ? <ErrorState retry={() => exams.refetch()} /> : exams.data?.length ? <div className="grid gap-4 sm:grid-cols-2">{exams.data.slice(0, 4).map((exam) => <ExamCard key={exam.id} exam={exam} />)}</div> : <EmptyState title="Inga prov just nu" text="När nya övningar publiceras dyker de upp här." />}</section></div><section className="mt-10"><div className="mb-4 flex items-end justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">Din historik</p><h2 className="mt-1 text-xl font-semibold">Senaste resultat</h2></div><Link href="/results" className="focus-ring text-sm font-semibold text-secondary-foreground hover:underline" data-testid="link-results-history">Visa historik <ArrowRight size={14} className="ml-1 inline" /></Link></div><Card className="divide-y divide-border p-2">{data.recentResults?.length ? data.recentResults.map((result) => <ResultRow key={result.id} result={result} />) : <EmptyState title="Ditt första resultat väntar" text="Gör ett övningsprov så blir din historik tillgänglig här." />}</Card></section></div>;
}

function ExamDetailPage() {
  const { examId = '' } = useParams<{ examId: string }>();
  const [, setLocation] = useLocation();
  const exam = useGetExam(examId, { query: { queryKey: getGetExamQueryKey(examId), enabled: Boolean(examId) } });
  const start = useStartAttempt();
  if (exam.isLoading) return <div className="mx-auto max-w-5xl px-5 py-10"><LoadingState label="Hämtar provet" /></div>;
  if (exam.isError || !exam.data) return <div className="mx-auto max-w-5xl px-5 py-10"><ErrorState retry={() => exam.refetch()} /></div>;
  const data = exam.data;
  const handleStart = () => start.mutate({ data: { examId } }, { onSuccess: (attempt) => setLocation(`/attempt/${attempt.id}`) });
  return <div className="mx-auto max-w-5xl px-5 py-10 lg:px-10"><Link href="/dashboard" className="focus-ring inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground" data-testid="link-back-dashboard"><ArrowLeft size={15} /> Till översikten</Link><div className="mt-9 grid gap-8 lg:grid-cols-[1fr_300px]"><div><div className="flex flex-wrap gap-2"><Badge tone="mint">{data.subject}</Badge><Badge>{data.gradeLevel}</Badge><Badge tone="yellow">{data.difficulty}</Badge></div><h1 className="mt-5 text-5xl font-bold leading-[.98] tracking-[-.065em] text-primary sm:text-6xl">{data.title}</h1><p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">{data.description}</p><div className="mt-9 flex flex-wrap gap-6 border-y border-border py-5 text-sm"><span className="flex items-center gap-2"><ListChecks size={16} className="text-secondary-foreground" /><strong>{data.questionCount}</strong> frågor</span>{data.durationMinutes && <span className="flex items-center gap-2"><Clock3 size={16} className="text-secondary-foreground" /><strong>{data.durationMinutes}</strong> minuter</span>}<span className="flex items-center gap-2"><Sparkles size={16} className="text-secondary-foreground" /> Övningsbedömning</span></div><div className="mt-9"><h2 className="text-lg font-semibold">Det här tränar du på</h2><div className="mt-4 space-y-3">{data.sections?.map((section, i) => <div key={section.title} className="flex gap-4 rounded-xl border border-border bg-card p-4"><span className="font-mono text-xs text-secondary-foreground">0{i + 1}</span><div><h3 className="text-sm font-semibold">{section.title}</h3><p className="mt-1 text-sm text-muted-foreground">{section.description}</p></div></div>)}</div></div></div><Card className="h-fit p-6 lg:sticky lg:top-24"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-accent text-primary"><Play size={20} fill="currentColor" /></div><h2 className="mt-5 text-xl font-semibold">Redo att börja?</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Du kan pausa när du vill. Dina svar sparas automatiskt.</p><Button className="mt-6 w-full" onClick={handleStart} disabled={start.isPending} data-testid="button-start-exam">{start.isPending ? 'Startar...' : 'Starta övningsprov'} <ArrowRight size={16} /></Button><p className="mt-4 text-center text-[11px] leading-relaxed text-muted-foreground">Detta är en övningsbedömning och påverkar inte ditt officiella betyg.</p></Card></div></div>;
}

function QuestionNavigator({ questions, current, answers, marked, onChange }: { questions: Question[]; current: number; answers: Record<string, string>; marked: Set<string>; onChange: (i: number) => void }) {
  return <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 lg:grid-cols-5">{questions.map((question, i) => <button key={question.id} onClick={() => onChange(i)} className={`focus-ring relative grid h-9 w-9 place-items-center rounded-lg font-mono text-xs transition ${i === current ? 'bg-primary text-primary-foreground' : answers[question.id] ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`} aria-label={`Fråga ${question.number}`} data-testid={`button-question-${question.number}`}>{question.number}{marked.has(question.id) && <Flag size={9} className="absolute -right-1 -top-1 fill-accent text-accent-foreground" />}</button>)}</div>;
}

function AttemptPage() {
  const { attemptId = '' } = useParams<{ attemptId: string }>();
  const [, setLocation] = useLocation();
  const attempt = useGetAttempt(attemptId, { query: { queryKey: getGetAttemptQueryKey(attemptId), enabled: Boolean(attemptId), refetchOnMount: 'always' } });
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [marked, setMarked] = useState<Set<string>>(new Set());
  const [remaining, setRemaining] = useState<number | null>(null);
  const save = useSaveAttempt();
  const submit = useSubmitAttempt();
  const detail = useGetExam(attempt.data?.examId ?? '', { query: { queryKey: getGetExamQueryKey(attempt.data?.examId ?? ''), enabled: Boolean(attempt.data?.examId) } });
  useEffect(() => { if (attempt.data) { setCurrent(attempt.data.currentQuestion || 0); const initial: Record<string, string> = {}; const initialMarked = new Set<string>(); attempt.data.answers?.forEach((a) => { initial[a.questionId] = a.answer; if (a.marked) initialMarked.add(a.questionId); }); setAnswers(initial); setMarked(initialMarked); } }, [attempt.data]);
  useEffect(() => { if (!attempt.data || !detail.data?.durationMinutes) return; const end = new Date(attempt.data.startedAt).getTime() + detail.data.durationMinutes * 60000; const tick = () => setRemaining(Math.max(0, Math.ceil((end - Date.now()) / 60000))); tick(); const timer = window.setInterval(tick, 30000); return () => window.clearInterval(timer); }, [attempt.data, detail.data?.durationMinutes]);
  if (attempt.isLoading || detail.isLoading) return <div className="mx-auto max-w-5xl px-5 py-10"><LoadingState label="Öppnar ditt prov" /></div>;
  if (attempt.isError || detail.isError || !attempt.data || !detail.data) return <div className="mx-auto max-w-5xl px-5 py-10"><ErrorState retry={() => attempt.refetch()} /></div>;
  const questions = detail.data.questions || [];
  const question = questions[current];
  if (!question) return <div className="mx-auto max-w-5xl px-5 py-10"><EmptyState title="Inga frågor hittades" text="Provet verkar inte ha några frågor än." /></div>;
  const answer = answers[question.id] || '';
  const persist = (value: string, isMarked = marked.has(question.id)) => save.mutate({ attemptId, data: { questionId: question.id, answer: value, marked: isMarked } });
  const choose = (value: string) => { setAnswers((old) => ({ ...old, [question.id]: value })); persist(value); };
  const toggleMark = () => { const next = new Set(marked); next.has(question.id) ? next.delete(question.id) : next.add(question.id); setMarked(next); persist(answer, next.has(question.id)); };
  const finish = () => { if (window.confirm('Vill du lämna in provet? Du kan inte ändra svaren efteråt.')) submit.mutate({ attemptId }, { onSuccess: (result) => setLocation(`/result/${result.id}`) }); };
  return <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-10"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><Link href="/dashboard" className="focus-ring rounded-lg p-2 text-muted-foreground hover:bg-muted" aria-label="Lämna provet" data-testid="link-leave-attempt"><ArrowLeft size={17} /></Link><div><p className="font-mono text-[10px] uppercase tracking-[.17em] text-muted-foreground">{detail.data.subject} / {detail.data.title}</p><p className="mt-1 text-sm font-semibold">Fråga {question.number} av {questions.length}</p></div></div><div className={`flex items-center gap-2 rounded-xl px-3 py-2 font-mono text-sm ${remaining !== null && remaining <= 5 ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`} data-testid="status-timer"><TimerReset size={15} /> {remaining !== null ? `${remaining} min kvar` : 'Tiden räknas'}</div></div><div className="mb-6 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-secondary-foreground transition-all duration-500" style={{ width: `${((current + 1) / questions.length) * 100}%` }} /></div><div className="grid gap-6 lg:grid-cols-[210px_1fr]"><Card className="h-fit p-4 lg:sticky lg:top-24"><div className="flex items-center justify-between"><p className="text-sm font-semibold">Frågor</p><span className="font-mono text-[10px] text-muted-foreground">{Object.keys(answers).filter((key) => answers[key]).length}/{questions.length}</span></div><div className="mt-4"><QuestionNavigator questions={questions} current={current} answers={answers} marked={marked} onChange={setCurrent} /></div><div className="mt-5 border-t border-border pt-4 text-[11px] leading-relaxed text-muted-foreground"><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-secondary" /> Besvarad<br /><Flag size={10} className="mr-1 inline text-accent-foreground" /> Markera för senare</div><Button variant="outline" className="mt-5 w-full text-xs" onClick={finish} disabled={submit.isPending} data-testid="button-submit-attempt"><Send size={14} /> {submit.isPending ? 'Skickar...' : 'Lämna in prov'}</Button></Card><Card className="min-h-[500px] p-6 sm:p-10"><div className="flex items-start justify-between gap-4"><div><Badge tone="mint">{question.section || 'Övning'}</Badge><p className="mt-6 font-mono text-xs text-muted-foreground">FRÅGA {String(question.number).padStart(2, '0')} · {question.points} POÄNG</p><h1 className="mt-3 max-w-2xl text-2xl font-semibold leading-snug tracking-tight sm:text-3xl">{question.text}</h1>{question.concepts?.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{question.concepts.map((concept) => <span key={concept} className="text-xs text-muted-foreground">#{concept}</span>)}</div>}</div><button onClick={toggleMark} className={`focus-ring shrink-0 rounded-xl border p-2.5 transition ${marked.has(question.id) ? 'border-accent bg-accent text-accent-foreground' : 'border-border text-muted-foreground hover:bg-muted'}`} aria-label="Markera fråga" data-testid="button-mark-question"><Flag size={17} /></button></div>{question.imageUrl && <img src={question.imageUrl} alt="" className="mt-8 max-h-56 rounded-xl object-contain" />}{question.type === 'multiple_choice' || question.options?.length > 0 ? <div className="mt-10 grid gap-3">{question.options.map((option, i) => <button key={option} onClick={() => choose(option)} className={`focus-ring flex items-center gap-3 rounded-xl border p-4 text-left text-sm transition ${answer === option ? 'border-secondary-foreground bg-secondary/50' : 'border-border hover:border-secondary-foreground/40 hover:bg-muted'}`} data-testid={`button-answer-${i}`}><span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg font-mono text-xs ${answer === option ? 'bg-secondary-foreground text-card' : 'bg-muted text-muted-foreground'}`}>{String.fromCharCode(65 + i)}</span>{option}{answer === option && <Check size={16} className="ml-auto text-secondary-foreground" />}</button>)}</div> : <textarea value={answer} onChange={(event) => choose(event.target.value)} placeholder="Skriv ditt svar här..." className="focus-ring mt-10 min-h-44 w-full resize-y rounded-xl border border-input bg-background p-4 text-sm leading-relaxed outline-none transition focus:border-secondary-foreground" aria-label="Ditt svar" data-testid="input-answer" />}{save.isPending && <p className="mt-4 flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground soft-pulse" data-testid="status-saving"><span className="h-1.5 w-1.5 rounded-full bg-secondary-foreground" /> Sparar svar</p>}{save.isSuccess && !save.isPending && <p className="mt-4 flex items-center gap-1.5 font-mono text-[10px] text-secondary-foreground" data-testid="status-saved"><Check size={12} /> Svar sparat</p>}<div className="mt-12 flex justify-between border-t border-border pt-5"><Button variant="quiet" onClick={() => setCurrent((n) => Math.max(0, n - 1))} disabled={current === 0} data-testid="button-previous-question"><ArrowLeft size={15} /> Föregående</Button>{current === questions.length - 1 ? <Button onClick={finish} disabled={submit.isPending} data-testid="button-finish-exam">Lämna in <Send size={15} /></Button> : <Button onClick={() => setCurrent((n) => Math.min(questions.length - 1, n + 1))} data-testid="button-next-question">Nästa <ArrowRight size={15} /></Button>}</div></Card></div></div>;
}

function ResultPage() {
  const { resultId = '' } = useParams<{ resultId: string }>();
  const result = useGetResult(resultId, { query: { queryKey: getGetResultQueryKey(resultId), enabled: Boolean(resultId) } });
  if (result.isLoading) return <div className="mx-auto max-w-5xl px-5 py-10"><LoadingState label="Sammanställer din återkoppling" /></div>;
  if (result.isError || !result.data) return <div className="mx-auto max-w-5xl px-5 py-10"><ErrorState retry={() => result.refetch()} /></div>;
  const data = result.data;
  return <div className="mx-auto max-w-5xl px-5 py-10 lg:px-10">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[.2em] text-secondary-foreground">Övningsbedömning · {new Date(data.completedAt).toLocaleDateString('sv-SE')}</p>
        <h1 className="mt-3 text-4xl font-bold tracking-[-.055em] text-primary">{data.examTitle}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{data.subject} · Årskurs {data.grade}</p>
      </div>
      <Link href="/dashboard" className="focus-ring inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted" data-testid="link-result-dashboard"><ArrowLeft size={15} /> Översikten</Link>
    </div>
    <Card className="mt-8 overflow-hidden">
      <div className="grid gap-8 bg-primary p-7 text-primary-foreground sm:grid-cols-[auto_1fr] sm:items-center sm:p-10">
        <div className="grid h-36 w-36 place-items-center rounded-full border-[10px] border-accent text-center">
          <div><span className="text-4xl font-bold tracking-[-.08em]">{Math.round(data.scorePercent)}</span><span className="text-lg text-primary-foreground/60">%</span><p className="font-mono text-[9px] uppercase tracking-wider text-primary-foreground/60">helhet</p></div>
        </div>
        <div><Badge tone="yellow">Bra jobbat — du är på väg</Badge><h2 className="mt-5 text-3xl font-semibold tracking-tight">Det här är vad ditt resultat berättar.</h2><p className="mt-3 max-w-xl text-sm leading-relaxed text-primary-foreground/65">Poängen är en ögonblicksbild för övning. Använd återkopplingen för att välja vad du vill förstå bättre nästa gång.</p></div>
      </div>
      <div className="grid gap-8 p-7 sm:grid-cols-2 sm:p-10">
        <div><p className="font-mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">Det sitter redan</p><ul className="mt-4 space-y-3">{data.strengths?.map((item) => <li key={item} className="flex gap-3 text-sm leading-relaxed"><CheckCircle2 size={17} className="mt-0.5 shrink-0 text-secondary-foreground" />{item}</li>)}</ul></div>
        <div><p className="font-mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">Nästa att öva på</p><ul className="mt-4 space-y-3">{data.practiceAreas?.map((item) => <li key={item} className="flex gap-3 text-sm leading-relaxed"><Target size={17} className="mt-0.5 shrink-0 text-destructive" />{item}</li>)}</ul></div>
      </div>
    </Card>
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
      <Card className="p-6 sm:p-8">
        <div className="flex items-center gap-2"><TrendingUp size={18} className="text-secondary-foreground" /><h2 className="font-semibold">Din utveckling i delar</h2></div>
        <div className="mt-7 space-y-5">{data.dimensionScores?.map((d) => <div key={d.label}><div className="mb-2 flex justify-between text-sm"><span>{d.label}</span><span className="font-mono text-xs text-muted-foreground">{Math.round(d.score)}%</span></div><div className="h-2.5 rounded-full bg-muted"><div className="h-full rounded-full bg-secondary-foreground" style={{ width: `${Math.min(100, d.score)}%` }} /></div></div>)}</div>
      </Card>
      <Card className="bg-accent p-6 sm:p-8"><div className="flex items-center gap-2 text-primary"><Sparkles size={18} /><h2 className="font-semibold">Gyllene återkoppling</h2></div><p className="mt-6 text-lg font-medium leading-relaxed tracking-tight text-primary">“{data.goldenFeedback}”</p><p className="mt-5 text-xs leading-relaxed text-primary/65">En tanke att ta med dig till nästa övning.</p></Card>
    </div>
    <Card className="mt-6 p-6 sm:p-8">
      <div className="flex items-center gap-2"><RotateCcw size={18} className="text-secondary-foreground" /><h2 className="font-semibold">Dina nästa steg</h2></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">{data.nextSteps?.map((step, i) => <div key={step} className="rounded-xl border border-border p-4"><span className="font-mono text-xs text-secondary-foreground">0{i + 1}</span><p className="mt-3 text-sm leading-relaxed">{step}</p></div>)}</div>
      <p className="mt-7 border-t border-border pt-5 text-xs text-muted-foreground">Det här är en övningsbedömning — inte ett officiellt betyg.</p>
    </Card>
  </div>;
}

function ResultsPage() {
  const results = useListResults({ query: { queryKey: getListResultsQueryKey() } });
  return <div className="mx-auto max-w-5xl px-5 py-10 lg:px-10"><PageHeading eyebrow="Din historik" title="Resultat med riktning." text="Se vad du har tränat på och vilka mönster som börjar synas." />{results.isLoading ? <LoadingState label="Hämtar din historik" /> : results.isError ? <div className="mt-8"><ErrorState retry={() => results.refetch()} /></div> : <Card className="mt-10 divide-y divide-border p-2">{results.data?.length ? results.data.map((result) => <ResultRow key={result.id} result={result} />) : <EmptyState title="Här samlas dina resultat" text="När du har lämnat in ditt första övningsprov hittar du återkopplingen här." />}</Card>}</div>;
}

function AdminPage() {
  const summary = useGetAdminSummary({ query: { queryKey: getGetAdminSummaryQueryKey() } });
  const exams = useListAdminExams({ query: { queryKey: getListAdminExamsQueryKey() } });
  const session = useGetAdminSession({ query: { queryKey: getGetAdminSessionQueryKey() } });
  const update = useUpdateAdminExam({ request: session.data?.csrfToken ? { headers: { 'x-csrf-token': session.data.csrfToken } } : undefined });
  const logout = useAdminLogout();
  const client = useQueryClient();
  const [, setLocation] = useLocation();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState({ title: '', description: '' });
  const beginEdit = (exam: AdminExam) => { setEditing(exam.id); setDraft({ title: exam.title, description: exam.description }); };
  const saveEdit = (id: string) => update.mutate({ examId: id, data: { title: draft.title, description: draft.description } }, { onSuccess: () => { setEditing(null); client.invalidateQueries({ queryKey: getListAdminExamsQueryKey() }); } });
  const toggleStatus = (exam: AdminExam) => update.mutate({ examId: exam.id, data: { status: exam.status === 'published' ? 'draft' : 'published' } }, { onSuccess: () => { client.invalidateQueries({ queryKey: getListAdminExamsQueryKey() }); client.invalidateQueries({ queryKey: getGetAdminSummaryQueryKey() }); } });
  return <div className="mx-auto max-w-6xl px-5 py-10 lg:px-10"><div className="flex flex-wrap items-start justify-between gap-4"><PageHeading eyebrow="Administration" title="Håll övningarna skarpa." text="En enkel grund för att följa innehåll, publicering och kvalitet." /><Button variant="outline" onClick={() => logout.mutate(undefined, { onSuccess: () => { client.setQueryData(getGetAdminSessionQueryKey(), { authenticated: false, username: null, csrfToken: null }); setLocation('/admin/login'); } })} disabled={logout.isPending} data-testid="button-admin-logout"><LockKeyhole size={15} /> Logga ut</Button></div>{summary.isLoading ? <LoadingState label="Laddar statistik" /> : summary.isError || !summary.data ? <div className="mt-8"><ErrorState retry={() => summary.refetch()} /></div> : <div className="mt-9 grid grid-cols-2 gap-3 sm:grid-cols-4">{[['Prov', summary.data.totalExams], ['Frågor', summary.data.totalQuestions], ['Försök', summary.data.totalAttempts], ['Snitt', `${Math.round(summary.data.averageScore)}%`]].map(([label, value]) => <Card key={label} className="p-5"><p className="font-mono text-[10px] uppercase tracking-[.16em] text-muted-foreground">{label}</p><p className="mt-3 text-3xl font-bold tracking-[-.05em] text-primary" data-testid={`metric-admin-${label}`}>{value}</p></Card>)}</div>}<div className="mt-10 flex items-center justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">Innehåll</p><h2 className="mt-1 text-xl font-semibold">Alla övningsprov</h2></div><Badge tone="mint">{exams.data?.length ?? 0} totalt</Badge></div>{exams.isLoading ? <LoadingState /> : exams.isError ? <ErrorState retry={() => exams.refetch()} /> : <Card className="mt-4 overflow-hidden">{exams.data?.map((exam) => <div key={exam.id} className="border-b border-border p-5 last:border-0" data-testid={`row-admin-exam-${exam.id}`}>{editing === exam.id ? <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"><label className="text-xs font-semibold">Titel<input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="focus-ring mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" data-testid={`input-admin-title-${exam.id}`} /></label><label className="text-xs font-semibold">Beskrivning<input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} className="focus-ring mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" data-testid={`input-admin-description-${exam.id}`} /></label><div className="flex gap-2"><Button onClick={() => saveEdit(exam.id)} disabled={update.isPending} data-testid={`button-save-admin-${exam.id}`}><Check size={15} /> Spara</Button><Button variant="quiet" onClick={() => setEditing(null)} data-testid={`button-cancel-admin-${exam.id}`}><X size={15} /></Button></div></div> : <div className="flex flex-wrap items-center gap-4"><div className="grid h-10 w-10 place-items-center rounded-xl bg-muted text-secondary-foreground"><FileCheck2 size={18} /></div><div className="min-w-[180px] flex-1"><p className="font-semibold">{exam.title}</p><p className="mt-1 text-xs text-muted-foreground">{exam.subject} · {exam.questionCount} frågor · uppdaterad {new Date(exam.updatedAt).toLocaleDateString('sv-SE')}</p></div><Badge tone={exam.status === 'published' ? 'mint' : 'neutral'}>{exam.status === 'published' ? 'Publicerad' : 'Utkast'}</Badge><Button variant="quiet" className="px-3" onClick={() => beginEdit(exam)} aria-label={`Redigera ${exam.title}`} data-testid={`button-edit-admin-${exam.id}`}><PencilLine size={15} /></Button><Button variant="outline" className="px-3" onClick={() => toggleStatus(exam)} disabled={update.isPending} data-testid={`button-toggle-admin-${exam.id}`}>{exam.status === 'published' ? 'Avpublicera' : 'Publicera'}</Button></div>}</div>)}</Card>}</div>;
}

function AdminLoginPage() {
  const login = useAdminLogin();
  const client = useQueryClient();
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    login.mutate({ data: { username, password } }, {
      onSuccess: (session) => {
        client.setQueryData(getGetAdminSessionQueryKey(), session);
        setLocation('/admin');
      },
      onError: () => setError('Fel användarnamn eller lösenord.'),
    });
  };
  return <div className="min-h-[100dvh] bg-background px-5 py-10"><div className="mx-auto max-w-md"><Link href="/" className="focus-ring inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft size={15} /> Till startsidan</Link><Card className="mt-12 p-7 sm:p-9"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground"><LockKeyhole size={21} /></div><p className="mt-7 font-mono text-[10px] uppercase tracking-[.2em] text-secondary-foreground">Säker administratörsåtkomst</p><h1 className="mt-3 text-3xl font-bold tracking-[-.05em] text-primary">Admininloggning</h1><p className="mt-3 text-sm leading-relaxed text-muted-foreground">Logga in för att hantera Examios prov och publiceringar.</p><form className="mt-8 space-y-4" onSubmit={submit}><label className="block text-sm font-semibold">Användarnamn<input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" className="focus-ring mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none" data-testid="input-admin-username" /></label><label className="block text-sm font-semibold">Lösenord<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" className="focus-ring mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none" data-testid="input-admin-password" /></label>{error && <p className="rounded-xl bg-destructive/10 px-3 py-2.5 text-sm text-destructive" role="alert" data-testid="status-admin-login-error">{error}</p>}<Button type="submit" className="mt-2 w-full" disabled={!username || !password || login.isPending} data-testid="button-admin-login">{login.isPending ? 'Loggar in...' : 'Logga in'} <ArrowRight size={16} /></Button></form></Card></div></div>;
}

function AdminGate() {
  const session = useGetAdminSession({ query: { queryKey: getGetAdminSessionQueryKey() } });
  if (session.isLoading) return <div className="min-h-[100dvh] bg-background px-5 py-10"><div className="mx-auto max-w-md"><LoadingState label="Kontrollerar administratörsåtkomst" /></div></div>;
  if (!session.data?.authenticated) return <AdminLoginPage />;
  return <AppShell><AdminPage /></AppShell>;
}

function Router() {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}><Switch><Route path="/" component={Landing} /><Route path="/dashboard"><AppShell><Dashboard /></AppShell></Route><Route path="/exam/:examId"><AppShell><ExamDetailPage /></AppShell></Route><Route path="/attempt/:attemptId"><AppShell><AttemptPage /></AppShell></Route><Route path="/result/:resultId"><AppShell><ResultPage /></AppShell></Route><Route path="/results"><AppShell><ResultsPage /></AppShell></Route><Route path="/admin/login" component={AdminLoginPage} /><Route path="/admin" component={AdminGate} /><Route component={NotFound} /></Switch></ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;