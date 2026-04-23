import type { Metadata } from 'next';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'XpenseSync — Your finances, finally in control',
  description:
    'Track expenses, split bills with friends, manage subscriptions, credit cards, loans, and assets — with AI-powered advice and organization. Free personal finance app built for real life.',
  keywords: [
    'expense tracker',
    'personal finance',
    'bill splitting',
    'budget app',
    'net worth tracker',
    'recurring payments',
    'money management',
    'financial health',
    'AI financial advisor',
    'AI budget organizer'
  ],
  openGraph: {
    title: 'XpenseSync — Your finances, finally in control',
    description:
      'Track expenses, split bills with friends, manage subscriptions, credit cards, loans, and assets — with AI-powered advice and organization.',
    url: '/',
    siteName: 'XpenseSync',
    type: 'website',
    locale: 'en_US'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'XpenseSync — Your finances, finally in control',
    description:
      'Track expenses, split bills with friends, manage subscriptions, credit cards, loans, and assets — with AI-powered advice and organization.'
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
  FaMinus,
  FaRobot,
  FaLayerGroup,
  FaLock
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
              <span className='text-base font-bold'>XpenseSync</span>
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
            Now with AI-powered financial advice
          </Badge>
          <h1 className='mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl'>
            Your finances,{' '}
            <span className='bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent'>
              finally in control
            </span>
          </h1>
          <p className='mx-auto mt-6 max-w-2xl text-base sm:text-lg text-muted-foreground leading-relaxed'>
            Track every expense, split bills with friends, manage recurring payments, and let AI
            surface what actually needs your attention — all in one place.
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
              { value: '14+', label: 'Built-in features' },
              { value: 'AI-powered', label: 'Financial advice' },
              { value: 'Multi-account', label: 'Banks, cards & loans' },
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
              },
              {
                icon: FaHeart,
                title: 'Financial Health',
                description:
                  'Get a snapshot of your net worth, savings rate, and overall financial wellbeing in one dashboard.',
                pro: true
              },
              {
                icon: FaCoins,
                title: 'Asset Tracking',
                description:
                  'Live pricing of stocks, gold and silver. Track physical and financial assets to monitor your net worth.',
                pro: true
              },
              {
                icon: FaScaleBalanced,
                title: 'Bill Splitting',
                description:
                  'Split expenses with friends and groups. Track who owes what and settle balances with ease.',
                pro: true
              },
              {
                icon: FaRobot,
                title: 'AI Advisor',
                description:
                  'Get personalised financial recommendations powered by AI — surfacing what actually needs your attention based on your real data.',
                pro: true
              },
              {
                icon: FaLayerGroup,
                title: 'AI Financial Organizer',
                description:
                  'AI-generated payday plan, monthly calendar, and budget breakdown tailored to your accounts, income, and recurring obligations.',
                pro: true
              }
            ].map(feature => (
              <Card
                key={feature.title}
                className={`group border-border/60 bg-card/50 hover:bg-card transition-all duration-200 ${feature.pro ? 'hover:border-primary/40' : 'hover:border-primary/30'} relative overflow-hidden`}
              >
                {feature.pro && (
                  <div className='absolute top-3 right-3'>
                    <Badge className='text-[10px] px-1.5 py-0.5 gap-1 bg-primary/10 text-primary border-primary/20 hover:bg-primary/10'>
                      <FaLock className='h-2 w-2' />
                      Pro
                    </Badge>
                  </div>
                )}
                <CardContent className='p-6'>
                  <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg ${feature.pro ? 'bg-primary/10 text-primary' : 'bg-primary/10 text-primary'} group-hover:bg-primary/15 transition-colors`}>
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
              log shared expenses, and XpenseSync figures out exactly who owes what — and by how
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

      {/* ── AI Spotlight ─────────────────────────────────────────────────── */}
      <section className='border-t border-border/50 bg-muted/10'>
        <div className='mx-auto max-w-6xl px-4 sm:px-6 py-24'>
          <div className='grid gap-12 lg:grid-cols-2 items-center'>
            {/* Visual side */}
            <div className='relative order-2 lg:order-1'>
              <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_50%,hsl(var(--primary)/0.08),transparent)]' />
              <Card className='border-border/60 shadow-xl relative'>
                <CardContent className='p-6'>
                  <div className='flex items-center gap-2 mb-4'>
                    <div className='flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary'>
                      <FaRobot className='h-3.5 w-3.5' />
                    </div>
                    <span className='text-sm font-semibold'>AI Advisor · Gemini</span>
                    <Badge variant='secondary' className='ml-auto text-xs'>Personalised</Badge>
                  </div>

                  <div className='rounded-lg bg-primary/5 border border-primary/15 p-3 mb-4'>
                    <div className='text-xs font-medium mb-1 text-primary'>Financial Health Summary</div>
                    <p className='text-xs text-muted-foreground leading-relaxed'>
                      Your savings rate of 32% is strong. Fixed obligations are well-managed. Focus this month on building your emergency fund to 3 months of expenses.
                    </p>
                  </div>

                  <div className='space-y-2.5'>
                    {[
                      { priority: 'High', color: 'border-l-destructive bg-destructive/5', badge: 'bg-destructive/15 text-destructive', cat: 'savings', title: 'Emergency fund below target', desc: 'Current liquid reserves cover ~6 weeks. Aim for 3 months.' },
                      { priority: 'Medium', color: 'border-l-yellow-500 bg-yellow-500/5', badge: 'bg-yellow-500/15 text-yellow-600', cat: 'spending', title: 'Dining spend up 28% this month', desc: 'NPR 12,400 vs your NPR 9,700 average. Review recent restaurant transactions.' },
                      { priority: 'Low', color: 'border-l-green-500 bg-green-500/5', badge: 'bg-green-500/15 text-green-600', cat: 'investments', title: 'SIP on track', desc: 'Monthly SIP deductions running consistently. No action needed.' }
                    ].map(rec => (
                      <div key={rec.title} className={`border-l-4 rounded-r-md p-3 ${rec.color}`}>
                        <div className='flex items-center gap-2 mb-1 flex-wrap'>
                          <span className='text-xs font-semibold'>{rec.title}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${rec.badge}`}>{rec.cat}</span>
                        </div>
                        <p className='text-[11px] text-muted-foreground leading-relaxed'>{rec.desc}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Text side */}
            <div className='order-1 lg:order-2'>
              <Badge variant='secondary' className='mb-4'>
                AI features
              </Badge>
              <h2 className='text-3xl font-bold tracking-tight sm:text-4xl mb-5'>
                Your finances,{' '}
                <span className='bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent'>
                  explained by AI.
                </span>
              </h2>
              <p className='text-muted-foreground leading-relaxed mb-6'>
                Two built-in AI tools analyse your actual data — accounts, transactions, recurring
                payments, and investments — and tell you what to do next.
              </p>
              <ul className='space-y-3 mb-8'>
                {[
                  'AI Advisor surfaces high-priority actions based on your real spending patterns',
                  'AI Financial Organizer builds your payday plan — exactly where each rupee should go',
                  'Monthly calendar pre-built from your recurring obligations, no guesswork',
                  'Budget breakdown with category-level spend trends and targets',
                  'Powered by Gemini — results cached so you stay within rate limits'
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
                  Try the AI features
                  <FaArrowRight className='h-3.5 w-3.5' />
                </Link>
              </Button>
            </div>
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
              &ldquo;I built XpenseSync because I couldn&apos;t find a finance app that fit how I
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
                <div className='text-xs text-muted-foreground'>Creator of XpenseSync</div>
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
              Start free. Upgrade when you need bill splitting and AI features.
            </p>
          </div>

          <div className='mx-auto max-w-3xl grid gap-6 sm:grid-cols-2'>
            {/* Free tier */}
            <Card className='border-border/60 relative overflow-hidden'>
              <CardContent className='p-8 flex flex-col h-full'>
                <div className="flex-col justify-between">
                  <div className='mb-8'>
                    <Badge variant='secondary' className='mb-3'>Free</Badge>
                    <div className='text-4xl font-bold tracking-tight'>
                      NPR 0
                      <span className='text-base font-normal text-muted-foreground ml-1'>/month</span>
                    </div>
                    <div className='text-sm text-muted-foreground mt-2'>
                      Core features, forever free
                    </div>
                  </div>
                  <ul className='space-y-3 mb-8'>
                    {[
                      'Unlimited transactions',
                      'Multiple accounts & cards',
                      'Recurring payment tracking',
                      'Categories & payees',
                      'Spending trends & charts',
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
                </div>

                <Button className='w-full gap-2 mt-auto' variant='outline' size='lg' asChild>
                  <Link href='/sign-up'>
                    Get Started Free
                    <FaArrowRight className='h-3.5 w-3.5' />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Pro tier */}
            <Card className='border-primary/40 shadow-lg relative overflow-hidden'>
              <div className='absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary to-transparent' />
              <CardContent className='p-8'>
                <div className='mb-8'>
                  <Badge className='mb-3 gap-1 bg-primary/10 text-primary border-primary/20 hover:bg-primary/10'>
                    <FaStar className='h-2.5 w-2.5' />
                    Pro
                  </Badge>
                  <div className='text-4xl font-bold tracking-tight'>
                    NPR 199
                    <span className='text-base font-normal text-muted-foreground ml-1'>/year</span>
                  </div>
                  <div className='text-sm text-muted-foreground mt-2'>
                    Less than NPR 17/month — early access pricing
                  </div>
                </div>

                <ul className='space-y-3 mb-6'>
                  {[
                    { text: 'Everything in Free', free: true },
                    { text: 'Financial health dashboard', free: false },
                    { text: 'Asset tracking with live pricing', free: false },
                    { text: 'Bill splitting & groups', free: false },
                    { text: 'AI Financial Advisor', free: false },
                    { text: 'AI Financial Organizer', free: false },
                    { text: 'Priority support', free: false }
                  ].map(item => (
                    <li key={item.text} className='flex items-center gap-3 text-sm'>
                      <span className='flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary'>
                        <FaCheck className='h-2.5 w-2.5' />
                      </span>
                      {item.text}
                    </li>
                  ))}
                </ul>

                <div className='flex items-center gap-2 mb-8 rounded-md bg-muted/50 border border-border/50 px-3 py-2'>
                  <FaStar className='h-3 w-3 text-primary shrink-0' />
                  <p className='text-xs text-muted-foreground'>
                    More Pro features coming — bulk import, export & more.
                  </p>
                </div>

                <Button className='w-full gap-2' size='lg' asChild>
                  <Link href='/sign-up'>
                    Get Early Access
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
              q: 'How much does XpenseSync cost?',
              a: 'XpenseSync is currently free to use during our early access period. We plan to introduce paid plans in the future with additional features — early users will be notified well in advance.'
            },
            {
              q: 'Can I manage multiple bank accounts and credit cards?',
              a: 'Absolutely. You can add as many accounts as you need — savings accounts, current accounts, credit cards, loans, and even physical assets. Everything is tracked in one place.'
            },
            {
              q: 'How does bill splitting work?',
              a: 'Create a group for any occasion (a trip, shared flat, dinner, etc.), add members, and log shared expenses. XpenseSync automatically calculates the optimal settlement so the minimum number of transactions are needed to settle all balances.'
            },
            {
              q: 'Is my financial data secure?',
              a: 'Your data is stored securely in the cloud with industry-standard encryption. Authentication is handled by Clerk, a trusted identity platform. We never share or sell your data.'
            },
            {
              q: 'Can I use XpenseSync on mobile?',
              a: 'XpenseSync is a responsive web app that works great on any device — desktop, tablet, or mobile browser. A dedicated mobile app may come in the future.'
            },
            {
              q: 'Does XpenseSync support currencies other than USD?',
              a: 'Yes. You can enter amounts in any currency. The app is built to be currency-agnostic, making it suitable for users worldwide including Nepal, India, and beyond.'
            },
            {
              q: 'How do the AI features work?',
              a: 'The AI Advisor analyses your accounts, transactions, and recurring payments and surfaces prioritised recommendations. The AI Financial Organizer builds a personalised payday plan, monthly calendar, and budget breakdown. Both are powered by Google Gemini and analyse only your own data — nothing is shared externally.'
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
            Join XpenseSync today and start tracking your finances with clarity.
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
              <span className='font-semibold text-sm'>XpenseSync</span>
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
            © {new Date().getFullYear()} XpenseSync. Built with care for personal finance.
          </div>
        </div>
      </footer>
    </div>
  );
}
