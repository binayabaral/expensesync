import type { Metadata } from 'next';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'XpenseSync — Track expenses, split bills & grow wealth',
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
    title: 'XpenseSync — Track expenses, split bills & grow wealth',
    description:
      'Track your expenses, split bills with friends, manage credit cards, loans and assets, and get AI-powered financial advice.',
    url: 'https://xpensesync.com',
    siteName: 'XpenseSync',
    type: 'website',
    locale: 'en_US'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'XpenseSync — Track expenses, split bills & grow wealth',
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
    canonical: 'https://xpensesync.com'
  }
};

import { LandingPageContent } from '@/components/landing/LandingPageContent';

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://xpensesync.com/#organization',
      name: 'XpenseSync',
      url: 'https://xpensesync.com',
      logo: {
        '@type': 'ImageObject',
        url: 'https://xpensesync.com/favicon-96x96.png'
      },
      sameAs: []
    },
    {
      '@type': 'WebSite',
      '@id': 'https://xpensesync.com/#website',
      url: 'https://xpensesync.com',
      name: 'XpenseSync',
      publisher: { '@id': 'https://xpensesync.com/#organization' }
    },
    {
      '@type': 'SoftwareApplication',
      '@id': 'https://xpensesync.com/#app',
      name: 'XpenseSync',
      url: 'https://xpensesync.com',
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Web, iOS, Android',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'NPR'
      },
      description:
        'Track expenses, split bills with friends, manage credit cards, loans and assets, and get AI-powered financial advice.',
      publisher: { '@id': 'https://xpensesync.com/#organization' }
    },
    {
      '@type': 'FAQPage',
      '@id': 'https://xpensesync.com/#faq',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'How much does XpenseSync cost?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'XpenseSync is free right now. When paid plans launch, early users will get plenty of notice and will likely get a discount for joining early.'
          }
        },
        {
          '@type': 'Question',
          name: 'Can I manage multiple bank accounts and credit cards?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'You can add as many accounts as you need. Savings accounts, current accounts, credit cards, loans, physical assets. Everything in one place.'
          }
        },
        {
          '@type': 'Question',
          name: 'How does bill splitting work?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Create a group for any occasion (a trip, shared flat, dinner, etc.), add members, and log shared expenses. XpenseSync automatically calculates the optimal settlement so the minimum number of transactions are needed to settle all balances.'
          }
        },
        {
          '@type': 'Question',
          name: 'Is my financial data secure?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Your data is stored securely in the cloud with industry-standard encryption. Authentication is handled by Clerk, a trusted identity platform. We never share or sell your data.'
          }
        },
        {
          '@type': 'Question',
          name: 'Can I use XpenseSync on mobile?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'XpenseSync works great on any device. You can also install it as a PWA from your browser for a near-native experience on iOS and Android.'
          }
        },
        {
          '@type': 'Question',
          name: 'Does XpenseSync support NPR and other currencies?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. You can enter amounts in any currency. The app is built with NPR (Nepali Rupee) as the primary currency and is suitable for users worldwide including Nepal, India, and beyond.'
          }
        },
        {
          '@type': 'Question',
          name: 'How do the AI features work?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'The AI Advisor looks at your accounts, transactions and recurring payments and tells you what to prioritise. The AI Organizer builds a payday plan, monthly calendar and budget breakdown. Both run on Google Gemini and only ever look at your own data.'
          }
        }
      ]
    }
  ]
};

export default async function LandingPage() {
  const { userId } = await auth();
  if (userId) redirect('/dashboard');
  return (
    <>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingPageContent />
    </>
  );
}
