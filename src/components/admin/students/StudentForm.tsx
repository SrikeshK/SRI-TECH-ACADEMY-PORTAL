import React, { useState } from 'react';
import { User, Mail, Phone, Hash, BookOpen, Check, Lock, Eye, EyeOff } from 'lucide-react';
import { Student, Course } from '../../../types';
import Button from '../../ui/Button';

interface StudentFormProps {
  initialData?: Student | null;
  courses: Course[];
  onSubmit: (data: Omit<Student, 'id' | 'createdAt'> & { initialPassword?: string }) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const StudentForm: React.FC<StudentFormProps> = ({
  initialData,
  courses,
  onSubmit,
  onCancel,
  isLoading = false
}) => {
  const isAddMode = !initialData;

  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    registerNumber: initialData?.registerNumber || initialData?.rollNo || '',
    enrolledCourses: initialData?.enrolledCourses || initialData?.courseIds || [],
    courseIds: initialData?.courseIds || initialData?.enrolledCourses || [],
    status: initialData?.status || 'Active' as 'Active' | 'Inactive'
  });

  // Password fields (add mode only)
  const [initialPassword, setInitialPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showInitialPassword, setShowInitialPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
    if (!formData.registerNumber.trim()) newErrors.registerNumber = 'Register number is required';
    if (formData.enrolledCourses.length === 0) newErrors.courses = 'Select at least one course';

    if (isAddMode) {
      if (!initialPassword) {
        newErrors.initialPassword = 'Initial password is required';
      } else if (initialPassword.length < 6) {
        newErrors.initialPassword = 'Password must be at least 6 characters';
      }
      if (!confirmPassword) {
        newErrors.confirmPassword = 'Please confirm the password';
      } else if (initialPassword !== confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit({
        ...(formData as Omit<Student, 'id' | 'createdAt'>),
        ...(isAddMode ? { initialPassword } : {})
      });
    }
  };

  const toggleCourse = (courseId: string) => {
    setFormData(prev => {
      const newCourses = prev.enrolledCourses.includes(courseId)
        ? prev.enrolledCourses.filter(id => id !== courseId)
        : [...prev.enrolledCourses, courseId];
      return {
        ...prev,
        enrolledCourses: newCourses,
        courseIds: newCourses  // keep both fields in sync
      };
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Full Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-400">Full Name</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`glass-input pl-10 w-full ${errors.name ? 'border-rose-500/50' : ''}`}
              placeholder="Enter student name"
            />
          </div>
          {errors.name && <span className="text-[10px] text-rose-400">{errors.name}</span>}
        </div>

        {/* Register Number */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-400">Register Number</label>
          <div className="relative">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              required
              value={formData.registerNumber}
              onChange={(e) => setFormData({ ...formData, registerNumber: e.target.value })}
              className={`glass-input pl-10 w-full ${errors.registerNumber ? 'border-rose-500/50' : ''}`}
              placeholder="e.g. REG2024001"
            />
          </div>
          {errors.registerNumber && <span className="text-[10px] text-rose-400">{errors.registerNumber}</span>}
        </div>

        {/* Email Address */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-400">
            Email Address
            {!isAddMode && <span className="ml-1.5 text-slate-600 font-normal">(read-only)</span>}
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="email"
              required
              value={formData.email}
              readOnly={!isAddMode}
              onChange={(e) => isAddMode && setFormData({ ...formData, email: e.target.value })}
              className={`glass-input pl-10 w-full ${errors.email ? 'border-rose-500/50' : ''} ${!isAddMode ? 'opacity-60 cursor-not-allowed' : ''}`}
              placeholder="student@example.com"
            />
          </div>
          {errors.email && <span className="text-[10px] text-rose-400">{errors.email}</span>}
        </div>

        {/* Phone Number */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-400">Phone Number</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className={`glass-input pl-10 w-full ${errors.phone ? 'border-rose-500/50' : ''}`}
              placeholder="+91 00000 00000"
            />
          </div>
          {errors.phone && <span className="text-[10px] text-rose-400">{errors.phone}</span>}
        </div>
      </div>

      {/* ── Password Section (Add Mode Only) ─────────────────── */}
      {isAddMode && (
        <div className="space-y-4 pt-2 border-t border-white/5">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-gold" />
            <span className="text-xs font-semibold text-slate-400">Account Credentials</span>
          </div>
          <p className="text-[10px] text-slate-500 -mt-2">
            Set an initial login password. The student can change it after their first login.
            Passwords are secured via Firebase Authentication — never stored in the database.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Initial Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Initial Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type={showInitialPassword ? 'text' : 'password'}
                  value={initialPassword}
                  onChange={(e) => setInitialPassword(e.target.value)}
                  className={`glass-input pl-10 pr-10 w-full ${errors.initialPassword ? 'border-rose-500/50' : ''}`}
                  placeholder="Min. 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowInitialPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showInitialPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.initialPassword && (
                <span className="text-[10px] text-rose-400">{errors.initialPassword}</span>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`glass-input pl-10 pr-10 w-full ${errors.confirmPassword ? 'border-rose-500/50' : ''}`}
                  placeholder="Re-enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <span className="text-[10px] text-rose-400">{errors.confirmPassword}</span>
              )}
              {confirmPassword && initialPassword && confirmPassword === initialPassword && (
                <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <Check className="h-3 w-3" /> Passwords match
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Course Selection */}
      <div className="space-y-3 pt-2">
        <label className="text-xs font-semibold text-slate-400 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-gold" />
          Course Selection
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {courses.map((course) => (
            <button
              key={course.id}
              type="button"
              onClick={() => toggleCourse(course.id)}
              className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs transition-all ${
                formData.enrolledCourses.includes(course.id)
                  ? 'bg-gold/10 border-gold/50 text-gold'
                  : 'bg-white/2 border-white/5 text-slate-400 hover:bg-white/5'
              }`}
            >
              <span className="truncate mr-1">{course.name}</span>
              {formData.enrolledCourses.includes(course.id) && <Check className="h-3 w-3 flex-shrink-0" />}
            </button>
          ))}
        </div>
        {errors.courses && <span className="text-[10px] text-rose-400">{errors.courses}</span>}
      </div>

      {/* Profile Status */}
      <div className="pt-2">
        <label className="text-xs font-semibold text-slate-400 block mb-3">Profile Status</label>
        <div className="flex gap-4">
          {['Active', 'Inactive'].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setFormData({ ...formData, status: status as 'Active' | 'Inactive' })}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs transition-all ${
                formData.status === status
                  ? status === 'Active'
                    ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/50 text-rose-400'
                  : 'bg-white/2 border-white/5 text-slate-400 hover:bg-white/5'
              }`}
            >
              <div className={`h-2 w-2 rounded-full ${status === 'Active' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-6 border-t border-white/5">
        <Button type="button" variant="glass" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="gold" isLoading={isLoading}>
          {isAddMode ? 'Create Student Account' : 'Update Student'}
        </Button>
      </div>
    </form>
  );
};

export default StudentForm;
