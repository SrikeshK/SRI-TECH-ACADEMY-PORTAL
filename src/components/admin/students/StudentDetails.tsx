import React from 'react';
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
import { Student, Course, Attendance, Mark, Fee, Certificate } from '../../../types';
import Badge from '../../ui/Badge';
import GlassCard from '../../ui/GlassCard';
import StudentAvatar from '../../ui/StudentAvatar';

interface StudentDetailsProps {
  student: Student;
  courses: Course[];
  attendance: Attendance[];
  marks: Mark[];
  fees?: Fee | null;
  certificates: Certificate[];
}

const StudentDetails: React.FC<StudentDetailsProps> = ({
  student,
  courses,
  attendance,
  marks,
  fees,
  certificates
}) => {
  const studentCourses = courses.filter(c => student.enrolledCourses.includes(c.id));

  const attendanceRate = attendance.length > 0
    ? Math.round((attendance.filter(a => a.status === 'Present').length / attendance.length) * 100)
    : 0;

  const gradedMarks = marks.filter(m => m.theoryMarks !== undefined && m.practicalMarks !== undefined && (m.theoryMarks > 0 || m.practicalMarks > 0));

  const averageMarks = gradedMarks.length > 0
    ? Math.round(gradedMarks.reduce((acc, m) => acc + (m.average ?? 0), 0) / gradedMarks.length)
    : 0;

  const feeStatus = fees
    ? fees.balanceAmount === 0 ? 'Fully Paid' : 'Pending'
    : 'Not Set';

  const stats = [
    { label: 'Attendance', value: `${attendanceRate}%`, icon: Activity, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Avg Marks', value: `${averageMarks}%`, icon: Award, color: 'text-gold', bg: 'bg-gold/10' },
    { label: 'Fees Paid', value: fees ? `${Math.round((fees.paidAmount / fees.totalAmount) * 100)}%` : '0%', icon: CreditCard, color: 'text-sky-400', bg: 'bg-sky-500/10' },
    { label: 'Courses', value: student.enrolledCourses.length, icon: BookOpen, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  ];

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
        <div className="relative">
          <StudentAvatar
            name={student.name}
            size="xl"
            status={student.status}
            variant="rounded"
          />
          <div className="absolute -bottom-2 -right-2">
            <Badge color={student.status === 'Active' ? 'success' : 'error'} className="border-2 border-slate-950">
              {student.status}
            </Badge>
          </div>
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-white font-display">{student.name}</h2>
            <span className="text-xs font-mono text-slate-500 bg-white/5 px-2 py-1 rounded border border-white/5">
              {student.registerNumber}
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
              Joined {new Date(student.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>
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

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Enrolled Courses */}
        <GlassCard className="p-5 border-white/5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-purple-400" />
              Enrolled Courses
            </h3>
            <Badge color="info" className="text-[10px]">{studentCourses.length}</Badge>
          </div>
          <div className="space-y-3">
            {studentCourses.map(course => (
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
                <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-gold transition-colors" />
              </div>
            ))}
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

        {/* Attendance Summary */}
        <GlassCard className="p-5 border-white/5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-400" />
              Attendance Record
            </h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1">
                <div className="text-[10px] text-slate-500 uppercase mb-1">Overall Attendance</div>
                <div className="text-lg font-bold text-white">{attendanceRate}%</div>
              </div>
              <div className="h-10 w-px bg-white/5" />
              <div className="flex-1 text-right">
                <div className="text-[10px] text-slate-500 uppercase mb-1">Total Days</div>
                <div className="text-lg font-bold text-white">{attendance.length}</div>
              </div>
            </div>
            <div className="flex gap-1 h-2">
              {attendance.slice(-20).map((a, i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-full ${a.status === 'Present' ? 'bg-emerald-500' : 'bg-rose-500'}`}
                  title={`${a.date}: ${a.status}`}
                />
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 pt-1">
              <span>Past 20 entries</span>
              <span className="flex items-center gap-2">
                <span className="flex items-center gap-1"><div className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Present</span>
                <span className="flex items-center gap-1"><div className="h-1.5 w-1.5 rounded-full bg-rose-500" /> Absent</span>
              </span>
            </div>
          </div>
        </GlassCard>

        {/* Fees & Certificates */}
        <div className="space-y-6">
          <GlassCard className="p-4 border-white/5">
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

          <GlassCard className="p-4 border-white/5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Award className="h-4 w-4 text-gold" />
                Certificates
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
    </div>
  );
};

export default StudentDetails;
