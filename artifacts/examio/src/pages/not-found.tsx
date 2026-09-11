import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, FileQuestion } from 'lucide-react';
import { Link } from 'wouter';

export default function NotFound() {
  return (
    <div className="grid min-h-[100dvh] w-full place-items-center bg-background px-5">
      <Card className="w-full max-w-md border-border bg-card">
        <CardContent className="pt-6">
          <div className="mb-4 flex gap-3">
            <FileQuestion className="h-8 w-8 text-secondary-foreground" />
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">Examio / 404</p>
              <h1 className="mt-1 text-2xl font-bold text-foreground">
                Sidan finns inte
              </h1>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Länken verkar ha hamnat fel. Gå tillbaka till din översikt och fortsätt därifrån.
          </p>
          <Link href="/dashboard" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground" data-testid="link-not-found-dashboard"><ArrowLeft size={15} /> Till översikten</Link>
        </CardContent>
      </Card>
    </div>
  );
}
