'use client';

import Link from 'next/link';
import { FaUsers, FaArchive } from 'react-icons/fa';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type Props = {
  group: {
    id: string;
    name: string;
    currency: string;
    isArchived: boolean;
    members: { id: string; contactName: string }[];
  };
};

export function GroupCard({ group }: Props) {
  return (
    <Link href={`/bill-split/${group.id}`}>
      <Card className='hover:shadow-md transition-shadow cursor-pointer h-full'>
        <CardHeader className='pb-2'>
          <div className='flex items-start justify-between gap-2'>
            <CardTitle className='text-sm font-semibold leading-tight'>{group.name}</CardTitle>
            <div className='flex items-center gap-1 shrink-0'>
              <Badge variant='secondary' className='text-xs'>{group.currency}</Badge>
              {group.isArchived && (
                <Badge variant='outline' className='text-xs'>
                  <FaArchive className='h-2.5 w-2.5 mr-1' />
                  Archived
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
            <FaUsers className='h-3 w-3' />
            <span>{group.members.length} {group.members.length === 1 ? 'member' : 'members'}</span>
          </div>
          {group.members.length > 0 && (
            <p className='text-xs text-muted-foreground mt-1 truncate'>
              {group.members.map(m => m.contactName).join(', ')}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
