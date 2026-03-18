import type { Metadata } from 'next';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'ExpenseSync — Your finances, finally in control',
  description:
    'Track expenses, split bills with friends, manage subscriptions, credit cards, loans, and assets. Free personal finance app built for real life.',
  keywords: [
    'expense tracker',
    'personal finance',
    'bill splitting',
    'budget app',
    'net worth tracker',
    'recurring payments',
    'money management',
    'financial health'
  ],
  openGraph: {
    title: 'ExpenseSync — Your finances, finally in control',
    description:
      'Track expenses, split bills with friends, manage subscriptions, credit cards, loans, and assets. Free, always.',
    url: '/',
    siteName: 'ExpenseSync',
    type: 'website',
    locale: 'en_US'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ExpenseSync — Your finances, finally in control',
    description:
      'Track expenses, split bills with friends, manage subscriptions, credit cards, loans, and assets. Free, always.'
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large'
    }
  },
  alternates: {
    canonical: '/'
  }
};
import Link from 'next/link';
import {
  FaMoneyBillTransfer,
  FaReceipt,
  FaScaleBalanced,
  FaArrowsRotate,
  FaWallet,
  FaTags,
  FaHeart,
  FaCheck,
  FaArrowRight,
  FaChartLine,
  FaCoins,
  FaStar,
  FaPlus,
  FaMinus
} from 'react-icons/fa6';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ThemeToggle } from '@/components/ThemeToggle';
import { DashboardPreview } from '@/components/landing/DashboardPreview';

