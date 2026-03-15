'use client';

import { useState } from 'react';

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useOpenAddMemberSheet } from '../hooks/useOpenAddMemberSheet';
import { useAddGroupMember } from '../api/useAddGroupMember';
import { useGetContacts } from '../api/useGetContacts';

export function AddMemberSheet() {
  const { isOpen, onClose, groupId, existingMemberContactIds } = useOpenAddMemberSheet();
  const { mutate, isPending } = useAddGroupMember(groupId ?? '');
  const contactsQuery = useGetContacts();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const contacts = (contactsQuery.data ?? []).filter(
    c => !existingMemberContactIds.includes(c.id)
  );

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleAdd() {
    if (selected.size === 0) return;
    mutate([...selected], {
      onSuccess: () => {
        setSelected(new Set());
        onClose();
      }
    });
  }

  function handleOpenChange(open: boolean) {
    if (!open) {
      setSelected(new Set());
      onClose();
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetContent className='space-y-4'>
        <SheetHeader>
          <SheetTitle>Add members</SheetTitle>
          <SheetDescription>Select one or more contacts to add to this group.</SheetDescription>
        </SheetHeader>

        {contactsQuery.isLoading ? (
          <div className='space-y-2'>
            {[...Array(3)].map((_, i) => <Skeleton key={i} className='h-12 rounded-md' />)}
          </div>
        ) : contacts.length === 0 ? (
          <p className='text-sm text-muted-foreground'>
            No contacts available. All your contacts are already in this group, or you haven&apos;t added any yet.
          </p>
        ) : (
          <div className='space-y-2'>
            {contacts.map(contact => (
              <button
                key={contact.id}
                type='button'
                onClick={() => toggle(contact.id)}
                className={`w-full flex items-center justify-between gap-3 rounded-md border px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted ${
                  selected.has(contact.id) ? 'border-primary bg-primary/5' : ''
                }`}
              >
                <div className='min-w-0'>
                  <p className='font-medium truncate'>{contact.name}</p>
                  {contact.email && <p className='text-xs text-muted-foreground truncate'>{contact.email}</p>}
                </div>
                <div className='flex items-center gap-2 shrink-0'>
                  {contact.linkedUserId ? (
                    <Badge variant='secondary' className='text-xs'>enrolled</Badge>
                  ) : (
                    <Badge variant='outline' className='text-xs text-muted-foreground'>pending</Badge>
                  )}
                  {selected.has(contact.id) && (
                    <div className='h-4 w-4 rounded-full bg-primary flex items-center justify-center'>
                      <span className='text-[10px] text-primary-foreground font-bold'>✓</span>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        <Button
          className='w-full'
          disabled={selected.size === 0 || isPending}
          onClick={handleAdd}
        >
          {selected.size > 1 ? `Add ${selected.size} members` : 'Add to group'}
        </Button>
      </SheetContent>
    </Sheet>
  );
}
