import { Hono } from 'hono';
import { handle } from 'hono/vercel';

import accountsRoute from './accounts';

export const runtime = 'edge';

const app = new Hono().basePath('/api');

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const routes = app.route('/accounts', accountsRoute);

export const GET = handle(app);
export const POST = handle(app);

export type AppType = typeof routes;
