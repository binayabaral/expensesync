import * as React from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  ColumnDef,
  Row,
  flexRender,
  SortingState,
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel
} from '@tanstack/react-table';

import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface DataTableProps<TData, TValue> {
  data: TData[];
  disabled?: boolean;
  hasFooter?: boolean;
  columns: ColumnDef<TData, TValue>[];
  renderMobileRow?: (row: Row<TData>) => React.ReactNode;
  pinnedColumns?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  meta?: Record<string, any>;
  onRowClick?: (row: Row<TData>) => void;
  isRowHighlighted?: (row: Row<TData>) => boolean;
}

export function DataTable<TData, TValue>({ data, columns, hasFooter, renderMobileRow, pinnedColumns, meta, onRowClick, isRowHighlighted }: DataTableProps<TData, TValue>) {
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
    state: { sorting, globalFilter },
    meta
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
    const bodyRows = Array.from(parentRef.current.querySelectorAll('tbody tr:not([class*="border-0"])'));
    if (!bodyRows.length) return;
    const firstRow = bodyRows[0];
    const raw = Array.from(firstRow.querySelectorAll('td')).map((td, i) => {
      if (i < (pinnedColumns ?? 0)) {
        return Math.max(...bodyRows.map(row => (row.querySelectorAll('td')[i]?.getBoundingClientRect().width ?? 0)));
      }
      return td.getBoundingClientRect().width;
    });
    if (!raw.length || raw.every(w => w === 0)) return;
    const nonPinnedWidths = raw.slice(pinnedColumns ?? 0);
    const avg = nonPinnedWidths.length ? nonPinnedWidths.reduce((a, b) => a + b, 0) / nonPinnedWidths.length : 0;
    const cap = avg * 1.2;
    setColWidths(raw.map((w, i) => i < (pinnedColumns ?? 0) ? w : Math.min(w, cap)));
  }, [pinnedColumns]);

  React.useEffect(() => {
    setColWidths([]);
  }, [columns.length]);

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


  const pinnedCount = pinnedColumns ?? 0;
  const pinnedOffsets = React.useMemo(() => {
    const offsets: number[] = [];
    let acc = 0;
    for (let i = 0; i < pinnedCount; i++) {
      offsets.push(acc);
      acc += colWidths[i] ?? 0;
    }
    return offsets;
  }, [colWidths, pinnedCount]);

  const getPinnedStyle = (index: number): React.CSSProperties | undefined =>
    index < pinnedCount ? { left: pinnedOffsets[index] } : undefined;

  const getPinnedClass = (index: number, isEdgeRow = false) =>
    index < pinnedCount
      ? cn(
          'sticky',
          isEdgeRow ? 'bg-background z-20' : 'bg-background z-[3] group-hover:bg-muted',
          index === pinnedCount - 1 && 'border-r shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)]'
        )
      : undefined;

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

      {/* Mobile card list */}
      {renderMobileRow && (
        <div className='md:hidden flex-1 overflow-y-auto rounded-md border divide-y'>
          {rows.length === 0 ? (
            <div className='h-24 flex items-center justify-center text-sm text-muted-foreground'>
              No results.
            </div>
          ) : (
            rows.map(row => (
              <React.Fragment key={row.id}>
                {renderMobileRow(row)}
              </React.Fragment>
            ))
          )}
        </div>
      )}

      {/* Desktop table */}
      <div className={cn('flex flex-col flex-1 min-h-0 rounded-md border overflow-hidden', renderMobileRow && 'hidden md:flex')}>
        <div
          ref={parentRef}
          className='flex-1 min-h-0 overflow-auto [scrollbar-gutter:stable]'
        >
          <Table className={cn('border-separate border-spacing-0', colWidths.length ? 'table-fixed' : '')}>
            {fixedColGroup}
            <TableHeader className='sticky top-0 z-10 bg-background'>
              {table.getHeaderGroups().map(headerGroup => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header, index) => (
                    <TableHead
                      key={header.id}
                      style={getPinnedStyle(index)}
                      className={cn(getPinnedClass(index, true), 'border-b-2 border-border')}
                    >
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
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
                        data-editing={isRowHighlighted?.(row) ? 'true' : undefined}
                        className={cn(
                          'group',
                          isRowHighlighted?.(row)
                            ? 'bg-amber-50 dark:bg-amber-900/15'
                            : onRowClick && 'cursor-pointer hover:bg-muted/50'
                        )}
                        onClick={() => onRowClick?.(row)}
                      >
                        {row.getVisibleCells().map((cell, index) => (
                          <TableCell key={cell.id} style={getPinnedStyle(index)} className={cn(getPinnedClass(index), 'border-b border-border')}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
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
            {hasFooter && (
              <TableFooter className='sticky bottom-0 z-10 border-t-0 bg-muted'>
                {table.getFooterGroups().map(footerGroup => (
                  <TableRow key={footerGroup.id}>
                    {footerGroup.headers.map((footer, index) => (
                      <TableCell
                        key={footer.id}
                        style={getPinnedStyle(index)}
                        className={cn(getPinnedClass(index, true), 'border-t-2 border-border')}
                      >
                        {footer.isPlaceholder ? null : flexRender(footer.column.columnDef.footer, footer.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableFooter>
            )}
          </Table>
        </div>
      </div>
    </div>
  );
}
