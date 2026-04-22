import { addDays, addMonths, addYears, getDaysInMonth, startOfDay } from 'date-fns';

const clampDayOfMonth = (date: Date, dayOfMonth: number) => {
  const maxDay = getDaysInMonth(date);
  return Math.min(dayOfMonth, maxDay);
};

export const getNextDueDate = (item: {
  cadence: 'DAILY' | 'MONTHLY' | 'YEARLY';
  startDate: Date;
  lastCompletedAt: Date | null;
  dayOfMonth: number | null;
  month: number | null;
  intervalMonths: number;
}): Date => {
  const baseDate = startOfDay(
    item.lastCompletedAt ? new Date(item.lastCompletedAt) : new Date(item.startDate)
  );

  if (item.cadence === 'DAILY') {
    return item.lastCompletedAt ? addDays(baseDate, 1) : baseDate;
  }

  if (item.cadence === 'MONTHLY') {
    const day = item.dayOfMonth ?? baseDate.getDate();
    const interval = item.intervalMonths ?? 1;
    const next = item.lastCompletedAt ? addMonths(baseDate, interval) : new Date(baseDate);
    next.setDate(clampDayOfMonth(next, day));
    return next;
  }

  if (item.cadence === 'YEARLY') {
    const day = item.dayOfMonth ?? baseDate.getDate();
    const targetMonth = item.month ? item.month - 1 : baseDate.getMonth();
    const next = item.lastCompletedAt ? addYears(baseDate, 1) : new Date(baseDate);
    next.setMonth(targetMonth);
    next.setDate(clampDayOfMonth(next, day));
    return next;
  }

  return baseDate;
};
