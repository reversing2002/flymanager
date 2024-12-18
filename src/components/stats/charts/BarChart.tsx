import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface BarChartProps {
  data: any[];
  xKey: string;
  yKey: string;
  compareKey?: string;
  sortKey?: string;
  stacked?: boolean;
  colors?: Record<string, string>;
  color?: string;
}

const BarChart: React.FC<BarChartProps> = ({ 
  data, 
  xKey, 
  yKey, 
  compareKey, 
  sortKey,
  stacked = false, 
  colors = {}, 
  color = '#3b82f6' 
}) => {
  const uniqueLabels = Array.from(new Set(data.map(item => item[xKey]))).sort();
  
  let datasets;
  if (compareKey) {
    // Obtenir les catégories uniques pour la comparaison
    const categories = Array.from(new Set(data.map(item => item[compareKey])));
    
    // Si une clé de tri est fournie, trier les catégories
    if (sortKey) {
      categories.sort((a, b) => {
        const itemA = data.find(item => item[compareKey] === a);
        const itemB = data.find(item => item[compareKey] === b);
        return (itemA?.[sortKey] || '').localeCompare(itemB?.[sortKey] || '');
      });
    }

    // Créer un dataset pour chaque catégorie
    datasets = categories.map(category => {
      const categoryData = uniqueLabels.map(label => {
        const item = data.find(d => d[xKey] === label && d[compareKey] === category);
        return item ? item[yKey] : 0;
      });

      return {
        label: category,
        data: categoryData,
        backgroundColor: colors[category] || color,
        borderRadius: 4,
      };
    });
  } else {
    datasets = [{
      data: uniqueLabels.map(label => {
        const item = data.find(d => d[xKey] === label);
        return item ? item[yKey] : 0;
      }),
      backgroundColor: color,
      borderRadius: 4,
    }];
  }

  const chartData = {
    labels: uniqueLabels,
    datasets,
  };

  const options = {
    responsive: true,
    scales: {
      x: {
        stacked,
      },
      y: {
        stacked,
        beginAtZero: true,
        ticks: {
          callback: (value: number) => `${value}h`
        }
      }
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => `${context.dataset.label}: ${context.formattedValue}h`,
        },
      },
    },
  };

  return <Bar data={chartData} options={options} />;
};

export default BarChart;