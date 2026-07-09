import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { studentService, courseService, marksService, marksCalculationService } from '../../services';
import { Student, Course, Mark } from '../../types';
import PageWrapper from '../../components/ui/PageWrapper';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Skeleton from '../../components/ui/Skeleton';
import PageHeader from '../../components/ui/PageHeader';
import StudentReportCard from '../../components/admin/marks/StudentReportCard';
import StudentAvatar from '../../components/ui/StudentAvatar';

import {
  Award,
  Search,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Edit,
  Eye,
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react';

export const AdminMarks: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [studentResults, setStudentResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search, Filters & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('all');
  const [selectedGrade, setSelectedGrade] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'average'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Dynamic Form states
  const [formMarks, setFormMarks] = useState<Record<string, { theoryMarks: string; practicalMarks: string }>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let unsubscribeMarks: (() => void) | null = null;

    const initSubscription = async () => {
      setLoading(true);
      try {
        const [studentsData, coursesData] = await Promise.all([
          studentService.getAll(),
          courseService.getAll()
        ]);
        setStudents(studentsData);
        setCourses(coursesData);

        // Subscribe to marks real-time
        unsubscribeMarks = marksService.subscribeToMarks((marksData) => {
          const results = studentsData.map((st) => {
            const enrolledProgCourses = coursesData.filter(c => 
              c.category === 'Programming' && 
              (st.courseIds?.includes(c.id) || st.enrolledCourses?.includes(c.id))
            );

            const subjects = enrolledProgCourses.map(course => {
              const markRecord = marksData.find(m => m.studentId === st.id && m.courseId === course.id);
              const theory = markRecord?.theoryMarks !== undefined ? markRecord.theoryMarks : 0;
              const practical = markRecord?.practicalMarks !== undefined ? markRecord.practicalMarks : 0;
              const average = marksCalculationService.calculateLanguageAverage(theory, practical);
              const grade = marksCalculationService.calculateGrade(average);

              return {
                courseId: course.id,
                courseName: course.name,
                courseCode: course.code || '',
                theoryMarks: theory,
                practicalMarks: practical,
                average,
                grade
              };
            });

            const gradedSubjects = subjects.filter(s => s.theoryMarks > 0 || s.practicalMarks > 0);
            const allCompleted = enrolledProgCourses.length > 0 && gradedSubjects.length === enrolledProgCourses.length;

            const overallAverage = allCompleted 
              ? marksCalculationService.calculateOverallAverage(subjects) 
              : 0;
            const finalGrade = allCompleted 
              ? marksCalculationService.calculateGrade(overallAverage) 
              : '—';
            const passStatus = allCompleted 
              ? marksCalculationService.calculatePassStatus(overallAverage) 
              : 'Pending';

            return {
              student: st,
              subjects,
              overallAverage,
              grade: finalGrade,
              status: passStatus,
              allCompleted
            };
          });

          setStudentResults(results.filter(r => r !== null));
          setLoading(false);
        });

      } catch (err) {
        console.error('Failed to load academic records in subscription:', err);
        setLoading(false);
      }
    };

    initSubscription();

    return () => {
      if (unsubscribeMarks) unsubscribeMarks();
    };
  }, []);

  const handleOpenEdit = (student: Student) => {
    setEditingStudent(student);
    const resultRecord = studentResults.find(r => r.student.id === student.id);
    const initialMarksMap: Record<string, { theoryMarks: string; practicalMarks: string }> = {};
    
    // Auto-detect programming courses student is enrolled in
    const enrolledProgCourses = courses.filter(c => 
      c.category === 'Programming' && 
      (student.courseIds?.includes(c.id) || student.enrolledCourses?.includes(c.id))
    );

    enrolledProgCourses.forEach(course => {
      const match = resultRecord?.subjects.find((s: any) => s.courseId === course.id);
      const t = match?.theoryMarks !== undefined ? match.theoryMarks : 0;
      const p = match?.practicalMarks !== undefined ? match.practicalMarks : 0;
      initialMarksMap[course.id] = {
        theoryMarks: t > 0 ? String(t) : '',
        practicalMarks: p > 0 ? String(p) : ''
      };
    });

    setFormMarks(initialMarksMap);
    setIsEditModalOpen(true);
  };

  const handleSaveMarks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setSaving(true);
    try {
      // Convert string form values to numeric values for saving
      const numericMarks: Record<string, { theoryMarks: number; practicalMarks: number }> = {};
      Object.entries(formMarks).forEach(([courseId, vals]) => {
        numericMarks[courseId] = {
          theoryMarks: vals.theoryMarks === '' ? 0 : Math.min(100, Math.max(0, Number(vals.theoryMarks))),
          practicalMarks: vals.practicalMarks === '' ? 0 : Math.min(100, Math.max(0, Number(vals.practicalMarks)))
        };
      });
      await marksCalculationService.updateStudentMarks(editingStudent.id, numericMarks);
      // Dispatch update event to alert any open dashboards
      window.dispatchEvent(new Event('sri_tech_db_updated'));
      setIsEditModalOpen(false);
    } catch (err) {
      console.error('Failed to save student marks:', err);
    } finally {
      setSaving(false);
      setEditingStudent(null);
    }
  };

  const handleOpenReport = (report: any) => {
    setSelectedReport(report);
    setIsReportModalOpen(true);
  };

  const toggleSort = (type: 'name' | 'average') => {
    if (sortBy === type) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(type);
      setSortOrder('asc');
    }
  };

  // 1. Filter results
  const filteredResults = studentResults.filter(r => {
    // Search query
    const matchSearch =
      r.student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.student.registerNumber || r.student.rollNo || '').toLowerCase().includes(searchQuery.toLowerCase());

    // Language filter
    const matchLanguage =
      selectedLanguage === 'all' ||
      r.subjects.some((s: any) => s.courseName.toLowerCase() === selectedLanguage.toLowerCase());

    // Grade filter
    const matchGrade = selectedGrade === 'all' || r.grade === selectedGrade;

    // Status filter
    const matchStatus = selectedStatus === 'all' || r.status.toLowerCase() === selectedStatus.toLowerCase();

    return matchSearch && matchLanguage && matchGrade && matchStatus;
  });

  // 2. Sort results
  const sortedResults = [...filteredResults].sort((a, b) => {
    let valueA, valueB;
    if (sortBy === 'name') {
      valueA = a.student.name.toLowerCase();
      valueB = b.student.name.toLowerCase();
    } else {
      valueA = a.overallAverage;
      valueB = b.overallAverage;
    }

    if (valueA < valueB) return sortOrder === 'asc' ? -1 : 1;
    if (valueA > valueB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // 3. Paginate results
  const totalPages = Math.ceil(sortedResults.length / itemsPerPage);
  const paginatedResults = sortedResults.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedLanguage, selectedGrade, selectedStatus, sortBy, sortOrder]);

  // Unique list of grades for filters
  const gradesList = ['A+', 'A', 'B', 'C', 'F'];

  // Identify programming courses to feed language filter dropdown
  const programmingCourses = courses.filter(c => c.category === 'Programming');

  return (
    <PageWrapper className="flex-1 flex flex-col gap-6">
      <PageHeader
        title="Marks Management Engine"
        subtitle="Manage student academic scores, dynamic syllabus results, letter grade calculations and report cards."
        icon={Award}
        iconColor="text-gold"
        breadcrumbRoot="Admin Portal"
        breadcrumbRootPath="/admin"
      />



      {/* Control Panel: Filters, Search, Sort */}
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by student name or register..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-white/5 bg-slate-950/60 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-gold/50 text-xs transition-all font-medium"
            />
          </div>

          {/* Programming Languages Dropdown */}
          <div className="relative">
            <select
              value={selectedLanguage}
              onChange={e => setSelectedLanguage(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-white/5 bg-slate-950/60 text-slate-300 text-xs focus:outline-none focus:border-gold/50 cursor-pointer font-medium"
            >
              <option value="all">All Programming Languages</option>
              {programmingCourses.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Grades Dropdown */}
          <div className="relative">
            <select
              value={selectedGrade}
              onChange={e => setSelectedGrade(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-white/5 bg-slate-950/60 text-slate-300 text-xs focus:outline-none focus:border-gold/50 cursor-pointer font-medium"
            >
              <option value="all">All Letter Grades</option>
              {gradesList.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {/* Status Dropdown */}
          <div className="relative">
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-white/5 bg-slate-950/60 text-slate-300 text-xs focus:outline-none focus:border-gold/50 cursor-pointer font-medium"
            >
              <option value="all">All Statuses</option>
              <option value="pass">Pass</option>
              <option value="fail">Fail</option>
            </select>
          </div>
        </div>
      </div>

      {/* Glassmorphic Grades Table */}
      <GlassCard hoverable={false} className="bg-slate-950/40 border border-white/5 p-0 overflow-hidden flex-1 flex flex-col justify-between min-h-[350px]">
        {loading ? (
          <div className="p-6">
            <Skeleton variant="text" count={6} />
          </div>
        ) : paginatedResults.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 text-center text-slate-400 flex-1">
            <FileSpreadsheet className="h-12 w-12 text-slate-600 mb-4" />
            <p className="text-base font-semibold text-slate-300">No student grades found</p>
            <p className="text-xs text-slate-500 mt-1">Try resetting search query or filtering parameters</p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-slate-900/30 text-[10px] text-slate-400 uppercase font-bold tracking-wider select-none">
                  <th className="px-6 py-4">Student Info</th>
                  <th className="px-6 py-4">Programming Syllabus</th>
                  <th className="px-6 py-4 text-center cursor-pointer hover:bg-white/5 transition-colors" onClick={() => toggleSort('average')}>
                    <div className="flex items-center justify-center gap-1">
                      Overall Average
                      {sortBy === 'average' && (
                        <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-center">Grade</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedResults.map(res => {
                  const hasProgramming = res.subjects.length > 0;
                  const isPassed = res.status === 'Pass';
                  const classInfo = hasProgramming ? marksCalculationService.getClassificationInfo(res.overallAverage) : null;

                  return (
                    <tr key={res.student.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                      {/* Photo + Name + Roll */}
                      <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                          <StudentAvatar
                            name={res.student.name}
                            size="sm"
                            variant="circle"
                            status={res.student.status}
                          />
                          <div>
                            <span className="text-xs font-semibold text-white block">{res.student.name}</span>
                            <span className="text-[9px] text-slate-500 font-mono tracking-wider">
                              {res.student.registerNumber || res.student.rollNo}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Badges for enrolled programming languages with per-subject averages */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-2 max-w-[220px]">
                          {res.subjects.map((sub: any) => {
                            const isGraded = sub.theoryMarks > 0 || sub.practicalMarks > 0;
                            return (
                              <div key={sub.courseId} className="flex items-center gap-2">
                                <Badge color={isGraded ? 'gold' : 'default'} className="text-[8px] uppercase tracking-wider font-bold shrink-0">
                                  {sub.courseName}
                                </Badge>
                                <span className={`text-[9px] font-mono font-semibold ${isGraded ? 'text-slate-300' : 'text-slate-600 italic'}`}>
                                  {isGraded ? `${sub.average}%` : 'Pending'}
                                </span>
                              </div>
                            );
                          })}
                          {!hasProgramming && (
                            <span className="text-[10px] text-slate-500 italic">No programming languages</span>
                          )}
                        </div>
                      </td>

                      {/* Overall Average */}
                      <td className="px-6 py-4 text-center font-mono font-bold text-white text-xs">
                        {hasProgramming && res.allCompleted ? `${res.overallAverage}%` : '—'}
                      </td>

                      {/* Final Grade */}
                      <td className="px-6 py-4 text-center">
                        {hasProgramming && res.allCompleted && classInfo ? (
                          <div className="flex flex-col items-center gap-1">
                            <Badge
                              color={
                                res.grade === 'A+' || res.grade === 'A'
                                  ? 'success'
                                  : res.grade === 'B'
                                  ? 'info'
                                  : res.grade === 'C'
                                  ? 'warning'
                                  : 'error'
                              }
                              variant="glass"
                              className="font-bold text-[10px]"
                            >
                              {res.grade}
                            </Badge>
                            <span className="text-[9px] text-slate-400 font-medium">
                              {classInfo.classification} ({classInfo.rangeText})
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>

                      {/* Status badge */}
                      <td className="px-6 py-4 text-center">
                        {hasProgramming ? (
                          <Badge
                            color={
                              res.status === 'Pass'
                                ? 'success'
                                : res.status === 'Fail'
                                ? 'error'
                                : 'warning'
                            }
                            variant="solid"
                            className="font-bold text-[9px] px-2.5"
                          >
                            {res.status}
                          </Badge>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEdit(res.student)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-gold hover:bg-gold/10 hover:border-gold/30 transition-all border border-transparent"
                            title="Edit Syllabus Marks"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleOpenReport(res)}
                            disabled={!hasProgramming}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 hover:border-indigo-500/30 transition-all border border-transparent disabled:opacity-30 disabled:cursor-not-allowed"
                            title="View Report Card"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer controls: pagination summary */}
        {sortedResults.length > 0 && (
          <div className="flex items-center justify-between p-4 border-t border-white/5 select-none bg-slate-950/20">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Showing {paginatedResults.length} of {sortedResults.length} Records
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg bg-white/5 border border-white/5 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs font-bold text-slate-300 font-mono">
                {currentPage} / {totalPages || 1}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-1.5 rounded-lg bg-white/5 border border-white/5 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </GlassCard>

      {/* Dynamic Mark Entry Form Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          if (!saving) setIsEditModalOpen(false);
        }}
        title={`Record Programming Scores – ${editingStudent?.name}`}
        size="md"
      >
        {editingStudent && (
          <form onSubmit={handleSaveMarks} className="flex flex-col gap-6">
            <div className="flex items-center gap-3 pb-4 border-b border-white/5">
              <StudentAvatar
                name={editingStudent.name}
                size="sm"
                variant="circle"
                status={editingStudent.status}
              />
              <div>
                <span className="text-sm font-semibold text-slate-200 block">{editingStudent.name}</span>
                <span className="text-[10px] text-slate-500 font-mono">{editingStudent.registerNumber || editingStudent.rollNo}</span>
              </div>
            </div>

            {/* Dynamic Form Sections */}
            <div className="flex flex-col gap-4 max-h-[50vh] overflow-y-auto custom-scrollbar pr-1">
              {courses
                .filter(c => 
                  c.category === 'Programming' && 
                  (editingStudent.courseIds?.includes(c.id) || editingStudent.enrolledCourses?.includes(c.id))
                )
                .map(course => {
                  const theoryStr = formMarks[course.id]?.theoryMarks ?? '';
                  const practicalStr = formMarks[course.id]?.practicalMarks ?? '';
                  const theory = theoryStr === '' ? 0 : Number(theoryStr);
                  const practical = practicalStr === '' ? 0 : Number(practicalStr);
                   
                  // Calculate dynamic average inside UI instantly using calculations service
                  const average = marksCalculationService.calculateLanguageAverage(theory, practical);
                  const grade = marksCalculationService.calculateGrade(average);
                  const classInfo = marksCalculationService.getClassificationInfo(average);

                  return (
                    <div key={course.id} className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 flex flex-col gap-4 transition-all">
                      <div className="flex justify-between items-start">
                        <span className="text-xs uppercase font-bold text-gold tracking-wide mt-1">
                          {course.code ? `${course.code} - ` : ''}{course.name}
                        </span>
                        <div className="flex flex-col items-end text-right gap-0.5 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5 min-w-[150px]">
                          <span className="text-[10px] font-mono font-bold text-slate-300">
                            Average : {average}%
                          </span>
                          <span className="text-[10px] font-bold text-white">
                            Grade : {grade}
                          </span>
                          <span className="text-[9px] text-slate-400">
                            Performance : <span className="text-gold font-semibold">{classInfo.classification} ({classInfo.rangeText})</span>
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">
                            Theory Score (100)
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            placeholder="0"
                            value={theoryStr}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/[^0-9]/g, '');
                              if (raw === '') {
                                setFormMarks(prev => ({ ...prev, [course.id]: { ...prev[course.id], theoryMarks: '' } }));
                              } else {
                                const num = Math.min(100, Number(raw));
                                setFormMarks(prev => ({ ...prev, [course.id]: { ...prev[course.id], theoryMarks: String(num) } }));
                              }
                            }}
                            className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-gold/50 transition-all font-semibold font-mono"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">
                            Practical Score (100)
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            placeholder="0"
                            value={practicalStr}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/[^0-9]/g, '');
                              if (raw === '') {
                                setFormMarks(prev => ({ ...prev, [course.id]: { ...prev[course.id], practicalMarks: '' } }));
                              } else {
                                const num = Math.min(100, Number(raw));
                                setFormMarks(prev => ({ ...prev, [course.id]: { ...prev[course.id], practicalMarks: String(num) } }));
                              }
                            }}
                            className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-gold/50 transition-all font-semibold font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}

              {courses.filter(c => 
                c.category === 'Programming' && 
                (editingStudent.courseIds?.includes(c.id) || editingStudent.enrolledCourses?.includes(c.id))
              ).length === 0 && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <span className="text-xs font-semibold">
                    Warning: This student is not enrolled in any Programming Language course. Assign them to a Programming course first under course/student settings.
                  </span>
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
              <Button
                type="button"
                variant="glass"
                size="sm"
                onClick={() => setIsEditModalOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="gold"
                size="sm"
                disabled={saving || courses.filter(c => 
                  c.category === 'Programming' && 
                  (editingStudent.courseIds?.includes(c.id) || editingStudent.enrolledCourses?.includes(c.id))
                ).length === 0}
                className="font-semibold shadow-lg shadow-gold/10"
              >
                {saving ? 'Saving Scores...' : 'Save Academic Marks'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Result Details / Report Card Modal */}
      <Modal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        title="Student Official Report Card"
        size="lg"
      >
        <StudentReportCard report={selectedReport} />
      </Modal>
    </PageWrapper>
  );
};

export default AdminMarks;
