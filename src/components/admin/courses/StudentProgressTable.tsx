import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, ChevronDown, ChevronUp, BookOpen, Clock, AlertCircle } from 'lucide-react';
import { Student, CourseModule, StudentProgress } from '../../../types';
import GlassCard from '../../ui/GlassCard';
import Badge from '../../ui/Badge';
import StudentAvatar from '../../ui/StudentAvatar';

interface StudentProgressTableProps {
  students: Student[];
  modules: CourseModule[];
  progressData: StudentProgress[];
  onToggleModule: (studentId: string, moduleId: string, completed: boolean) => void;
  calculateProgress: (completedCount: number, totalCount: number) => number;
}

const StudentProgressTable: React.FC<StudentProgressTableProps> = ({
  students,
  modules,
  progressData,
  onToggleModule,
  calculateProgress
}) => {
  const activeModules = modules.filter(m => m.isActive);
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

  const toggleExpand = (studentId: string) => {
    setExpandedStudentId(prev => (prev === studentId ? null : studentId));
  };

  return (
    <GlassCard className="overflow-hidden border-white/5 bg-slate-950/40 p-0">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 bg-slate-900/40">
              <th className="p-4 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Student Details
              </th>
              <th className="p-4 text-[10px] uppercase font-bold text-slate-500 tracking-wider text-center">
                Completed / Total
              </th>
              <th className="p-4 text-[10px] uppercase font-bold text-slate-500 tracking-wider text-center">
                Progress
              </th>
              <th className="p-4 text-[10px] uppercase font-bold text-slate-500 tracking-wider text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => {
              const studentProgress = progressData.find(p => p.studentId === student.id);
              const completedCount = studentProgress?.completedModuleIds.filter(id =>
                activeModules.some(m => m.id === id)
              ).length || 0;
              const progressPercentage = calculateProgress(completedCount, activeModules.length);
              const isExpanded = expandedStudentId === student.id;

              return (
                <React.Fragment key={student.id}>
                  {/* Student Main Row */}
                  <tr
                    onClick={() => toggleExpand(student.id)}
                    className="border-b border-white/5 hover:bg-white/2 cursor-pointer transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center border border-white/10 overflow-hidden shrink-0">
                            <StudentAvatar
                              name={student.name}
                              size="sm"
                              variant="circle"
                              status={student.status}
                            />
                          </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-200">{student.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono tracking-wider">
                            {student.registerNumber || student.rollNo || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="p-4 text-center">
                      <span className="text-sm font-mono font-bold text-slate-300">
                        {completedCount} <span className="text-slate-500">/</span> {activeModules.length}
                      </span>
                    </td>

                    <td className="p-4">
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-28 h-2 bg-slate-900 rounded-full overflow-hidden shrink-0">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercentage}%` }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                            className={`h-full ${
                              progressPercentage === 100 ? 'bg-emerald-500' : 'bg-gold'
                            }`}
                          />
                        </div>
                        <span className={`text-sm font-bold font-mono min-w-[50px] text-right ${
                          progressPercentage === 100 ? 'text-emerald-400' : 'text-gold'
                        }`}>
                          {progressPercentage}%
                        </span>
                      </div>
                    </td>

                    <td className="p-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(student.id);
                        }}
                        className="p-1.5 rounded-lg bg-white/5 border border-white/5 hover:border-gold/30 text-slate-400 hover:text-gold transition-all"
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </td>
                  </tr>

                  {/* Expandable Module Syllabus Checklist Row */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <tr>
                        <td colSpan={4} className="p-0 bg-slate-950/80">
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden border-b border-white/5"
                          >
                            <div className="p-6 flex flex-col gap-6">
                              {/* Statistics Header */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col">
                                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Syllabus</span>
                                  <span className="text-lg font-bold text-slate-200 mt-1">{activeModules.length} Modules</span>
                                </div>
                                <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col">
                                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Completed</span>
                                  <span className="text-lg font-bold text-emerald-400 mt-1">{completedCount} Completed</span>
                                </div>
                                <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col">
                                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Remaining</span>
                                  <span className="text-lg font-bold text-amber-500 mt-1">{activeModules.length - completedCount} Modules</span>
                                </div>
                                <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col">
                                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Progress Status</span>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-lg font-bold text-gold">{progressPercentage}%</span>
                                    {progressPercentage === 100 && <Badge color="success">Done</Badge>}
                                  </div>
                                </div>
                              </div>

                              {/* Modules Interactive Checklist Grid */}
                              <div>
                                <h4 className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-3 flex items-center gap-1.5">
                                  <BookOpen className="h-4 w-4 text-gold" />
                                  Syllabus Completion Checklist
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {activeModules.map((module) => {
                                    const isCompleted = studentProgress?.completedModuleIds.includes(module.id) || false;

                                    return (
                                      <motion.div
                                        key={module.id}
                                        whileHover={{ scale: 1.01 }}
                                        onClick={() => onToggleModule(student.id, module.id, !isCompleted)}
                                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer select-none transition-all ${
                                          isCompleted
                                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/15'
                                            : 'bg-slate-900/50 border-white/5 text-slate-400 hover:border-gold/30 hover:bg-slate-900/80 hover:text-slate-200'
                                        }`}
                                      >
                                        <div className={`h-6 w-6 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
                                          isCompleted
                                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                                            : 'bg-white/5 border-white/10 text-slate-600'
                                        }`}>
                                          {isCompleted ? (
                                            <span className="text-xs font-bold font-sans">✓</span>
                                          ) : (
                                            <span className="text-xs font-bold font-sans">✗</span>
                                          )}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                          <span className="text-xs font-semibold truncate leading-tight">
                                            {module.title}
                                          </span>
                                          <span className="text-[9px] text-slate-500 font-mono">
                                            Module {module.order}
                                          </span>
                                        </div>
                                      </motion.div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        </td>
                      </tr>
                    )}
                  </AnimatePresence>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {students.length === 0 && (
        <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
          <AlertCircle className="h-8 w-8 text-slate-500" />
          <p className="text-slate-500 italic text-sm">No students currently enrolled in this course.</p>
        </div>
      )}
    </GlassCard>
  );
};

export default StudentProgressTable;
