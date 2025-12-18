import { z } from 'zod';
import { Hono } from 'hono';
import { getAuth } from '@hono/clerk-auth';
import { createId } from '@paralleldrive/cuid2';
import { zValidator } from '@hono/zod-validator';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';

import { db } from '@/db/drizzle';
import { accounts, assets, assetLots, assetPrices, insertAssetSchema, transactions } from '@/db/schema';

const app = new Hono()
  .get('/', async c => {
    const auth = getAuth(c);

    if (!auth?.userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userAssets = await db
      .select({
        id: assets.id,
        name: assets.name,
        type: assets.type,
        quantity: assets.quantity,
        unit: assets.unit,
        assetPrice: assets.assetPrice,
        extraCharge: assets.extraCharge,
        totalPaid: assets.totalPaid,
        accountId: assets.accountId,
        isSold: assets.isSold,
        soldAt: assets.soldAt,
        sellAmount: assets.sellAmount,
        createdAt: assets.createdAt,
        updatedAt: assets.updatedAt
      })
      .from(assets)
      .where(eq(assets.userId, auth.userId))
      .orderBy(desc(assets.createdAt));

    const assetIds = userAssets.map(a => a.id);

    // Fetch latest live prices per asset type from the asset_prices table
    const prices = await db
      .select({
        type: assetPrices.type,
        unit: assetPrices.unit,
        price: assetPrices.price,
        fetchedAt: assetPrices.fetchedAt
      })
      .from(assetPrices);

    const latestPriceByType: Record<string, number> = {};

    for (const p of prices) {
      const key = p.type;
      const existing = latestPriceByType[key];

      if (existing == null) {
        latestPriceByType[key] = p.price as number;
      }
    }

    // Compute realized profit/loss per asset from lots (sell lots only)
    const realizedByAsset: Record<string, number> = {};

    if (assetIds.length > 0) {
      const realizedRows = await db
        .select({
          assetId: assetLots.assetId,
          realized: sql<number>`
            COALESCE(SUM(
              CASE
                WHEN ${assetLots.quantity} < 0 THEN
                  (${assetLots.sellPrice} * ABS(${assetLots.quantity}) - -${assetLots.totalPaid} - ${assetLots.extraCharge})
                ELSE 0
              END
            ), 0)
          `
        })
        .from(assetLots)
        .where(inArray(assetLots.assetId, assetIds))
        .groupBy(assetLots.assetId);

      for (const row of realizedRows) {
        realizedByAsset[row.assetId] = row.realized;
      }
    }

    const data = userAssets.map(asset => {
      const liveUnitPrice = latestPriceByType[asset.type] ?? null;
      const currentValue = liveUnitPrice ? liveUnitPrice * asset.quantity : null;
      const realizedProfitLoss = realizedByAsset[asset.id] ?? 0;
      const unrealizedProfitLoss = currentValue != null ? currentValue - asset.totalPaid : null;

      return {
        ...asset,
        liveUnitPrice,
        currentValue,
        realizedProfitLoss,
        unrealizedProfitLoss
      };
    });

    return c.json({ data });
  })
  .get(
    '/:id/lots',
    zValidator(
      'param',
      z.object({
        id: z.string().optional()
      })
    ),
    async c => {
      const auth = getAuth(c);
      const { id } = c.req.valid('param');

      if (!auth?.userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      if (!id) {
        return c.json({ error: 'Id is required' }, 400);
      }

      const [asset] = await db
        .select({
          id: assets.id,
          userId: assets.userId
        })
        .from(assets)
        .where(eq(assets.id, id));

      if (!asset || asset.userId !== auth.userId) {
        return c.json({ error: 'Not found' }, 404);
      }

      const lots = await db
        .select({
          id: assetLots.id,
          quantity: assetLots.quantity,
          unit: assetLots.unit,
          assetPrice: assetLots.assetPrice,
          sellPrice: assetLots.sellPrice,
          extraCharge: assetLots.extraCharge,
          totalPaid: assetLots.totalPaid,
          accountId: assetLots.accountId,
          date: assetLots.date,
          account: accounts.name
        })
        .from(assetLots)
        .innerJoin(accounts, eq(assetLots.accountId, accounts.id))
        .where(eq(assetLots.assetId, id))
        .orderBy(desc(assetLots.date));

      return c.json({ data: lots });
    }
  )
  .get(
    '/:id',
    zValidator(
      'param',
      z.object({
        id: z.string().optional()
      })
    ),
    async c => {
      const auth = getAuth(c);
      const { id } = c.req.valid('param');

      if (!auth?.userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      if (!id) {
        return c.json({ error: 'Id is required' }, 400);
      }

      const [data] = await db
        .select({
          id: assets.id,
          name: assets.name,
          type: assets.type,
          quantity: assets.quantity,
          unit: assets.unit,
          assetPrice: assets.assetPrice,
          extraCharge: assets.extraCharge,
          totalPaid: assets.totalPaid,
          accountId: assets.accountId,
          isSold: assets.isSold,
          soldAt: assets.soldAt,
          sellAmount: assets.sellAmount
        })
        .from(assets)
        .innerJoin(accounts, eq(assets.accountId, accounts.id))
        .where(and(eq(assets.id, id), eq(accounts.userId, auth.userId)));

      if (!data) {
        return c.json({ error: 'Not found' }, 404);
      }

      return c.json({ data });
    }
  )
  .post(
    '/',
    zValidator(
      'json',
      insertAssetSchema
        .omit({
          id: true,
          userId: true,
          buyTransactionId: true,
          sellTransactionId: true,
          isSold: true,
          soldAt: true,
          sellAmount: true,
          createdAt: true,
          updatedAt: true
        })
        .extend({
          date: z.coerce.date()
        })
    ),
    async c => {
      const auth = getAuth(c);
      const values = c.req.valid('json');

      if (!auth?.userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const [account] = await db
        .select({ id: accounts.id })
        .from(accounts)
        .where(and(eq(accounts.id, values.accountId), eq(accounts.userId, auth.userId)));

      if (!account) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const buyTransactionId = createId();

      await db.insert(transactions).values({
        id: buyTransactionId,
        accountId: values.accountId,
        amount: -values.totalPaid,
        payee: `Asset purchase - ${values.name}`,
        notes: values.extraCharge ? `Purchase including extra charge` : 'Asset purchase',
        date: values.date,
        type: 'ASSET_BUY'
      });

      // Find existing asset for this user, by name and type; otherwise create a new asset "instrument"
      let [asset] = await db
        .select()
        .from(assets)
        .where(and(eq(assets.userId, auth.userId), eq(assets.name, values.name), eq(assets.type, values.type)));

      if (!asset) {
        const [newAsset] = await db
          .insert(assets)
          .values({
            id: createId(),
            userId: auth.userId,
            name: values.name,
            type: values.type,
            quantity: 0,
            unit: values.unit,
            assetPrice: 0,
            extraCharge: 0,
            totalPaid: 0,
            accountId: values.accountId,
            buyTransactionId
          })
          .returning();

        asset = newAsset;
      }

      // Insert lot for this purchase
      const [insertedLot] = await db
        .insert(assetLots)
        .values({
          id: createId(),
          assetId: asset.id,
          quantity: values.quantity,
          unit: values.unit,
          assetPrice: values.assetPrice,
          extraCharge: values.extraCharge,
          totalPaid: values.totalPaid,
          accountId: values.accountId,
          buyTransactionId,
          date: values.date
        })
        .returning();

      // Recalculate aggregates for the asset from all its lots
      const [aggregates] = await db
        .select({
          totalQuantity: sql<number>`COALESCE(SUM(${assetLots.quantity}), 0)`,
          totalPaid: sql<number>`COALESCE(SUM(${assetLots.totalPaid}), 0)`,
          totalExtraCharge: sql<number>`COALESCE(SUM(${assetLots.extraCharge}), 0)`,
          totalBaseCost: sql<number>`COALESCE(SUM(${assetLots.assetPrice} * ${assetLots.quantity}), 0)`
        })
        .from(assetLots)
        .where(eq(assetLots.assetId, asset.id));

      const avgPricePerUnit =
        aggregates.totalQuantity > 0 ? Math.round(aggregates.totalBaseCost / aggregates.totalQuantity) : 0;

      const [updatedAsset] = await db
        .update(assets)
        .set({
          quantity: aggregates.totalQuantity,
          totalPaid: aggregates.totalPaid,
          extraCharge: aggregates.totalExtraCharge,
          assetPrice: avgPricePerUnit,
          updatedAt: values.date
        })
        .where(eq(assets.id, asset.id))
        .returning();

      return c.json({ data: { ...updatedAsset, lastLotId: insertedLot.id } });
    }
  )
  .patch(
    '/lots/:id',
    zValidator(
      'param',
      z.object({
        id: z.string().optional()
      })
    ),
    zValidator(
      'json',
      z.object({
        quantity: z.number(),
        assetPrice: z.number(),
        extraCharge: z.number(),
        accountId: z.string(),
        date: z.coerce.date()
      })
    ),
    async c => {
      const auth = getAuth(c);
      const { id } = c.req.valid('param');
      const values = c.req.valid('json');

      if (!auth?.userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      if (!id) {
        return c.json({ error: 'Id is required' }, 400);
      }

      const [existingLot] = await db
        .select({
          id: assetLots.id,
          assetId: assetLots.assetId,
          accountId: assetLots.accountId,
          buyTransactionId: assetLots.buyTransactionId,
          userId: assets.userId
        })
        .from(assetLots)
        .innerJoin(assets, eq(assetLots.assetId, assets.id))
        .where(eq(assetLots.id, id));

      if (!existingLot || existingLot.userId !== auth.userId) {
        return c.json({ error: 'Not found' }, 404);
      }

      const newTotalPaid = values.quantity * values.assetPrice + values.extraCharge;

      const [account] = await db
        .select({ id: accounts.id })
        .from(accounts)
        .where(and(eq(accounts.id, values.accountId), eq(accounts.userId, auth.userId)));

      if (!account) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const [updatedLot] = await db
        .update(assetLots)
        .set({
          quantity: values.quantity,
          assetPrice: values.assetPrice,
          extraCharge: values.extraCharge,
          totalPaid: newTotalPaid,
          accountId: values.accountId,
          date: values.date,
          updatedAt: new Date()
        })
        .where(eq(assetLots.id, id))
        .returning();

      if (existingLot.buyTransactionId) {
        await db
          .update(transactions)
          .set({
            amount: -newTotalPaid,
            accountId: values.accountId,
            date: values.date
          })
          .where(eq(transactions.id, existingLot.buyTransactionId));
      }

      // Recalculate aggregates for the asset from all its lots
      const [aggregates] = await db
        .select({
          totalQuantity: sql<number>`COALESCE(SUM(${assetLots.quantity}), 0)`,
          totalPaid: sql<number>`COALESCE(SUM(${assetLots.totalPaid}), 0)`,
          totalExtraCharge: sql<number>`COALESCE(SUM(${assetLots.extraCharge}), 0)`,
          totalBaseCost: sql<number>`COALESCE(SUM(${assetLots.assetPrice} * ${assetLots.quantity}), 0)`
        })
        .from(assetLots)
        .where(eq(assetLots.assetId, existingLot.assetId));

      // If no quantity remains, remove the parent asset record entirely
      if (!aggregates || aggregates.totalQuantity === 0) {
        await db.delete(assets).where(eq(assets.id, existingLot.assetId));
      } else {
        const avgPricePerUnit =
          aggregates.totalQuantity > 0 ? Math.round(aggregates.totalBaseCost / aggregates.totalQuantity) : 0;

        await db
          .update(assets)
          .set({
            quantity: aggregates.totalQuantity,
            totalPaid: aggregates.totalPaid,
            extraCharge: aggregates.totalExtraCharge,
            assetPrice: avgPricePerUnit,
            updatedAt: new Date()
          })
          .where(eq(assets.id, existingLot.assetId));
      }

      return c.json({ data: updatedLot });
    }
  )
  .delete(
    '/lots/:id',
    zValidator(
      'param',
      z.object({
        id: z.string().optional()
      })
    ),
    async c => {
      const auth = getAuth(c);
      const { id } = c.req.valid('param');

      if (!auth?.userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      if (!id) {
        return c.json({ error: 'Id is required' }, 400);
      }

      const [existingLot] = await db
        .select({
          id: assetLots.id,
          assetId: assetLots.assetId,
          quantity: assetLots.quantity,
          buyTransactionId: assetLots.buyTransactionId,
          sellPrincipalTransactionId: assetLots.sellPrincipalTransactionId,
          sellProfitTransactionId: assetLots.sellProfitTransactionId,
          userId: assets.userId
        })
        .from(assetLots)
        .innerJoin(assets, eq(assetLots.assetId, assets.id))
        .where(eq(assetLots.id, id));

      if (!existingLot || existingLot.userId !== auth.userId) {
        return c.json({ error: 'Not found' }, 404);
      }

      // Delete the lot
      const [deletedLot] = await db.delete(assetLots).where(eq(assetLots.id, id)).returning();

      // Delete linked transactions if present
      if (existingLot.buyTransactionId) {
        await db.delete(transactions).where(eq(transactions.id, existingLot.buyTransactionId));
      }
      if (existingLot.sellPrincipalTransactionId) {
        await db.delete(transactions).where(eq(transactions.id, existingLot.sellPrincipalTransactionId));
      }
      if (existingLot.sellProfitTransactionId) {
        await db.delete(transactions).where(eq(transactions.id, existingLot.sellProfitTransactionId));
      }

      // Recalculate aggregates for the asset from remaining lots
      const [aggregates] = await db
        .select({
          totalQuantity: sql<number>`COALESCE(SUM(${assetLots.quantity}), 0)`,
          totalPaid: sql<number>`COALESCE(SUM(${assetLots.totalPaid}), 0)`,
          totalExtraCharge: sql<number>`COALESCE(SUM(${assetLots.extraCharge}), 0)`,
          totalBaseCost: sql<number>`COALESCE(SUM(${assetLots.assetPrice} * ${assetLots.quantity}), 0)`
        })
        .from(assetLots)
        .where(eq(assetLots.assetId, existingLot.assetId));

      // If no quantity remains, remove the parent asset record entirely
      if (!aggregates || aggregates.totalQuantity === 0) {
        await db.delete(assets).where(eq(assets.id, existingLot.assetId));
      } else {
        const avgPricePerUnit =
          aggregates.totalQuantity > 0 ? Math.round(aggregates.totalBaseCost / aggregates.totalQuantity) : 0;

        await db
          .update(assets)
          .set({
            quantity: aggregates.totalQuantity,
            totalPaid: aggregates.totalPaid,
            extraCharge: aggregates.totalExtraCharge,
            assetPrice: avgPricePerUnit,
            updatedAt: new Date()
          })
          .where(eq(assets.id, existingLot.assetId));
      }

      return c.json({ data: deletedLot });
    }
  )
  .post(
    '/:id/sell',
    zValidator(
      'param',
      z.object({
        id: z.string().optional()
      })
    ),
    zValidator(
      'json',
      z.object({
        accountId: z.string(),
        amount: z.number(),
        quantity: z.number().positive(),
        extraCharge: z.number().min(0).default(0),
        date: z.coerce.date(),
        notes: z.string().optional()
      })
    ),
    async c => {
      const auth = getAuth(c);
      const { id } = c.req.valid('param');
      const values = c.req.valid('json');

      if (!auth?.userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      if (!id) {
        return c.json({ error: 'Id is required' }, 400);
      }

      const [asset] = await db
        .select()
        .from(assets)
        .where(and(eq(assets.id, id), eq(assets.userId, auth.userId)));

      if (!asset) {
        return c.json({ error: 'Not found' }, 404);
      }

      if (asset.isSold) {
        return c.json({ error: 'Asset already sold' }, 400);
      }

      const [account] = await db
        .select({ id: accounts.id })
        .from(accounts)
        .where(and(eq(accounts.id, values.accountId), eq(accounts.userId, auth.userId)));

      if (!account) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      // Validate quantity
      if (values.quantity > asset.quantity) {
        return c.json({ error: 'Cannot sell more than you own' }, 400);
      }

      const saleAmount = values.amount;
      const extraCharge = values.extraCharge ?? 0;

      // Allocate original cost (principal) proportionally to the quantity being sold
      const sellRatio = values.quantity / asset.quantity;
      const principal = Math.round(asset.totalPaid * sellRatio);
      const profit = saleAmount - principal - extraCharge;

      const principalReturnTransactionId = createId();
      const profitTransactionId = profit > 0 ? createId() : null;

      // Principal return: not counted as income
      // If selling at a loss (saleAmount < principal), we only return the actual saleAmount as principal.
      const principalReturnAmount = profit < 0 ? saleAmount : principal;

      await db.insert(transactions).values({
        id: principalReturnTransactionId,
        accountId: values.accountId,
        amount: principalReturnAmount,
        payee: `Asset sale (principal) - ${asset.name}`,
        notes: values.notes ?? 'Asset sale principal return',
        date: values.date,
        type: 'ASSET_RETURN'
      });

      // Profit: counted as income (only if saleAmount >= principal + extraCharge)
      if (profitTransactionId && profit > 0) {
        await db.insert(transactions).values({
          id: profitTransactionId,
          accountId: values.accountId,
          amount: profit,
          payee: `Asset sale (profit) - ${asset.name}`,
          notes: values.notes ?? 'Asset sale profit',
          date: values.date,
          type: 'ASSET_SELL'
        });
      }

      // Record this sale in assetLots as a "lot" as well (negative quantity, negative principal)
      await db.insert(assetLots).values({
        id: createId(),
        assetId: asset.id,
        quantity: -values.quantity,
        unit: asset.unit,
        // Use current average buy price per unit so remaining average stays consistent
        assetPrice: asset.assetPrice,
        // Store sell price per unit separately for display
        sellPrice: Math.round(saleAmount / values.quantity),
        extraCharge,
        totalPaid: -principal,
        accountId: values.accountId,
        date: values.date,
        sellPrincipalTransactionId: principalReturnTransactionId,
        sellProfitTransactionId: profitTransactionId
      });

      // Recalculate aggregates for the asset from all its lots (buys and sells)
      const [aggregates] = await db
        .select({
          totalQuantity: sql<number>`COALESCE(SUM(${assetLots.quantity}), 0)`,
          totalPaid: sql<number>`COALESCE(SUM(${assetLots.totalPaid}), 0)`,
          totalExtraCharge: sql<number>`COALESCE(SUM(${assetLots.extraCharge}), 0)`,
          totalBaseCost: sql<number>`COALESCE(SUM(${assetLots.assetPrice} * ${assetLots.quantity}), 0)`
        })
        .from(assetLots)
        .where(eq(assetLots.assetId, asset.id));

      const avgPricePerUnit =
        aggregates.totalQuantity > 0 ? Math.round(aggregates.totalBaseCost / aggregates.totalQuantity) : 0;

      const fullySold = aggregates.totalQuantity === 0;

      const [updatedAsset] = await db
        .update(assets)
        .set({
          quantity: aggregates.totalQuantity,
          totalPaid: aggregates.totalPaid,
          extraCharge: aggregates.totalExtraCharge,
          assetPrice: avgPricePerUnit,
          isSold: fullySold,
          soldAt: fullySold ? values.date : null,
          sellAmount: fullySold ? values.amount : null,
          sellTransactionId: profitTransactionId ?? principalReturnTransactionId,
          updatedAt: values.date
        })
        .where(eq(assets.id, id))
        .returning();

      return c.json({ data: updatedAsset });
    }
  )
  .patch(
    '/:id',
    zValidator(
      'param',
      z.object({
        id: z.string().optional()
      })
    ),
    zValidator(
      'json',
      insertAssetSchema
        .omit({
          id: true,
          userId: true,
          buyTransactionId: true,
          sellTransactionId: true,
          isSold: true,
          soldAt: true,
          sellAmount: true,
          createdAt: true,
          updatedAt: true
        })
        .extend({
          date: z.coerce.date()
        })
    ),
    async c => {
      const auth = getAuth(c);
      const { id } = c.req.valid('param');
      const values = c.req.valid('json');

      if (!auth?.userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      if (!id) {
        return c.json({ error: 'Id is required' }, 400);
      }

      const [existingAsset] = await db
        .select({
          id: assets.id,
          userId: assets.userId,
          isSold: assets.isSold,
          buyTransactionId: assets.buyTransactionId
        })
        .from(assets)
        .where(eq(assets.id, id));

      if (!existingAsset || existingAsset.userId !== auth.userId) {
        return c.json({ error: 'Not found' }, 404);
      }

      if (existingAsset.isSold) {
        return c.json({ error: 'Cannot edit a sold asset' }, 400);
      }

      const [account] = await db
        .select({ id: accounts.id })
        .from(accounts)
        .where(and(eq(accounts.id, values.accountId), eq(accounts.userId, auth.userId)));

      if (!account) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const [updatedAsset] = await db
        .update(assets)
        .set({
          name: values.name,
          type: values.type,
          quantity: values.quantity,
          unit: values.unit,
          assetPrice: values.assetPrice,
          extraCharge: values.extraCharge,
          totalPaid: values.totalPaid,
          accountId: values.accountId,
          updatedAt: values.date
        })
        .where(eq(assets.id, id))
        .returning();

      if (existingAsset.buyTransactionId) {
        await db
          .update(transactions)
          .set({
            amount: -values.totalPaid,
            accountId: values.accountId,
            date: values.date,
            payee: `Asset purchase - ${values.name}`,
            notes: values.extraCharge ? `Purchase including extra charge` : 'Asset purchase'
          })
          .where(eq(transactions.id, existingAsset.buyTransactionId));
      }

      return c.json({ data: updatedAsset });
    }
  );

export default app;
