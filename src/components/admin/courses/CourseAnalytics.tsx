import React from 'react';
import { motion } from 'framer-motion';
import { Users, CheckCircle, Clock, BarChart3, HelpCircle } from 'lucide-react';
import GlassCard from '../../ui/GlassCard';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

interface CourseAnalyticsProps {
  analytics: {
    totalStudents: number;
    averageCompletion: number;
    completedStudents: number;
    studentsInProgress: number;
    distribution?: {
      beginner: number;
      intermediate: number;
      advanced: number;
      expert: number;
    };
  };
}

const CourseAnalytics: React.FC<CourseAnalyticsProps> = ({ analytics }) => {
  const chartData = {
    labels: ['Completed', 'In Progress'],
    datasets: [
      {
        data: [analytics.completedStudents, analytics.studentsInProgress],
        backgroundColor: ['#10b981', '#f59e0b'],
        borderColor: ['rgba(16, 185, 129, 0.2)', 'rgba(245, 158, 11, 0.2)'],
        borderWidth: 1,
        hoverOffset: 4,
      },
    ],
  };

  const chartOptions = {
    cutout: '70%',
    plugins: {
      legend: {
        display: false,
      },
    },
    maintainAspectRatio: false,
  };

  const stats = [
    { label: 'Total Students', value: analytics.totalStudents, icon: Users, color: 'text-sky-400', bg: 'bg-sky-400/10' },
    { label: 'Avg. Progress', value: `${analytics.averageCompletion}%`, icon: BarChart3, color: 'text-gold', bg: 'bg-gold/10' },
    { label: 'Completed', value: analytics.completedStudents, icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { label: 'In Progress', value: analytics.studentsInProgress, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-400/10' },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Top row: doughnut chart & stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard className="lg:col-span-1 p-6 flex flex-col items-center justify-center min-h-[250px] border-white/5 bg-slate-950/40">
          <div className="relative h-40 w-40">
            <Doughnut data={chartData} options={chartOptions} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-display font-extrabold text-white">{analytics.averageCompletion}%</span>
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mt-0.5">Average</span>
            </div>
          </div>
          <div className="flex gap-4 mt-6">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="text-xs text-slate-400 font-semibold">Done</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <span className="text-xs text-slate-400 font-semibold">Doing</span>
            </div>
          </div>
        </GlassCard>

        <div className="lg:col-span-3 grid grid-cols-2 gap-4">
          {stats.map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <GlassCard className="p-6 h-full flex flex-col justify-between border-white/5 hover:border-white/10 hover:shadow-lg transition-all bg-slate-950/40">
                <div className={`p-2.5 w-fit rounded-xl ${stat.bg} mb-4`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <div className="text-3xl font-display font-extrabold text-white mb-1">{stat.value}</div>
                  <div className="text-xs text-slate-400 font-medium tracking-wide">{stat.label}</div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CourseAnalytics;
