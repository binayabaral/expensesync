import { NextResponse } from 'next/server';
import { differenceInCalendarDays, startOfDay } from 'date-fns';
import { eq } from 'drizzle-orm';

import { db } from '@/db/drizzle';
import { recurringPayments } from '@/db/schema';
import { getNextDueDate } from '@/lib/recurring-utils';
import { sendPushToUser } from '@/lib/push';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const all = await db
    .select({
      id: recurringPayments.id,
      userId: recurringPayments.userId,
      name: recurringPayments.name,
      cadence: recurringPayments.cadence,
      startDate: recurringPayments.startDate,
      lastCompletedAt: recurringPayments.lastCompletedAt,
      dayOfMonth: recurringPayments.dayOfMonth,
      month: recurringPayments.month,
      intervalMonths: recurringPayments.intervalMonths,
      isActive: recurringPayments.isActive
    })
    .from(recurringPayments)
    .where(eq(recurringPayments.isActive, true));

  const today = startOfDay(new Date());
  const due: typeof all = [];

  for (const item of all) {
    const nextDue = getNextDueDate({
      cadence: item.cadence,
      startDate: item.startDate,
      lastCompletedAt: item.lastCompletedAt,
      dayOfMonth: item.dayOfMonth,
      month: item.month,
      intervalMonths: item.intervalMonths ?? 1
    });

    const daysLeft = differenceInCalendarDays(nextDue, today);
    if (daysLeft === 1 || daysLeft === 0) {
      due.push(item);
    }
  }

  // Group by userId so we send one notification per user with all due items
  const byUser = due.reduce<Record<string, typeof due>>((acc, item) => {
    if (!acc[item.userId]) acc[item.userId] = [];
    acc[item.userId].push(item);
    return acc;
  }, {});

  const results = await Promise.allSettled(
    Object.entries(byUser).map(([userId, items]) => {
      const dueToday = items.filter(i => {
        const daysLeft = differenceInCalendarDays(
          getNextDueDate({
            cadence: i.cadence,
            startDate: i.startDate,
            lastCompletedAt: i.lastCompletedAt,
            dayOfMonth: i.dayOfMonth,
            month: i.month,
            intervalMonths: i.intervalMonths ?? 1
          }),
          today
        );
        return daysLeft === 0;
      });
      const dueTomorrow = items.filter(i => !dueToday.includes(i));

      const names = items.map(i => i.name);
      const title =
        dueToday.length > 0 && dueTomorrow.length === 0
          ? 'Recurring payment due today'
          : dueToday.length === 0 && dueTomorrow.length > 0
            ? 'Upcoming recurring payment'
            : 'Recurring payments reminder';

      const bodyParts: string[] = [];
      if (dueToday.length > 0)
        bodyParts.push(
          `Due today: ${dueToday
            .map(i => i.name)
            .join(', ')}`
        );
      if (dueTomorrow.length > 0)
        bodyParts.push(
          `Due tomorrow: ${dueTomorrow
            .map(i => i.name)
            .join(', ')}`
        );

      return sendPushToUser(userId, {
        title,
        body: bodyParts.join(' · '),
        url: '/dashboard/recurring-payments',
        badgeCount: names.length
      });
    })
  );

  const sent = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  return NextResponse.json({ sent, failed, usersNotified: Object.keys(byUser).length });
}
