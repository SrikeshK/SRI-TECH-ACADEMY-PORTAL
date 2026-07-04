import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { courseService, marksService, marksCalculationService, studentService } from "../../services";
import { Mark, Course, Student } from "../../types";
import PageWrapper from "../../components/ui/PageWrapper";
import GlassCard from "../../components/ui/GlassCard";
import Badge from "../../components/ui/Badge";
import Skeleton from "../../components/ui/Skeleton";
import { ClipboardList, Clock } from "lucide-react";

interface SubjectRow {
  courseId: string;
  courseName: string;
  courseCode: string;
  theoryMarks: number;
  practicalMarks: number;
  average: number;
  grade: string;
  isGraded: boolean;
}

export const StudentResults: React.FC = () => {
  const { user } = useAuth();
  const [marks, setMarks] = useState<Mark[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeMarks: (() => void) | null = null;
    const fetchResults = async () => {
      if (!user?.studentId) return;
      try {
        const [coursesData, studentData] = await Promise.all([
          courseService.getAll(),
          studentService.getById(user.studentId),
        ]);
        setCourses(coursesData);
        setStudent(studentData);
        unsubscribeMarks = marksService.subscribeToStudentMarks(user.studentId, (marksData) => {
          setMarks(marksData);
          setLoading(false);
        });
      } catch (err) {
        console.error("Failed to load student results:", err);
        setLoading(false);
      }
    };
    fetchResults();
    return () => { if (unsubscribeMarks) unsubscribeMarks(); };
  }, [user]);

  const buildSubjectRows = (): SubjectRow[] => {
    const enrolledProgCourses = courses.filter(c =>
      c.category === "Programming" &&
      (student?.courseIds?.includes(c.id) || student?.enrolledCourses?.includes(c.id))
    );
    if (enrolledProgCourses.length === 0) {
      return marks.map(mark => {
        const course = courses.find(c => c.id === mark.courseId);
        const theory = mark.theoryMarks ?? 0;
        const practical = mark.practicalMarks ?? 0;
        const average = marksCalculationService.calculateLanguageAverage(theory, practical);
        const grade = marksCalculationService.calculateGrade(average);
        return { courseId: mark.courseId, courseName: course?.name ?? mark.courseId, courseCode: course?.code ?? "", theoryMarks: theory, practicalMarks: practical, average, grade, isGraded: theory > 0 || practical > 0 };
      });
    }
    return enrolledProgCourses.map(course => {
      const markRecord = marks.find(m => m.courseId === course.id);
      const theory = markRecord?.theoryMarks ?? 0;
      const practical = markRecord?.practicalMarks ?? 0;
      const average = marksCalculationService.calculateLanguageAverage(theory, practical);
      const grade = marksCalculationService.calculateGrade(average);
      return { courseId: course.id, courseName: course.name, courseCode: course.code ?? "", theoryMarks: theory, practicalMarks: practical, average, grade, isGraded: theory > 0 || practical > 0 };
    });
  };

  const subjectRows = buildSubjectRows();
  const gradedRows = subjectRows.filter(r => r.isGraded);
  const allCompleted = subjectRows.length > 0 && gradedRows.length === subjectRows.length;
  const overallAverage = gradedRows.length > 0 ? Math.round(gradedRows.reduce((sum, r) => sum + r.average, 0) / gradedRows.length) : 0;

  const getGPA = () => {
    const gpa = (overallAverage / 10).toFixed(1);
    if (overallAverage >= 90) return `${gpa} / 10.0 (O)`;
    if (overallAverage >= 80) return `${gpa} / 10.0 (A+)`;
    if (overallAverage >= 70) return `${gpa} / 10.0 (A)`;
    if (overallAverage >= 60) return `${gpa} / 10.0 (B)`;
    if (overallAverage >= 50) return `${gpa} / 10.0 (C)`;
    return `${gpa} / 10.0 (F)`;
  };

  return (
    <PageWrapper className="flex-1 flex flex-col gap-6">
      {loading ? (
        <div className="flex flex-col gap-6"><Skeleton variant="card" count={2} /></div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <GlassCard hoverable={false} className="bg-slate-950/40 p-5 border border-white/5 flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Average Performance</span>
              {gradedRows.length > 0 ? (
                <>
                  <span className="text-2xl font-display font-extrabold text-white mt-2">{overallAverage}% Average Score</span>
                  {!allCompleted && (
                    <span className="text-[10px] text-amber-400 mt-1 font-semibold flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Based on {gradedRows.length} of {subjectRows.length} graded courses
                    </span>
                  )}
                </>
              ) : (
                <span className="text-2xl font-display font-extrabold text-slate-500 mt-2">Not Yet Graded</span>
              )}
            </GlassCard>
            <GlassCard hoverable={false} className="bg-slate-950/40 p-5 border border-white/5 flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Cumulative GPA Index</span>
              {allCompleted && gradedRows.length > 0 ? (
                <span className="text-2xl font-display font-extrabold text-gold mt-2">{getGPA()}</span>
              ) : (
                <>
                  <span className="text-2xl font-display font-extrabold text-amber-400 mt-2">{gradedRows.length > 0 ? "In Progress" : "Not Started"}</span>
                  <span className="text-[10px] text-slate-500 mt-1">GPA calculated after all courses are graded</span>
                </>
              )}
            </GlassCard>
          </div>

          <GlassCard hoverable={false} className="bg-slate-950/40 border border-white/5 p-0 overflow-hidden flex-grow">
            {subjectRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-20 text-center text-slate-400">
                <ClipboardList className="h-12 w-12 text-slate-600 mb-4" />
                <p className="text-base font-semibold text-slate-300">No grades recorded yet</p>
                <p className="text-xs text-slate-500 mt-1">Exam scores are pending evaluation by academy leads</p>
              </div>
            ) : (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/2">
                      <th className="px-6 py-4 text-xs font-display font-bold uppercase tracking-wider text-slate-400">Course Syllabus</th>
                      <th className="px-6 py-4 text-xs font-display font-bold uppercase tracking-wider text-slate-400">Subject Topic</th>
                      <th className="px-6 py-4 text-xs font-display font-bold uppercase tracking-wider text-slate-400">Exam Assessment Name</th>
                      <th className="px-6 py-4 text-xs font-display font-bold uppercase tracking-wider text-slate-400">Marks Secured</th>
                      <th className="px-6 py-4 text-xs font-display font-bold uppercase tracking-wider text-slate-400 text-center">Subject Average</th>
                      <th className="px-6 py-4 text-xs font-display font-bold uppercase tracking-wider text-slate-400 text-center">Evaluation Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjectRows.map(row => (
                      <tr key={row.courseId} className={"border-b border-white/5 hover:bg-white/2 transition-colors " + (!row.isGraded ? "opacity-60" : "")}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-300 font-medium">{row.courseName}</span>
                            {!row.isGraded && <Badge color="warning" className="text-[8px]">Pending</Badge>}
                          </div>
                        </td>
                        <td className="px-6 py-4"><span className="text-xs text-slate-400">Theory &amp; Practical</span></td>
                        <td className="px-6 py-4"><span className="text-xs text-slate-400 font-medium">{row.isGraded ? "Term End Exam" : "---"}</span></td>
                        <td className="px-6 py-4 font-mono">
                          {row.isGraded ? (
                            <span className="text-xs text-slate-200">T: {row.theoryMarks} | P: {row.practicalMarks}</span>
                          ) : (
                            <span className="text-xs text-slate-600 italic">Not yet entered</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {row.isGraded ? (
                            <span className="text-sm font-display font-extrabold text-gold">{row.average}%</span>
                          ) : (
                            <span className="text-xs text-slate-600">---</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {row.isGraded ? (
                            <Badge color={row.grade.startsWith("A") ? "success" : row.grade.startsWith("B") ? "info" : row.grade.startsWith("C") ? "warning" : "error"}>
                              {row.grade}
                            </Badge>
                          ) : (
                            <span className="text-xs text-slate-600 italic">Pending</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {gradedRows.length > 0 && (
                    <tfoot>
                      <tr className="border-t border-white/10 bg-white/3">
                        <td colSpan={4} className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">
                          {allCompleted ? "Overall Result" : "Overall (" + gradedRows.length + "/" + subjectRows.length + " Courses Completed)"}
                        </td>
                        <td className="px-6 py-3 text-center">
                          <span className="text-sm font-display font-extrabold text-gold">{overallAverage}%</span>
                        </td>
                        <td className="px-6 py-3 text-center">
                          {allCompleted ? (
                            <Badge color={marksCalculationService.calculateGrade(overallAverage).startsWith("A") ? "success" : marksCalculationService.calculateGrade(overallAverage).startsWith("B") ? "info" : marksCalculationService.calculateGrade(overallAverage).startsWith("C") ? "warning" : "error"} variant="solid" className="font-bold">
                              {marksCalculationService.calculateGrade(overallAverage)}
                            </Badge>
                          ) : (
                            <Badge color="warning" variant="solid" className="font-bold text-[9px]">In Progress</Badge>
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </GlassCard>
        </>
      )}
    </PageWrapper>
  );
};

export default StudentResults;
