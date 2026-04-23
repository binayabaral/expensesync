import type { Metadata } from 'next';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'XpenseSync — Your finances, finally in control',
  description:
    'Track your expenses, split bills with friends, manage credit cards, loans and assets, and get AI-powered financial advice. Built for real life, not for spreadsheet nerds.',
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
      'Track your expenses, split bills with friends, manage credit cards, loans and assets, and get AI-powered financial advice.',
    url: '/',
    siteName: 'XpenseSync',
    type: 'website',
    locale: 'en_US'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'XpenseSync — Your finances, finally in control',
    description:
      'Track your expenses, split bills with friends, manage credit cards, loans and assets, and get AI-powered financial advice.'
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

import { LandingPageContent } from '@/components/landing/LandingPageContent';

export default async function LandingPage() {
  const { userId } = await auth();
  if (userId) redirect('/dashboard');
  return <LandingPageContent />;
}
