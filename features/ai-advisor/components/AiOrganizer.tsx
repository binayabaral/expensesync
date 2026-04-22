'use client';

import { useState, useEffect } from 'react';
import { Loader2, Building2, RefreshCw, ArrowRight, CalendarDays, Wallet, AlertTriangle } from 'lucide-react';
import { Sparkles } from 'lucide-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

type AccountRecommendation = 'KEEP' | 'REVIEW' | 'CLOSE';

type AccountHealth = {
  name: string;
  type: string;
  balance: number;
  recommendation: AccountRecommendation;
  role?: string;
  reason: string;
};

type AccountRole = {
  name: string;
  role: string;
  purpose: string;
};

type PaydayStep = {
  step: number;
  action: string;
  amount: number;
  isEstimated?: boolean;
  from: string;
  to: string;
  reason: string;
  covers?: string[];
};

type PaydayPlan = {
  salaryAccount: string;
  salaryAmount: number;
  salaryDay: number | null;
  steps: PaydayStep[];
  totalAllocated?: number;
  notes: string[];
};

type RoutineEntry = {
  day: number;
  action: string;
  account: string;
  amount?: number;
  isAutomatic: boolean;
  isVariable?: boolean;
};

type MonthlyRoutine = {
  calendar: RoutineEntry[];
  watchOut: string[];
  upcomingAnnual: string[];
};

type BudgetCategory = {
  name: string;
  recommended: number;
  actual: number;
  status: 'ok' | 'over' | 'under';
};

type BudgetAllocation = {
  monthlyIncome: number;
  fixedObligations: {
    total: number;
    breakdown: { name: string; amount: number; isEstimated?: boolean }[];
  };
  savingsTarget: { percentage: number; amount: number };
  discretionaryBudget: {
    total: number;
    categories: BudgetCategory[];
  };
  notes: string[];
};

type OrgData = {
  accountHealth: AccountHealth[];
  accountRoles: AccountRole[];
  paydayPlan: PaydayPlan;
  monthlyRoutine: MonthlyRoutine;
  budgetAllocation: BudgetAllocation;
};

type Meta = {
  createdAt: string;
  model: string;
  tier: string;
  canRefresh: boolean;
  nextRefreshAt: string;
};

const recommendationConfig: Record<AccountRecommendation, { label: string; badgeClass: string; borderClass: string }> = {
  KEEP: { label: 'Keep', badgeClass: 'bg-green-100 text-green-700 border-green-200', borderClass: 'border-l-green-500' },
  REVIEW: { label: 'Review', badgeClass: 'bg-yellow-100 text-yellow-700 border-yellow-200', borderClass: 'border-l-yellow-500' },
  CLOSE: { label: 'Close', badgeClass: 'bg-red-100 text-red-700 border-red-200', borderClass: 'border-l-destructive' }
};

const statusConfig: Record<string, { label: string; class: string }> = {
  ok: { label: 'On track', class: 'text-green-600' },
  over: { label: 'Over budget', class: 'text-destructive' },
  under: { label: 'Under', class: 'text-muted-foreground' }
};

function fmt(n: number | null | undefined) {
  if (n == null || isNaN(n)) return 'NPR 0';
  return `NPR ${Math.round(n).toLocaleString('en-US')}`;
}

function modelLabel(model: string): string {
  if (model.includes('vertex')) return 'Gemini · Vertex AI';
  return 'Gemini';
}

