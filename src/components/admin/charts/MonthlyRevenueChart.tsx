import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface MonthlyRevenue {
  month: string;
  amount: number;
}

interface MonthlyRevenueChartProps {
  data: MonthlyRevenue[];
}

export const MonthlyRevenueChart = ({ data }: MonthlyRevenueChartProps) => {
  const chartData = {
    labels: data?.map(d => d.month) || [],
    datasets: [
      {
        label: 'Revenus mensuels',
        data: data?.map(d => d.amount) || [],
        backgroundColor: 'rgba(53, 162, 235, 0.8)',
        borderColor: 'rgba(53, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Revenus mensuels',
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const value = context.raw;
            return `${value.toFixed(2)} €`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: number) => `${value} €`,
        },
      },
    },
  };

  return (
    <div className="w-full h-[400px] bg-white rounded-lg p-4">
      <Bar data={chartData} options={options} />
    </div>
  );
};
