import { IconType } from 'react-icons';
import { cva, VariantProps } from 'class-variance-authority';

import { CountUp } from '@/components/CountUp';
import { cn, formatCurrency } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const boxVariants = cva('rounded-md p-3', {
  variants: {
    variant: {
      default: 'bg-muted-foreground/20',
      warning: 'bg-yellow-500/20',
      neutral: 'bg-blue-500/20',
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
      neutral: 'fill-blue-500',
      success: 'fill-green-500',
      destructive: 'fill-rose-500'
    },
    defaultVariants: {
      variant: 'default'
    }
  }
});

const baseTextVariants = cva('text-muted-foreground text-sm line-clamp-1', {
  variants: {
    variant: {
      default: 'text-muted-foreground',
      warning: 'text-yellow-500',
      neutral: 'text-blue-500',
      success: 'text-primary',
      destructive: 'text-destructive'
    },
    defaultVariants: {
      variant: 'default'
    }
  }
});

type BoxVariants = VariantProps<typeof boxVariants>;
type IconVariants = VariantProps<typeof iconVariants>;
type BaseTextVariants = VariantProps<typeof baseTextVariants>;

interface DataCardProps extends BoxVariants, IconVariants, BaseTextVariants {
  title: string;
  icon: IconType;
  value?: number;
  subtitle: string;
  baseText: string;
  isLoading?: boolean;
}

function DataCard({ title, variant, baseText, subtitle, value = 0, isLoading, icon: Icon }: DataCardProps) {
  if (isLoading) {
    return (
      <Card className='border border-slate-200 shadow-none h-48'>
        <CardHeader className='flex flex-row items-center justify-between gap-x-4'>
          <div className='space-y-2'>
            <Skeleton className='h-6 w-24' />
            <Skeleton className='h-6 w-40' />
          </div>
          <Skeleton className='size-12' />
        </CardHeader>
        <CardContent className='pt-0 md:pt-0'>
          <Skeleton className='shrink-0 h-10 w-24 mb-2' />
          <Skeleton className='shrink-0 h-4 w-40' />
        </CardContent>
      </Card>
    );
  }
  return (
    <Card className='border border-slate-200 shadow-none'>
      <CardHeader className='flex flex-row items-center justify-between gap-x-4'>
        <div className='space-y-1 md:space-y-2'>
          <CardTitle className='text-xl md:text-2xl line-clamp-1'>{title}</CardTitle>
          <CardDescription className='line-clamp-1'>{subtitle}</CardDescription>
        </div>
        <div className={cn('shrink-0', boxVariants({ variant }))}>
          <Icon className={cn(iconVariants({ variant }))} />
        </div>
      </CardHeader>
      <CardContent className='pt-0 md:pt-0'>
        <h1 className='font-bold text-xl md:text-2xl mb-2 line-clamp-1 break-all'>
          <CountUp start={0} decimals={2} preserveValue decimalPlaces={2} end={value} formattingFn={formatCurrency} />
        </h1>
        <p className={cn(baseTextVariants({ variant }))}>{baseText}</p>
      </CardContent>
    </Card>
  );
}

export default DataCard;
