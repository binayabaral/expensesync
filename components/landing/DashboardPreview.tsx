'use client';

import { useState } from 'react';
import {
  FaMoneyBillTransfer,
  FaReceipt,
  FaScaleBalanced,
  FaArrowsRotate,
  FaWallet,
  FaTags,
  FaHeart,
  FaChartLine,
  FaCoins,
  FaCreditCard,
  FaFileInvoiceDollar,
  FaArrowTrendUp,
  FaArrowTrendDown,
  FaLayerGroup,
  FaArrowRightArrowLeft,
  FaPlus,
  FaRobot,
  FaArrowRight,
  FaLock
} from 'react-icons/fa6';

type Page =
  | 'overview'
  | 'transactions'
  | 'transfers'
  | 'recurring'
  | 'bill-split'
  | 'accounts'
  | 'credit-cards'
  | 'loans'
  | 'assets'
  | 'categories'
  | 'payees'
  | 'health'
  | 'ai-advisor'
  | 'ai-organizer';

const sidebarSections = [
  {
    label: null,
    items: [{ id: 'overview' as Page, icon: FaLayerGroup, label: 'Overview', pro: false }]
  },
  {
    label: 'Transactions',
    icon: FaArrowRightArrowLeft,
    items: [
      { id: 'transactions' as Page, icon: FaReceipt, label: 'Transactions' },
      { id: 'transfers' as Page, icon: FaArrowRightArrowLeft, label: 'Transfers' },
      { id: 'recurring' as Page, icon: FaArrowsRotate, label: 'Recurring' },
      { id: 'bill-split' as Page, icon: FaScaleBalanced, label: 'Bill Split', pro: true }
    ]
  },
  {
    label: 'Accounts',
    icon: FaWallet,
    items: [
      { id: 'accounts' as Page, icon: FaWallet, label: 'Accounts' },
      { id: 'credit-cards' as Page, icon: FaCreditCard, label: 'Credit Cards' },
      { id: 'loans' as Page, icon: FaFileInvoiceDollar, label: 'Loans' },
      { id: 'assets' as Page, icon: FaCoins, label: 'Assets' }
    ]
  },
  {
    label: 'Analytics',
    icon: FaChartLine,
    items: [
      { id: 'categories' as Page, icon: FaTags, label: 'Categories' },
      { id: 'payees' as Page, icon: FaReceipt, label: 'Payees' },
      { id: 'health' as Page, icon: FaHeart, label: 'Financial Health' }
    ]
  },
  {
    label: 'AI',
    icon: FaRobot,
    items: [
      { id: 'ai-advisor' as Page, icon: FaRobot, label: 'Advisor', pro: true },
      { id: 'ai-organizer' as Page, icon: FaLayerGroup, label: 'Organizer', pro: true }
    ]
  }
];

/* ── Shared sub-components ───────────────────────────────────────── */

function MockButton({ children, primary }: { children: React.ReactNode; primary?: boolean }) {
  return (
    <div
      className={`pointer-events-none select-none inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[10px] font-medium ${
        primary
          ? 'bg-primary text-primary-foreground'
          : 'border border-border/60 bg-background text-foreground'
      }`}
    >
      {children}
    </div>
  );
}

function TableRow({ cells }: { cells: React.ReactNode[] }) {
  return (
    <tr className='border-b border-border/30 last:border-0'>
      {cells.map((cell, i) => (
        <td key={i} className='py-1.5 px-2 text-[10px]'>
          {cell}
        </td>
      ))}
    </tr>
  );
}

function TableHead({ cols }: { cols: string[] }) {
  return (
    <thead>
      <tr className='border-b border-border/50'>
        {cols.map(col => (
          <th key={col} className='py-1.5 px-2 text-[9px] text-muted-foreground font-medium text-left whitespace-nowrap'>
            {col}
          </th>
        ))}
      </tr>
    </thead>
  );
}

function PageCard({
  title,
  action,
  children
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className='rounded-lg border border-border/50 bg-background overflow-hidden'>
      <div className='flex items-center justify-between px-3 py-2.5 border-b border-border/40'>
        <span className='text-xs font-semibold'>{title}</span>
        {action}
      </div>
      {children}
    </div>
  );
}

function SearchBox() {
  return (
    <div className='mx-3 mt-2.5 mb-2'>
      <div className='h-6 rounded border border-border/50 bg-muted/30 flex items-center px-2'>
        <span className='text-[9px] text-muted-foreground'>Search all columns...</span>
      </div>
    </div>
  );
}

/* ── Page content ────────────────────────────────────────────────── */

