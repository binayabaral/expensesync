'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { TimePicker } from '@/components/ui-extended/Datepicker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

type Props = {
  value: Date;
  onChangeAction: (date: Date) => void;
  disabled?: boolean;
  className?: string;
};

export function DateInputWithPicker({ value, onChangeAction, disabled, className }: Props) {
  const [open, setOpen] = useState(false);

  const handleNativeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) return;
    const [datePart, timePart] = e.target.value.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute] = (timePart ?? '00:00').split(':').map(Number);
    onChangeAction(new Date(year, month - 1, day, hour, minute));
  };

  const handleCalendarSelect = (day: Date | undefined) => {
    if (!day) return;
    const updated = new Date(day);
    updated.setHours(value.getHours(), value.getMinutes(), 0);
    onChangeAction(updated);
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Input
        type='datetime-local'
        value={format(value, "yyyy-MM-dd'T'HH:mm")}
        onChange={handleNativeChange}
        disabled={disabled}
        className='flex-1 [&::-webkit-calendar-picker-indicator]:hidden'
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type='button'
            variant='outline'
            size='icon'
            className='size-9 shrink-0'
            disabled={disabled}
          >
            <CalendarIcon className='size-4' />
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-auto p-0' align='end'>
          <Calendar
            mode='single'
            selected={value}
            onSelect={handleCalendarSelect}
            initialFocus
          />
          <div className='border-t border-border p-3'>
            <TimePicker
              date={value}
              onChange={date => { if (date) onChangeAction(date); }}
              hourCycle={12}
              granularity='minute'
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
