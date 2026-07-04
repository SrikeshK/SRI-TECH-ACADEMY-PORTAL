import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Users, Layers, TrendingUp, ChevronRight, FileText, Play } from 'lucide-react';
import { Course } from '../../../types';
import GlassCard from '../../ui/GlassCard';
import Badge from '../../ui/Badge';

interface CourseCardProps {
  course: Course;
  studentCount: number;
  averageProgress: number;
  onClick: () => void;
  onViewSyllabus?: (e: React.MouseEvent) => void;
  onViewProgress?: (e: React.MouseEvent) => void;
}

const CourseCard: React.FC<CourseCardProps> = ({
  course,
  studentCount,
  averageProgress,
  onClick,
  onViewSyllabus,
  onViewProgress
}) => {
  const materialsCount = course.materials?.length || 0;
  const status = studentCount > 0 ? 'Active' : 'Draft';
  const statusColor: 'success' | 'warning' = status === 'Active' ? 'success' : 'warning';

  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className="h-full"
    >
      <GlassCard
        className="group relative overflow-hidden h-full flex flex-col p-6 cursor-pointer border-white/5 hover:border-gold/30 transition-colors"
        onClick={onClick}
      >
        {/* Background icon decoration */}
        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
          <BookOpen className="h-16 w-16 text-gold" />
        </div>

        <div className="flex justify-between items-start mb-4 z-10">
          <div className="flex flex-col gap-1.5">
            <Badge color="gold" className="text-[10px] uppercase tracking-wider font-bold w-fit">
              {course.category || 'Programming'}
            </Badge>
            <Badge color={statusColor} className="text-[9px] uppercase tracking-wider font-semibold w-fit">
              {status}
            </Badge>
          </div>
          <div className="flex flex-col items-end gap-1 text-slate-400 text-xs">
            <div className="flex items-center gap-1">
              <Layers className="h-3.5 w-3.5 text-slate-400" />
              <span>{course.modules?.length || 0} Modules</span>
            </div>
            <div className="flex items-center gap-1">
              <FileText className="h-3.5 w-3.5 text-slate-400" />
              <span>{materialsCount} Resources</span>
            </div>
          </div>
        </div>

        <h3 className="text-xl font-display font-bold text-white mb-2 group-hover:text-gold transition-colors z-10">
          {course.name}
        </h3>
        
        {course.description && (
          <p className="text-xs text-slate-400 line-clamp-2 mb-4 font-sans leading-relaxed">
            {course.description}
          </p>
        )}

        <div className="grid grid-cols-2 gap-4 mt-auto pt-4 border-t border-white/5 z-10">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-slate-400 text-[10px] uppercase font-bold tracking-tight">
              <Users className="h-3 w-3 text-sky-400" />
              <span>Students</span>
            </div>
            <span className="text-lg font-display font-bold text-white">{studentCount}</span>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-slate-400 text-[10px] uppercase font-bold tracking-tight">
              <TrendingUp className="h-3 w-3 text-emerald-400" />
              <span>Avg. Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-display font-bold text-white">{averageProgress}%</span>
              <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${averageProgress}%` }}
                  className="h-full bg-emerald-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="mt-6 pt-4 border-t border-white/5 flex gap-2 items-center justify-between z-10">
          <div className="flex gap-2 w-full">
            {onViewSyllabus && (
              <button
                onClick={onViewSyllabus}
                className="flex-1 py-1.5 px-2.5 rounded-lg border border-white/5 hover:border-gold/30 hover:bg-gold/5 text-slate-300 hover:text-gold text-[10px] font-bold uppercase tracking-wider transition-all"
              >
                Syllabus
              </button>
            )}
            {onViewProgress && (
              <button
                onClick={onViewProgress}
                className="flex-1 py-1.5 px-2.5 rounded-lg border border-white/5 hover:border-gold/30 hover:bg-gold/5 text-slate-300 hover:text-gold text-[10px] font-bold uppercase tracking-wider transition-all"
              >
                Progress
              </button>
            )}
          </div>
          <ChevronRight className="h-4 w-4 text-slate-500 group-hover:translate-x-1 group-hover:text-gold transition-all shrink-0 ml-1" />
        </div>
      </GlassCard>
    </motion.div>
  );
};

export default CourseCard;
