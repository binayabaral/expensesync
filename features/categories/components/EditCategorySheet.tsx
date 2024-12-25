import { z } from 'zod';
import { Loader2 } from 'lucide-react';

import { useConfirm } from '@/hooks/useConfirm';
import { insertCategorySchema } from '@/db/schema';
import { useGetCategory } from '@/features/categories/api/useGetCategory';
import { useEditCategory } from '@/features/categories/api/useEditCategory';
import { CategoryForm } from '@/features/categories/components/CategoryForm';
import { useDeleteCategory } from '@/features/categories/api/useDeleteCategory';
import { useOpenEditCategorySheet } from '@/features/categories/hooks/useOpenEditCategorySheet';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const formSchema = insertCategorySchema.pick({
  name: true
});

type FormValues = z.input<typeof formSchema>;

export const EditCategorySheet = () => {
  const { isOpen, onClose, id } = useOpenEditCategorySheet();
  const [ConfirmDialog, confirm] = useConfirm('Are you sure?', 'You are about to delete this category.');

  const editMutation = useEditCategory(id);
  const categoryQuery = useGetCategory(id);
  const deleteMutation = useDeleteCategory(id);

  const isLoading = categoryQuery.isLoading;
  const isPending = editMutation.isPending || deleteMutation.isPending;

  const onSubmit = (values: FormValues) => {
    editMutation.mutate(values, {
      onSuccess: () => {
        onClose();
      }
    });
  };

  const onDelete = async () => {
    const ok = await confirm();

    if (ok) {
      deleteMutation.mutate(undefined, {
        onSuccess: () => {
          onClose();
        }
      });
    }
  };

  const defaultValues = categoryQuery.data ? { name: categoryQuery.data.name } : { name: '' };

  return (
    <>
      <ConfirmDialog />
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className='space-y-4'>
          <SheetHeader>
            <SheetTitle>Edit Category</SheetTitle>
            <SheetDescription>Edit an existing category.</SheetDescription>
          </SheetHeader>
          {isLoading ? (
            <div className='flex justify-center'>
              <Loader2 className='size-12 text-muted-foreground animate-spin' />
            </div>
          ) : (
            <CategoryForm
              id={id}
              onDelete={onDelete}
              onSubmit={onSubmit}
              disabled={isPending}
              defaultValues={defaultValues}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};
