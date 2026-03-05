'use client';

import { Column } from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';

import { Button } from '@/components/ui/button';

type Props<TData> = {
  column: Column<TData, unknown>;
  label: string;
};

export function SortableHeader<TData>({ column, label }: Props<TData>) {
  return (
    <Button variant='ghost' className='px-3' onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
      {label}
      <ArrowUpDown className='ml-2 h-4 w-4' />
    </Button>
  );
}
