import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { Geist, Geist_Mono } from 'next/font/google';

import { Toaster } from '@/components/ui/sonner';
import QueryProvider from '@/providers/QueryProvider';
import { ThemeProvider } from '@/components/ThemeProvider';

import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap'
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap'
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://expensesync.vercel.app'),
  title: {
    default: 'ExpenseSync',
    template: '%s | ExpenseSync'
  },
  description: 'Personal finance tracker — track expenses, split bills, manage subscriptions, and grow your net worth.',
  icons: {
    icon: [
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/favicon.svg', type: 'image/svg+xml' }
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }]
  },
  other: {
    'fb:app_id': process.env.NEXT_PUBLIC_FB_APP_ID ?? ''
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang='en' suppressHydrationWarning>
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased pointer-events-auto!`}>
          <ThemeProvider>
            <QueryProvider>
              <Toaster position='top-right' />
              {children}
            </QueryProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
