import React from 'react';
import { motion } from 'framer-motion';
import { Check, CircleDot, Circle } from 'lucide-react';
import { StudentCourseProgressionItem } from '../../types';

interface CourseProgressionBarProps {
  items: StudentCourseProgressionItem[];
  compact?: boolean;
}

export const CourseProgressionBar: React.FC<CourseProgressionBarProps> = ({
  items,
  compact = false,
}) => {
  if (!items || items.length === 0) {
    return (
      <span className="text-xs text-slate-500 italic">No courses enrolled</span>
    );
  }

  return (
    <div className="flex items-center flex-wrap gap-2 py-1">
      {items.map((item, idx) => {
        const isCompleted = item.status === 'COMPLETED';
        const isCurrent = item.status === 'CURRENT';
        const isUpcoming = item.status === 'UPCOMING';

        return (
          <React.Fragment key={item.courseId}>
            {/* Step Node */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25, delay: idx * 0.04 }}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-medium border transition-all ${
                isCompleted
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.12)]'
                  : isCurrent
                  ? 'bg-gold/15 border-gold/40 text-gold shadow-[0_0_15px_rgba(212,175,55,0.18)] font-semibold'
                  : 'bg-slate-900/60 border-white/5 text-slate-400'
              }`}
            >
              {/* Status Icon */}
              {isCompleted && (
                <div className="flex items-center justify-center h-4 w-4 rounded-full bg-emerald-500/20 text-emerald-400">
                  <Check className="h-3 w-3 stroke-[2.5]" />
                </div>
              )}
              {isCurrent && (
                <div className="flex items-center justify-center h-4 w-4 rounded-full bg-gold/20 text-gold relative">
                  <span className="absolute h-2 w-2 rounded-full bg-gold animate-ping opacity-60" />
                  <CircleDot className="h-3 w-3 stroke-[2.5]" />
                </div>
              )}
              {isUpcoming && (
                <div className="flex items-center justify-center h-4 w-4 rounded-full bg-slate-800 text-slate-500">
                  <Circle className="h-3 w-3 stroke-[1.5]" />
                </div>
              )}

              {/* Course Name */}
              <span className="font-display font-semibold tracking-wide">
                {item.courseName}
              </span>

              {/* Status Subtitle / Grade / Badge */}
              <span
                className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-md font-mono ${
                  isCompleted
                    ? 'bg-emerald-500/20 text-emerald-200'
                    : isCurrent
                    ? 'bg-gold/20 text-gold font-bold'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {isCompleted
                  ? item.averageMarks !== undefined
                    ? `${item.averageMarks}%`
                    : '✓ Done'
                  : isCurrent
                  ? '● Current'
                  : '○ Upcoming'}
              </span>
            </motion.div>

            {/* Connecting Arrow/Divider between steps */}
            {idx < items.length - 1 && (
              <div className="flex items-center text-slate-600 font-mono text-xs px-0.5 select-none">
                <span className={`transition-colors ${isCompleted ? 'text-emerald-500/50' : 'text-slate-600'}`}>
                  ────────
                </span>
                <span className={`text-[10px] ${isCompleted ? 'text-emerald-400' : 'text-slate-600'}`}>
                  ▶
                </span>
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default CourseProgressionBar;
