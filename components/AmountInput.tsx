import CurrencyInput from 'react-currency-input-field';
import { Info, MinusCircle, PlusCircle } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

type Props = {
  value: string;
  disabled?: boolean;
  placeholder?: string;
  allowNegativeValue?: boolean;
  onChange: (value: string | undefined) => void;
};

export const AmountInput = ({ value, disabled, placeholder, onChange, allowNegativeValue = true }: Props) => {
  const parsedValue = parseFloat(value);
  const isIncome = parsedValue > 0;
  const isExpense = parsedValue < 0;

  const onReverseValue = () => {
    if (!value) return;

    onChange((parseFloat(value) * -1).toString());
  };
  return (
    <div className='relative'>
      {allowNegativeValue && (
        <TooltipProvider>
          <Tooltip delayDuration={100}>
            <TooltipTrigger asChild>
              <button
                type='button'
                onClick={onReverseValue}
                className={cn(
                  'bg-slate-400 hover:bg-slate-500 absolute top-1 left-1 rounded-md p-2 flex items-center justify-center transition',
                  isIncome && 'bg-emerald-500 hover:bg-emerald-600',
                  isExpense && 'bg-rose-500 hover:bg-rose-600'
                )}
              >
                {!parsedValue && <Info className='size-3 text-white' />}
                {isIncome && <PlusCircle className='size-3 text-white' />}
                {isExpense && <MinusCircle className='size-3 text-white' />}
              </button>
            </TooltipTrigger>
            <TooltipContent>Use [+] for income and [-] for expenses</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      <CurrencyInput
        prefix='Rs. '
        value={value}
        decimalScale={2}
        decimalsLimit={2}
        disabled={disabled}
        onValueChange={onChange}
        placeholder={placeholder}
        allowNegativeValue={allowNegativeValue}
        className={cn(
          'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          allowNegativeValue && 'pl-10'
        )}
      />
      {allowNegativeValue && (
        <p className='text-xs text-muted-foreground mt-2'>
          {isIncome && 'This will count as income'}
          {isExpense && 'This will count as expense'}
        </p>
      )}
    </div>
  );
};
