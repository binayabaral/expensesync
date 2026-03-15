'use client';

import { FaUsers, FaHandHoldingDollar, FaArrowRightArrowLeft } from 'react-icons/fa6';
import { FaExclamationTriangle } from 'react-icons/fa';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useEnroll } from '../api/useEnroll';

export function EnrollmentScreen() {
  const { mutate: enroll, isPending } = useEnroll();

  return (
    <div className='flex flex-col items-center justify-center min-h-[60vh] px-4'>
      <div className='max-w-md w-full space-y-6 text-center'>
        <div className='space-y-2'>
          <h1 className='text-2xl font-semibold'>Split bills with friends</h1>
          <p className='text-muted-foreground text-sm'>
            Track shared expenses, IOUs, and settle up with people you know — all in one place.
          </p>
        </div>

        <div className='grid grid-cols-1 gap-3 text-left'>
          <Card>
            <CardContent className='flex items-start gap-3 pt-4'>
              <FaHandHoldingDollar className='h-4 w-4 mt-0.5 text-primary shrink-0' />
              <div>
                <p className='text-sm font-medium'>Flexible splitting</p>
                <p className='text-xs text-muted-foreground'>Equal, by percentage, custom amounts, or shares</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className='flex items-start gap-3 pt-4'>
              <FaUsers className='h-4 w-4 mt-0.5 text-primary shrink-0' />
              <div>
                <p className='text-sm font-medium'>Group trips and events</p>
                <p className='text-xs text-muted-foreground'>Create groups for trips, households, or recurring events</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className='flex items-start gap-3 pt-4'>
              <FaArrowRightArrowLeft className='h-4 w-4 mt-0.5 text-primary shrink-0' />
              <div>
                <p className='text-sm font-medium'>Settle up easily</p>
                <p className='text-xs text-muted-foreground'>Track who owes what and record repayments</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className='flex items-start gap-2 text-left bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground'>
          <FaExclamationTriangle className='h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-500' />
          <p>
            Once enrolled, other ExpenseSync users can find you by your email address and add you to splits.
          </p>
        </div>

        <Button onClick={() => enroll()} disabled={isPending} className='w-full'>
          {isPending ? 'Setting up...' : 'Get started'}
        </Button>
      </div>
    </div>
  );
}
