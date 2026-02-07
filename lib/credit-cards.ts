import { addDays, addMonths, endOfMonth, getDaysInMonth, startOfDay } from 'date-fns';

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
  if (settings.statementCloseIsEom) {
    return endOfMonth(base);
  }

  const day = settings.statementCloseDay ?? base.getDate();
  const clampedDay = clampDayOfMonth(base, day);
  const closeDate = new Date(base);
  closeDate.setDate(clampedDay);
  return closeDate;
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
