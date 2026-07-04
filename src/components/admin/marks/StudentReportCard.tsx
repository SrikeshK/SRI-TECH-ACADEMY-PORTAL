import React from 'react';
import { Student, CourseModule } from '../../../types';
import Badge from '../../ui/Badge';
import GlassCard from '../../ui/GlassCard';
import { Award, Printer, ShieldAlert } from 'lucide-react';
import Button from '../../ui/Button';
import { marksCalculationService } from '../../../services';
import StudentAvatar from '../../ui/StudentAvatar';

interface SubjectResult {
  courseId: string;
  courseName: string;
  courseCode: string;
  theoryMarks: number;
  practicalMarks: number;
  average: number;
  grade: string;
}

interface StudentReportCardProps {
  report: {
    student: Student;
    subjects: SubjectResult[];
    overallAverage: number;
    grade: string;
    status: 'Pass' | 'Fail' | 'Pending';
    allCompleted?: boolean;
  } | null;
}

export const StudentReportCard: React.FC<StudentReportCardProps> = ({ report }) => {
  if (!report) return null;

  const { student, subjects, overallAverage, grade, status } = report;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Print Action Row */}
      <div className="flex justify-end print:hidden">
        <Button
          variant="glass"
          size="sm"
          leftIcon={<Printer className="h-4 w-4" />}
          onClick={handlePrint}
          className="text-xs hover:border-gold/30 hover:text-gold"
        >
          Print Report Card
        </Button>
      </div>

      {/* Main Report Document */}
      <div className="border border-white/10 rounded-2xl p-6 bg-slate-950/60 flex flex-col gap-6 relative overflow-hidden print:border-black print:text-black print:bg-white print:p-0">
        
        {/* Decorative Golden Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gold/50 via-gold to-gold/50 print:hidden" />

        {/* Certificate Style Header */}
        <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-4 pb-6 border-b border-white/5 print:border-black">
          <div className="flex items-center gap-4 text-center md:text-left flex-col md:flex-row">
            <div className="h-16 w-16 rounded-full bg-slate-900 flex items-center justify-center border border-white/10 overflow-hidden shrink-0 print:border-black">
              <StudentAvatar
                name={student.name}
                size="lg"
                variant="circle"
                noHover
              />
            </div>
            <div>
              <h2 className="text-xl font-display font-bold text-white print:text-black">SRI TECH ACADEMY</h2>
              <p className="text-xs text-gold uppercase tracking-wider font-semibold">Official Academic Report Card</p>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-1.5 text-xs text-slate-400">
                <span className="font-semibold text-slate-200 print:text-black">{student.name}</span>
                <span className="text-slate-600">•</span>
                <span className="font-mono">{student.registerNumber || student.rollNo}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center md:items-end gap-2 shrink-0">
            <Badge color={isPassed ? 'success' : 'error'} variant="solid" className="px-4 py-1 font-bold text-sm tracking-wider uppercase">
              {status}
            </Badge>
            <span className="text-[10px] text-slate-500 font-mono">Date Generated: {new Date().toLocaleDateString()}</span>
          </div>
        </div>

        {/* Enrollment Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-white/5 border border-white/5 print:border-black print:text-black">
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Academic Branch</span>
            <span className="text-sm font-semibold text-slate-200 print:text-black">{student.batch || 'Computer Science Division'}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Phone Number</span>
            <span className="text-sm font-semibold text-slate-200 print:text-black">{student.phone || 'N/A'}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Email Address</span>
            <span className="text-sm font-semibold text-slate-200 print:text-black">{student.email}</span>
          </div>
        </div>

        {/* Detailed Marks Sheet */}
        <div>
          <h3 className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-3 print:text-black">Programming Language Scores</h3>
          
          <div className="overflow-hidden border border-white/5 rounded-xl bg-slate-900/40 print:border-black print:bg-white">
            <table className="w-full text-left border-collapse text-xs md:text-sm">
              <thead>
                <tr className="border-b border-white/5 bg-white/5 text-[10px] text-slate-400 uppercase font-bold tracking-wider print:border-black print:text-black">
                  <th className="px-4 py-3">Course Code</th>
                  <th className="px-4 py-3">Programming Language</th>
                  <th className="px-4 py-3 text-center">Theory Score (100)</th>
                  <th className="px-4 py-3 text-center">Practical Score (100)</th>
                  <th className="px-4 py-3 text-center">Language Average</th>
                  <th className="px-4 py-3 text-center">Grade</th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((sub) => {
                  const isGraded = sub.theoryMarks > 0 || sub.practicalMarks > 0;
                  return (
                    <tr key={sub.courseId} className="border-b border-white/5 last:border-0 hover:bg-white/2 transition-colors print:border-black print:text-black">
                      <td className="px-4 py-3 font-mono font-bold text-slate-400 print:text-black">{sub.courseCode}</td>
                      <td className="px-4 py-3 font-semibold text-slate-200 print:text-black">{sub.courseName}</td>
                      <td className="px-4 py-3 text-center font-mono font-medium text-slate-300 print:text-black">{isGraded ? sub.theoryMarks : '—'}</td>
                      <td className="px-4 py-3 text-center font-mono font-medium text-slate-300 print:text-black">{isGraded ? sub.practicalMarks : '—'}</td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-white print:text-black">{isGraded ? `${sub.average}%` : '—'}</td>
                      <td className="px-4 py-3 text-center font-bold">
                        <span className={`${
                          !isGraded ? 'text-slate-500' : sub.grade === 'Fail' ? 'text-rose-400 print:text-black' : 'text-gold'
                        }`}>
                          {isGraded ? sub.grade : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {subjects.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500 italic">
                      No programming courses currently graded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Overall Summary Box */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center mt-2 border-t border-white/5 pt-6 print:border-black">
          {/* Averages */}
          <div className="md:col-span-2 grid grid-cols-3 gap-4">
            <GlassCard className="p-4 flex flex-col justify-center border-white/5 bg-slate-900/60 print:border-black">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Overall Average</span>
              <span className="text-3xl font-display font-extrabold text-gold mt-1">
                {status === 'Pending' ? '—' : `${overallAverage}%`}
              </span>
            </GlassCard>
            <GlassCard className="p-4 flex flex-col justify-center border-white/5 bg-slate-900/60 print:border-black">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Final Average Grade</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-3xl font-display font-extrabold text-white print:text-black">
                  {status === 'Pending' ? '—' : grade}
                </span>
                {status !== 'Pending' && grade !== 'Fail' && grade !== 'F' && <Award className="h-5 w-5 text-gold" />}
              </div>
            </GlassCard>
            <GlassCard className="p-4 flex flex-col justify-center border-white/5 bg-slate-900/60 print:border-black">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Performance</span>
              <div className="flex flex-col mt-1">
                <span className="text-base font-bold text-slate-200 print:text-black">
                  {status === 'Pending' ? 'In Progress' : marksCalculationService.getClassificationInfo(overallAverage).classification}
                </span>
                <span className="text-[9px] text-slate-400 font-mono mt-0.5 print:text-slate-500">
                  {status === 'Pending' ? 'Syllabus partially graded' : marksCalculationService.getClassificationInfo(overallAverage).rangeText}
                </span>
              </div>
            </GlassCard>
          </div>

          {/* Verification Stamps */}
          <div className="p-5 rounded-xl border-2 border-dashed border-white/10 bg-slate-950 flex flex-col items-center justify-center text-center shrink-0 min-h-[110px] print:border-black print:text-black">
            {status === 'Pass' ? (
              <>
                <div className="h-8 w-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-1.5 print:border-black">
                  ✓
                </div>
                <span className="text-xs font-bold text-slate-300 print:text-black">ELIGIBLE FOR CERTIFICATE</span>
                <span className="text-[9px] text-slate-500 mt-0.5">Sri Tech Academy Registrar</span>
              </>
            ) : status === 'Pending' ? (
              <>
                <div className="h-8 w-8 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-1.5 print:border-black">
                  ⧖
                </div>
                <span className="text-xs font-bold text-amber-400 print:text-black">COURSE IN PROGRESS</span>
                <span className="text-[9px] text-slate-500 mt-0.5">Awaiting Syllabus Completion</span>
              </>
            ) : (
              <>
                <div className="h-8 w-8 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-1.5 print:border-black">
                  <ShieldAlert className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold text-rose-400 print:text-black">ACADEMIC PROBATION</span>
                <span className="text-[9px] text-slate-500 mt-0.5">Needs Remedial Retake</span>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default StudentReportCard;
