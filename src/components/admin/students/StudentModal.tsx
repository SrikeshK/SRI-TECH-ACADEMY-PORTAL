import React from 'react';
import Modal from '../../ui/Modal';
import StudentForm from './StudentForm';
import StudentDetails from './StudentDetails';
import { Student, Course, Attendance, Mark, Fee, Certificate } from '../../../types';
import { AlertTriangle } from 'lucide-react';
import Button from '../../ui/Button';

interface StudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'add' | 'edit' | 'view' | 'delete';
  student: Student | null;
  courses: Course[];
  attendance?: Attendance[];
  marks?: Mark[];
  fees?: Fee | null;
  certificates?: Certificate[];
  onSubmit?: (data: any) => void;
  onConfirmDelete?: () => void;
  isLoading?: boolean;
}

const StudentModal: React.FC<StudentModalProps> = ({
  isOpen,
  onClose,
  mode,
  student,
  courses,
  attendance = [],
  marks = [],
  fees = null,
  certificates = [],
  onSubmit,
  onConfirmDelete,
  isLoading = false
}) => {
  const getTitle = () => {
    switch (mode) {
      case 'add': return 'Enroll New Student';
      case 'edit': return 'Edit Student Profile';
      case 'view': return 'Student Profile Details';
      case 'delete': return 'Confirm Deletion';
      default: return '';
    }
  };

  const getSize = () => {
    switch (mode) {
      case 'view': return 'xl';
      case 'add':
      case 'edit': return 'lg';
      default: return 'md';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={getTitle()}
      size={getSize()}
    >
      {mode === 'view' && student && (
        <StudentDetails
          student={student}
          courses={courses}
          attendance={attendance}
          marks={marks}
          fees={fees}
          certificates={certificates}
        />
      )}

      {(mode === 'add' || mode === 'edit') && (
        <StudentForm
          initialData={mode === 'edit' ? student : null}
          courses={courses}
          onSubmit={onSubmit || (() => {})}
          onCancel={onClose}
          isLoading={isLoading}
        />
      )}

      {mode === 'delete' && student && (
        <div className="space-y-6">
          <div className="flex flex-col items-center text-center gap-4 py-4">
            <div className="h-16 w-16 rounded-full bg-rose-500/10 flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-rose-500" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Delete Student Account?</h3>
              <p className="text-sm text-slate-400 max-w-xs mx-auto">
                Are you sure you want to remove <span className="text-white font-semibold">{student.name}</span>? This action will permanently delete all associated academic and financial records.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 pt-4 border-t border-white/5">
            <Button variant="glass" onClick={onClose} disabled={isLoading}>
              No, Keep Student
            </Button>
            <Button variant="danger" onClick={onConfirmDelete} isLoading={isLoading}>
              Yes, Delete Permanently
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default StudentModal;
