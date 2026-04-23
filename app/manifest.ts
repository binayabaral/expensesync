import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'XpenseSync',
    short_name: 'XpenseSync',
    description: 'Personal finance tracker — track expenses, split bills, manage subscriptions, and grow your net worth.',
    start_url: '/dashboard',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f5f5f5',
    theme_color: '#16a34a',
    lang: 'en',
    categories: ['finance'],
    icons: [
      {
        src: '/web-app-manifest-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/web-app-manifest-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: '/web-app-manifest-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/web-app-manifest-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      }
    ],
    shortcuts: [
      {
        name: 'Add Transaction',
        short_name: 'Transaction',
        description: 'Quickly add a new transaction',
        url: '/dashboard/transactions',
        icons: [{ src: '/web-app-manifest-192x192.png', sizes: '192x192' }]
      },
      {
        name: 'Add Transfer',
        short_name: 'Transfer',
        description: 'Record a transfer between accounts',
        url: '/dashboard/transfers',
        icons: [{ src: '/web-app-manifest-192x192.png', sizes: '192x192' }]
      },
      {
        name: 'Bill Split',
        short_name: 'Split',
        description: 'Go to bill split',
        url: '/dashboard/bill-split',
        icons: [{ src: '/web-app-manifest-192x192.png', sizes: '192x192' }]
      }
    ]
  };
}
