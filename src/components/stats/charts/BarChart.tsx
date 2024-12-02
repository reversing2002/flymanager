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
  color?: string;
}

const BarChart: React.FC<BarChartProps> = ({ data, xKey, yKey, color = '#3b82f6' }) => {
  const chartData = {
    labels: data.map(item => item[xKey]),
    datasets: [
      {
        data: data.map(item => item[yKey]),
        backgroundColor: color,
        borderRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => `${context.formattedValue}h`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: number) => `${value}h`,
        },
      },
    },
  };

  return <Bar data={chartData} options={options} />;
};

export default BarChart;