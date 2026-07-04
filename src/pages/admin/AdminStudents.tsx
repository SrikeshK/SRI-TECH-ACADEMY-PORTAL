import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Plus,
  Search,
  Filter,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  UserPlus
} from 'lucide-react';

// Services
import {
  studentService,
  courseService,
  attendanceService,
  marksService,
  feeService,
  certificateService
} from '../../services';
import { createStudentAccount } from '../../services/firebaseAuthService';

// Types
import { Student, Course, Attendance, Mark, Fee, Certificate } from '../../types';

// Components
import PageWrapper from '../../components/ui/PageWrapper';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import GlassCard from '../../components/ui/GlassCard';
import EmptyState from '../../components/ui/EmptyState';
import { Toast, ToastType } from '../../components/ui/Toast';

// Module Components
import StudentTable from '../../components/admin/students/StudentTable';
import StudentModal from '../../components/admin/students/StudentModal';

const ITEMS_PER_PAGE = 8;

const AdminStudents: React.FC = () => {
  // Data State
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  // Interaction State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Modal State
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view' | 'delete' | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Extra Data for View Mode
  const [studentAttendance, setStudentAttendance] = useState<Attendance[]>([]);
  const [studentMarks, setStudentMarks] = useState<Mark[]>([]);
  const [studentFees, setStudentFees] = useState<Fee | null>(null);
  const [studentCertificates, setStudentCertificates] = useState<Certificate[]>([]);

  // Toast State
  const [toast, setToast] = useState<{ message: string; type: ToastType; visible: boolean }>({
    message: '',
    type: 'success',
    visible: false
  });

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ message, type, visible: true });
  };

  const fetchCourses = async () => {
    try {
      const coursesData = await courseService.getAll();
      setCourses(coursesData);
    } catch (error) {
      console.error('Failed to fetch courses:', error);
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const studentsData = await studentService.getAll();
      setStudents(studentsData);
    } catch (error) {
      showToast('Failed to fetch students data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();

    let unsubscribe: (() => void) | undefined;
    setLoading(true);

    if (studentService.onSnapshot) {
      unsubscribe = studentService.onSnapshot((studentsData) => {
        setStudents(studentsData);
        setLoading(false);
      });
    } else {
      fetchStudents();
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // Filtering Logic
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchesSearch =
        student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.registerNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.email.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'All' || student.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [students, searchQuery, statusFilter]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE);
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Handlers
  const handleOpenAdd = () => {
    setSelectedStudent(null);
    setModalMode('add');
  };

  const handleOpenEdit = (student: Student) => {
    setSelectedStudent(student);
    setModalMode('edit');
  };

  const handleOpenDelete = (student: Student) => {
    setSelectedStudent(student);
    setModalMode('delete');
  };

  const handleOpenView = async (student: Student) => {
    setSelectedStudent(student);
    setModalMode('view');
    // Fetch related data
    try {
      const [attendance, marks, fees, certificates] = await Promise.all([
        attendanceService.getByStudentId(student.id),
        marksService.getByStudentId(student.id),
        feeService.getByStudentId(student.id),
        certificateService.getByStudentId(student.id)
      ]);
      setStudentAttendance(attendance);
      setStudentMarks(marks);
      setStudentFees(fees);
      setStudentCertificates(certificates);
    } catch (error) {
      console.error('Error fetching student details:', error);
    }
  };

  const handleCloseModal = () => {
    setModalMode(null);
    setSelectedStudent(null);
  };

  const handleSubmit = async (data: Omit<Student, 'id' | 'createdAt'> & { initialPassword?: string }) => {
    setModalLoading(true);
    try {
      if (modalMode === 'add') {
        const { initialPassword, ...studentFields } = data as any;

        // Normalize course arrays
        const enrolledCourses = studentFields.enrolledCourses as string[] | undefined;
        const courseIds: string[] = studentFields.courseIds?.length
          ? studentFields.courseIds
          : (enrolledCourses ?? []);

        // Step 1: Create Firebase Auth account + both Firestore documents (students + users)
        // createStudentAccount handles all three steps atomically with rollback on failure.
        await createStudentAccount(
          studentFields.email,
          initialPassword,
          {
            name:           studentFields.name,
            phone:          studentFields.phone,
            registerNumber: studentFields.registerNumber ?? '',
            courseIds,
            enrolledCourses: courseIds,
            status:         studentFields.status as 'Active' | 'Inactive',
            batch:          studentFields.batch,
          }
        );

        // NOTE: createStudentAccount signs out the admin after creating the student
        // so the admin will be redirected to login. This is a known limitation of
        // using a single Firebase Auth instance. The admin must log in again.
        showToast('Student account created successfully! Please log in again to continue.', 'success');

      } else if (modalMode === 'edit' && selectedStudent) {
        // Normalize: form may submit enrolledCourses; Student type uses courseIds as primary
        const enrolledCourses = (data as any).enrolledCourses as string[] | undefined;
        const normalizedData: Omit<Student, 'id' | 'createdAt'> = {
          ...data,
          courseIds: data.courseIds?.length ? data.courseIds : (enrolledCourses ?? []),
          enrolledCourses: enrolledCourses ?? data.courseIds ?? []
        };
        await studentService.update(selectedStudent.id, normalizedData);
        showToast('Student profile updated');
      }

      if (!studentService.onSnapshot) {
        await fetchStudents();
      }
      handleCloseModal();
    } catch (error: any) {
      console.error('Student operation failed:', error);
      const msg = error?.message ? error.message : 'Operation failed. Please try again.';
      showToast(msg, 'error');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedStudent) return;
    setModalLoading(true);
    try {
      await studentService.delete(selectedStudent.id);
      showToast('Student record deleted successfully');
      if (!studentService.onSnapshot) {
        await fetchStudents();
      }
      handleCloseModal();
    } catch (error) {
      showToast('Failed to delete student', 'error');
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <PageWrapper>
      <PageHeader
        title="Student Management"
        subtitle="View, enroll, and manage all students in the academy. Track their academic progress and fees."
        icon={Users}
        iconColor="text-gold"
        breadcrumbRoot="Admin"
        breadcrumbRootPath="/admin"
        actions={
          <div className="flex items-center gap-3">
            <Button variant="glass" size="sm" onClick={() => { fetchCourses(); fetchStudents(); }} leftIcon={<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />}>
              Refresh
            </Button>
            <Button variant="gold" size="sm" onClick={handleOpenAdd} leftIcon={<UserPlus className="h-4 w-4" />}>
              Add Student
            </Button>
          </div>
        }
      />

      <div className="space-y-6 mt-6">
        {/* Filters Bar */}
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="flex flex-1 items-center gap-3 w-full max-w-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search by name, register number or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="glass-input w-full pl-10 pr-4 py-2.5 rounded-2xl text-sm"
              />
            </div>
            <div className="relative w-40">
              <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="glass-input w-full pl-10 pr-4 py-2.5 rounded-2xl text-sm appearance-none cursor-pointer"
              >
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 mr-2">
              Showing {paginatedStudents.length} of {filteredStudents.length} students
            </span>
            <Button variant="glass" size="sm" className="!px-3" leftIcon={<Download className="h-4 w-4" />}>
              Export
            </Button>
          </div>
        </div>

        {/* Table Section */}
        <GlassCard className="p-0 border-white/5 overflow-hidden min-h-[500px] flex flex-col">
          {filteredStudents.length > 0 ? (
            <>
              <div className="flex-1">
                <StudentTable
                  students={paginatedStudents}
                  courses={courses}
                  isLoading={loading}
                  onEdit={handleOpenEdit}
                  onDelete={handleOpenDelete}
                  onView={handleOpenView}
                />
              </div>

              {/* Pagination */}
              <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between bg-white/1">
                <div className="text-xs text-slate-500">
                  Page {currentPage} of {totalPages || 1}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="p-2 rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-all"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    disabled={currentPage === totalPages || totalPages === 0}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="p-2 rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-all"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <EmptyState
                icon={Users}
                title={searchQuery ? "No results found" : "No students enrolled"}
                description={searchQuery ? `We couldn't find any student matching "${searchQuery}".` : "Start by enrolling your first student to the academy."}
                action={!searchQuery && (
                  <Button variant="gold" onClick={handleOpenAdd}>
                    Enroll First Student
                  </Button>
                )}
              />
            </div>
          )}
        </GlassCard>
      </div>

      {/* Modals */}
      <StudentModal
        isOpen={!!modalMode}
        onClose={handleCloseModal}
        mode={modalMode || 'view'}
        student={selectedStudent}
        courses={courses}
        attendance={studentAttendance}
        marks={studentMarks}
        fees={studentFees}
        certificates={studentCertificates}
        onSubmit={handleSubmit}
        onConfirmDelete={handleDelete}
        isLoading={modalLoading}
      />

      {/* Toast Notification */}
      <Toast
        isVisible={toast.visible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, visible: false })}
      />
    </PageWrapper>
  );
};

export default AdminStudents;
