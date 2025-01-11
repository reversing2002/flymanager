import React from 'react';
import { format, subMonths, startOfYear, endOfYear, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import * as Select from '@radix-ui/react-select';
import { motion } from 'framer-motion';

export type DateRange = {
  startDate: Date;
  endDate: Date;
};

type DateRangeFilterProps = {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
};

const getCurrentYear = () => new Date().getFullYear();

const getPredefinedRanges = () => {
  const now = new Date();
  const currentYear = getCurrentYear();

  return [
    {
      label: '12 derniers mois',
      value: 'last12months',
      range: {
        startDate: subMonths(startOfMonth(now), 11),
        endDate: endOfMonth(now),
      },
    },
    {
      label: 'Année en cours',
      value: 'currentYear',
      range: {
        startDate: startOfYear(now),
        endDate: endOfYear(now),
      },
    },
    {
      label: 'Année précédente',
      value: `${currentYear - 1}`,
      range: {
        startDate: startOfYear(new Date(currentYear - 1, 0, 1)),
        endDate: endOfYear(new Date(currentYear - 1, 0, 1)),
      },
    },
  ];
};

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  onChange,
  value,
  className = '',
}) => {
  const ranges = getPredefinedRanges();

  const getCurrentRangeValue = () => {
    const matchingRange = ranges.find(
      (r) =>
        format(r.range.startDate, 'yyyy-MM-dd') === format(value.startDate, 'yyyy-MM-dd') &&
        format(r.range.endDate, 'yyyy-MM-dd') === format(value.endDate, 'yyyy-MM-dd')
    );
    return matchingRange?.value || 'custom';
  };

  const handleRangeChange = (selectedValue: string) => {
    const selectedRange = ranges.find((r) => r.value === selectedValue);
    if (selectedRange) {
      onChange(selectedRange.range);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center space-x-2 ${className}`}
    >
      <Select.Root value={getCurrentRangeValue()} onValueChange={handleRangeChange}>
        <Select.Trigger className="inline-flex items-center justify-between min-w-[180px] px-3 py-2 text-sm border rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500">
          <Select.Value placeholder="Sélectionner une période" />
          <Select.Icon>
            <span className="text-gray-500">▼</span>
          </Select.Icon>
        </Select.Trigger>

        <Select.Portal>
          <Select.Content className="overflow-hidden bg-white rounded-md shadow-lg border border-gray-200">
            <Select.ScrollUpButton className="flex items-center justify-center h-6 bg-white text-gray-700 cursor-default">
              ▲
            </Select.ScrollUpButton>
            <Select.Viewport className="p-1">
              {ranges.map((range) => (
                <Select.Item
                  key={range.value}
                  value={range.value}
                  className="relative flex items-center px-8 py-2 text-sm text-gray-700 cursor-default select-none hover:bg-gray-100 outline-none focus:bg-gray-100"
                >
                  <Select.ItemText>{range.label}</Select.ItemText>
                  <Select.ItemIndicator className="absolute left-2 inline-flex items-center">
                    ✓
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.Viewport>
            <Select.ScrollDownButton className="flex items-center justify-center h-6 bg-white text-gray-700 cursor-default">
              ▼
            </Select.ScrollDownButton>
          </Select.Content>
        </Select.Portal>
      </Select.Root>

      <div className="text-sm text-gray-500">
        {format(value.startDate, 'dd MMM yyyy', { locale: fr })} -{' '}
        {format(value.endDate, 'dd MMM yyyy', { locale: fr })}
      </div>
    </motion.div>
  );
};
