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
    onChangeAction(option?.value || '');
  };

  const handleCreate = (inputValue: string) => {
    if (inputValue !== '') {
      onCreate?.(inputValue);
    }
  };

  const formattedValue = useMemo(() => options.find(option => option.value === value), [options, value]);
  return (
    <CreatableSelect
      isClearable
      options={options}
      onChange={onSelect}
      isDisabled={disabled}
      value={formattedValue}
      className='text-sm shadow-sm rounded-md'
      placeholder={placeholder}
      onCreateOption={handleCreate}
      isValidNewOption={() => allowCreatingOptions}
      styles={{
        container: (base, state) => ({
          ...base,
          cursor: state.isDisabled ? 'not-allowed' : 'default',
          pointerEvents: 'all'
        }),
        control: (base, state) => ({
          ...base,
          backgroundColor: state.isDisabled ? 'var(--muted)' : 'var(--background)',
          color: 'var(--foreground)',
          boxShadow: 'none',
          opacity: state.isDisabled ? 0.5 : 1,
          cursor: state.isDisabled ? 'not-allowed' : 'default',
          pointerEvents: state.isDisabled ? 'none' : 'all',
          borderColor: state.isFocused ? 'var(--ring)' : 'var(--input)',
          '&:hover': {
            borderColor: state.isFocused ? 'var(--ring)' : 'var(--input)'
          }
        }),
        menu: base => ({
          ...base,
          backgroundColor: 'var(--popover)',
          border: '1px solid var(--border)',
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        }),
        option: (base, state) => ({
          ...base,
          backgroundColor: state.isSelected
            ? 'var(--primary)'
            : state.isFocused
              ? 'var(--accent)'
              : 'transparent',
          color: state.isSelected ? 'var(--primary-foreground)' : 'var(--popover-foreground)',
          '&:active': {
            backgroundColor: 'var(--accent)',
          },
        }),
        singleValue: base => ({
          ...base,
          color: 'var(--foreground)',
        }),
        input: base => ({
          ...base,
          color: 'var(--foreground)',
        }),
        placeholder: base => ({
          ...base,
          color: 'var(--muted-foreground)',
        }),
        indicatorSeparator: base => ({
          ...base,
          backgroundColor: 'var(--border)',
        }),
        clearIndicator: base => ({
          ...base,
          color: 'var(--muted-foreground)',
          '&:hover': { color: 'var(--foreground)' },
        }),
        dropdownIndicator: base => ({
          ...base,
          color: 'var(--muted-foreground)',
          '&:hover': { color: 'var(--foreground)' },
        }),
        noOptionsMessage: base => ({
          ...base,
          color: 'var(--muted-foreground)',
        }),
      }}
    />
  );
};
