import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { startOfMinute } from 'date-fns';

import { insertAssetSchema } from '@/db/schema';
import { useGetAccounts } from '@/features/accounts/api/useGetAccounts';
import { useAddAsset } from '@/features/assets/hooks/useAddAsset';
import { useCreateAsset } from '@/features/assets/api/useCreateAsset';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';

import { AssetForm } from './AssetForm';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const formSchema = insertAssetSchema.omit({
  id: true
});

type FormValues = z.input<typeof formSchema>;

export const AddAssetSheet = () => {
  const { isOpen, onClose } = useAddAsset();
  const createAssetMutation = useCreateAsset();

  const accountsQuery = useGetAccounts();
  const accountOptions = (accountsQuery.data ?? []).map(account => ({
    label: account.name,
    value: account.id
  }));

  const onSubmit = (values: any) => {
    createAssetMutation.mutate(values, {
      onSuccess: () => {
        onClose();
      }
    });
  };

  const isPending = createAssetMutation.isPending;
  const isLoading = accountsQuery.isLoading;

  const defaultValues: any = {
    name: '',
    type: '',
    quantity: '',
    unit: '',
    assetPrice: '',
    extraCharge: '',
    totalPaid: '',
    accountId: '',
    date: startOfMinute(new Date())
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className='space-y-4' tabIndex={undefined}>
        <SheetHeader>
          <SheetTitle>New Asset</SheetTitle>
          <SheetDescription>Add a new asset purchase.</SheetDescription>
        </SheetHeader>
        {isLoading ? (
          <div className='absolute inset-0 flex items-center justify-center'>
            <Loader2 className='size-4 text-muted-foreground animate-spin' />
          </div>
        ) : (
          <AssetForm onSubmit={onSubmit} disabled={isPending} defaultValues={defaultValues} accountOptions={accountOptions} />
        )}
      </SheetContent>
    </Sheet>
  );
};


