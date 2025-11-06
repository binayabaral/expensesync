import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import { clerkMiddleware } from '@hono/clerk-auth';

import healthRoute from './health';
import summaryRoute from './summary';
import accountsRoute from './accounts';
import TransfersRoute from './transfers';
import categoriesRoute from './categories';
import transactionsRoute from './transactions';

export const runtime = 'edge';

const app = new Hono().basePath('/api');

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const routes = app
  .use(clerkMiddleware())
  .route('/health', healthRoute)
  .route('/summary', summaryRoute)
  .route('/accounts', accountsRoute)
  .route('/transfers', TransfersRoute)
  .route('/categories', categoriesRoute)
  .route('/transactions', transactionsRoute);

export const GET = handle(app);
export const POST = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);

export type AppType = typeof routes;
