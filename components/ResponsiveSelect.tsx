'use client';

import isMobile from 'is-mobile';

import { Select } from '@/components/Select';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';

type Option = { label: string; value: string };

type Props = {
  value: string;
  options: Option[];
  placeholder: string;
  disabled?: boolean;
  allowCreatingOptions?: boolean;
  onCreate?: (name: string) => void;
  onChangeAction: (value: string) => void;
};

/**
 * Renders a native <select> on mobile devices and the richer Select component
 * on desktop. Eliminates the repeated isMobile() ternary across all form files.
 */
export function ResponsiveSelect({
  value,
  options,
  placeholder,
  disabled = false,
  allowCreatingOptions = false,
  onCreate,
  onChangeAction
}: Props) {
  if (isMobile()) {
    return (
      <NativeSelect value={value} onChange={e => onChangeAction(e.target.value)} disabled={disabled} className='w-full'>
        <NativeSelectOption value=''>{placeholder}</NativeSelectOption>
        {options.map(option => (
          <NativeSelectOption key={option.value} value={option.value}>
            {option.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    );
  }

  return (
    <Select
      value={value}
      disabled={disabled}
      options={options}
      allowCreatingOptions={allowCreatingOptions}
      onCreate={onCreate}
      placeholder={placeholder}
      onChangeAction={v => onChangeAction(v ?? '')}
    />
  );
}
