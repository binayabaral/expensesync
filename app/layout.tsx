import type { Metadata, Viewport } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { Geist, Geist_Mono } from 'next/font/google';

import { Toaster } from '@/components/ui/sonner';
import QueryProvider from '@/providers/QueryProvider';
import { ThemeProvider } from '@/components/ThemeProvider';
import { PwaInstallPrompt } from '@/components/PwaInstallPrompt';

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

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#16a34a' },
    { media: '(prefers-color-scheme: dark)', color: '#15803d' }
  ]
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://xpensesync.com'),
  title: {
    default: 'XpenseSync',
    template: '%s | XpenseSync'
  },
  description: 'Personal finance tracker — track expenses, split bills, manage subscriptions, and grow your net worth.',
  openGraph: {
    title: 'XpenseSync',
    description: 'Personal finance tracker — track expenses, split bills, manage subscriptions, and grow your net worth.',
    url: 'https://xpensesync.com',
    siteName: 'XpenseSync',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'XpenseSync',
    description: 'Personal finance tracker — track expenses, split bills, manage subscriptions, and grow your net worth.',
    images: ['/opengraph-image']
  },
  icons: {
    icon: [
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/favicon.svg', type: 'image/svg+xml' }
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }]
  },
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
              <PwaInstallPrompt />
              {children}
            </QueryProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
