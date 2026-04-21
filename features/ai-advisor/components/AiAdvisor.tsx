'use client';

import { useState, useEffect } from 'react';
import { Loader2, Sparkles, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import {
  FaMoneyBillWave,
  FaCreditCard,
  FaPiggyBank,
  FaChartLine,
  FaArrowsRotate,
  FaCircleInfo
} from 'react-icons/fa6';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

type Priority = 'high' | 'medium' | 'low';
type Category = 'spending' | 'debt' | 'savings' | 'investments' | 'cashflow' | 'general';

type Recommendation = {
  priority: Priority;
  category: Category;
  title: string;
  description: string;
  action: string;
};

type AdvisorData = {
  summary: string;
  recommendations: Recommendation[];
};

type Meta = {
  createdAt: string;
  model: string;
  tier: string;
  canRefresh: boolean;
  nextRefreshAt: string;
};

const categoryIcon: Record<Category, React.ReactNode> = {
  spending: <FaMoneyBillWave className='h-4 w-4' />,
  debt: <FaCreditCard className='h-4 w-4' />,
  savings: <FaPiggyBank className='h-4 w-4' />,
  investments: <FaChartLine className='h-4 w-4' />,
  cashflow: <FaArrowsRotate className='h-4 w-4' />,
  general: <FaCircleInfo className='h-4 w-4' />
};

const priorityConfig: Record<Priority, { label: string; borderClass: string; badgeVariant: 'destructive' | 'secondary' | 'outline' }> = {
  high: { label: 'High', borderClass: 'border-l-destructive', badgeVariant: 'destructive' },
  medium: { label: 'Medium', borderClass: 'border-l-yellow-500', badgeVariant: 'secondary' },
  low: { label: 'Low', borderClass: 'border-l-green-500', badgeVariant: 'outline' }
};

function modelLabel(model: string): string {
  if (model.includes('vertex')) return 'Gemini · Vertex AI';
  return 'Gemini';
}

export default function AiAdvisor() {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingCached, setIsFetchingCached] = useState(true);
  const [data, setData] = useState<AdvisorData | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/ai-advisor')
      .then(r => r.json())
      .then(({ data: d, meta: m }) => {
        if (d) { setData(d); setMeta(m); }
      })
      .catch(() => {})
      .finally(() => setIsFetchingCached(false));
  }, []);

  const fetchRecommendations = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai-advisor', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) {
        if (json.raw) console.error('[AI Advisor] raw error:', json.raw);
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

  const highRecs = data?.recommendations.filter(r => r.priority === 'high') ?? [];
  const mediumRecs = data?.recommendations.filter(r => r.priority === 'medium') ?? [];
  const lowRecs = data?.recommendations.filter(r => r.priority === 'low') ?? [];

  return (
    <div className='h-full overflow-y-auto'>
      <div className='max-w-4xl mx-auto p-4 space-y-6'>
        {/* Header */}
        <div className='flex flex-col gap-3'>
          <div className='flex items-center justify-between gap-3'>
            <h1 className='text-xl font-bold flex items-center gap-2'>
              <Sparkles className='h-5 w-5 text-primary shrink-0' />
              AI Financial Advisor
            </h1>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      onClick={fetchRecommendations}
                      disabled={isDisabled}
                      size='sm'
                      variant={data ? 'outline' : 'default'}
                      className='shrink-0'
                    >
                      {isLoading ? (
                        <Loader2 className='h-4 w-4 animate-spin' />
                      ) : data ? (
                        <RefreshCw className='h-4 w-4' />
                      ) : (
                        <>
                          <Sparkles className='h-4 w-4 mr-2' />
                          Analyze
                        </>
                      )}
                    </Button>
                  </span>
                </TooltipTrigger>
                {meta && !canRefresh && (
                  <TooltipContent>
                    Next refresh available {format(new Date(meta.nextRefreshAt), 'MMM d, yyyy')}
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className='text-muted-foreground text-sm'>
            Analyzes all your financial data and surfaces what actually needs your attention.
          </p>
        </div>

        {/* Meta row */}
        {meta && !isLoading && (
          <p className='text-xs text-muted-foreground'>
            {modelLabel(meta.model)} · {format(new Date(meta.createdAt), 'MMM d, h:mm a')}
          </p>
        )}

        {/* Error */}
        {error && (
          <Card className='border-destructive bg-destructive/5'>
            <CardContent className='pt-4'>
              <p className='text-sm text-destructive'>{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {!data && !isLoading && !isFetchingCached && !error && (
          <Card className='border-dashed'>
            <CardContent className='flex flex-col items-center justify-center py-16 text-center gap-3'>
              <Sparkles className='h-10 w-10 text-muted-foreground/40' />
              <p className='text-muted-foreground text-sm max-w-xs'>
                Click "Analyze My Finances" to get personalized recommendations based on your accounts, spending, and investments.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Loading skeleton */}
        {(isLoading || isFetchingCached) && !data && (
          <div className='space-y-3'>
            {[1, 2, 3].map(i => (
              <Card key={i} className='border-l-4 border-l-muted animate-pulse'>
                <CardContent className='pt-4 pb-4'>
                  <div className='h-4 bg-muted rounded w-1/4 mb-2' />
                  <div className='h-4 bg-muted rounded w-3/4 mb-2' />
                  <div className='h-3 bg-muted rounded w-1/2' />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Results */}
        {data && !isLoading && (
          <>
            {/* Summary */}
            <Card className='bg-primary/5 border-primary/20'>
              <CardHeader className='pb-2'>
                <CardTitle className='text-base'>Financial Health Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className='text-sm leading-relaxed'>{data.summary}</p>
              </CardContent>
            </Card>

            {/* Recommendations */}
            {[
              { recs: highRecs, label: 'High Priority' },
              { recs: mediumRecs, label: 'Medium Priority' },
              { recs: lowRecs, label: 'Low Priority' }
            ]
              .filter(g => g.recs.length > 0)
              .map(group => (
                <div key={group.label} className='space-y-3'>
                  <h2 className='text-sm font-semibold text-muted-foreground uppercase tracking-wide'>
                    {group.label}
                  </h2>
                  {group.recs.map((rec, i) => {
                    const config = priorityConfig[rec.priority];
                    return (
                      <Card
                        key={i}
                        className={cn('border-l-4', config.borderClass)}
                      >
                        <CardContent className='pt-4 pb-4'>
                          <div className='flex items-start gap-3'>
                            <div className='mt-0.5 text-muted-foreground shrink-0'>
                              {categoryIcon[rec.category] ?? categoryIcon.general}
                            </div>
                            <div className='flex-1 min-w-0'>
                              <div className='flex items-center gap-2 flex-wrap mb-1'>
                                <span className='font-semibold text-sm'>{rec.title}</span>
                                <Badge variant={config.badgeVariant} className='text-xs px-1.5 py-0'>
                                  {rec.category}
                                </Badge>
                              </div>
                              <p className='text-sm text-muted-foreground leading-relaxed'>
                                {rec.description}
                              </p>
                              <p className='text-sm font-medium text-primary mt-2'>
                                → {rec.action}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ))}
          </>
        )}
      </div>
    </div>
  );
}