function OverviewContent() {
  return (
    <div className='space-y-2.5'>
      <div className='mb-1'>
        <div className='text-xs font-semibold'>Welcome back, Alex! 👋</div>
        <div className='text-[10px] text-muted-foreground'>Here&apos;s an overview of your finances</div>
      </div>

      {/* 4 cards */}
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-2'>
        {[
          { label: 'Current Balance', value: 'NPR 4,10,885', sub: 'All accounts', color: 'text-primary', bg: 'bg-primary/10', icon: FaWallet },
          { label: 'Income', value: 'NPR 3,13,500', sub: '+100% vs last period', color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: FaArrowTrendUp },
          { label: 'Expenses', value: 'NPR 1,56,652', sub: '+143% vs last period', color: 'text-red-400', bg: 'bg-red-500/10', icon: FaArrowTrendDown },
          { label: 'Extra Charges', value: 'NPR 9,530', sub: '-5% vs last period', color: 'text-orange-400', bg: 'bg-orange-500/10', icon: FaReceipt }
        ].map(card => (
          <div key={card.label} className='rounded-lg border border-border/50 bg-background p-2.5 flex items-start justify-between gap-1'>
            <div className='min-w-0'>
              <div className='text-[9px] text-muted-foreground mb-0.5 truncate'>{card.label}</div>
              <div className={`text-[11px] font-bold ${card.color} truncate`}>{card.value}</div>
              <div className='text-[8px] text-muted-foreground mt-0.5 truncate'>{card.sub}</div>
            </div>
            <div className={`h-7 w-7 rounded-lg ${card.bg} ${card.color} flex items-center justify-center shrink-0`}>
              <card.icon className='h-3 w-3' />
            </div>
          </div>
        ))}
      </div>

      {/* Donut charts + credit cards */}
      <div className='grid grid-cols-3 gap-2'>
        <div className='rounded-lg border border-border/50 bg-background p-3'>
          <div className='text-[10px] font-medium mb-2'>Categories</div>
          <div className='flex items-center gap-2'>
            <div className='relative shrink-0' style={{ width: 48, height: 48 }}>
              <div className='w-full h-full rounded-full' style={{ background: 'conic-gradient(#f97316 0% 70%, #3b82f6 70% 83%, #22c55e 83% 86%, #a855f7 86% 96%, #6b7280 96% 100%)' }} />
              <div className='absolute inset-0 flex items-center justify-center'>
                <div className='rounded-full bg-background' style={{ width: 30, height: 30 }} />
              </div>
            </div>
            <div className='space-y-0.5 min-w-0'>
              {[['Food & Drinks', '70%', 'bg-orange-400'], ['Transport', '10%', 'bg-blue-500'], ['Household', '3%', 'bg-emerald-500'], ['Others', '17%', 'bg-purple-500']].map(([l, p, c]) => (
                <div key={l} className='flex items-center gap-1'>
                  <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${c}`} />
                  <span className='text-[8px] text-muted-foreground truncate'>{l}</span>
                  <span className='text-[8px] font-medium ml-auto'>{p}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className='rounded-lg border border-border/50 bg-background p-3'>
          <div className='text-[10px] font-medium mb-2'>Payees</div>
          <div className='flex items-center gap-2'>
            <div className='relative shrink-0' style={{ width: 48, height: 48 }}>
              <div className='w-full h-full rounded-full' style={{ background: 'conic-gradient(#f59e0b 0% 70%, #06b6d4 70% 80%, #ec4899 80% 83%, #84cc16 83% 85%, #6b7280 85% 100%)' }} />
              <div className='absolute inset-0 flex items-center justify-center'>
                <div className='rounded-full bg-background' style={{ width: 30, height: 30 }} />
              </div>
            </div>
            <div className='space-y-0.5 min-w-0'>
              {[['Green Fork', '70%', 'bg-amber-400'], ['Bluebook', '10%', 'bg-cyan-500'], ['Krystal', '5%', 'bg-pink-500'], ['Others', '15%', 'bg-lime-500']].map(([l, p, c]) => (
                <div key={l} className='flex items-center gap-1'>
                  <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${c}`} />
                  <span className='text-[8px] text-muted-foreground truncate'>{l}</span>
                  <span className='text-[8px] font-medium ml-auto'>{p}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className='rounded-lg border border-border/50 bg-background p-3'>
          <div className='text-[10px] font-medium mb-2'>Credit Cards</div>
          <div className='text-[9px] text-muted-foreground mb-1.5 uppercase tracking-wide'>Utilization</div>
          <div className='space-y-2'>
            {[{ name: 'Himalayan Card', used: 4, owed: 'NPR 8,169' }, { name: 'Nabil Card', used: 11, owed: 'NPR 10,611' }].map(cc => (
              <div key={cc.name}>
                <div className='flex justify-between text-[8px] mb-0.5'>
                  <span className='text-muted-foreground truncate'>{cc.name}</span>
                  <span className='font-medium'>{cc.used}%</span>
                </div>
                <div className='h-1 rounded-full bg-muted overflow-hidden'>
                  <div className='h-full rounded-full bg-primary' style={{ width: `${cc.used}%` }} />
                </div>
                <div className='text-[8px] text-muted-foreground mt-0.5'>Owed {cc.owed}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Area chart */}
      <div className='rounded-lg border border-border/50 bg-background p-3'>
        <div className='text-[10px] font-medium mb-2'>Transactions</div>
        <svg viewBox='0 0 400 60' className='w-full' preserveAspectRatio='none' style={{ height: 60 }}>
          {[0, 30, 60].map(y => <line key={y} x1='0' y1={y} x2='400' y2={y} stroke='currentColor' strokeOpacity='0.08' strokeWidth='1' strokeDasharray='4 4' />)}
          <path d='M0,55 C30,50 60,42 90,32 C120,22 150,16 180,13 C200,11 220,18 240,22 C270,28 300,16 340,8 C370,3 390,4 400,4 L400,60 L0,60 Z' fill='rgba(34,197,94,0.12)' />
          <path d='M0,55 C30,50 60,42 90,32 C120,22 150,16 180,13 C200,11 220,18 240,22 C270,28 300,16 340,8 C370,3 390,4 400,4' fill='none' stroke='rgb(34,197,94)' strokeWidth='1.5' />
          <path d='M0,58 C40,56 80,54 120,53 C160,52 200,55 240,54 C280,53 320,56 360,57 C380,57.5 395,58 400,58 L400,60 L0,60 Z' fill='rgba(239,68,68,0.25)' />
          <path d='M0,58 C40,56 80,54 120,53 C160,52 200,55 240,54 C280,53 320,56 360,57 C380,57.5 395,58 400,58' fill='none' stroke='rgb(239,68,68)' strokeWidth='1.5' />
        </svg>
      </div>
    </div>
  );
}

function TransactionsContent() {
  return (
    <PageCard title='Transactions History' action={<MockButton primary><FaPlus className='h-2.5 w-2.5' /> Add New</MockButton>}>
      <SearchBox />
      <div className='overflow-x-auto'>
        <table className='w-full'>
          <TableHead cols={['Date', 'Category', 'Payee', 'Amount', 'Account', 'Notes']} />
          <tbody>
            {[
              ['18 Mar, 2026', 'Food & Drinks', 'Green Fork Restaurant', <span key='v' className='text-red-400 font-semibold'>-NPR 1,450</span>, 'Nabil Bank', 'Lunch'],
              ['17 Mar, 2026', 'Transportation', 'Bluebook Renew', <span key='v' className='text-red-400 font-semibold'>-NPR 4,000</span>, 'Himalayan Bank', '—'],
              ['15 Mar, 2026', 'Salary', 'NEA', <span key='v' className='text-emerald-500 font-semibold'>+NPR 85,000</span>, 'Nabil Bank', 'March salary'],
              ['14 Mar, 2026', 'Household', 'Big Mart', <span key='v' className='text-red-400 font-semibold'>-NPR 3,200</span>, 'Himalayan Bank', 'Groceries'],
              ['12 Mar, 2026', 'Entertainment', 'Krystal', <span key='v' className='text-red-400 font-semibold'>-NPR 800</span>, 'Cash', '—']
            ].map((row, i) => <TableRow key={i} cells={row as React.ReactNode[]} />)}
          </tbody>
        </table>
      </div>
    </PageCard>
  );
}

function TransfersContent() {
  return (
    <PageCard title='Transfers History' action={<MockButton primary><FaPlus className='h-2.5 w-2.5' /> Add New</MockButton>}>
      <SearchBox />
      <div className='overflow-x-auto'>
        <table className='w-full'>
          <TableHead cols={['Date', 'From', 'To', 'Amount', 'Extra Charges', 'Notes']} />
          <tbody>
            {[
              ['15 Mar, 2026', 'Cash', 'Nabil Bank', 'NPR 20,000', <span key='v' className='text-muted-foreground'>NPR 0</span>, 'Top up'],
              ['10 Mar, 2026', 'Nabil Bank', 'Himalayan Bank', 'NPR 50,000', <span key='v' className='text-red-400'>NPR 100</span>, 'Transfer fee'],
              ['04 Mar, 2026', 'Himalayan Bank', 'Cash', 'NPR 5,000', <span key='v' className='text-muted-foreground'>NPR 0</span>, 'ATM withdrawal'],
              ['28 Feb, 2026', 'Nabil Bank', 'Cash', 'NPR 8,000', <span key='v' className='text-muted-foreground'>NPR 0</span>, '—']
            ].map((row, i) => <TableRow key={i} cells={row as React.ReactNode[]} />)}
          </tbody>
        </table>
      </div>
    </PageCard>
  );
}

function RecurringContent() {
  return (
    <PageCard title='Recurring Payments' action={<MockButton primary><FaPlus className='h-2.5 w-2.5' /> Add New</MockButton>}>
      <SearchBox />
      <div className='overflow-x-auto'>
        <table className='w-full'>
          <TableHead cols={['Name', 'Type', 'Cadence', 'Next Due', 'Days Left', 'Amount']} />
          <tbody>
            {[
              ['Netflix', 'Transaction', 'Monthly', '01 Apr, 2026', <span key='v' className='text-emerald-500'>14 days</span>, 'NPR 649'],
              ['Home Loan EMI', 'Transfer', 'Every 3 months', '20 Mar, 2026', <span key='v' className='text-red-400'>Overdue</span>, 'NPR 32,000'],
              ['Car Insurance', 'Transaction', 'Yearly', '15 May, 2026', <span key='v' className='text-emerald-500'>58 days</span>, 'NPR 18,500'],
              ['Internet Bill', 'Transaction', 'Monthly', '25 Mar, 2026', <span key='v' className='text-yellow-500'>7 days</span>, 'NPR 1,200'],
              ['Gym Membership', 'Transaction', 'Monthly', '01 Apr, 2026', <span key='v' className='text-emerald-500'>14 days</span>, 'NPR 2,500']
            ].map((row, i) => <TableRow key={i} cells={row as React.ReactNode[]} />)}
          </tbody>
        </table>
      </div>
    </PageCard>
  );
}

function BillSplitContent() {
  return (
    <div className='space-y-2.5'>
      <div className='flex items-center justify-between mb-1'>
        <div className='text-xs font-semibold'>Bill Split</div>
        <MockButton primary><FaPlus className='h-2.5 w-2.5' /> Add contact</MockButton>
      </div>

      {/* You owe / You're owed */}
      <div className='grid grid-cols-2 gap-2'>
        <div className='rounded-lg border border-rose-500/30 bg-rose-500/5 p-3'>
          <div className='text-[9px] text-muted-foreground mb-0.5'>You owe</div>
          <div className='text-sm font-bold text-red-400'>NPR 1,043</div>
          <div className='text-[9px] text-muted-foreground mt-0.5'>to Priya</div>
        </div>
        <div className='rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3'>
          <div className='text-[9px] text-muted-foreground mb-0.5'>You&apos;re owed</div>
          <div className='text-sm font-bold text-emerald-500'>NPR 5,720</div>
          <div className='text-[9px] text-muted-foreground mt-0.5'>from 2 people</div>
        </div>
      </div>

      {/* People grid */}
      <div className='rounded-lg border border-border/50 bg-background p-3'>
        <div className='text-[10px] font-medium mb-2'>People</div>
        <div className='grid grid-cols-2 gap-1.5'>
          {[
            { initials: 'PR', name: 'Priya', status: 'you owe NPR 1,043', color: 'bg-blue-500/20 text-blue-500', statusColor: 'text-red-400' },
            { initials: 'RK', name: 'Rohan', status: 'owes you NPR 3,200', color: 'bg-purple-500/20 text-purple-500', statusColor: 'text-emerald-500' },
            { initials: 'SM', name: 'Sita', status: 'owes you NPR 2,520', color: 'bg-orange-500/20 text-orange-500', statusColor: 'text-emerald-500' },
            { initials: 'DG', name: 'Dev', status: 'settled', color: 'bg-green-500/20 text-green-500', statusColor: 'text-muted-foreground' }
          ].map(p => (
            <div key={p.name} className='rounded-md border border-border/50 bg-muted/20 p-2'>
              <div className='flex items-center gap-1.5 mb-1'>
                <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[9px] font-bold ${p.color}`}>{p.initials}</div>
                <span className='text-[10px] font-medium'>{p.name}</span>
              </div>
              <div className={`text-[9px] ${p.statusColor}`}>{p.status}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Groups */}
      <div className='rounded-lg border border-border/50 bg-background p-3'>
        <div className='flex items-center justify-between mb-2'>
          <div className='text-[10px] font-medium'>Groups</div>
          <MockButton primary><FaPlus className='h-2 w-2' /> New group</MockButton>
        </div>
        <div className='space-y-1.5'>
          {[
            { name: 'College Crew', members: 'Priya, Rohan, Sita', currency: 'NPR' },
            { name: 'Work Team', members: 'Priya, Dev', currency: 'NPR' }
          ].map(g => (
            <div key={g.name} className='flex items-center justify-between rounded border border-border/40 bg-muted/20 px-2.5 py-1.5'>
              <div className='flex items-center gap-2'>
                <div className='h-6 w-6 rounded bg-primary/10 flex items-center justify-center'>
                  <FaScaleBalanced className='h-2.5 w-2.5 text-primary' />
                </div>
                <div>
                  <div className='text-[10px] font-medium'>{g.name} <span className='text-[9px] border border-border/50 rounded px-1'>{g.currency}</span></div>
                  <div className='text-[9px] text-muted-foreground'>{g.members}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AccountsContent() {
  return (
    <PageCard title='Accounts' action={<MockButton primary><FaPlus className='h-2.5 w-2.5' /> Add New</MockButton>}>
      <SearchBox />
      <div className='overflow-x-auto'>
        <table className='w-full'>
          <TableHead cols={['Name', 'Available Balance', 'Type']} />
          <tbody>
            {[
              ['Nabil Bank', <span key='v' className='text-emerald-500 font-semibold'>NPR 2,14,500</span>, 'Bank Account'],
              ['Himalayan Bank', <span key='v' className='text-emerald-500 font-semibold'>NPR 98,200</span>, 'Bank Account'],
              ['Cash', <span key='v' className='text-emerald-500 font-semibold'>NPR 12,800</span>, 'Cash'],
              ['eSewa Wallet', <span key='v' className='text-emerald-500 font-semibold'>NPR 4,385</span>, 'Digital Wallet'],
              ['Old Savings', <span key='v0' className='text-muted-foreground font-semibold'>NPR 80,000</span>, <span key='v1' className='text-[9px] border border-border/50 rounded px-1 mr-1'>Closed</span>]
            ].map((row, i) => <TableRow key={i} cells={row as React.ReactNode[]} />)}
          </tbody>
        </table>
      </div>
    </PageCard>
  );
}

function CreditCardsContent() {
  return (
    <div className='space-y-2.5'>
      {/* Card selector */}
      <div className='rounded-lg border border-border/50 bg-background p-3'>
        <div className='flex items-center justify-between mb-2.5'>
          <span className='text-xs font-semibold'>Credit Cards</span>
          <div className='pointer-events-none border border-border/60 rounded px-2 py-0.5 text-[10px] flex items-center gap-1'>
            Himalayan Credit Card <span className='text-muted-foreground'>▾</span>
          </div>
        </div>
        <div className='grid grid-cols-2 gap-x-6 gap-y-1 text-[10px] mb-3'>
          {[
            ['Current Owed', 'NPR 8,169.00'], ['Next Statement Due', 'N/A'],
            ['Credit Limit', 'NPR 2,00,000.00'], ['Minimum Payment', 'N/A'],
            ['Available Credit', 'NPR 1,91,831.00'], ['Statement Balance', 'N/A'],
            ['Utilization', '4%'], ['Interest Estimate', 'N/A'],
            ['APR', '24.00%'], ['', '']
          ].map(([k, v], i) => k ? (
            <div key={i} className='flex justify-between border-b border-border/20 pb-0.5'>
              <span className='text-muted-foreground'>{k}:</span>
              <span className='font-medium'>{v}</span>
            </div>
          ) : <div key={i} />)}
        </div>
        <div className='flex gap-2'>
          <MockButton primary>Close Statement</MockButton>
          <MockButton>Pay Statement</MockButton>
        </div>
      </div>

      {/* Statements table */}
      <PageCard title='Statements'>
        <SearchBox />
        <div className='overflow-x-auto'>
          <table className='w-full'>
            <TableHead cols={['Statement Date', 'Due Date', 'Statement Balance', 'Payment Due', 'Minimum', 'Paid', 'Status']} />
            <tbody>
              {[
                ['28 Feb, 2026', '16 Mar, 2026', 'NPR 45,198', 'NPR 45,198', 'NPR 4,519', 'NPR 45,198', <span key='v' className='text-emerald-500'>Paid</span>],
                ['01 Feb, 2026', '16 Feb, 2026', 'NPR 99,607', 'NPR 99,607', 'NPR 9,960', 'NPR 1,00,604', <span key='v' className='text-emerald-500'>Paid</span>]
              ].map((row, i) => <TableRow key={i} cells={row as React.ReactNode[]} />)}
            </tbody>
          </table>
        </div>
      </PageCard>
    </div>
  );
}

function LoansContent() {
  return (
    <div className='space-y-2.5'>
      {/* EMI loans */}
      <div className='text-[10px] font-semibold text-muted-foreground uppercase tracking-wide'>EMI Loans</div>
      <div className='grid grid-cols-2 gap-2'>
        {[
          { name: 'Home Loan', badge: 'EMI', progress: 56, paid: 'NPR 1,25,000', total: 'NPR 2,25,000', remaining: 'NPR 1,00,000', payments: '5', rate: '14%', due: '20th' },
          { name: 'Car Loan', badge: 'EMI', progress: 17, paid: 'NPR 16,80,291', total: 'NPR 36,02,200', remaining: 'NPR 19,21,908', payments: '14/84', rate: '5.81%', due: '1st' }
        ].map(loan => (
          <div key={loan.name} className='rounded-lg border border-border/50 bg-background p-3'>
            <div className='flex items-center gap-2 mb-2'>
              <span className='text-[11px] font-semibold'>{loan.name}</span>
              <span className='text-[9px] border border-border/50 rounded px-1'>{loan.badge}</span>
            </div>
            <div className='flex items-center justify-between text-[9px] text-muted-foreground mb-1'>
              <span>Progress</span>
              <span className='font-semibold text-foreground'>{loan.progress}%</span>
            </div>
            <div className='h-1.5 rounded-full bg-muted overflow-hidden mb-2'>
              <div className='h-full rounded-full bg-primary' style={{ width: `${loan.progress}%` }} />
            </div>
            <div className='space-y-0.5 text-[9px]'>
              <div><span className='text-muted-foreground'>Paid: </span>{loan.paid} <span className='text-muted-foreground'>· Total: </span>{loan.total}</div>
              <div><span className='text-muted-foreground'>Remaining: </span><span className='text-red-400 font-medium'>{loan.remaining}</span></div>
              <div><span className='text-muted-foreground'>Payments: </span>{loan.payments} <span className='text-muted-foreground'>· Rate: </span>{loan.rate} <span className='text-muted-foreground'>· Due: </span><span className='font-semibold'>{loan.due}</span></div>
            </div>
          </div>
        ))}
      </div>

      {/* Outstanding balance chart */}
      <div className='rounded-lg border border-border/50 bg-background p-3'>
        <div className='text-[10px] font-medium mb-2'>Outstanding Balance by Loan</div>
        <svg viewBox='0 0 400 80' className='w-full' preserveAspectRatio='none' style={{ height: 80 }}>
          {[0, 40, 80].map(y => <line key={y} x1='0' y1={y} x2='400' y2={y} stroke='currentColor' strokeOpacity='0.08' strokeWidth='1' strokeDasharray='4 4' />)}
          {/* Home loan - goes up then stays flat */}
          <path d='M0,78 C20,75 40,60 60,40 C80,20 100,10 130,8 C180,6 220,7 280,7 C330,7 370,8 400,9' fill='none' stroke='#f97316' strokeWidth='1.5' />
          {/* Car loan - rises sharply */}
          <path d='M0,79 C20,78 40,75 60,55 C80,35 100,15 130,5 C150,2 180,2 220,3 C270,3 330,3 400,3' fill='rgba(34,197,94,0.15)' />
          <path d='M0,79 C20,78 40,75 60,55 C80,35 100,15 130,5 C150,2 180,2 220,3 C270,3 330,3 400,3' fill='none' stroke='rgb(34,197,94)' strokeWidth='1.5' />
          {/* Personal loan - small, stays low */}
          <path d='M0,79 C30,78 60,77 100,75 C140,73 180,76 220,74 C260,72 320,75 400,76' fill='none' stroke='#3b82f6' strokeWidth='1' />
        </svg>
        <div className='flex gap-3 mt-1.5'>
          {[['Home Loan', 'bg-orange-400'], ['Car Loan', 'bg-emerald-500'], ['Personal Loan', 'bg-blue-500']].map(([l, c]) => (
            <div key={l} className='flex items-center gap-1'>
              <div className={`h-1.5 w-3 rounded ${c}`} />
              <span className='text-[8px] text-muted-foreground'>{l}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AssetsContent() {
  return (
    <PageCard title='Assets' action={<MockButton primary><FaPlus className='h-2.5 w-2.5' /> Add New</MockButton>}>
      <SearchBox />
      <div className='overflow-x-auto'>
        <table className='w-full'>
          <TableHead cols={['Name', 'Type', 'Qty', 'Total Paid', 'Current Value', 'Unrealized P/L']} />
          <tbody>
            {[
              ['Nabil Bank Shares', 'Stock', '200', 'NPR 1,40,000', 'NPR 1,68,000', <span key='v' className='text-emerald-500'>+NPR 28,000</span>],
              ['Honda Activa', 'Vehicle', '1', 'NPR 1,85,000', 'NPR 1,20,000', <span key='v' className='text-red-400'>-NPR 65,000</span>],
              ['Gold (10g)', 'Commodity', '10', 'NPR 87,500', 'NPR 1,02,000', <span key='v' className='text-emerald-500'>+NPR 14,500</span>],
              ['NIC Asia Shares', 'Stock', '150', 'NPR 63,000', 'NPR 59,250', <span key='v' className='text-red-400'>-NPR 3,750</span>]
            ].map((row, i) => <TableRow key={i} cells={row as React.ReactNode[]} />)}
          </tbody>
          <tfoot>
            <tr className='border-t border-border/50 bg-muted/20'>
              <td colSpan={3} className='py-1.5 px-2 text-[9px] text-muted-foreground'>Totals</td>
              <td className='py-1.5 px-2 text-[10px] font-semibold'>NPR 4,75,500</td>
              <td className='py-1.5 px-2 text-[10px] font-semibold'>NPR 4,49,250</td>
              <td className='py-1.5 px-2 text-[10px] font-semibold text-red-400'>-NPR 26,250</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </PageCard>
  );
}

function CategoriesContent() {
  return (
    <PageCard title='Categories' action={<MockButton primary><FaPlus className='h-2.5 w-2.5' /> Add New</MockButton>}>
      <SearchBox />
      <div className='overflow-x-auto'>
        <table className='w-full'>
          <TableHead cols={['Name', 'Mar 01–18', 'Feb 01–18', 'Jan 01–18', 'Dec 01–18']} />
          <tbody>
            {[
              ['Salary', <span key='v0' className='text-emerald-500'>NPR 3,13,500</span>, <span key='v1' className='text-muted-foreground'>NPR 0.00</span>, <span key='v2' className='text-emerald-500'>NPR 3,13,500</span>, <span key='v3' className='text-emerald-500'>NPR 3,13,500</span>],
              ['Food & Drinks', <span key='v0' className='text-red-400'>-NPR 23,763</span>, <span key='v1' className='text-red-400'>-NPR 27,451</span>, <span key='v2' className='text-red-400'>-NPR 36,069</span>, <span key='v3' className='text-red-400'>-NPR 23,210</span>],
              ['Transportation', <span key='v0' className='text-red-400'>-NPR 15,680</span>, <span key='v1' className='text-red-400'>-NPR 2,120</span>, <span key='v2' className='text-red-400'>-NPR 250</span>, <span key='v3' className='text-red-400'>-NPR 3,12,954</span>],
              ['Household', <span key='v0' className='text-red-400'>-NPR 5,126</span>, <span key='v1' className='text-red-400'>-NPR 19,822</span>, <span key='v2' className='text-red-400'>-NPR 24,632</span>, <span key='v3' className='text-red-400'>-NPR 12,899</span>],
              ['Entertainment', <span key='v0' className='text-muted-foreground'>NPR 0.00</span>, <span key='v1' className='text-muted-foreground'>NPR 0.00</span>, <span key='v2' className='text-red-400'>-NPR 7,251</span>, <span key='v3' className='text-red-400'>-NPR 1,400</span>]
            ].map((row, i) => <TableRow key={i} cells={row as React.ReactNode[]} />)}
          </tbody>
          <tfoot>
            <tr className='border-t border-border/50 bg-muted/20'>
              <td className='py-1.5 px-2 text-[9px] text-muted-foreground'>Totals</td>
              {[
                ['NPR 3,13,500', '-NPR 1,56,652', 'NPR 1,56,847'],
                ['NPR 0.00', '-NPR 64,473', '-NPR 64,473'],
                ['NPR 3,16,517', '-NPR 2,80,309', 'NPR 36,208'],
                ['NPR 3,13,500', '-NPR 3,60,198', '-NPR 46,698']
              ].map((col, i) => (
                <td key={i} className='py-1.5 px-2'>
                  <div className='text-[8px] text-emerald-500'>{col[0]}</div>
                  <div className='text-[8px] text-red-400'>{col[1]}</div>
                  <div className='text-[8px] font-semibold'>{col[2]}</div>
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </PageCard>
  );
}

function PayeesContent() {
  return (
    <PageCard title='Payees'>
      <SearchBox />
      <div className='overflow-x-auto'>
        <table className='w-full'>
          <TableHead cols={['Payee', 'Mar 01–18', 'Feb 01–18', 'Jan 01–18', 'Dec 01–18']} />
          <tbody>
            {[
              ['Green Fork Restaurant', <span key='v0' className='text-red-400'>-NPR 12,840</span>, <span key='v1' className='text-red-400'>-NPR 18,320</span>, <span key='v2' className='text-red-400'>-NPR 22,100</span>, <span key='v3' className='text-red-400'>-NPR 9,450</span>],
              ['Bluebook Renew', <span key='v0' className='text-emerald-500'>NPR 0</span>, <span key='v1' className='text-red-400'>-NPR 4,000</span>, <span key='v2' className='text-muted-foreground'>NPR 0</span>, <span key='v3' className='text-red-400'>-NPR 4,000</span>],
              ['NEA', <span key='v0' className='text-red-400'>-NPR 1,800</span>, <span key='v1' className='text-red-400'>-NPR 1,650</span>, <span key='v2' className='text-red-400'>-NPR 2,100</span>, <span key='v3' className='text-red-400'>-NPR 1,900</span>],
              ['Krystal', <span key='v0' className='text-red-400'>-NPR 5,400</span>, <span key='v1' className='text-red-400'>-NPR 3,200</span>, <span key='v2' className='text-red-400'>-NPR 6,800</span>, <span key='v3' className='text-red-400'>-NPR 4,100</span>],
              ['Big Mart', <span key='v0' className='text-red-400'>-NPR 3,200</span>, <span key='v1' className='text-red-400'>-NPR 5,800</span>, <span key='v2' className='text-red-400'>-NPR 4,900</span>, <span key='v3' className='text-red-400'>-NPR 6,200</span>]
            ].map((row, i) => <TableRow key={i} cells={row as React.ReactNode[]} />)}
          </tbody>
        </table>
      </div>
    </PageCard>
  );
}

function HealthContent() {
  return (
    <div className='space-y-2.5'>
      {/* Summary cards */}
      <div className='grid grid-cols-3 gap-2'>
        {[
          { label: 'Assets', value: 'NPR 23,74,091', sub: 'On Mar 19, 2026', color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: FaCoins },
          { label: 'Liabilities', value: 'NPR 25,41,731', sub: 'On Mar 19, 2026', color: 'text-red-400', bg: 'bg-red-500/10', icon: FaFileInvoiceDollar },
          { label: 'Net Worth', value: '-NPR 1,67,640', sub: 'On Mar 19, 2026', color: 'text-red-400', bg: 'bg-red-500/10', icon: FaChartLine }
        ].map(card => (
          <div key={card.label} className='rounded-lg border border-border/50 bg-background p-2.5 flex items-start justify-between gap-1'>
            <div className='min-w-0'>
              <div className='text-[9px] text-muted-foreground mb-0.5'>{card.label}</div>
              <div className={`text-[10px] font-bold ${card.color} truncate`}>{card.value}</div>
              <div className='text-[8px] text-muted-foreground mt-0.5'>{card.sub}</div>
            </div>
            <div className={`h-7 w-7 rounded-lg ${card.bg} ${card.color} flex items-center justify-center shrink-0`}>
              <card.icon className='h-3 w-3' />
            </div>
          </div>
        ))}
      </div>

      {/* Net worth chart */}
      <div className='rounded-lg border border-border/50 bg-background p-3'>
        <div className='text-[10px] font-medium mb-2'>Net worth over time</div>
        <svg viewBox='0 0 400 90' className='w-full' preserveAspectRatio='none' style={{ height: 90 }}>
          {[0, 45, 90].map(y => <line key={y} x1='0' y1={y} x2='400' y2={y} stroke='currentColor' strokeOpacity='0.08' strokeWidth='1' strokeDasharray='4 4' />)}
          {/* Positive net worth area (green, short) */}
          <path d='M0,60 C20,55 40,45 60,30 C80,15 100,8 120,10 C140,12 160,30 180,45 L180,45 L120,45 L60,45 L0,45 Z' fill='rgba(34,197,94,0.15)' />
          <path d='M0,60 C20,55 40,45 60,30 C80,15 100,8 120,10 C140,12 160,30 180,45' fill='none' stroke='rgb(34,197,94)' strokeWidth='1.5' />
          {/* Negative net worth area (red) */}
          <path d='M180,45 C200,50 220,58 240,68 C260,75 300,78 340,78 C370,78 390,78 400,78 L400,90 L180,90 Z' fill='rgba(239,68,68,0.2)' />
          <path d='M180,45 C200,50 220,58 240,68 C260,75 300,78 340,78 C370,78 390,78 400,78' fill='none' stroke='rgb(239,68,68)' strokeWidth='1.5' />
          {/* Zero line */}
          <line x1='0' y1='45' x2='400' y2='45' stroke='currentColor' strokeOpacity='0.3' strokeWidth='0.5' strokeDasharray='2 2' />
        </svg>
        <div className='flex justify-between mt-1'>
          {['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'].map(m => (
            <span key={m} className='text-[7px] text-muted-foreground'>{m}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function AiAdvisorContent() {
  return (
    <div className='space-y-2.5'>
      <div className='flex items-center justify-between'>
        <div>
          <div className='text-xs font-semibold flex items-center gap-1.5'>
            <FaRobot className='h-3 w-3 text-primary' />
            AI Financial Advisor
          </div>
          <div className='text-[9px] text-muted-foreground mt-0.5'>Analyses all your financial data and surfaces what actually needs your attention.</div>
        </div>
        <div className='pointer-events-none border border-border/60 rounded-md px-2 py-1 text-[9px] flex items-center gap-1 bg-background'>
          <FaArrowRight className='h-2 w-2' /> Refresh
        </div>
      </div>

      <div className='text-[8px] text-muted-foreground'>Gemini · Vertex AI · Apr 22, 9:38 AM · AI-generated — verify before acting</div>

      <div className='rounded-lg border border-primary/20 bg-primary/5 p-3'>
        <div className='text-[10px] font-semibold mb-1'>Financial Health Summary</div>
        <p className='text-[9px] text-muted-foreground leading-relaxed'>
          Your net worth is currently negative, primarily driven by significant liabilities including a large car loan. While your overall savings rate over the last 90 days was healthy, your monthly net savings have declined sharply in April, indicating increasing expenses are eroding your financial progress.
        </p>
      </div>

      <div className='text-[9px] font-semibold text-muted-foreground uppercase tracking-wide'>High Priority</div>
      <div className='space-y-1.5'>
        {[
          { cat: 'debt', badge: 'bg-destructive/15 text-destructive', border: 'border-l-destructive', title: 'Address Negative Net Worth', desc: 'Your net worth is currently negative, driven by total liabilities of NPR 8,50,000. This indicates you owe more than you own.', action: 'Prioritise aggressive debt reduction, starting with high-interest loans while building an emergency buffer.' },
          { cat: 'savings', badge: 'bg-destructive/15 text-destructive', border: 'border-l-destructive', title: 'Build a Robust Emergency Fund', desc: 'Your current liquid savings cover less than 3 months of average monthly expenses. A recommended emergency fund is 3–6 months.', action: 'Set a target of at least NPR 2,55,000. Prioritise topping this up before increasing other investments.' }
        ].map(rec => (
          <div key={rec.title} className={`border-l-4 ${rec.border} rounded-r-md bg-destructive/5 p-2.5`}>
            <div className='flex items-center gap-1.5 mb-1 flex-wrap'>
              <span className='text-[9px] font-semibold'>{rec.title}</span>
              <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-medium ${rec.badge}`}>{rec.cat}</span>
            </div>
            <p className='text-[8px] text-muted-foreground leading-relaxed mb-1'>{rec.desc}</p>
            <p className='text-[8px] text-primary font-medium'>→ {rec.action}</p>
          </div>
        ))}
      </div>

      <div className='text-[9px] font-semibold text-muted-foreground uppercase tracking-wide'>Medium Priority</div>
      <div className='space-y-1.5'>
        {[
          { cat: 'debt', badge: 'bg-yellow-500/15 text-yellow-600', border: 'border-l-yellow-500', title: 'Evaluate High APR Home Loan', desc: 'Your Home Loan has an APR of 14%, significantly above the market average for home financing.', action: 'Research options to refinance with a lower interest rate from another financial institution.' },
          { cat: 'spending', badge: 'bg-yellow-500/15 text-yellow-600', border: 'border-l-yellow-500', title: 'Review Credit Card Annual Fee', desc: 'One of your credit cards has an annual subscription charge of NPR 1,500 that may be waivable.', action: 'Contact your bank to inquire about waiving the annual fee based on your spending history.' }
        ].map(rec => (
          <div key={rec.title} className={`border-l-4 ${rec.border} rounded-r-md bg-yellow-500/5 p-2.5`}>
            <div className='flex items-center gap-1.5 mb-1 flex-wrap'>
              <span className='text-[9px] font-semibold'>{rec.title}</span>
              <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-medium ${rec.badge}`}>{rec.cat}</span>
            </div>
            <p className='text-[8px] text-muted-foreground leading-relaxed mb-1'>{rec.desc}</p>
            <p className='text-[8px] text-primary font-medium'>→ {rec.action}</p>
          </div>
        ))}
      </div>

      <div className='text-[9px] font-semibold text-muted-foreground uppercase tracking-wide'>Low Priority</div>
      <div className={`border-l-4 border-l-green-500 rounded-r-md bg-green-500/5 p-2.5`}>
        <div className='flex items-center gap-1.5 mb-1'>
          <span className='text-[9px] font-semibold'>Improve Data Entry for Recurring Items</span>
          <span className='text-[8px] px-1.5 py-0.5 rounded-full font-medium bg-green-500/15 text-green-600'>general</span>
        </div>
        <p className='text-[8px] text-muted-foreground leading-relaxed mb-1'>Several items listed under Recurring Income such as vehicle registration and insurance renewals are actually recurring expenses, not income.</p>
        <p className='text-[8px] text-primary font-medium'>→ Recategorise these items under Recurring Expenses for more accurate reporting.</p>
      </div>
    </div>
  );
}

function AiOrganizerContent() {
  return (
    <div className='space-y-2.5'>
      <div className='flex items-center justify-between'>
        <div>
          <div className='text-xs font-semibold flex items-center gap-1.5'>
            <FaLayerGroup className='h-3 w-3 text-primary' />
            AI Financial Organizer
          </div>
          <div className='text-[9px] text-muted-foreground mt-0.5'>Account health check, payday routing plan, monthly calendar, and budget breakdown.</div>
        </div>
        <div className='pointer-events-none border border-border/60 rounded-md px-2 py-1 text-[9px] flex items-center gap-1 bg-background'>
          <FaArrowRight className='h-2 w-2' /> Refresh
        </div>
      </div>

      <div className='text-[8px] text-muted-foreground'>Gemini · Vertex AI · Apr 22, 12:10 PM · AI-generated — verify before acting</div>

      {/* Payday Plan */}
      <div className='rounded-lg border border-border/50 bg-background overflow-hidden'>
        <div className='px-3 py-2 border-b border-border/40 text-[10px] font-semibold'>Payday Plan</div>
        <div className='p-2.5 space-y-1.5'>
          {[
            { step: 1, action: 'Transfer to National Bank for Car EMI buffer', amount: 'NPR 10,000', to: 'National Bank', color: 'bg-orange-500/10 border-orange-500/30' },
            { step: 2, action: 'Transfer to SSF — mandatory SSF contributions', amount: 'NPR 2,500', to: 'SSF', color: 'bg-blue-500/10 border-blue-500/30' },
            { step: 3, action: 'Transfer to Sunrise Savings for savings and set-asides', amount: 'NPR 35,000', to: 'Sunrise Savings', color: 'bg-emerald-500/10 border-emerald-500/30' },
            { step: 4, action: 'Transfer to Metro Bank for monthly spending', amount: 'NPR 37,500', to: 'Metro Bank', color: 'bg-primary/10 border-primary/30' }
          ].map(s => (
            <div key={s.step} className={`rounded border ${s.color} p-2`}>
              <div className='flex items-center justify-between mb-0.5'>
                <div className='flex items-center gap-1.5'>
                  <span className='h-4 w-4 rounded-full bg-primary/15 text-primary text-[8px] font-bold flex items-center justify-center shrink-0'>{s.step}</span>
                  <span className='text-[9px] font-medium'>{s.action}</span>
                </div>
                <span className='text-[9px] font-bold shrink-0 ml-2'>{s.amount}</span>
              </div>
              <div className='text-[8px] text-muted-foreground ml-5.5'>→ {s.to}</div>
            </div>
          ))}
          <div className='text-[8px] text-muted-foreground text-right'>Total: NPR 85,000</div>
        </div>
      </div>

      {/* Monthly Routine */}
      <div className='rounded-lg border border-border/50 bg-background overflow-hidden'>
        <div className='px-3 py-2 border-b border-border/40 text-[10px] font-semibold'>Monthly Routine</div>
        <div className='p-2.5 space-y-1'>
          {[
            { day: 1, name: 'Car EMI auto-deducted', amount: 'NPR 10,000', badge: 'Auto', account: 'National Bank' },
            { day: 15, name: 'Monthly salary deposit', amount: 'NPR 85,000', badge: 'Auto', account: 'Summit Bank' },
            { day: 15, name: 'SSF contributions', amount: 'NPR 2,500', badge: 'Auto', account: 'SSF' },
            { day: 15, name: 'SIP — mutual fund deducted', amount: 'NPR 3,000', badge: 'Auto', account: 'SIP Fund' },
            { day: 25, name: 'Pay electricity bill', amount: '~NPR 1,800', badge: 'Variable', account: 'unknown', variable: true },
            { day: 28, name: 'Pay streaming subscription', amount: 'NPR 649', badge: null, account: 'Metro Bank' }
          ].map((item, i) => (
            <div key={i} className='flex items-center gap-2'>
              <span className='text-[8px] text-muted-foreground w-6 shrink-0 text-right'>Day {item.day}</span>
              <span className='text-[9px] flex-1'>{item.name}</span>
              <span className={`text-[8px] font-medium ${item.variable ? 'text-yellow-600' : ''}`}>{item.amount}</span>
              {item.badge && (
                <span className={`text-[7px] px-1 py-0.5 rounded border shrink-0 ${item.variable ? 'border-yellow-500/40 text-yellow-600 bg-yellow-500/10' : 'border-border/50 text-muted-foreground'}`}>
                  {item.badge}
                </span>
              )}
            </div>
          ))}
          <div className='mt-2 rounded bg-yellow-500/10 border border-yellow-500/20 p-2 text-[8px] text-yellow-700 dark:text-yellow-400'>
            ⚠ Days 15–16 are busy: SIP auto-deduction, salary deposit, and SSF contributions all fall within 2 days. Aug 20 — Life Insurance Premium — NPR 18,500
          </div>
        </div>
      </div>

      {/* Budget Allocation */}
      <div className='rounded-lg border border-border/50 bg-background overflow-hidden'>
        <div className='px-3 py-2 border-b border-border/40 text-[10px] font-semibold'>Budget Allocation</div>
        <div className='grid grid-cols-3 gap-px bg-border/30'>
          {[
            { label: 'Monthly Income', value: 'NPR 85,000', color: 'text-foreground' },
            { label: 'Fixed Obligations', value: 'NPR 18,200', color: 'text-red-400' },
            { label: 'Savings Target', value: 'NPR 25,500 (30%)', color: 'text-emerald-500' }
          ].map(card => (
            <div key={card.label} className='bg-background p-2.5 text-center'>
              <div className='text-[8px] text-muted-foreground'>{card.label}</div>
              <div className={`text-[9px] font-bold mt-0.5 ${card.color}`}>{card.value}</div>
            </div>
          ))}
        </div>
        <div className='p-2.5'>
          <div className='text-[9px] font-medium mb-1.5'>Discretionary Budget <span className='text-muted-foreground font-normal'>NPR 41,300</span></div>
          <div className='space-y-1'>
            {[
              { name: 'Food & Drinks', budget: 'NPR 18,000', actual: 'NPR 14,200', status: 'ok', statusColor: 'text-emerald-500' },
              { name: 'Entertainment', budget: 'NPR 4,500', actual: 'NPR 6,100', status: 'over', statusColor: 'text-red-400' },
              { name: 'Clothing', budget: 'NPR 3,200', actual: 'NPR 5,800', status: 'over', statusColor: 'text-red-400' },
              { name: 'Others', budget: 'NPR 2,100', actual: 'NPR 1,900', status: 'ok', statusColor: 'text-emerald-500' }
            ].map(cat => (
              <div key={cat.name} className='flex items-center gap-2 text-[8px]'>
                <span className='flex-1 text-muted-foreground truncate'>{cat.name}</span>
                <span>actual {cat.actual}</span>
                <span>budget {cat.budget}</span>
                <span className={`font-medium w-6 text-right ${cat.statusColor}`}>{cat.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Account Health (compact) */}
      <div className='rounded-lg border border-border/50 bg-background overflow-hidden'>
        <div className='px-3 py-2 border-b border-border/40 text-[10px] font-semibold'>Account Health</div>
        <div className='divide-y divide-border/30'>
          {[
            { name: 'Sunrise Savings', tags: ['Emergency Fund', 'Long-term Savings'], rec: 'KEEP', balance: 'NPR 1,42,500', desc: 'High-interest savings account. Primary savings vehicle.' },
            { name: 'Metro Bank', tags: ['Primary Spending Account'], rec: 'KEEP', balance: 'NPR 48,200', desc: 'Main account for daily expenses and family transfers.' },
            { name: 'SIP Fund', tags: ['Mutual Fund Investment'], rec: 'KEEP', balance: 'NPR 15,000', desc: 'Mutual fund SIP account for automated monthly investments.' },
            { name: 'Summit Bank', tags: ['Salary Landing Account'], rec: 'KEEP', balance: 'NPR 2,100', desc: 'Primary salary account where income is deposited.' }
          ].map(acc => (
            <div key={acc.name} className='px-3 py-2'>
              <div className='flex items-center gap-1.5 mb-0.5'>
                <span className='text-[9px] font-medium'>{acc.name}</span>
                {acc.tags.map(t => (
                  <span key={t} className='text-[7px] border border-border/50 rounded px-1 text-muted-foreground'>{t}</span>
                ))}
                <span className='ml-auto text-[8px] font-semibold text-emerald-500'>{acc.rec}</span>
                <span className='text-[8px] font-medium'>{acc.balance}</span>
              </div>
              <p className='text-[8px] text-muted-foreground'>{acc.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const pageContent: Record<Page, React.ReactNode> = {
  overview: <OverviewContent />,
  transactions: <TransactionsContent />,
  transfers: <TransfersContent />,
  recurring: <RecurringContent />,
  'bill-split': <BillSplitContent />,
  accounts: <AccountsContent />,
  'credit-cards': <CreditCardsContent />,
  loans: <LoansContent />,
  assets: <AssetsContent />,
  categories: <CategoriesContent />,
  payees: <PayeesContent />,
  health: <HealthContent />,
  'ai-advisor': <AiAdvisorContent />,
  'ai-organizer': <AiOrganizerContent />
};

/* ── Main export ─────────────────────────────────────────────────── */

export function DashboardPreview() {
  const [activePage, setActivePage] = useState<Page>('overview');

  return (
    <div className='rounded-xl border border-border/60 bg-card shadow-2xl overflow-hidden'>
      {/* Browser chrome */}
      <div className='flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-muted/40'>
        <div className='flex gap-1.5'>
          <div className='h-3 w-3 rounded-full bg-red-400/70' />
          <div className='h-3 w-3 rounded-full bg-yellow-400/70' />
          <div className='h-3 w-3 rounded-full bg-green-400/70' />
        </div>
        <div className='flex-1 mx-3'>
          <div className='mx-auto max-w-xs h-6 rounded-md bg-background/60 border border-border/40 flex items-center justify-center'>
            <span className='text-xs text-muted-foreground'>expensesync.app/dashboard</span>
          </div>
        </div>
      </div>

      {/* App layout */}
      <div className='flex' style={{ height: 660, overflow: 'hidden' }}>
        {/* Sidebar */}
        <div className='hidden sm:flex flex-col w-48 border-r border-border/50 bg-muted/20 p-2.5 gap-0 shrink-0 overflow-hidden'>
          {/* Logo */}
          <div className='flex items-center gap-2 px-2 py-2 mb-1'>
            <div className='h-6 w-6 rounded bg-primary flex items-center justify-center shrink-0'>
              <FaMoneyBillTransfer className='h-3 w-3 text-primary-foreground' />
            </div>
            <div>
              <div className='text-[10px] font-bold leading-none'>ExpenseSync</div>
              <div className='text-[9px] text-muted-foreground'>Finance Tracker</div>
            </div>
          </div>

          {/* Nav sections */}
          {sidebarSections.map((section, si) => (
            <div key={si} className={si > 0 ? 'mt-2 mb-1' : 'mb-1'}>
              {section.label && (
                <div className='flex items-center gap-1.5 px-2 py-1'>
                  {section.icon && <section.icon className='h-2.5 w-2.5 text-muted-foreground' />}
                  <span className='text-[9px] text-muted-foreground font-medium'>{section.label}</span>
                </div>
              )}
              {section.items.map(item => (
                <button
                  key={item.id}
                  onClick={() => setActivePage(item.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] cursor-pointer transition-colors ${
                    activePage === item.id
                      ? 'bg-primary/15 text-primary font-semibold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <item.icon className='h-3 w-3 shrink-0' />
                  <span className='flex-1 text-left'>{item.label}</span>
                  {item.pro && (
                    <span className='flex items-center gap-0.5 text-[8px] font-medium text-primary/70 bg-primary/10 rounded px-1 py-0.5 shrink-0'>
                      <FaLock className='h-1.5 w-1.5' />
                      Pro
                    </span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Main content */}
        <div className='flex-1 p-4 overflow-y-auto overflow-x-hidden'>
          {pageContent[activePage]}
        </div>
      </div>
    </div>
  );
}
