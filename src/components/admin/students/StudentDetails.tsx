import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Mail,
  Phone,
  Calendar,
  Award,
  CreditCard,
  Activity,
  ChevronRight,
  Clock,
  CheckCircle2,
  BookOpen,
} from 'lucide-react';
import { Student, Course, Mark, Fee, Certificate } from '../../../types';
import Badge from '../../ui/Badge';
import GlassCard from '../../ui/GlassCard';
import StudentAvatar from '../../ui/StudentAvatar';
import CourseProgressionBar from '../../ui/CourseProgressionBar';
import { computeStudentAcademicProgression, sortEnrolledCoursesByPriority } from '../../../utils/courseProgression';

interface StudentDetailsProps {
  student: Student;
  courses: Course[];
  marks: Mark[];
  fees?: Fee | null;
  certificates: Certificate[];
}

const StudentDetails: React.FC<StudentDetailsProps> = ({
  student,
  courses,
  marks,
  fees,
  certificates
}) => {
  const progression = useMemo(() => {
    return computeStudentAcademicProgression(student, courses, marks);
  }, [student, courses, marks]);

  const studentCourses = useMemo(() => {
    const enrolledIds = student.courseIds?.length ? student.courseIds : (student.enrolledCourses ?? []);
    const matching = courses.filter(c => enrolledIds.includes(c.id));
    return sortEnrolledCoursesByPriority(matching);
  }, [student, courses]);

  const gradedMarks = marks.filter(m => m.theoryMarks !== undefined && m.practicalMarks !== undefined && (m.theoryMarks > 0 || m.practicalMarks > 0));

  const averageMarks = gradedMarks.length > 0
    ? Math.round(gradedMarks.reduce((acc, m) => acc + (m.average ?? 0), 0) / gradedMarks.length)
    : 0;

  const feeStatus = fees
    ? fees.balanceAmount === 0 ? 'Fully Paid' : 'Pending'
    : 'Not Set';

  const issuedCertsCount = certificates.filter(c => c.status === 'Issued' || c.status === 'Approved').length;

  const stats = [
    {
      label: 'Academic Status',
      value: progression.overallStatus,
      icon: Activity,
      color: progression.overallStatus === 'COMPLETED' ? 'text-emerald-400' : 'text-gold',
      bg: progression.overallStatus === 'COMPLETED' ? 'bg-emerald-500/10' : 'bg-gold/10'
    },
    { label: 'Avg Marks', value: `${averageMarks}%`, icon: Award, color: 'text-gold', bg: 'bg-gold/10' },
    { label: 'Fees Paid', value: fees ? `${Math.round((fees.paidAmount / fees.totalAmount) * 100)}%` : '0%', icon: CreditCard, color: 'text-sky-400', bg: 'bg-sky-500/10' },
    { label: 'Courses', value: studentCourses.length, icon: BookOpen, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  ];

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
        <div className="relative">
          <StudentAvatar
            name={student.name}
            size="xl"
            variant="rounded"
          />
          <div className="absolute -bottom-2 -right-2">
            <Badge
              color={progression.overallStatus === 'COMPLETED' ? 'success' : 'gold'}
              className="border-2 border-slate-950 text-[9px] uppercase font-bold"
            >
              {progression.overallStatus}
            </Badge>
          </div>
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-bold text-white font-display">{student.name}</h2>
            <span className="text-xs font-mono text-slate-500 bg-white/5 px-2 py-1 rounded border border-white/5">
              {student.registerNumber || student.rollNo || 'N/A'}
            </span>
            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
              student.classSchedule === 'weekday'
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                : student.classSchedule === 'weekend'
                ? 'bg-purple-950/40 border-purple-500/30 text-purple-300'
                : 'bg-slate-900 border-white/10 text-slate-400'
            }`}>
              {student.classSchedule === 'weekday' ? 'Weekday Batch' : student.classSchedule === 'weekend' ? 'Weekend Batch' : 'Schedule: Not Set'}
            </span>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-slate-400">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-slate-600" />
              {student.email}
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-slate-600" />
              {student.phone}
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-600" />
              Joined {student.createdAt ? new Date(student.createdAt).toLocaleDateString() : 'N/A'}
            </div>
          </div>
        </div>
      </div>

      {/* Progression Banner */}
      <div className="p-4 rounded-2xl border border-white/5 bg-white/2 flex flex-col gap-2">
        <div className="flex justify-between items-center text-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 font-display">
            Academic Course Progression Path
          </span>
          {progression.currentCourse ? (
            <span className="text-xs font-semibold text-gold">
              Current Focus: {progression.currentCourse.courseName}
            </span>
          ) : (
            <span className="text-xs font-semibold text-emerald-400">
              ✓ All Enrolled Courses Completed
            </span>
          )}
        </div>
        <CourseProgressionBar items={progression.enrolledCourses} />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={stat.label}
            className="p-4 rounded-2xl border border-white/5 bg-white/2 hover:bg-white/5 transition-all"
          >
            <div className={`p-2 w-fit rounded-lg ${stat.bg} ${stat.color} mb-3`}>
              <stat.icon className="h-4 w-4" />
            </div>
            <div className="text-xl font-bold text-white">{stat.value}</div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Details Grid - 2 Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Enrolled Courses */}
        <GlassCard className="p-5 border-white/5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-purple-400" />
              Enrolled Courses (Priority Order)
            </h3>
            <Badge color="info" className="text-[10px]">{studentCourses.length}</Badge>
          </div>
          <div className="space-y-3">
            {studentCourses.map(course => {
              const progItem = progression.enrolledCourses.find(p => p.courseId === course.id);
              const status = progItem?.status || 'UPCOMING';

              return (
                <div key={course.id} className="flex items-center justify-between p-3 rounded-xl bg-white/2 border border-white/5 hover:border-white/10 transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-deep-blue flex items-center justify-center text-[10px] font-bold text-sky-400">
                      {course.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-200">{course.name}</div>
                      <div className="text-[9px] text-slate-500 uppercase">{course.category}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded ${
                      status === 'COMPLETED'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : status === 'CURRENT'
                        ? 'bg-gold/20 text-gold'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {status === 'COMPLETED' ? '✓ Completed' : status === 'CURRENT' ? '● Current' : '○ Upcoming'}
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-gold transition-colors" />
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>

        {/* Recent Performance / Marks */}
        <GlassCard className="p-5 border-white/5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Award className="h-4 w-4 text-gold" />
              Academic Marks
            </h3>
          </div>
          <div className="space-y-3">
            {studentCourses.filter(c => c.category === 'Programming').length > 0 ? (
              studentCourses
                .filter(c => c.category === 'Programming')
                .map(course => {
                  const mark = marks.find(m => m.courseId === course.id);
                  const average = mark?.average !== undefined ? mark.average : 0;
                  const isGraded = mark?.theoryMarks !== undefined && mark?.practicalMarks !== undefined && (mark.theoryMarks > 0 || mark.practicalMarks > 0);

                  return (
                    <div key={course.id} className="p-3 rounded-xl bg-white/2 border border-white/5">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-200">{course.name}</span>
                          {!isGraded && <Badge color="warning" className="text-[8px]">Pending</Badge>}
                        </div>
                        <span className="text-xs font-bold text-gold">{isGraded ? `${average}%` : '—'}</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: isGraded ? `${average}%` : '0%' }}
                          className="h-full bg-gold/50 rounded-full"
                        />
                      </div>
                    </div>
                  );
                })
            ) : (
              <div className="text-center py-6 text-slate-500 text-xs italic">No programming courses enrolled</div>
            )}
          </div>
        </GlassCard>

        {/* Fees Summary */}
        <GlassCard className="p-5 border-white/5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-sky-400" />
              Fees Summary
            </h3>
            <Badge color={feeStatus === 'Fully Paid' ? 'success' : 'warning'}>{feeStatus}</Badge>
          </div>
          {fees ? (
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Paid Amount</span>
                <span className="text-white font-medium">₹{fees.paidAmount}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Balance</span>
                <span className="text-rose-400 font-medium">₹{fees.balanceAmount}</span>
              </div>
              <div className="h-1 w-full bg-slate-900 rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-sky-500" style={{ width: `${(fees.paidAmount / fees.totalAmount) * 100}%` }} />
              </div>
            </div>
          ) : (
            <div className="text-slate-500 text-xs italic">No fee data found</div>
          )}
        </GlassCard>

        {/* Certificates */}
        <GlassCard className="p-5 border-white/5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Award className="h-4 w-4 text-gold" />
              Certificates ({issuedCertsCount})
            </h3>
          </div>
          <div className="space-y-2">
            {certificates.length > 0 ? (
              certificates.map(cert => (
                <div key={cert.id} className="flex items-center gap-3 text-xs p-2 rounded-lg bg-white/2 border border-white/5">
                  {cert.status === 'Issued' ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Clock className="h-4 w-4 text-amber-400" />}
                  <div className="flex-1">
                    <div className="text-slate-200 font-medium">
                      {courses.find(c => c.id === cert.courseId)?.name || 'Course Certificate'}
                    </div>
                    <div className="text-[10px] text-slate-500">{cert.status} • {cert.issueDate || 'Pending'}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-slate-500 text-xs italic">No certificates issued yet</div>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default StudentDetails;
