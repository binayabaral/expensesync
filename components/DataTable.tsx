import * as React from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  ColumnDef,
  flexRender,
  SortingState,
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel
} from '@tanstack/react-table';

import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface DataTableProps<TData, TValue> {
  data: TData[];
  disabled?: boolean;
  hasFooter?: boolean;
  columns: ColumnDef<TData, TValue>[];
}

export function DataTable<TData, TValue>({ data, columns, hasFooter }: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = React.useState('');

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    getFilteredRowModel: getFilteredRowModel(),
    state: { sorting, globalFilter }
  });

  const rows = table.getRowModel().rows;
  const parentRef = React.useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 45,
    overscan: 10,
    measureElement: el => el.getBoundingClientRect().height
  });

  const virtualItems = virtualizer.getVirtualItems();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom =
    virtualItems.length > 0 ? virtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end : 0;

  const [colWidths, setColWidths] = React.useState<number[]>([]);

  const measureColWidths = React.useCallback(() => {
    if (!parentRef.current) return;
    const firstRow = parentRef.current.querySelector('tbody tr:not([class*="border-0"])');
    if (!firstRow) return;
    const raw = Array.from(firstRow.querySelectorAll('td')).map(td => td.getBoundingClientRect().width);
    if (!raw.length || raw.every(w => w === 0)) return;
    const avg = raw.reduce((a, b) => a + b, 0) / raw.length;
    const cap = avg * 1.2;
    setColWidths(raw.map(w => Math.min(w, cap)));
  }, []);

  React.useLayoutEffect(() => {
    measureColWidths();
  }, [virtualItems, measureColWidths]);

  React.useEffect(() => {
    const ro = new ResizeObserver(measureColWidths);
    if (parentRef.current) ro.observe(parentRef.current);
    return () => ro.disconnect();
  }, [measureColWidths]);

  const fixedColGroup =
    colWidths.length > 0 ? (
      <colgroup>
        {colWidths.map((w, i) => (
          <col key={i} style={{ width: `${w}px` }} />
        ))}
      </colgroup>
    ) : null;

  return (
    <div className='flex flex-col flex-1 min-h-0'>
      <div className='pb-4'>
        <Input
          placeholder='Search all columns...'
          value={globalFilter ?? ''}
          onChange={event => setGlobalFilter(event.target.value)}
          className='max-w-sm'
        />
      </div>
      <div className='flex-1 min-h-0 flex flex-col rounded-md border overflow-hidden'>
        <Table className={colWidths.length ? 'table-fixed' : ''}>
          {fixedColGroup}
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
        </Table>
        <div ref={parentRef} className='flex-1 overflow-auto min-h-0 [scrollbar-gutter:stable]'>
          <Table className={colWidths.length ? 'table-fixed' : ''}>
            {fixedColGroup}
            <TableBody>
              {rows.length ? (
                <>
                  {paddingTop > 0 && (
                    <TableRow className='border-0'>
                      <TableCell colSpan={columns.length} style={{ height: paddingTop, padding: 0, border: 0 }} />
                    </TableRow>
                  )}
                  {virtualItems.map(virtualRow => {
                    const row = rows[virtualRow.index];
                    return (
                      <TableRow
                        key={row.id}
                        data-index={virtualRow.index}
                        ref={virtualizer.measureElement}
                      >
                        {row.getVisibleCells().map(cell => (
                          <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                        ))}
                      </TableRow>
                    );
                  })}
                  {paddingBottom > 0 && (
                    <TableRow className='border-0'>
                      <TableCell colSpan={columns.length} style={{ height: paddingBottom, padding: 0, border: 0 }} />
                    </TableRow>
                  )}
                </>
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className='h-24 text-center'>
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {hasFooter && (
          <Table className={colWidths.length ? 'table-fixed' : ''}>
            {fixedColGroup}
            <TableFooter>
              {table.getFooterGroups().map(footerGroup => (
                <TableRow key={footerGroup.id}>
                  {footerGroup.headers.map(footer => (
                    <TableCell key={footer.id}>
                      {footer.isPlaceholder ? null : flexRender(footer.column.columnDef.footer, footer.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableFooter>
          </Table>
        )}
      </div>
    </div>
  );
}
