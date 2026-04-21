'use client';

import { useState } from 'react';
import { Loader2, Sparkles, RefreshCw } from 'lucide-react';
import {
  FaMoneyBillWave,
  FaCreditCard,
  FaPiggyBank,
  FaChartLine,
  FaArrowsRotate,
  FaCircleInfo
} from 'react-icons/fa6';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

export default function AiAdvisor() {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<AdvisorData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai-advisor', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Request failed');
      setData(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const highRecs = data?.recommendations.filter(r => r.priority === 'high') ?? [];
  const mediumRecs = data?.recommendations.filter(r => r.priority === 'medium') ?? [];
  const lowRecs = data?.recommendations.filter(r => r.priority === 'low') ?? [];

  return (
    <div className='h-full overflow-y-auto'>
      <div className='max-w-4xl mx-auto p-4 space-y-6'>
        {/* Header */}
        <div className='flex items-start justify-between gap-4'>
          <div>
            <h1 className='text-2xl font-bold flex items-center gap-2'>
              <Sparkles className='h-6 w-6 text-primary' />
              AI Financial Advisor
            </h1>
            <p className='text-muted-foreground mt-1 text-sm'>
              Analyzes all your financial data and surfaces what actually needs your attention.
            </p>
          </div>
          <Button
            onClick={fetchRecommendations}
            disabled={isLoading}
            size='sm'
            variant={data ? 'outline' : 'default'}
          >
            {isLoading ? (
              <>
                <Loader2 className='h-4 w-4 animate-spin mr-2' />
                Analyzing…
              </>
            ) : data ? (
              <>
                <RefreshCw className='h-4 w-4 mr-2' />
                Refresh
              </>
            ) : (
              <>
                <Sparkles className='h-4 w-4 mr-2' />
                Analyze My Finances
              </>
            )}
          </Button>
        </div>

        {/* Error */}
        {error && (
          <Card className='border-destructive bg-destructive/5'>
            <CardContent className='pt-4'>
              <p className='text-sm text-destructive'>{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {!data && !isLoading && !error && (
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
        {isLoading && (
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
