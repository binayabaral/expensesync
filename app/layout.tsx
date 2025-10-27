import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { Geist, Geist_Mono } from 'next/font/google';

import { Toaster } from '@/components/ui/sonner';
import QueryProvider from '@/providers/QueryProvider';
import { SheetProvider } from '@/providers/SheetProvider';

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
  title: 'Expense Sync',
  description: 'Take control of your personal expenses'
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang='en'>
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased !pointer-events-auto`}>
          <QueryProvider>
            <SheetProvider>
              <Toaster position='top-right' />
              {children}
            </SheetProvider>
          </QueryProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