export default function AiOrganizer() {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingCached, setIsFetchingCached] = useState(true);
  const [data, setData] = useState<OrgData | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/ai-organizer')
      .then(r => r.json())
      .then(({ data: d, meta: m }) => {
        if (d) { setData(d); setMeta(m); }
      })
      .catch(() => {})
      .finally(() => setIsFetchingCached(false));
  }, []);

  const analyze = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai-organizer', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) {
        if (json.raw) console.error('[AI Organizer] raw error:', json.raw);
        throw new Error(json.error ?? 'Request failed');
      }
      setData(json.data);
      setMeta(json.meta);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const canRefresh = meta?.canRefresh ?? true;
  const isDisabled = isLoading || isFetchingCached || !canRefresh;

  return (
    <div className='h-full overflow-y-auto'>
      <div className='max-w-4xl mx-auto p-4 space-y-6'>
        {/* Header */}
        <div className='flex flex-col gap-3'>
          <div className='flex items-center justify-between gap-3'>
            <h1 className='text-xl font-bold flex items-center gap-2'>
              <Building2 className='h-5 w-5 text-primary shrink-0' />
              AI Financial Organizer
            </h1>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button onClick={analyze} disabled={isDisabled} size='sm' variant={data ? 'outline' : 'default'} className='shrink-0'>
                      {isLoading ? <Loader2 className='h-4 w-4 animate-spin' /> : data ? <RefreshCw className='h-4 w-4' /> : <><Sparkles className='h-4 w-4 mr-2' />Organize</>}
                    </Button>
                  </span>
                </TooltipTrigger>
                {meta && !canRefresh && (
                  <TooltipContent>Next refresh available {format(new Date(meta.nextRefreshAt), 'MMM d, yyyy')}</TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className='text-muted-foreground text-sm'>
            Account health check, payday routing plan, monthly calendar, and budget breakdown.
          </p>
        </div>

        {meta && !isLoading && (
          <p className='text-xs text-muted-foreground'>
            {modelLabel(meta.model)} · {format(new Date(meta.createdAt), 'MMM d, h:mm a')}
            <span className='ml-2'>· AI-generated — verify before acting</span>
          </p>
        )}

        {error && (
          <Card className='border-destructive bg-destructive/5'>
            <CardContent className='pt-4'>
              <p className='text-sm text-destructive'>{error}</p>
            </CardContent>
          </Card>
        )}

        {!data && !isLoading && !isFetchingCached && !error && (
          <Card className='border-dashed'>
            <CardContent className='flex flex-col items-center justify-center py-16 text-center gap-3'>
              <Building2 className='h-10 w-10 text-muted-foreground/40' />
              <p className='text-muted-foreground text-sm max-w-xs'>
                Click "Organize" to get a complete account health check, payday plan, and monthly budget breakdown.
              </p>
            </CardContent>
          </Card>
        )}

        {(isLoading || isFetchingCached) && !data && (
          <div className='space-y-3'>
            {[1, 2, 3, 4].map(i => (
              <Card key={i} className='border-l-4 border-l-muted animate-pulse'>
                <CardContent className='pt-4 pb-4'>
                  <div className='h-4 bg-muted rounded w-1/3 mb-2' />
                  <div className='h-3 bg-muted rounded w-2/3' />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {data && !isLoading && (
          <>
            {/* Payday Plan */}
            {data.paydayPlan && (
              <div className='space-y-3'>
                <h2 className='text-sm font-semibold text-muted-foreground uppercase tracking-wide'>Payday Plan</h2>
                <Card>
                  <CardHeader className='pb-2'>
                    <CardTitle className='text-sm flex items-start justify-between gap-2'>
                      <span className='flex items-center gap-2'>
                        <Wallet className='h-4 w-4 text-primary shrink-0' />
                        <span>
                          {data.paydayPlan.salaryAccount}
                          {data.paydayPlan.salaryDay && (
                            <span className='text-muted-foreground font-normal'> · day {data.paydayPlan.salaryDay}</span>
                          )}
                        </span>
                      </span>
                      <span className='font-semibold text-primary shrink-0'>{fmt(data.paydayPlan.salaryAmount)}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className='pt-0 pb-4 space-y-3'>
                    {data.paydayPlan.steps.map((step) => (
                      <div key={step.step} className='flex gap-3 text-sm'>
                        <span className='shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center mt-0.5'>
                          {step.step}
                        </span>
                        <div className='flex-1 min-w-0'>
                          <div className='flex items-center gap-1.5 flex-wrap'>
                            <span className='font-medium'>{step.action}</span>
                            <span className='text-primary font-semibold'>
                              {step.isEstimated ? '~' : ''}{fmt(step.amount)}
                            </span>
                            {step.isEstimated && <span className='text-xs text-muted-foreground'>(est.)</span>}
                          </div>
                          <div className='flex items-start gap-1 text-xs text-muted-foreground mt-0.5 flex-wrap'>
                            <span className='flex items-center gap-1 shrink-0'>
                              <span>{step.from}</span>
                              <ArrowRight className='h-3 w-3' />
                              <span>{step.to}</span>
                            </span>
                            <span>— {step.reason}</span>
                          </div>
                          {step.covers && step.covers.length > 0 && (
                            <div className='mt-1.5 flex flex-wrap gap-1'>
                              {step.covers.map((c, ci) => (
                                <span key={ci} className='text-xs bg-muted text-muted-foreground rounded px-1.5 py-0.5'>{c}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {data.paydayPlan.notes.map((note, i) => (
                      <p key={i} className='text-xs text-muted-foreground pl-8'>{note}</p>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Monthly Routine */}
            {data.monthlyRoutine && (
              <div className='space-y-3'>
                <h2 className='text-sm font-semibold text-muted-foreground uppercase tracking-wide'>Monthly Routine</h2>
                <Card>
                  <CardHeader className='pb-2'>
                    <CardTitle className='text-sm flex items-center gap-2'>
                      <CalendarDays className='h-4 w-4 text-primary' />
                      Calendar
                    </CardTitle>
                  </CardHeader>
                  <CardContent className='pt-0 pb-4 space-y-2.5'>
                    {data.monthlyRoutine.calendar
                      .slice()
                      .sort((a, b) => a.day - b.day)
                      .map((entry, i) => (
                        <div key={i} className='flex items-start gap-3 text-sm'>
                          <span className='shrink-0 w-9 text-right text-xs font-mono text-muted-foreground pt-0.5'>
                            Day {entry.day}
                          </span>
                          <div className='flex-1 min-w-0'>
                            <div className='flex flex-wrap items-center gap-x-1.5 gap-y-1'>
                              <span className='font-medium'>{entry.action}</span>
                              {entry.amount != null && (
                                <span className='text-primary font-medium'>
                                  {entry.isVariable ? '~' : ''}{fmt(entry.amount)}
                                </span>
                              )}
                              {entry.isAutomatic && <Badge variant='outline' className='text-xs px-1 py-0'>Auto</Badge>}
                              {entry.isVariable && <Badge variant='outline' className='text-xs px-1 py-0 border-yellow-400 text-yellow-600'>Variable</Badge>}
                            </div>
                            <span className='text-xs text-muted-foreground'>{entry.account}</span>
                          </div>
                        </div>
                      ))}
                  </CardContent>
                </Card>

                {(data.monthlyRoutine.watchOut.length > 0 || data.monthlyRoutine.upcomingAnnual.length > 0) && (
                  <Card className='border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20 dark:border-yellow-900'>
                    <CardContent className='pt-4 pb-4 space-y-2'>
                      {data.monthlyRoutine.watchOut.map((w, i) => (
                        <div key={i} className='flex gap-2 text-sm'>
                          <AlertTriangle className='h-4 w-4 text-yellow-600 shrink-0 mt-0.5' />
                          <span className='text-yellow-800 dark:text-yellow-200'>{w}</span>
                        </div>
                      ))}
                      {data.monthlyRoutine.upcomingAnnual.map((a, i) => (
                        <div key={i} className='flex gap-2 text-sm'>
                          <CalendarDays className='h-4 w-4 text-yellow-600 shrink-0 mt-0.5' />
                          <span className='text-yellow-800 dark:text-yellow-200'>{a}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Budget Allocation */}
            {data.budgetAllocation && (
              <div className='space-y-3'>
                <h2 className='text-sm font-semibold text-muted-foreground uppercase tracking-wide'>Budget Allocation</h2>
                <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
                  <Card>
                    <CardContent className='pt-4 pb-4 flex sm:flex-col items-center sm:items-center justify-between sm:justify-center gap-2'>
                      <p className='text-xs text-muted-foreground'>Monthly Income</p>
                      <p className='font-semibold text-sm'>{fmt(data.budgetAllocation.monthlyIncome)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className='pt-4 pb-4 flex sm:flex-col items-center sm:items-center justify-between sm:justify-center gap-2'>
                      <p className='text-xs text-muted-foreground'>Fixed Obligations</p>
                      <p className='font-semibold text-sm text-destructive'>{fmt(data.budgetAllocation.fixedObligations.total)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className='pt-4 pb-4 flex sm:flex-col items-center sm:items-center justify-between sm:justify-center gap-2'>
                      <p className='text-xs text-muted-foreground'>Savings Target</p>
                      <p className='font-semibold text-sm text-green-600'>
                        {fmt(data.budgetAllocation.savingsTarget.amount)}
                        <span className='font-normal text-muted-foreground'> ({data.budgetAllocation.savingsTarget.percentage}%)</span>
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className='pb-2'>
                    <CardTitle className='text-sm'>Fixed Obligations Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className='pt-0 pb-4 space-y-1.5'>
                    {data.budgetAllocation.fixedObligations.breakdown.map((item) => (
                      <div key={item.name} className='flex justify-between text-sm gap-2'>
                        <span className='text-muted-foreground'>{item.name}</span>
                        <span className='font-medium shrink-0'>
                          {item.isEstimated ? '~' : ''}{fmt(item.amount)}
                          {item.isEstimated && <span className='text-xs text-muted-foreground ml-1'>(est.)</span>}
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {data.budgetAllocation.discretionaryBudget.categories.length > 0 && (
                  <Card>
                    <CardHeader className='pb-2'>
                      <CardTitle className='text-sm flex items-center justify-between'>
                        <span>Discretionary Budget</span>
                        <span className='font-semibold text-primary'>{fmt(data.budgetAllocation.discretionaryBudget.total)}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className='pt-0 pb-4 space-y-2.5'>
                      {data.budgetAllocation.discretionaryBudget.categories.map((cat) => {
                        const scfg = statusConfig[cat.status] ?? statusConfig.ok;
                        return (
                          <div key={cat.name} className='text-sm'>
                            <div className='flex items-center justify-between gap-2 mb-0.5'>
                              <span className='font-medium truncate'>{cat.name}</span>
                              <span className={cn('text-xs shrink-0', scfg.class)}>{scfg.label}</span>
                            </div>
                            <div className='flex items-center justify-between gap-2 text-xs text-muted-foreground'>
                              <span>Actual: {fmt(cat.actual)}</span>
                              <span>Budget: {fmt(cat.recommended)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                )}

                {data.budgetAllocation.notes.length > 0 && (
                  <div className='space-y-1'>
                    {data.budgetAllocation.notes.map((note, i) => (
                      <p key={i} className='text-xs text-muted-foreground'>* {note}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Account Health */}
            <div className='space-y-3'>
              <h2 className='text-sm font-semibold text-muted-foreground uppercase tracking-wide'>Account Health</h2>
              {data.accountHealth.map((a) => {
                const cfg = recommendationConfig[a.recommendation] ?? recommendationConfig.REVIEW;
                return (
                  <Card key={a.name} className={cn('border-l-4', cfg.borderClass)}>
                    <CardContent className='pt-4 pb-4'>
                      <div className='flex items-start justify-between gap-3'>
                        <div className='flex-1 min-w-0'>
                          <div className='flex items-center gap-2 flex-wrap mb-1'>
                            <span className='font-semibold text-sm'>{a.name}</span>
                            <span className={cn('text-xs px-1.5 py-0 rounded border font-medium', cfg.badgeClass)}>{cfg.label}</span>
                            {a.role && <span className='text-xs text-muted-foreground'>· {a.role}</span>}
                          </div>
                          <p className='text-sm text-muted-foreground'>{a.reason}</p>
                          <p className='text-xs font-medium mt-1'>{fmt(a.balance)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Account Roles */}
            {data.accountRoles.length > 0 && (
              <div className='space-y-3'>
                <h2 className='text-sm font-semibold text-muted-foreground uppercase tracking-wide'>Account Roles</h2>
                <Card>
                  <CardContent className='pt-4 pb-4 divide-y divide-border'>
                    {data.accountRoles.map((r) => (
                      <div key={r.name} className='py-2.5 first:pt-0 last:pb-0'>
                        <div className='flex items-center justify-between gap-2 mb-0.5'>
                          <span className='text-sm font-medium'>{r.name}</span>
                          <Badge variant='secondary' className='shrink-0 text-xs'>{r.role}</Badge>
                        </div>
                        <p className='text-xs text-muted-foreground'>{r.purpose}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
