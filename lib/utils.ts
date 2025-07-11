import { twMerge } from 'tailwind-merge';
import { clsx, type ClassValue } from 'clsx';
import {
  parse,
  format,
  endOfDay,
  isSameDay,
  subMonths,
  startOfDay,
  startOfMonth,
  differenceInDays,
  eachDayOfInterval
} from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function convertAmountToMiliUnits(amount: number) {
  return amount * 1000;
}

export function convertAmountFromMiliUnits(amount: number) {
  return amount / 1000;
}

export function formatCurrency(value: number) {
  return Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'NPR',
    minimumFractionDigits: 2
  }).format(convertAmountFromMiliUnits(value));
}

export function calculatePercentageChange(current: number, previous: number, isExpense: boolean = false): number {
  if (previous === 0) {
    if (current === 0) return 0;
    const direction = current > 0 ? 1 : -1;
    return isExpense ? -100 * direction : 100 * direction;
  }

  const change = ((current - previous) / Math.abs(previous)) * 100;

  if (isExpense) {
    return -change;
  }

  return change;
}

export function fillMissingDays(
  activeDays: {
    date: Date;
    income: number;
    expenses: number;
  }[],
  startDate: Date,
  endDate: Date
) {
  if (activeDays.length == 0) {
    return [];
  }

  const allDays = eachDayOfInterval({ start: startDate, end: endDate });

  const transactionsByDay = allDays.map(day => {
    const found = activeDays.filter(d => isSameDay(d.date, day));

    if (found.length > 0) {
      return found.reduce(
        (acc, curr) => ({
          date: day,
          income: acc.income + curr.income,
          expenses: acc.expenses + curr.expenses
        }),
        { date: day, income: 0, expenses: 0 }
      );
    } else {
      return {
        date: day,
        income: 0,
        expenses: 0
      };
    }
  });

  return transactionsByDay;
}

type Period = {
  from: string | Date | undefined;
  to: string | Date | undefined;
};
export function formatDateRange(period?: Period) {
  const today = new Date();
  const defaultTo = endOfDay(today);
  const defaultFrom = startOfMonth(defaultTo);

  if (!period?.from) {
    return `${format(defaultFrom, 'LLL dd, y')} - ${format(defaultTo, 'LLL dd, y')} (${
      differenceInDays(defaultTo, defaultFrom) + 1
    } days)`;
  }

  if (period?.to) {
    return `${format(period.from, 'LLL dd, y')} - ${format(period.to, 'LLL dd, y')} (${
      differenceInDays(period.to, period.from) + 1
    } days)`;
  }

  return format(period.from, 'LLL dd, y');
}

export function formatPercentage(
  value: number,
  options: { addPrefix?: boolean; showEndDateOnly?: boolean } = { addPrefix: false, showEndDateOnly: false },
  period?: { from?: string; to?: string }
) {
  const result = new Intl.NumberFormat('en-US', { style: 'percent' }).format(value / 100);

  let returnString = '';

  if (options.addPrefix && value > 0) {
    returnString += `+${result}`;
  } else {
    returnString += result;
  }

  if (!period) {
    return returnString;
  }

  const { from, to } = period;

  const today = new Date();
  const defaultTo = endOfDay(today);
  const defaultFrom = startOfMonth(today);

  const startDate = from ? startOfDay(parse(from, 'yyyy-MM-dd', new Date())) : defaultFrom;
  const endDate = to ? endOfDay(parse(to, 'yyyy-MM-dd', new Date())) : defaultTo;

  const lastPeriodEndDate = subMonths(endDate, 1);
  const lastPeriodStartDate = subMonths(startDate, 1);

  if (options.showEndDateOnly) {
    returnString += ` from ${format(lastPeriodEndDate, 'LLL dd, y')}`;
  } else {
    returnString += ` from ${format(lastPeriodStartDate, 'LLL dd')} - ${format(
      lastPeriodEndDate,
      'LLL dd'
    )} (previous ${differenceInDays(lastPeriodEndDate, lastPeriodStartDate) + 1} days)`;
  }

  return returnString;
}
