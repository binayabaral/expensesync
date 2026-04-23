import Link from 'next/link';
import {
  FaMoneyBillTransfer,
  FaCheck,
  FaArrowTrendUp,
  FaArrowTrendDown,
  FaScaleBalanced,
  FaArrowsRotate
} from 'react-icons/fa6';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className='relative min-h-screen bg-background overflow-hidden flex flex-col'>

      {/* ── Ambient blobs + grid ─────────────────────────────────────── */}
      <div className='pointer-events-none absolute -top-40 -left-40 h-125 w-125 rounded-full bg-primary/12 blur-[120px]' />
      <div className='pointer-events-none absolute -bottom-40 -right-40 h-100 w-100 rounded-full bg-primary/10 blur-[100px]' />
      <div className='pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-80 w-180 rounded-full bg-primary/5 blur-[120px]' />
      <div
        className='pointer-events-none absolute inset-0 opacity-[0.025]'
        style={{
          backgroundImage:
            'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
          backgroundSize: '48px 48px'
        }}
      />

      {/* ── Background content layer (behind card) ───────────────────── */}
      <div className='pointer-events-none select-none absolute inset-0 hidden md:flex items-center px-10 blur-sm opacity-40'>
        <div className='w-full grid grid-cols-2 gap-10 items-start mt-16'>

          {/* Left */}
          <div className='flex flex-col gap-5'>
            <div>
              <div className='inline-flex items-center gap-2 text-xs text-muted-foreground bg-muted/60 border border-border/60 rounded-full px-3 py-1 mb-4 w-fit'>
                <span className='h-1.5 w-1.5 rounded-full bg-primary' />
                Personal finance, reimagined
              </div>
              <h2 className='text-3xl font-bold tracking-tight leading-tight mb-3'>
                Your finances,
                <br />
                <span className='bg-linear-to-r from-primary to-primary/50 bg-clip-text text-transparent'>
                  finally in control
                </span>
              </h2>
              <p className='text-sm text-muted-foreground leading-relaxed'>
                Track expenses, split bills, manage subscriptions, and watch your net worth grow.
              </p>
            </div>
            <ul className='space-y-2'>
              {[
                'Multiple accounts, cards & loans',
                'Bill splitting with auto settlements',
                'Recurring payment reminders',
                'Net worth & financial health',
                'Spending trends by category',
              ].map(f => (
                <li key={f} className='flex items-center gap-2.5 text-sm text-muted-foreground'>
                  <span className='h-4 w-4 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0'>
                    <FaCheck className='h-2 w-2' />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
            <div className='rounded-xl border border-border/60 bg-card/60 p-4'>
              <div className='flex items-center justify-between mb-3'>
                <span className='text-xs font-semibold'>Spending this month</span>
                <span className='text-xs text-muted-foreground'>NPR 1,56,652</span>
              </div>
              <div className='space-y-2.5'>
                {[
                  { label: 'Food & Drinks', pct: 70, color: 'bg-orange-400', amount: 'NPR 23,763' },
                  { label: 'Transportation', pct: 44, color: 'bg-blue-500', amount: 'NPR 15,680' },
                  { label: 'Household', pct: 22, color: 'bg-emerald-500', amount: 'NPR 5,126' },
                  { label: 'Entertainment', pct: 12, color: 'bg-purple-500', amount: 'NPR 3,200' },
                ].map(row => (
                  <div key={row.label}>
                    <div className='flex justify-between text-[11px] mb-1'>
                      <span className='text-muted-foreground'>{row.label}</span>
                      <span className='font-medium'>{row.amount}</span>
                    </div>
                    <div className='h-1.5 rounded-full bg-muted overflow-hidden'>
                      <div className={`h-full rounded-full ${row.color}`} style={{ width: `${row.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className='border-t border-border/40 pt-4'>
              <p className='text-xs text-muted-foreground italic leading-relaxed'>
                &ldquo;Using it every day has genuinely changed how I think about my finances.&rdquo;
              </p>
              <p className='text-[11px] text-muted-foreground/60 mt-1.5'>— Binaya Baral, Creator of XpenseSync</p>
            </div>
          </div>

          {/* Right */}
          <div className='flex flex-col gap-4'>
            <div className='grid grid-cols-2 gap-3'>
              {[
                { icon: FaArrowTrendUp, label: 'Income', value: 'NPR 3,13,500', color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20' },
                { icon: FaArrowTrendDown, label: 'Expenses', value: 'NPR 1,56,652', color: 'text-red-500', bg: 'bg-red-500/10 border-red-500/20' },
                { icon: FaScaleBalanced, label: 'Owed to you', value: 'NPR 5,720', color: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-500/20' },
                { icon: FaArrowsRotate, label: 'Recurring', value: '5 active', color: 'text-purple-500', bg: 'bg-purple-500/10 border-purple-500/20' },
              ].map(card => (
                <div key={card.label} className={`rounded-xl border p-3.5 ${card.bg}`}>
                  <card.icon className={`h-4 w-4 mb-2 ${card.color}`} />
                  <div className={`text-sm font-bold ${card.color}`}>{card.value}</div>
                  <div className='text-muted-foreground text-[11px] mt-0.5'>{card.label}</div>
                </div>
              ))}
            </div>
            <div className='rounded-xl border border-border/60 bg-card/60 p-4'>
              <div className='text-xs font-semibold mb-3'>Recent transactions</div>
              <div className='space-y-3'>
                {[
                  { name: 'Green Fork Restaurant', cat: 'Food & Drinks', amount: '-NPR 1,450', color: 'text-red-500', dot: 'bg-orange-400' },
                  { name: 'March Salary', cat: 'Income', amount: '+NPR 85,000', color: 'text-emerald-500', dot: 'bg-emerald-500' },
                  { name: 'Netflix', cat: 'Entertainment', amount: '-NPR 649', color: 'text-red-500', dot: 'bg-purple-500' },
                  { name: 'Big Mart', cat: 'Household', amount: '-NPR 3,200', color: 'text-red-500', dot: 'bg-emerald-400' },
                  { name: 'Bluebook Renewal', cat: 'Transportation', amount: '-NPR 4,000', color: 'text-red-500', dot: 'bg-blue-500' },
                ].map(tx => (
                  <div key={tx.name} className='flex items-center justify-between gap-3'>
                    <div className='flex items-center gap-2 min-w-0'>
                      <div className={`h-2 w-2 rounded-full shrink-0 ${tx.dot}`} />
                      <div className='min-w-0'>
                        <div className='text-[11px] font-medium truncate'>{tx.name}</div>
                        <div className='text-[10px] text-muted-foreground'>{tx.cat}</div>
                      </div>
                    </div>
                    <span className={`text-[11px] font-semibold shrink-0 ${tx.color}`}>{tx.amount}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className='rounded-xl border border-border/60 bg-card/60 p-4'>
              <div className='text-xs font-semibold mb-3'>Net worth snapshot</div>
              <div className='space-y-2'>
                {[
                  { label: 'Assets', value: 'NPR 23,74,091', color: 'text-emerald-500' },
                  { label: 'Liabilities', value: 'NPR 25,41,731', color: 'text-red-500' },
                  { label: 'Net Worth', value: '-NPR 1,67,640', color: 'text-red-500' },
                ].map(row => (
                  <div key={row.label} className='flex justify-between items-center py-1 border-b border-border/30 last:border-0'>
                    <span className='text-[11px] text-muted-foreground'>{row.label}</span>
                    <span className={`text-[11px] font-bold ${row.color}`}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── Top bar ───────────────────────────────────────────────────── */}
      <header className='relative z-10 flex items-center justify-between px-8 py-4'>
        <Link href='/' className='flex items-center gap-2.5'>
          <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground'>
            <FaMoneyBillTransfer className='h-3.5 w-3.5' />
          </div>
          <span className='font-bold'>XpenseSync</span>
        </Link>
        <ThemeToggle />
      </header>

      {/* ── Foreground: centered card ─────────────────────────────────── */}
      <main className='relative z-10 flex flex-1 items-start justify-center px-4 pt-20 pb-8'>
        <div className='w-full max-w-sm rounded-2xl border border-border/60 bg-background shadow-2xl'>
          {children}
        </div>
      </main>

    </div>
  );
}
