import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import { clerkMiddleware } from '@hono/clerk-auth';

import healthRoute from './health';
import summaryRoute from './summary';
import accountsRoute from './accounts';
import TransfersRoute from './transfers';
import categoriesRoute from './categories';
import transactionsRoute from './transactions';
import assetsRoute from './assets';
import payeesRoute from './payees';
import recurringPaymentsRoute from './recurring-payments';
import creditCardsRoute from './credit-cards';
import creditCardStatementsRoute from './credit-card-statements';
import loansRoute from './loans';
import splitEnrollmentRoute from './split-enrollment';
import splitContactsRoute from './split-contacts';
import splitGroupsRoute from './split-groups';
import splitExpensesRoute from './split-expenses';
import splitSettlementsRoute from './split-settlements';
import splitBalancesRoute from './split-balances';

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
  .route('/transactions', transactionsRoute)
  .route('/assets', assetsRoute)
  .route('/payees', payeesRoute)
  .route('/recurring-payments', recurringPaymentsRoute)
  .route('/credit-cards', creditCardsRoute)
  .route('/credit-card-statements', creditCardStatementsRoute)
  .route('/loans', loansRoute)
  .route('/split-enrollment', splitEnrollmentRoute)
  .route('/split-contacts', splitContactsRoute)
  .route('/split-groups', splitGroupsRoute)
  .route('/split-expenses', splitExpensesRoute)
  .route('/split-settlements', splitSettlementsRoute)
  .route('/split-balances', splitBalancesRoute);

export const GET = handle(app);
export const POST = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);

export type AppType = typeof routes;
