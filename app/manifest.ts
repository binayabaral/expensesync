import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Expense Sync',
    short_name: 'Expense Sync',
    description: 'Sync and manage your expenses seamlessly.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f5f5f5',
    theme_color: '#16a34a',
    icons: [
      {
        src: '/web-app-manifest-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable' as any
      },
      {
        src: '/web-app-manifest-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable' as any
      }
    ],
  };
}
