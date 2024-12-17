import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';

interface MonthlyAccountSummaryData {
  month_name: string;
  entry_type_code: string;
  entry_type_name: string;
  total_amount: number;
}

const MonthlyAccountSummary = () => {
  const currentYear = new Date().getFullYear();

  const { data, isLoading, error } = useQuery({
    queryKey: ['monthlyAccountSummary', currentYear],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_monthly_account_summary', {
        p_year: currentYear,
      });
      if (error) throw error;
      return data as MonthlyAccountSummaryData[];
    },
  });

  if (isLoading) {
    return <div className="p-4">Chargement...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600">Erreur lors du chargement des données</div>;
  }

  // Obtenir la liste unique des types d'entrée
  const entryTypes = Array.from(
    new Set(data?.map(item => item.entry_type_code))
  ).map(code => {
    const entry = data?.find(item => item.entry_type_code === code);
    return {
      code,
      name: entry?.entry_type_name || code
    };
  });

  // Organiser les données par mois
  const monthsData = data?.reduce((acc, curr) => {
    if (!acc[curr.month_name]) {
      acc[curr.month_name] = {};
    }
    acc[curr.month_name][curr.entry_type_code] = curr.total_amount;
    return acc;
  }, {} as Record<string, Record<string, number>>);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white rounded-lg overflow-hidden shadow-md">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Mois</th>
            {entryTypes.map(type => (
              <th key={type.code} className="px-4 py-2 text-left text-sm font-medium text-gray-600">
                {type.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {Object.entries(monthsData || {}).map(([month, values]) => (
            <tr key={month} className="hover:bg-gray-50">
              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{month}</td>
              {entryTypes.map(type => (
                <td key={type.code} className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                  {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
                    .format(values[type.code] || 0)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MonthlyAccountSummary;
