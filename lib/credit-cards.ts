import { addDays, addMonths, getDaysInMonth, startOfDay } from 'date-fns';

type CreditCardSettings = {
  statementCloseDay?: number | null;
  statementCloseIsEom?: boolean | null;
  paymentDueDay?: number | null;
  paymentDueDays?: number | null;
};

const clampDayOfMonth = (date: Date, day: number) => {
  const daysInMonth = getDaysInMonth(date);
  return Math.min(Math.max(day, 1), daysInMonth);
};

export const getStatementCloseDateForMonth = (referenceDate: Date, settings: CreditCardSettings) => {
  const base = startOfDay(referenceDate);
  
  // Extract UTC calendar date components to avoid timezone issues
  const year = base.getUTCFullYear();
  const month = base.getUTCMonth();
  
  if (settings.statementCloseIsEom) {
    // Get last day of the month in UTC
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const result = new Date(Date.UTC(year, month, lastDay, 0, 0, 0, 0));
    return result;
  }

  const day = settings.statementCloseDay ?? base.getUTCDate();
  // Get the actual last day of the current month
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const clampedDay = Math.min(Math.max(day, 1), daysInMonth);
  const result = new Date(Date.UTC(year, month, clampedDay, 0, 0, 0, 0));
  return result;
};

export const getMostRecentStatementCloseDate = (referenceDate: Date, settings: CreditCardSettings) => {
  const base = startOfDay(referenceDate);
  const closeThisMonth = getStatementCloseDateForMonth(base, settings);
  
  if (closeThisMonth <= base) {
    return closeThisMonth;
  }

  const previousMonth = addMonths(base, -1);
  return getStatementCloseDateForMonth(previousMonth, settings);
};

export const getPreviousStatementCloseDate = (statementDate: Date, settings: CreditCardSettings) => {
  const previousDay = addDays(startOfDay(statementDate), -1);
  return getMostRecentStatementCloseDate(previousDay, settings);
};

export const getPaymentDueDate = (statementDate: Date, settings: CreditCardSettings) => {
  const base = startOfDay(statementDate);

  if (settings.paymentDueDays && settings.paymentDueDays > 0) {
    return addDays(base, settings.paymentDueDays);
  }

  if (settings.paymentDueDay && settings.paymentDueDay > 0) {
    const dueThisMonth = new Date(base);
    dueThisMonth.setDate(clampDayOfMonth(dueThisMonth, settings.paymentDueDay));

    if (dueThisMonth > base) {
      return dueThisMonth;
    }

    const nextMonth = addMonths(base, 1);
    const dueNextMonth = new Date(nextMonth);
    dueNextMonth.setDate(clampDayOfMonth(dueNextMonth, settings.paymentDueDay));
    return dueNextMonth;
  }

  return addDays(base, 15);
};
