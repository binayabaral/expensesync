import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import { clerkMiddleware } from '@hono/clerk-auth';

import accountsRoute from './accounts';

export const runtime = 'edge';

const app = new Hono().basePath('/api');

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const routes = app.use(clerkMiddleware()).route('/accounts', accountsRoute);

export const GET = handle(app);
export const POST = handle(app);

export type AppType = typeof routes;
