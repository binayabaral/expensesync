import { z } from 'zod';
import { Loader2 } from 'lucide-react';

import { insertAssetSchema } from '@/db/schema';
import { convertAmountFromMiliUnits } from '@/lib/utils';
import { useGetAccounts } from '@/features/accounts/api/useGetAccounts';
import { useGetAsset } from '@/features/assets/api/useGetAsset';
import { useEditAsset } from '@/features/assets/api/useEditAsset';
import { useOpenEditAssetSheet } from '@/features/assets/hooks/useOpenEditAssetSheet';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';

import { AssetForm } from './AssetForm';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const formSchema = insertAssetSchema.omit({
  id: true
});

type FormValues = z.input<typeof formSchema>;

export const EditAssetSheet = () => {
  const { isOpen, onClose, id } = useOpenEditAssetSheet();

  const editMutation = useEditAsset(id);
  const assetQuery = useGetAsset(id);

  const accountsQuery = useGetAccounts();
  const accountOptions = (accountsQuery.data ?? []).map(account => ({
    label: account.name,
    value: account.id
  }));

  const isLoading = assetQuery.isLoading;
  const isPending = editMutation.isPending || accountsQuery.isLoading || assetQuery.isLoading;

  const onSubmit = (values: any) => {
    editMutation.mutate(values, {
      onSuccess: () => {
        onClose();
      }
    });
  };

  const defaultValues: any = assetQuery.data
    ? {
        name: assetQuery.data.name,
        type: assetQuery.data.type,
        quantity: assetQuery.data.quantity.toString(),
        unit: assetQuery.data.unit,
        assetPrice: convertAmountFromMiliUnits(assetQuery.data.assetPrice).toString(),
        extraCharge: convertAmountFromMiliUnits(assetQuery.data.extraCharge).toString(),
        totalPaid: convertAmountFromMiliUnits(assetQuery.data.totalPaid).toString(),
        accountId: assetQuery.data.accountId,
        date: new Date()
      }
    : {
        name: '',
        type: '',
        quantity: '',
        unit: '',
        assetPrice: '',
        extraCharge: '',
        totalPaid: '',
        accountId: '',
        date: new Date()
      };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className='space-y-4' tabIndex={undefined}>
        <SheetHeader>
          <SheetTitle>Edit Asset</SheetTitle>
          <SheetDescription>Edit an existing asset.</SheetDescription>
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


