import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Edit2,
  Trash2,
  Eye,
  Phone,
  Mail,
  Hash,
  BookOpen,
} from 'lucide-react';
import { Student, Course } from '../../../types';
import Badge from '../../ui/Badge';
import Skeleton from '../../ui/Skeleton';
import StudentAvatar from '../../ui/StudentAvatar';

interface StudentTableProps {
  students: Student[];
  courses: Course[];
  isLoading: boolean;
  onEdit: (student: Student) => void;
  onDelete: (student: Student) => void;
  onView: (student: Student) => void;
}

const StudentTable: React.FC<StudentTableProps> = ({
  students,
  courses,
  isLoading,
  onEdit,
  onDelete,
  onView
}) => {
  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} variant="text" className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const getCourseCount = (student: Student) => student.enrolledCourses.length;

  return (
    <div className="overflow-x-auto custom-scrollbar">
      <table className="w-full text-left border-separate border-spacing-y-2 px-4">
        <thead>
          <tr className="text-slate-400 text-xs font-display font-semibold uppercase tracking-wider">
            <th className="px-4 py-2">Avatar</th>
            <th className="px-4 py-2">Name & Register Number</th>
            <th className="px-4 py-2">Contact Info</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2 text-center">Courses</th>
            <th className="px-4 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="space-y-2">
          <AnimatePresence mode="popLayout">
            {students.map((student) => (
              <motion.tr
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                key={student.id}
                className="group bg-white/2 hover:bg-white/5 border border-white/5 transition-all duration-300"
              >
                <td className="px-4 py-3 first:rounded-l-2xl border-y border-l border-white/5">
                  <StudentAvatar
                    name={student.name}
                    size="md"
                    status={student.status}
                    variant="rounded"
                  />
                </td>
                <td className="px-4 py-3 border-y border-white/5">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-white group-hover:text-gold transition-colors">
                      {student.name}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono mt-1 flex items-center gap-1">
                      <Hash className="h-3 w-3" /> {student.registerNumber}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 border-y border-white/5">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Mail className="h-3.5 w-3.5 text-slate-600" />
                      <span>{student.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <Phone className="h-3.5 w-3.5 text-slate-600" />
                      <span>{student.phone}</span>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 border-y border-white/5">
                  <Badge
                    color={student.status === 'Active' ? 'success' : 'error'}
                    className="px-2.5 py-1 rounded-lg text-[10px]"
                  >
                    {student.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 border-y border-white/5 text-center">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/50 border border-white/5 text-xs text-slate-300">
                    <BookOpen className="h-3.5 w-3.5 text-sky-400" />
                    <span className="font-bold">{getCourseCount(student)}</span>
                  </div>
                </td>
                <td className="px-4 py-3 last:rounded-r-2xl border-y border-r border-white/5 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => onView(student)}
                      className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onEdit(student)}
                      className="p-2 rounded-lg text-slate-400 hover:text-gold hover:bg-white/5 transition-all"
                      title="Edit Student"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDelete(student)}
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/5 transition-all"
                      title="Delete Student"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  );
};

export default StudentTable;
