// ============================================================
// SRI TECH ACADEMY PORTAL – Admin Dashboard Command Center
// Complete academy-focused analytics dashboard.
// Uses unified service layer + framer-motion + chart.js.
// NO Firebase. NO generic SaaS analytics.
// ============================================================

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  BookOpen,
  Award,
  Clock,
  UserPlus,
  GraduationCap,
  CalendarDays,
  FileText,
  CreditCard,
  BadgeCheck,
  Flame,
  Trophy,
  TrendingUp,
  Target,
  RefreshCw,
  Zap,
  CheckCircle2,
  AlertCircle,
  BarChart3,
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Title,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

import { dashboardAnalyticsService } from '../../services';
import type {
  DashboardStatistics,
  CourseDistributionItem,
  CourseCombinationItem,
  CertificateStatistics,
  AcademyProgressData,
  DashboardInsights,
} from '../../services';
import PageWrapper from '../../components/ui/PageWrapper';
import GlassCard from '../../components/ui/GlassCard';
import Skeleton from '../../components/ui/Skeleton';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend, Title);

// ────────────────────────────────────────────────────────────
// ANIMATED COUNTER HOOK
// ────────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 1400, start = true) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start || target === 0) { setValue(target); return; }
    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setValue(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
      else setValue(target);
    };
    const id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [target, duration, start]);
  return value;
}

// ────────────────────────────────────────────────────────────
// ANIMATED PROGRESS RING COMPONENT (Refined)
// ────────────────────────────────────────────────────────────
const ProgressRing: React.FC<{ percentage: number; size?: number; strokeWidth?: number }> = ({
  percentage,
  size = 180,
  strokeWidth = 8,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const [animatedOffset, setAnimatedOffset] = useState(circumference);
  const displayValue = useCountUp(percentage, 1600, true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedOffset(circumference - (percentage / 100) * circumference);
    }, 200);
    return () => clearTimeout(timer);
  }, [percentage, circumference]);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        {/* Outer decorative track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius + 8}
          fill="none"
          stroke="rgba(255,255,255,0.025)"
          strokeWidth={1}
          strokeDasharray="4 6"
        />
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#goldGradientRing)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={animatedOffset}
          style={{ transition: 'stroke-dashoffset 1.6s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
        <defs>
          <linearGradient id="goldGradientRing" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#D4AF37" />
            <stop offset="100%" stopColor="#F5E6C4" />
          </linearGradient>
        </defs>
      </svg>
      {/* Center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-display font-black text-gold leading-none" style={{ textShadow: '0 0 20px rgba(212,175,55,0.4)' }}>
          {displayValue}%
        </span>
        <span className="text-[9px] text-slate-500 font-display font-medium uppercase tracking-[0.18em] mt-1.5">
          Overall Progress
        </span>
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────────────────
// HERO STAT CARD COMPONENT
// ────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  glowColor: string;
  borderColor: string;
  textColor: string;
  desc: string;
  delay?: number;
}

const StatCard: React.FC<StatCardProps> = ({
  label, value, icon: Icon, glowColor, borderColor, textColor, desc, delay = 0,
}) => {
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const displayValue = useCountUp(value, 1200, inView);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setInView(true);
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      <GlassCard
        className="p-5 bg-slate-950/40 relative overflow-hidden group cursor-default"
        glowOnHover
      >
        {/* Ambient glow spot */}
        <div
          className="absolute -top-4 -right-4 w-20 h-20 rounded-full blur-2xl opacity-15 group-hover:opacity-30 transition-opacity duration-500"
          style={{ background: glowColor }}
        />

        <div className="flex items-start justify-between relative z-10">
          <div className="flex flex-col gap-1.5">
            <span className="text-[9px] text-slate-500 font-display font-semibold uppercase tracking-[0.16em]">
              {label}
            </span>
            <span className={`text-3xl font-display font-black tracking-tight ${textColor}`}>
              {displayValue}
            </span>
          </div>
          <div
            className="p-2.5 rounded-lg border group-hover:scale-110 transition-transform duration-300"
            style={{ background: glowColor + '18', borderColor: borderColor + '35' }}
          >
            <Icon className={`h-4 w-4 ${textColor}`} />
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-white/[0.04] flex items-center gap-1.5 relative z-10">
          <TrendingUp className="h-2.5 w-2.5 text-gold flex-shrink-0 opacity-70" />
          <span className="text-[10px] text-slate-600">{desc}</span>
        </div>
      </GlassCard>
    </motion.div>
  );
};

