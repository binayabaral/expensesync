import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import { HTTPException } from 'hono/http-exception';

import accountsRoute from './accounts';

export const runtime = 'edge';

const app = new Hono().basePath('/api');

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const routes = app.route('/accounts', accountsRoute);

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse();
  }

  return c.json({ error: 'Internal Server Error' }, 500);
});

export const GET = handle(app);
export const POST = handle(app);

export type AppType = typeof routes;
