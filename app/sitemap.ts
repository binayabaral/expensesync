import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://xpensesync.com',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1
    },
    {
      url: 'https://xpensesync.com/sign-in',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5
    },
    {
      url: 'https://xpensesync.com/sign-up',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7
    }
  ];
}