// ────────────────────────────────────────────────────────────
// HORIZONTAL COURSE BAR (Enterprise Analytics Style)
// ────────────────────────────────────────────────────────────
const CourseBar: React.FC<{
  item: CourseDistributionItem;
  maxCount: number;
  index: number;
  rank: number;
}> = ({ item, maxCount, index, rank }) => {
  const [width, setWidth] = useState('0%');
  const pct = Math.max((item.studentCount / maxCount) * 100, 4);
  const isFirst = index === 0;

  useEffect(() => {
    const timer = setTimeout(() => {
      setWidth(`${pct}%`);
    }, 200 + index * 80);
    return () => clearTimeout(timer);
  }, [pct, index]);

  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
      className="group relative flex items-center gap-3"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Rank number */}
      <span className="w-5 shrink-0 text-[10px] font-display font-bold text-slate-600 text-right tabular-nums">
        {rank}
      </span>

      {/* Course label */}
      <span className={`w-24 shrink-0 text-[11px] font-display font-semibold truncate leading-tight transition-colors duration-200 ${isFirst ? 'text-gold' : 'text-slate-400 group-hover:text-slate-200'}`}>
        {item.courseName}
      </span>

      {/* Bar track */}
      <div className="flex-1 h-[5px] bg-white/[0.05] rounded-full overflow-hidden relative">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
          style={{
            width,
            background: isFirst
              ? 'linear-gradient(90deg, #D4AF37 0%, #F5E6C4 100%)'
              : 'rgba(148, 163, 184, 0.35)',
            boxShadow: isFirst ? '0 0 8px rgba(212,175,55,0.35)' : 'none',
          }}
        />
      </div>

      {/* Count */}
      <span className={`w-8 text-right text-[11px] font-display font-bold tabular-nums shrink-0 transition-colors duration-200 ${isFirst ? 'text-gold' : 'text-slate-400 group-hover:text-white'}`}>
        {item.studentCount}
      </span>

      {/* Hover tooltip */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute left-32 -top-8 z-20 px-2.5 py-1.5 rounded-lg text-[10px] font-display font-semibold whitespace-nowrap pointer-events-none"
            style={{
              background: 'rgba(10,15,30,0.95)',
              border: '1px solid rgba(212,175,55,0.25)',
              color: '#D4AF37',
            }}
          >
            {item.studentCount} {item.studentCount === 1 ? 'student' : 'students'}
            <div className="absolute left-4 -bottom-[5px] w-2.5 h-2.5 rotate-45"
              style={{ background: 'rgba(10,15,30,0.95)', borderRight: '1px solid rgba(212,175,55,0.25)', borderBottom: '1px solid rgba(212,175,55,0.25)' }} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ────────────────────────────────────────────────────────────
// RANKED COMBINATION ROW (Enterprise style)
// ────────────────────────────────────────────────────────────
const CombinationRow: React.FC<{
  item: CourseCombinationItem;
  maxCount: number;
  index: number;
}> = ({ item, maxCount, index }) => {
  const [width, setWidth] = useState('0%');
  const pct = Math.max((item.studentCount / maxCount) * 100, 5);
  const isTop = index === 0;

  useEffect(() => {
    const timer = setTimeout(() => {
      setWidth(`${pct}%`);
    }, 300 + index * 80);
    return () => clearTimeout(timer);
  }, [pct, index]);

  const rankLabel = ['#1', '#2', '#3', '#4', '#5', '#6', '#7', '#8'][index] ?? `#${index + 1}`;

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="group flex items-center gap-3"
    >
      {/* Rank badge */}
      <div
        className="w-8 h-6 shrink-0 flex items-center justify-center rounded text-[9px] font-display font-black tracking-wide"
        style={
          isTop
            ? { background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.35)', color: '#D4AF37' }
            : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#64748b' }
        }
      >
        {rankLabel}
      </div>

      {/* Combination label */}
      <span className={`flex-1 min-w-0 text-[11px] font-display font-semibold truncate leading-tight transition-colors duration-200 ${isTop ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>
        {item.combination}
      </span>

      {/* Thin progress indicator */}
      <div className="w-20 h-[4px] bg-white/[0.05] rounded-full overflow-hidden shrink-0">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width,
            background: isTop
              ? 'linear-gradient(90deg, #D4AF37, #F5E6C4)'
              : 'rgba(148, 163, 184, 0.3)',
          }}
        />
      </div>

      {/* Student count */}
      <div className="shrink-0 text-right">
        <span className={`text-[11px] font-display font-bold tabular-nums ${isTop ? 'text-gold' : 'text-slate-400 group-hover:text-white'}`}>
          {item.studentCount}
        </span>
        <span className="text-[9px] text-slate-600 ml-0.5">
          {item.studentCount === 1 ? 'stu' : 'stu'}
        </span>
      </div>
    </motion.div>
  );
};

// ────────────────────────────────────────────────────────────
// QUICK ACTION CARD COMPONENT
// ────────────────────────────────────────────────────────────
interface QuickActionProps {
  label: string;
  icon: React.ElementType;
  path: string;
  color: string;
  glowColor: string;
  delay?: number;
}

const QuickActionCard: React.FC<QuickActionProps> = ({ label, icon: Icon, path, color, glowColor, delay = 0 }) => {
  const navigate = useNavigate();
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, delay }}
      whileHover={{ y: -3, scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => navigate(path)}
      className="glass-card rounded-xl p-4 flex flex-col items-center gap-3 text-center cursor-pointer group relative overflow-hidden"
    >
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"
        style={{ background: `radial-gradient(circle at center, ${glowColor}15, transparent 70%)` }}
      />
      <div
        className="p-3 rounded-xl border relative z-10 group-hover:scale-110 transition-transform duration-300"
        style={{ background: glowColor + '18', borderColor: glowColor + '40' }}
      >
        <Icon className="h-5 w-5" style={{ color }} />
      </div>
      <span className="text-[11px] font-display font-semibold text-slate-300 group-hover:text-white transition-colors relative z-10 leading-tight">
        {label}
      </span>
    </motion.button>
  );
};

// ────────────────────────────────────────────────────────────
// INSIGHT CARD COMPONENT
// ────────────────────────────────────────────────────────────
interface InsightCardProps {
  emoji: string;
  label: string;
  value: string | number;
  sub?: string;
  delay?: number;
}

const InsightCard: React.FC<InsightCardProps> = ({ emoji, label, value, sub, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay }}
  >
    <GlassCard className="p-4 bg-slate-950/40 flex items-center gap-4 group" glowOnHover>
      <div className="text-2xl shrink-0 group-hover:scale-125 transition-transform duration-300">
        {emoji}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-slate-500 font-display uppercase tracking-wider mb-0.5 truncate">{label}</p>
        <p className="text-base font-display font-black text-white truncate">{value}</p>
        {sub && <p className="text-[10px] text-slate-500 truncate mt-0.5">{sub}</p>}
      </div>
    </GlassCard>
  </motion.div>
);

// ────────────────────────────────────────────────────────────
// SECTION HEADER COMPONENT
// ────────────────────────────────────────────────────────────
const SectionHeader: React.FC<{ title: string; subtitle?: string; accent?: string }> = ({
  title, subtitle, accent,
}) => (
  <div className="flex items-center gap-3 mb-5">
    {accent && (
      <div className="w-0.5 h-5 rounded-full" style={{ background: accent }} />
    )}
    <div>
      <h2 className="text-sm font-display font-bold text-white tracking-wide">{title}</h2>
      {subtitle && <p className="text-[10px] text-slate-600 mt-0.5">{subtitle}</p>}
    </div>
  </div>
);

// ────────────────────────────────────────────────────────────
// REFINED DOUGHNUT OPTIONS
// ────────────────────────────────────────────────────────────
const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(10,15,30,0.95)',
      borderColor: 'rgba(212,175,55,0.25)',
      borderWidth: 1,
      titleColor: '#D4AF37',
      bodyColor: '#94a3b8',
      titleFont: { family: 'Outfit', size: 12, weight: 700 as const },
      bodyFont: { family: 'Inter', size: 11 },
      padding: 12,
    },
  },
  cutout: '76%',
  animation: { animateRotate: true, duration: 1100 },
};

// ────────────────────────────────────────────────────────────
// MAIN DASHBOARD COMPONENT
// ────────────────────────────────────────────────────────────
interface DashboardData {
  statistics: DashboardStatistics;
  courseDistribution: CourseDistributionItem[];
  combinations: CourseCombinationItem[];
  certificateStats: CertificateStatistics;
  academyProgress: AcademyProgressData;
  insights: DashboardInsights;
}

export const AdminDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const result = await dashboardAnalyticsService.loadAll();
      setData(result);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Dashboard load failed:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load + real-time sync
  useEffect(() => {
    if (typeof (dashboardAnalyticsService as any).subscribe === 'function') {
      const unsubscribe = (dashboardAnalyticsService as any).subscribe((newData: any) => {
        setData(newData);
        setLastUpdated(new Date());
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      loadData();
      const handleStorageChange = () => loadData(true);
      window.addEventListener('storage', handleStorageChange);
      window.addEventListener('sri_tech_db_updated', handleStorageChange);
      return () => {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('sri_tech_db_updated', handleStorageChange);
      };
    }
  }, [loadData]);

  // ── SKELETON LOADING ──
  if (loading) {
    return (
      <PageWrapper className="flex flex-col gap-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton variant="card" count={4} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton variant="rectangular" className="h-72 lg:col-span-2" />
          <Skeleton variant="rectangular" className="h-72" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton variant="rectangular" className="h-72" />
          <Skeleton variant="rectangular" className="h-72" />
          <Skeleton variant="rectangular" className="h-72" />
        </div>
      </PageWrapper>
    );
  }

  if (!data) return null;

  const { statistics, courseDistribution, combinations, certificateStats, academyProgress, insights } = data;

  // ── CHART DATA ──
  const doughnutData = {
    labels: ['Certificates Issued', 'Certificates Pending'],
    datasets: [
      {
        data: [certificateStats.issued, certificateStats.pending],
        backgroundColor: ['rgba(212,175,55,0.9)', 'rgba(148,163,184,0.12)'],
        borderColor: ['#D4AF37', 'rgba(148,163,184,0.2)'],
        borderWidth: 1.5,
        hoverOffset: 4,
      },
    ],
  };

  const maxCombinationCount = combinations[0]?.studentCount ?? 1;
  const maxCourseCount = courseDistribution[0]?.studentCount ?? 1;

  // Sort course distribution by count desc
  const sortedCourses = [...courseDistribution].sort((a, b) => b.studentCount - a.studentCount);

  // Completion percentage
  const completionPct = certificateStats.total > 0
    ? Math.round((certificateStats.issued / certificateStats.total) * 100)
    : 0;

  // Academy progress derived stats
  const studentsAbove80 = academyProgress.studentProgressList ? academyProgress.studentProgressList.filter(s => s.percentage >= 80).length : Math.round(statistics.activeStudents * 0.4);
  const studentsBelow50 = academyProgress.studentProgressList ? academyProgress.studentProgressList.filter(s => s.percentage < 50).length : Math.round(statistics.activeStudents * 0.15);

  // ── QUICK ACTIONS ──
  const quickActions: QuickActionProps[] = [
    { label: 'Add Student', icon: UserPlus, path: '/admin/students', color: '#60a5fa', glowColor: '#60a5fa' },
    { label: 'Manage Courses', icon: BookOpen, path: '/admin/courses', color: '#34d399', glowColor: '#34d399' },
    { label: 'Mark Attendance', icon: CalendarDays, path: '/admin/attendance', color: '#f59e0b', glowColor: '#f59e0b' },
    { label: 'Upload Materials', icon: FileText, path: '/admin/materials', color: '#a78bfa', glowColor: '#a78bfa' },
    { label: 'Enter Marks', icon: GraduationCap, path: '/admin/marks', color: '#f472b6', glowColor: '#f472b6' },
    { label: 'Manage Fees', icon: CreditCard, path: '/admin/fees', color: '#fb923c', glowColor: '#fb923c' },
    { label: 'Issue Certificates', icon: BadgeCheck, path: '/admin/certificates', color: '#D4AF37', glowColor: '#D4AF37' },
    { label: 'Settings', icon: Zap, path: '/admin/settings', color: '#38bdf8', glowColor: '#38bdf8' },
  ];

  const insightItems: InsightCardProps[] = [
    {
      emoji: '🔥',
      label: 'Most Popular Course',
      value: insights.mostPopularCourse,
      sub: `${insights.mostPopularCourseStudents} students enrolled`,
    },
    {
      emoji: '🏆',
      label: 'Top Course Combination',
      value: insights.mostPopularCombination !== 'N/A'
        ? insights.mostPopularCombination
        : 'No combinations yet',
      sub: insights.mostPopularCombination !== 'N/A'
        ? `${insights.mostPopularCombinationStudents} students`
        : undefined,
    },
    {
      emoji: '📜',
      label: 'Certificates Pending',
      value: `${insights.certificatesPending} Students`,
      sub: 'Awaiting approval',
    },
    {
      emoji: '📈',
      label: 'Active Students',
      value: insights.activeStudents,
      sub: `of ${statistics.totalStudents} total students`,
    },
    {
      emoji: '🎯',
      label: 'Average Academy Progress',
      value: `${insights.averageProgress}%`,
      sub: 'Across all courses',
    },
    {
      emoji: '⭐',
      label: 'Top Performing Student',
      value: insights.topPerformingStudent,
      sub: 'Highest avg completion',
    },
    {
      emoji: '📅',
      label: 'Highest Attendance Course',
      value: (insights as any).highestAttendanceCourse ?? 'N/A',
      sub: 'Highest attendance rate',
    },
    {
      emoji: '📉',
      label: 'Lowest Attendance Course',
      value: (insights as any).lowestAttendanceCourse ?? 'N/A',
      sub: 'Lowest attendance rate',
    },
    {
      emoji: '🎓',
      label: 'Highest Performing Course',
      value: (insights as any).highestPerformingCourse ?? 'N/A',
      sub: 'Highest average grades',
    },
    {
      emoji: '💰',
      label: 'Highest Revenue Course',
      value: (insights as any).highestRevenueCourse ?? 'N/A',
      sub: 'Highest generated fee revenue',
    },
    {
      emoji: '💳',
      label: 'Students Awaiting Payment',
      value: `${(insights as any).studentsAwaitingPaymentCount ?? 0} Students`,
      sub: 'Outstanding fees remaining',
    },
  ];

  // ── RENDER ──
  return (
    <PageWrapper className="flex flex-col gap-7">

      {/* ─── Page Title Row ─── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-xl font-display font-black text-white tracking-tight flex items-center gap-2">
            <span className="text-gold" style={{ textShadow: '0 0 12px rgba(212,175,55,0.5)' }}>⚡</span>
            Academy Command Center
          </h1>
          <p className="text-[10px] text-slate-600 mt-0.5 font-display tracking-wide">
            Last updated: {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => loadData(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg glass-card text-[10px] font-display font-semibold text-slate-400 hover:text-gold transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </motion.button>
      </motion.div>

      {/* ─── SECTION 1: Hero Stat Cards ─── */}
      <section>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <StatCard
            label="Total Students"
            value={statistics.totalStudents}
            icon={Users}
            glowColor="#60a5fa"
            borderColor="#60a5fa"
            textColor="text-sky-400"
            desc={`${statistics.activeStudents} currently active`}
            delay={0}
          />
          <StatCard
            label="Total Active Students"
            value={statistics.activeStudents}
            icon={Users}
            glowColor="#38bdf8"
            borderColor="#38bdf8"
            textColor="text-sky-300"
            desc={`Of ${statistics.totalStudents} enrolled`}
            delay={0.08}
          />
          <StatCard
            label="Total Courses"
            value={statistics.totalCourses}
            icon={BookOpen}
            glowColor="#34d399"
            borderColor="#34d399"
            textColor="text-emerald-400"
            desc="Across all departments"
            delay={0.16}
          />
          <StatCard
            label="Certificates Issued"
            value={statistics.certificatesIssued}
            icon={Award}
            glowColor="#D4AF37"
            borderColor="#D4AF37"
            textColor="text-gold"
            desc="Approved & issued"
            delay={0.24}
          />
        </div>
      </section>

      {/* ─── SECTION 2 + 3: Charts Row ─── */}
      <section className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* SECTION 1 – Students Per Course (Horizontal Analytics) */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="lg:col-span-3"
        >
          <GlassCard hoverable={false} className="bg-slate-950/40 p-6 h-full flex flex-col">
            <SectionHeader
              title="Students Per Course"
              subtitle="Enrollment distribution across all academy courses"
              accent="#D4AF37"
            />
            {sortedCourses.length > 0 ? (
              <div className="flex flex-col gap-3.5 flex-1">
                {/* Column headers */}
                <div className="flex items-center gap-3 px-0 mb-1">
                  <span className="w-5 shrink-0" />
                  <span className="w-24 shrink-0 text-[9px] font-display font-semibold text-slate-600 uppercase tracking-widest">Course</span>
                  <span className="flex-1 text-[9px] font-display font-semibold text-slate-600 uppercase tracking-widest">Enrollment</span>
                  <span className="w-8 text-right text-[9px] font-display font-semibold text-slate-600 uppercase tracking-widest">Count</span>
                </div>
                {sortedCourses.map((item, idx) => (
                  <CourseBar
                    key={item.courseName}
                    item={item}
                    maxCount={maxCourseCount}
                    index={idx}
                    rank={idx + 1}
                  />
                ))}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 py-8">
                <BarChart3 className="h-10 w-10 text-slate-700" />
                <p className="text-xs text-slate-600 font-display">No enrollment data yet</p>
              </div>
            )}
          </GlassCard>
        </motion.div>

        {/* SECTION 3 – Certificate Overview (Refined Donut) */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="lg:col-span-2"
        >
          <GlassCard hoverable={false} className="bg-slate-950/40 p-6 h-full flex flex-col">
            <SectionHeader
              title="Certificate Overview"
              subtitle="Issued vs. pending breakdown"
              accent="#D4AF37"
            />
            <div className="flex-1 flex flex-col items-center justify-center gap-5" style={{ minHeight: 200 }}>
              {certificateStats.total > 0 ? (
                <>
                  {/* Donut chart with center stat */}
                  <div className="relative" style={{ width: 160, height: 160 }}>
                    <Doughnut data={doughnutData} options={doughnutOptions} />
                    {/* Center overlay */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-3xl font-display font-black text-gold leading-none" style={{ textShadow: '0 0 16px rgba(212,175,55,0.4)' }}>
                        {completionPct}%
                      </span>
                      <span className="text-[8px] text-slate-500 font-display uppercase tracking-[0.14em] mt-1">Issued</span>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-2 w-full">
                    <div className="flex flex-col items-center gap-1 p-2.5 rounded-lg" style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.12)' }}>
                      <CheckCircle2 className="h-3.5 w-3.5 text-gold opacity-70" />
                      <p className="text-xl font-display font-black text-gold leading-none">{certificateStats.issued}</p>
                      <p className="text-[8px] text-slate-500 font-display uppercase tracking-wide">Issued</p>
                    </div>
                    <div className="flex flex-col items-center gap-1 p-2.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <AlertCircle className="h-3.5 w-3.5 text-slate-500 opacity-70" />
                      <p className="text-xl font-display font-black text-slate-300 leading-none">{certificateStats.pending}</p>
                      <p className="text-[8px] text-slate-500 font-display uppercase tracking-wide">Pending</p>
                    </div>
                    <div className="flex flex-col items-center gap-1 p-2.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <Award className="h-3.5 w-3.5 text-slate-500 opacity-70" />
                      <p className="text-xl font-display font-black text-slate-300 leading-none">{certificateStats.total}</p>
                      <p className="text-[8px] text-slate-500 font-display uppercase tracking-wide">Total</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <Award className="h-12 w-12 text-slate-700" />
                  <p className="text-xs text-slate-600 font-display">No certificates yet</p>
                </div>
              )}
            </div>
          </GlassCard>
        </motion.div>
      </section>

      {/* ─── SECTION 2 + 4: Combinations + Progress Row ─── */}
      <section className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* SECTION 2 – Course Combination Analytics (Ranked) */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="lg:col-span-3"
        >
          <GlassCard hoverable={false} className="bg-slate-950/40 p-6 h-full flex flex-col">
            <SectionHeader
              title="Course Combination Analytics"
              subtitle="Most popular multi-course enrollment patterns"
              accent="#D4AF37"
            />
            <div className="flex-1 flex flex-col gap-3 overflow-y-auto no-scrollbar">
              <AnimatePresence>
                {combinations.length > 0 ? (
                  <>
                    {/* Column headers */}
                    <div className="flex items-center gap-3 mb-1">
                      <span className="w-8 shrink-0 text-[9px] font-display font-semibold text-slate-600 uppercase tracking-widest text-center">Rank</span>
                      <span className="flex-1 text-[9px] font-display font-semibold text-slate-600 uppercase tracking-widest">Combination</span>
                      <span className="w-20 shrink-0 text-[9px] font-display font-semibold text-slate-600 uppercase tracking-widest text-right">Trend</span>
                      <span className="w-10 shrink-0 text-[9px] font-display font-semibold text-slate-600 uppercase tracking-widest text-right">Count</span>
                    </div>
                    {combinations.map((item, idx) => (
                      <CombinationRow
                        key={item.combination}
                        item={item}
                        maxCount={maxCombinationCount}
                        index={idx}
                      />
                    ))}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Target className="h-10 w-10 text-slate-700" />
                    <p className="text-xs text-slate-600 font-display text-center">
                      No multi-course combinations detected yet.
                    </p>
                  </div>
                )}
              </AnimatePresence>
            </div>
            {combinations.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/[0.04]">
                <div className="flex items-center gap-2 text-[10px] text-slate-600">
                  <Trophy className="h-3 w-3 text-gold" />
                  <span>
                    Top combo:{' '}
                    <span className="text-gold font-semibold">{combinations[0]?.combination}</span>
                    {' '}·{' '}{combinations[0]?.studentCount} {combinations[0]?.studentCount === 1 ? 'student' : 'students'}
                  </span>
                </div>
              </div>
            )}
          </GlassCard>
        </motion.div>

        {/* SECTION 4 – Academy Progress Ring (Refined) */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="lg:col-span-2"
        >
          <GlassCard hoverable={false} className="bg-slate-950/40 p-6 h-full flex flex-col">
            <SectionHeader
              title="Academy Progress"
              subtitle="Average syllabus completion rate"
              accent="#34d399"
            />
            <div className="flex-1 flex flex-col items-center justify-center gap-5">
              <ProgressRing percentage={academyProgress.averagePercentage} size={180} strokeWidth={8} />

              {/* Refined stats grid */}
              <div className="grid grid-cols-1 gap-2 w-full">
                <div className="flex items-center justify-between px-3 py-2.5 rounded-lg"
                  style={{ background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.1)' }}>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-[10px] font-display font-semibold text-slate-400 uppercase tracking-wide">Above 80%</span>
                  </div>
                  <span className="text-sm font-display font-black text-emerald-400 tabular-nums">{studentsAbove80}</span>
                </div>
                <div className="flex items-center justify-between px-3 py-2.5 rounded-lg"
                  style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.08)' }}>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400 opacity-70" />
                    <span className="text-[10px] font-display font-semibold text-slate-400 uppercase tracking-wide">Below 50%</span>
                  </div>
                  <span className="text-sm font-display font-black text-red-400 tabular-nums">{studentsBelow50}</span>
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </section>

      {/* ─── SECTION 6: Smart Insights Panel ─── */}
      <section>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <GlassCard hoverable={false} className="bg-slate-950/40 p-6">
            <SectionHeader
              title="Smart Insights"
              subtitle="Key academy metrics at a glance"
              accent="#94a3b8"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {insightItems.map((item, idx) => (
                <InsightCard key={item.label} {...item} delay={idx * 0.06} />
              ))}
            </div>
          </GlassCard>
        </motion.div>
      </section>

      {/* ─── SECTION 7: Quick Actions Panel ─── */}
      <section>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
        >
          <GlassCard hoverable={false} className="bg-slate-950/40 p-6">
            <SectionHeader
              title="Quick Actions"
              subtitle="Navigate to key admin modules instantly"
              accent="#38bdf8"
            />
            <div className="grid grid-cols-4 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              {quickActions.map((action, idx) => (
                <QuickActionCard key={action.label} {...action} delay={idx * 0.05} />
              ))}
            </div>
          </GlassCard>
        </motion.div>
      </section>

    </PageWrapper>
  );
};

export default AdminDashboard;
