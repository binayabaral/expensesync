import { Hono } from 'hono';
import { z } from 'zod';
import { getAuth } from '@hono/clerk-auth';
import { zValidator } from '@hono/zod-validator';
import { createId } from '@paralleldrive/cuid2';
import { and, eq } from 'drizzle-orm';

import { db } from '@/db/drizzle';
import { pushSubscriptions } from '@/db/schema';

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string(),
  auth: z.string()
});

const app = new Hono()
  .post('/', zValidator('json', subscriptionSchema), async c => {
    const auth = getAuth(c);
    if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401);

    const { endpoint, p256dh, auth: authKey } = c.req.valid('json');

    await db
      .insert(pushSubscriptions)
      .values({ id: createId(), userId: auth.userId, endpoint, p256dh, auth: authKey })
      .onConflictDoNothing({ target: pushSubscriptions.endpoint });

    return c.json({ ok: true });
  })
  .delete('/', zValidator('json', z.object({ endpoint: z.string() })), async c => {
    const auth = getAuth(c);
    if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401);

    const { endpoint } = c.req.valid('json');

    await db
      .delete(pushSubscriptions)
      .where(and(eq(pushSubscriptions.userId, auth.userId), eq(pushSubscriptions.endpoint, endpoint)));

    return c.json({ ok: true });
  });

export default app;
