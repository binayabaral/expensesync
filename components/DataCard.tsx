import { IconType } from 'react-icons';
import { cva, VariantProps } from 'class-variance-authority';

import { CountUp } from '@/components/CountUp';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatCurrency, formatPercentage } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const boxVariants = cva('rounded-md p-3', {
  variants: {
    variant: {
      default: 'bg-muted-foreground/20',
      warning: 'bg-yellow-500/20',
      success: 'bg-green-500/20',
      destructive: 'bg-rose-500/20'
    },
    defaultVariants: {
      variant: 'default'
    }
  }
});

const iconVariants = cva('size-6', {
  variants: {
    variant: {
      default: 'fill-muted-foreground',
      warning: 'fill-yellow-500',
      success: 'fill-green-500',
      destructive: 'fill-rose-500'
    },
    defaultVariants: {
      variant: 'default'
    }
  }
});

type BoxVariants = VariantProps<typeof boxVariants>;
type IconVariants = VariantProps<typeof iconVariants>;

interface DataCardProps extends BoxVariants, IconVariants {
  title: string;
  icon: IconType;
  value?: number;
  subtitle: string;
  isLoading?: boolean;
  percentageChange?: number;
  period: { from: string | undefined; to: string | undefined };
}

function DataCard({
  title,
  variant,
  value = 0,
  subtitle,
  isLoading,
  icon: Icon,
  percentageChange = 0,
  period
}: DataCardProps) {
  if (isLoading) {
    return (
      <Card className='border-none drop-shadow-sm h-48'>
        <CardHeader className='flex flex-row items-center justify-between gap-x-4'>
          <div className='space-y-2'>
            <Skeleton className='h-6 w-24' />
            <Skeleton className='h-6 w-40' />
          </div>
          <Skeleton className='size-12' />
        </CardHeader>
        <CardContent>
          <Skeleton className='shrink-0 h-10 w-24 mb-2' />
          <Skeleton className='shrink-0 h-4 w-40' />
        </CardContent>
      </Card>
    );
  }
  return (
    <Card className='border-none drop-shadow-sm'>
      <CardHeader className='flex flex-row items-center justify-between gap-x-4'>
        <div className='space-y-2'>
          <CardTitle className='text-2xl line-clamp-1'>{title}</CardTitle>
          <CardDescription className='line-clamp-1'>{subtitle}</CardDescription>
        </div>
        <div className={cn('shrink-0', boxVariants({ variant }))}>
          <Icon className={cn(iconVariants({ variant }))} />
        </div>
      </CardHeader>
      <CardContent>
        <h1 className='font-bold text-2xl mb-2 line-clamp-1 break-all'>
          <CountUp start={0} decimals={2} preserveValue decimalPlaces={2} end={value} formattingFn={formatCurrency} />
        </h1>
        <p
          className={cn(
            'text-muted-foreground text-sm line-clamp-1',
            percentageChange !== 0 &&
              (title === 'Expenses'
                ? percentageChange > 0
                  ? 'text-destructive'
                  : 'text-primary'
                : percentageChange > 0
                ? 'text-primary'
                : 'text-destructive')
          )}
        >
          {formatPercentage(
            percentageChange,
            { addPrefix: true, showEndDateOnly: title === 'Current Balance' },
            period
          )}
        </p>
      </CardContent>
    </Card>
  );
}

export default DataCard;
