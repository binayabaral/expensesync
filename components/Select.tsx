'use client';

import { useMemo } from 'react';
import { SingleValue } from 'react-select';
import CreatableSelect from 'react-select/creatable';

type Props = {
  disabled?: boolean;
  placeholder: string;
  allowCreatingOptions: boolean;
  value?: string | null | undefined;
  onCreate?: (value: string) => void;
  onChangeAction: (value?: string) => void;
  options?: { label: string; value: string }[];
};

export const Select = ({
  value,
  onCreate,
  disabled,
  placeholder,
  options = [],
  onChangeAction,
  allowCreatingOptions
}: Props) => {
  const onSelect = (option: SingleValue<{ label: string; value: string }>) => {
    onChangeAction(option?.value);
  };

  const formattedValue = useMemo(() => options.find(option => option.value === value), [options, value]);
  return (
    <CreatableSelect
      options={options}
      onChange={onSelect}
      isDisabled={disabled}
      value={formattedValue}
      className='text-sm h-10'
      placeholder={placeholder}
      onCreateOption={onCreate}
      isValidNewOption={() => allowCreatingOptions}
      styles={{ control: base => ({ ...base, borderColor: '#e2e8f0', ':hover': { borderColor: '#e2e8f0' } }) }}
    />
  );
};
