import { z } from 'zod';

import { insertCategorySchema } from '@/db/schema';
import { useAddCategory } from '@/features/categories/hooks/useAddCategory';
import { CategoryForm } from '@/features/categories/components/CategoryForm';
import { useCreateCategory } from '@/features/categories/api/useCreateCategory';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const formSchema = insertCategorySchema.pick({
  name: true
});

type FormValues = z.infer<typeof formSchema>;

export const AddCategorySheet = () => {
  const { isOpen, onClose } = useAddCategory();
  const mutation = useCreateCategory();

  const onSubmit = (values: FormValues) => {
    mutation.mutate(values, {
      onSuccess: () => {
        onClose();
      }
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className='max-sm:w-full space-y-4 overflow-y-auto'>
        <SheetHeader>
          <SheetTitle>New Category</SheetTitle>
          <SheetDescription>Create a new category to organize your transactions.</SheetDescription>
        </SheetHeader>
        <CategoryForm onSubmit={onSubmit} disabled={mutation.isPending} defaultValues={{ name: '' }} />
      <Button variant="outline" onClick={onClose} className="w-full">Cancel</Button>
      </SheetContent>
    </Sheet>
  );
};