export default async function LandingPage() {
  const { userId } = await auth();
  if (userId) redirect('/dashboard');

  return (
    <div className='relative min-h-screen bg-background text-foreground'>
      <div className='pointer-events-none fixed -top-40 -left-40 h-125 w-125 rounded-full bg-primary/12 blur-[120px]' />
      <div className='pointer-events-none fixed -bottom-40 -right-40 h-100 w-100 rounded-full bg-primary/8 blur-[100px]' />
      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <header className='sticky top-0 z-50 border-b border-border/30 bg-background/40 backdrop-blur-md'>
        <div className='mx-auto max-w-6xl px-4 sm:px-6'>
          <div className='flex h-16 items-center justify-between'>
            <div className='flex items-center gap-2.5'>
              <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground'>
                <FaMoneyBillTransfer className='h-5 w-5' />
              </div>
              <span className='text-base font-bold'>ExpenseSync</span>
            </div>
            <nav className='hidden sm:flex items-center gap-6 text-sm text-muted-foreground'>
              <a href='#features' className='hover:text-foreground transition-colors'>
                Features
              </a>
              <a href='#how-it-works' className='hover:text-foreground transition-colors'>
                How it works
              </a>
              <a href='#pricing' className='hover:text-foreground transition-colors'>
                Pricing
              </a>
              <a href='#faq' className='hover:text-foreground transition-colors'>
                FAQ
              </a>
            </nav>
            <div className='flex items-center gap-2'>
              <ThemeToggle />
              <Button variant='ghost' size='sm' asChild>
                <Link href='/sign-in'>Sign In</Link>
              </Button>
              <Button size='sm' asChild>
                <Link href='/sign-up'>Get Started</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className='relative overflow-hidden'>
        <div
          className='pointer-events-none absolute inset-0 opacity-[0.03]'
          style={{
            backgroundImage:
              'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
            backgroundSize: '48px 48px'
          }}
        />
        <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.15),transparent)]' />

        <div className='relative mx-auto max-w-6xl px-4 sm:px-6 py-24 sm:py-36 text-center'>
          <Badge variant='secondary' className='mb-6 gap-1.5 px-3 py-1 text-xs font-medium'>
            <span className='inline-block h-1.5 w-1.5 rounded-full bg-primary' />
            Personal finance, reimagined
          </Badge>
          <h1 className='mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl'>
            Your finances,{' '}
            <span className='bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent'>
              finally in control
            </span>
          </h1>
          <p className='mx-auto mt-6 max-w-2xl text-base sm:text-lg text-muted-foreground leading-relaxed'>
            Track every expense, split bills with friends, manage recurring payments, and get a clear
            picture of your financial health — all in one place.
          </p>
          <div className='mt-10 flex flex-col sm:flex-row items-center justify-center gap-3'>
            <Button size='lg' className='w-full sm:w-auto gap-2 px-8' asChild>
              <Link href='/sign-up'>
                Get Started
                <FaArrowRight className='h-3.5 w-3.5' />
              </Link>
            </Button>
            <Button size='lg' variant='outline' className='w-full sm:w-auto px-8' asChild>
              <Link href='/sign-in'>Sign In</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Stats bar ────────────────────────────────────────────────────── */}
      <section className='border-y border-border/50 bg-muted/30'>
        <div className='mx-auto max-w-6xl px-4 sm:px-6 py-10'>
          <div className='grid grid-cols-2 gap-6 sm:grid-cols-4'>
            {[
              { value: '12+', label: 'Built-in features' },
              { value: 'Multi-account', label: 'Banks, cards & loans' },
              { value: 'Real-time', label: 'Balance tracking' },
              { value: 'Multi-user', label: 'Bill splitting' }
            ].map(stat => (
              <div key={stat.label} className='text-center'>
                <div className='text-2xl sm:text-3xl font-bold text-primary'>{stat.value}</div>
                <div className='mt-1 text-sm text-muted-foreground'>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Dashboard Preview ────────────────────────────────────────────── */}
      <section className='mx-auto max-w-6xl px-4 sm:px-6 py-24'>
        <div className='text-center mb-12'>
          <h2 className='text-3xl font-bold tracking-tight sm:text-4xl'>
            A dashboard built for clarity
          </h2>
          <p className='mt-4 text-muted-foreground max-w-xl mx-auto'>
            Click any page in the sidebar to explore. Everything at a glance — balances, spending
            trends, categories, credit cards, and more.
          </p>
        </div>

        <DashboardPreview />
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section id='features' className='border-t border-border/50 bg-muted/10'>
        <div className='mx-auto max-w-6xl px-4 sm:px-6 py-24'>
          <div className='text-center mb-14'>
            <h2 className='text-3xl font-bold tracking-tight sm:text-4xl'>
              Everything you need to manage money
            </h2>
            <p className='mt-4 text-muted-foreground max-w-xl mx-auto'>
              A complete personal finance toolkit — from daily transactions to long-term asset
              tracking.
            </p>
          </div>

          <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
            {[
              {
                icon: FaReceipt,
                title: 'Expense Tracking',
                description:
                  'Log every transaction with categories, payees, and notes. Filter and search across your full history.'
              },
              {
                icon: FaScaleBalanced,
                title: 'Bill Splitting',
                description:
                  'Split expenses with friends and groups. Track who owes what and settle balances with ease.'
              },
              {
                icon: FaArrowsRotate,
                title: 'Recurring Payments',
                description:
                  'Never lose track of subscriptions and bills. Log recurring payments and monitor their impact on your budget.'
              },
              {
                icon: FaWallet,
                title: 'Accounts & Cards',
                description:
                  'Manage multiple bank accounts, credit cards, and loans. See balances at a glance.'
              },
              {
                icon: FaTags,
                title: 'Categories & Payees',
                description:
                  'Organise spending with custom categories and payees. Understand where your money actually goes.'
              },
              {
                icon: FaHeart,
                title: 'Financial Health',
                description:
                  'Get a snapshot of your net worth, savings rate, and overall financial wellbeing in one dashboard.'
              },
              {
                icon: FaCoins,
                title: 'Asset Tracking',
                description:
                  'Track physical and financial assets — property, investments, savings — to monitor your net worth over time.'
              },
              {
                icon: FaChartLine,
                title: 'Spending Trends',
                description:
                  'Visual charts break down your spending by category and period so you can spot patterns instantly.'
              },
              {
                icon: FaMoneyBillTransfer,
                title: 'Transfers',
                description:
                  'Record money moved between your own accounts without double-counting it as income or expense.'
              }
            ].map(feature => (
              <Card
                key={feature.title}
                className='group border-border/60 bg-card/50 hover:bg-card hover:border-primary/30 transition-all duration-200'
              >
                <CardContent className='p-6'>
                  <div className='mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary/15 transition-colors'>
                    <feature.icon className='h-5 w-5' />
                  </div>
                  <h3 className='font-semibold text-base mb-2'>{feature.title}</h3>
                  <p className='text-sm text-muted-foreground leading-relaxed'>
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bill Split Spotlight ─────────────────────────────────────────── */}
      <section className='mx-auto max-w-6xl px-4 sm:px-6 py-24'>
        <div className='grid gap-12 lg:grid-cols-2 items-center'>
          {/* Text side */}
          <div>
            <Badge variant='secondary' className='mb-4'>
              Standout feature
            </Badge>
            <h2 className='text-3xl font-bold tracking-tight sm:text-4xl mb-5'>
              Split bills.{' '}
              <span className='bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent'>
                No awkward maths.
              </span>
            </h2>
            <p className='text-muted-foreground leading-relaxed mb-6'>
              Going on a trip, sharing a flat, or just grabbing dinner with friends? Create a group,
              log shared expenses, and ExpenseSync figures out exactly who owes what — and by how
              much.
            </p>
            <ul className='space-y-3 mb-8'>
              {[
                'Create groups for any occasion — trips, flatmates, events',
                'Log expenses and assign them to one or multiple people',
                'See real-time balance: who owes you, who you owe',
                'Settle up with a single tap',
                'Full history of every group transaction'
              ].map(point => (
                <li key={point} className='flex items-start gap-3 text-sm'>
                  <span className='mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary'>
                    <FaCheck className='h-2.5 w-2.5' />
                  </span>
                  {point}
                </li>
              ))}
            </ul>
            <Button asChild className='gap-2'>
              <Link href='/sign-up'>
                Try bill splitting
                <FaArrowRight className='h-3.5 w-3.5' />
              </Link>
            </Button>
          </div>

          {/* Visual side — bill split group card mock */}
          <div className='relative'>
            <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_50%,hsl(var(--primary)/0.08),transparent)]' />
            <Card className='border-border/60 shadow-xl relative'>
              <CardContent className='p-6'>
                <div className='flex items-center justify-between mb-4'>
                  <div>
                    <div className='text-sm font-semibold'>Pokhara Trip 🏔️</div>
                    <div className='text-xs text-muted-foreground mt-0.5'>4 members · 8 expenses</div>
                  </div>
                  <Badge variant='secondary' className='text-xs'>
                    Active
                  </Badge>
                </div>

                {/* Members */}
                <div className='text-xs text-muted-foreground uppercase tracking-wide mb-2'>
                  Members
                </div>
                <div className='flex flex-wrap gap-2 mb-5'>
                  {[
                    { initials: 'AK', name: 'Aryan (you)', status: null, color: 'bg-primary/20 text-primary' },
                    { initials: 'PR', name: 'Priya', status: 'owes NPR 1,043', color: 'bg-blue-500/20 text-blue-500' },
                    { initials: 'RJ', name: 'Rohan', status: 'settled', color: 'bg-purple-500/20 text-purple-500' },
                    { initials: 'SM', name: 'Sita', status: 'settled', color: 'bg-orange-500/20 text-orange-500' }
                  ].map(m => (
                    <div key={m.name} className='flex items-center gap-1.5 border border-border/60 rounded-full px-2.5 py-1'>
                      <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold ${m.color}`}>
                        {m.initials}
                      </div>
                      <span className='text-xs'>{m.name}</span>
                      {m.status && (
                        <span className={`text-[10px] ${m.status === 'settled' ? 'text-muted-foreground' : 'text-red-400'}`}>
                          {m.status === 'settled' ? '· settled' : `· ${m.status}`}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Expenses */}
                <div className='text-xs text-muted-foreground uppercase tracking-wide mb-2'>
                  Recent expenses
                </div>
                <div className='space-y-2 mb-5'>
                  {[
                    { name: 'Hotel (2 nights)', amount: 'NPR 8,400', by: 'Aryan', shares: ['Priya NPR 2,100', 'Rohan NPR 2,100', 'Sita NPR 2,100', 'You NPR 2,100'] },
                    { name: 'Lakeside Dinner', amount: 'NPR 5,600', by: 'Priya', shares: ['Priya NPR 1,400', 'Rohan NPR 1,400', 'Sita NPR 1,400', 'You NPR 1,400'] },
                    { name: 'Paragliding', amount: 'NPR 12,000', by: 'Aryan', shares: ['Priya NPR 3,000', 'Rohan NPR 3,000', 'Sita NPR 3,000', 'You NPR 3,000'] }
                  ].map(exp => (
                    <div key={exp.name} className='rounded-md border border-border/50 p-2.5 bg-muted/20'>
                      <div className='flex items-center justify-between mb-1.5'>
                        <div>
                          <span className='text-xs font-medium'>{exp.name}</span>
                          <span className='text-[10px] text-muted-foreground'> · paid by {exp.by}</span>
                        </div>
                        <span className='text-xs font-semibold'>{exp.amount}</span>
                      </div>
                      <div className='flex flex-wrap gap-1'>
                        {exp.shares.map(s => (
                          <span key={s} className='text-[9px] bg-background border border-border/50 rounded px-1.5 py-0.5'>
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <Button size='sm' className='w-full gap-1.5'>
                  Settle balances
                  <FaCheck className='h-3 w-3' />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section id='how-it-works' className='border-y border-border/50 bg-muted/20'>
        <div className='mx-auto max-w-6xl px-4 sm:px-6 py-24'>
          <div className='text-center mb-14'>
            <h2 className='text-3xl font-bold tracking-tight sm:text-4xl'>How it works</h2>
            <p className='mt-4 text-muted-foreground max-w-xl mx-auto'>
              Set up in minutes, gain insights in seconds.
            </p>
          </div>

          <div className='grid gap-8 sm:grid-cols-3 relative'>
            <div className='hidden sm:block absolute top-8 left-[calc(33%+1rem)] right-[calc(33%+1rem)] h-px bg-border/60' />
            {[
              {
                step: '01',
                title: 'Add your accounts',
                description:
                  'Add your bank accounts, credit cards, and loans to get a complete picture of your finances.'
              },
              {
                step: '02',
                title: 'Track transactions',
                description:
                  'Log income and expenses with categories and notes. Import or enter them as they happen.'
              },
              {
                step: '03',
                title: 'Split & settle',
                description:
                  'Create bill-split groups for trips, shared housing, or any shared expense. Track and settle balances effortlessly.'
              }
            ].map(step => (
              <div key={step.step} className='flex flex-col items-center text-center relative'>
                <div className='flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary/30 bg-background text-primary font-bold text-lg mb-5 relative z-10'>
                  {step.step}
                </div>
                <h3 className='font-semibold text-base mb-2'>{step.title}</h3>
                <p className='text-sm text-muted-foreground leading-relaxed max-w-xs'>
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonial ──────────────────────────────────────────────────── */}
      <section className='mx-auto max-w-6xl px-4 sm:px-6 py-24'>
        <div className='relative rounded-2xl border border-border/60 bg-card/50 px-8 py-12 sm:px-16 sm:py-14 text-center overflow-hidden'>
          <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_50%,hsl(var(--primary)/0.06),transparent)]' />
          <div className='relative'>
            <div className='flex justify-center gap-1 mb-6'>
              {[...Array(5)].map((_, i) => (
                <FaStar key={i} className='h-4 w-4 text-yellow-400' />
              ))}
            </div>
            <blockquote className='mx-auto max-w-2xl text-xl sm:text-2xl font-medium leading-snug tracking-tight mb-8'>
              &ldquo;I built ExpenseSync because I couldn&apos;t find a finance app that fit how I
              actually manage money — multiple accounts, shared expenses with friends, and recurring
              bills all in one place. Using it every day has genuinely changed how I think about my
              finances.&rdquo;
            </blockquote>
            <div className='flex flex-col items-center gap-2.5'>
              <div className='h-11 w-11 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-bold'>
                BB
              </div>
              <div>
                <div className='font-semibold text-sm'>Binaya Baral</div>
                <div className='text-xs text-muted-foreground'>Creator of ExpenseSync</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────────── */}
      <section id='pricing' className='border-t border-border/50 bg-muted/10'>
        <div className='mx-auto max-w-6xl px-4 sm:px-6 py-24'>
          <div className='text-center mb-14'>
            <h2 className='text-3xl font-bold tracking-tight sm:text-4xl'>Pricing</h2>
            <p className='mt-4 text-muted-foreground max-w-xl mx-auto'>
              Sign up now and get full access while we&apos;re in early access.
            </p>
          </div>

          <div className='mx-auto max-w-sm'>
            <Card className='border-primary/40 shadow-lg relative overflow-hidden'>
              <div className='absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary to-transparent' />
              <CardContent className='p-8'>
                <div className='text-center mb-8'>
                  <Badge variant='secondary' className='mb-3'>
                    Early Access
                  </Badge>
                  <div className='text-5xl font-bold tracking-tight'>
                    Free
                    <span className='text-lg font-normal text-muted-foreground ml-1'>
                      for now
                    </span>
                  </div>
                  <div className='text-sm text-muted-foreground mt-2'>
                    Paid plans will be introduced in the future
                  </div>
                </div>

                <ul className='space-y-3 mb-8'>
                  {[
                    'Unlimited transactions',
                    'Multiple accounts & cards',
                    'Recurring payment tracking',
                    'Bill splitting & groups',
                    'Categories & payees',
                    'Financial health dashboard',
                    'Asset & net worth tracking',
                    'Dark & light mode'
                  ].map(feature => (
                    <li key={feature} className='flex items-center gap-3 text-sm'>
                      <span className='flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary'>
                        <FaCheck className='h-2.5 w-2.5' />
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>

                <Button className='w-full gap-2' size='lg' asChild>
                  <Link href='/sign-up'>
                    Get Started
                    <FaArrowRight className='h-3.5 w-3.5' />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section id='faq' className='mx-auto max-w-6xl px-4 sm:px-6 py-24'>
        <div className='text-center mb-14'>
          <h2 className='text-3xl font-bold tracking-tight sm:text-4xl'>
            Frequently asked questions
          </h2>
          <p className='mt-4 text-muted-foreground max-w-xl mx-auto'>
            Got questions? We&apos;ve got answers.
          </p>
        </div>

        <div className='mx-auto max-w-2xl space-y-3'>
          {[
            {
              q: 'How much does ExpenseSync cost?',
              a: 'ExpenseSync is currently free to use during our early access period. We plan to introduce paid plans in the future with additional features — early users will be notified well in advance.'
            },
            {
              q: 'Can I manage multiple bank accounts and credit cards?',
              a: 'Absolutely. You can add as many accounts as you need — savings accounts, current accounts, credit cards, loans, and even physical assets. Everything is tracked in one place.'
            },
            {
              q: 'How does bill splitting work?',
              a: 'Create a group for any occasion (a trip, shared flat, dinner, etc.), add members, and log shared expenses. ExpenseSync automatically calculates the optimal settlement so the minimum number of transactions are needed to settle all balances.'
            },
            {
              q: 'Is my financial data secure?',
              a: 'Your data is stored securely in the cloud with industry-standard encryption. Authentication is handled by Clerk, a trusted identity platform. We never share or sell your data.'
            },
            {
              q: 'Can I use ExpenseSync on mobile?',
              a: 'ExpenseSync is a responsive web app that works great on any device — desktop, tablet, or mobile browser. A dedicated mobile app may come in the future.'
            },
            {
              q: 'Does ExpenseSync support currencies other than USD?',
              a: 'Yes. You can enter amounts in any currency. The app is built to be currency-agnostic, making it suitable for users worldwide including Nepal, India, and beyond.'
            }
          ].map((item, i) => (
            <details
              key={i}
              className='group rounded-lg border border-border/60 bg-card/50 open:bg-card transition-colors duration-200'
            >
              <summary className='flex items-center justify-between gap-4 px-5 py-4 cursor-pointer list-none select-none font-medium text-sm'>
                {item.q}
                <span className='shrink-0 text-muted-foreground group-open:hidden'>
                  <FaPlus className='h-3 w-3' />
                </span>
                <span className='shrink-0 text-muted-foreground hidden group-open:block'>
                  <FaMinus className='h-3 w-3' />
                </span>
              </summary>
              <div className='px-5 pb-4 text-sm text-muted-foreground leading-relaxed'>
                {item.a}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ───────────────────────────────────────────────────── */}
      <section className='border-t border-border/50 bg-muted/20'>
        <div className='mx-auto max-w-6xl px-4 sm:px-6 py-20 text-center'>
          <h2 className='text-3xl font-bold tracking-tight sm:text-4xl mb-4'>
            Ready to take control?
          </h2>
          <p className='text-muted-foreground max-w-md mx-auto mb-8'>
            Join ExpenseSync today and start tracking your finances with clarity.
          </p>
          <div className='flex flex-col sm:flex-row items-center justify-center gap-3'>
            <Button size='lg' className='w-full sm:w-auto gap-2 px-8' asChild>
              <Link href='/sign-up'>
                Create your account
                <FaArrowRight className='h-3.5 w-3.5' />
              </Link>
            </Button>
            <Button size='lg' variant='ghost' className='w-full sm:w-auto' asChild>
              <Link href='/sign-in'>Already have an account?</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className='border-t border-border/50'>
        <div className='mx-auto max-w-6xl px-4 sm:px-6 py-8'>
          <div className='flex flex-col sm:flex-row items-center justify-between gap-4'>
            <div className='flex items-center gap-2.5'>
              <div className='flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground'>
                <FaMoneyBillTransfer className='h-3.5 w-3.5' />
              </div>
              <span className='font-semibold text-sm'>ExpenseSync</span>
              <span className='text-xs text-muted-foreground'>· Personal Finance Tracker</span>
            </div>
            <div className='flex items-center gap-4 text-sm text-muted-foreground'>
              <a href='#features' className='hover:text-foreground transition-colors'>
                Features
              </a>
              <a href='#pricing' className='hover:text-foreground transition-colors'>
                Pricing
              </a>
              <a href='#faq' className='hover:text-foreground transition-colors'>
                FAQ
              </a>
              <Link href='/sign-in' className='hover:text-foreground transition-colors'>
                Sign In
              </Link>
              <Link href='/sign-up' className='hover:text-foreground transition-colors'>
                Sign Up
              </Link>
            </div>
          </div>
          <div className='mt-6 text-center text-xs text-muted-foreground'>
            © {new Date().getFullYear()} ExpenseSync. Built with care for personal finance.
          </div>
        </div>
      </footer>
    </div>
  );
}
