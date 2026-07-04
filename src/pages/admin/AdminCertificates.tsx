import React, { useEffect, useState } from 'react';
import { Student, Course, Certificate } from '../../types';
import PageWrapper from '../../components/ui/PageWrapper';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Skeleton from '../../components/ui/Skeleton';
import PageHeader from '../../components/ui/PageHeader';
import { 
  Plus, 
  Award, 
  Eye, 
  Printer, 
  Download, 
  Sparkles, 
  Trash2, 
  Edit, 
  Search, 
  Calendar,
  AlertCircle,
  Copy,
  ExternalLink,
  GraduationCap,
  Briefcase,
  FileText,
  Link as LinkIcon
} from 'lucide-react';
import {
  createCertificate,
  updateCertificate,
  deleteCertificate,
  subscribeToCertificates,
  studentService,
  courseService
} from '../../services';

// Helper to convert Google Drive URL to direct download URL
const convertGoogleDriveUrl = (url: string): string => {
  if (!url) return '';
  const driveFileRegex = /https:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/;
  const match = url.match(driveFileRegex);
  if (match && match[1]) {
    return `https://drive.google.com/uc?export=download&id=${match[1]}`;
  }
  const driveOpenRegex = /https:\/\/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/;
  const matchOpen = url.match(driveOpenRegex);
  if (matchOpen && matchOpen[1]) {
    return `https://drive.google.com/uc?export=download&id=${matchOpen[1]}`;
  }
  return url;
};

// Helper to style Source label
const getLinkSource = (url: string): string => {
  if (!url) return 'Direct Link';
  const urlLower = url.toLowerCase();
  if (urlLower.includes('drive.google.com')) return 'Google Drive';
  if (urlLower.includes('github.com')) return 'GitHub';
  if (urlLower.includes('onedrive.live.com') || urlLower.includes('1drv.ms') || urlLower.includes('sharepoint.com')) return 'OneDrive';
  if (urlLower.includes('dropbox.com')) return 'Dropbox';
  return 'Direct Link';
};

const getSourceBadgeColor = (source: string): 'success' | 'warning' | 'error' | 'info' | 'gold' | 'default' => {
  switch (source) {
    case 'Google Drive':
      return 'success';
    case 'GitHub':
      return 'gold';
    case 'OneDrive':
      return 'info';
    case 'Dropbox':
      return 'warning';
    default:
      return 'default';
  }
};

const getCertificateTypeIcon = (type: string) => {
  switch (type) {
    case 'Course Completion':
      return GraduationCap;
    case 'Internship':
      return Briefcase;
    default:
      return FileText;
  }
};

export const AdminCertificates: React.FC = () => {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);

  // Form states for Issuing
  const [formTitle, setFormTitle] = useState('Course Completion Certificate');
  const [formStudentId, setFormStudentId] = useState('');
  const [formCourseIds, setFormCourseIds] = useState<string[]>([]);
  const [formCertNumber, setFormCertNumber] = useState('');
  const [formAwardDate, setFormAwardDate] = useState(new Date().toISOString().split('T')[0]);
  const [formDescription, setFormDescription] = useState('');
  const [formType, setFormType] = useState('Course Completion');
  const [formLink, setFormLink] = useState('');
  const [formStatus, setFormStatus] = useState<'Pending' | 'Approved' | 'Rejected' | 'Issued'>('Issued');

  // Edit form states
  const [editForm, setEditForm] = useState<{
    id: string;
    studentId: string;
    studentName: string;
    registerNumber: string;
    courseId: string;
    courseIds: string[];
    courseName: string;
    certificateTitle: string;
    certificateNumber: string;
    issueDate: string;
    description: string;
    certificateType: string;
    downloadUrl: string;
    status: 'Pending' | 'Approved' | 'Rejected' | 'Issued';
  } | null>(null);

  // Search, Filters & Sorting states
  const [searchStudent, setSearchStudent] = useState('');
  const [searchCourse, setSearchCourse] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortByDate, setSortByDate] = useState<'desc' | 'asc'>('desc');

  useEffect(() => {
    // Load metadata (students, courses)
    const loadMetadata = async () => {
      try {
        const [studentsData, coursesData] = await Promise.all([
          studentService.getAll(),
          courseService.getAll()
        ]);
        setStudents(studentsData);
        setCourses(coursesData);
        if (studentsData.length > 0) setFormStudentId(studentsData[0].id);
      } catch (err: any) {
        console.error('Failed to load students/courses metadata:', err);
        setError('Failed to load metadata: ' + err.message);
      }
    };
    loadMetadata();

    // Realtime certificate subscription
    const unsubscribe = subscribeToCertificates((certsData) => {
      setCertificates(certsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Sync checkboxes for included courses when selected student changes
  useEffect(() => {
    const student = students.find(s => s.id === formStudentId);
    if (student) {
      const enrolledIds = student.courseIds || student.enrolledCourses || [];
      setFormCourseIds(enrolledIds);
    } else {
      setFormCourseIds([]);
    }
  }, [formStudentId, students]);

  const getSelectedStudentCourses = (): Course[] => {
    const student = students.find(s => s.id === formStudentId);
    if (!student) return [];
    const enrolledIds = student.courseIds || student.enrolledCourses || [];
    return courses.filter(c => enrolledIds.includes(c.id));
  };

  const getSelectedEditStudentCourses = (): Course[] => {
    if (!editForm) return [];
    const student = students.find(s => s.id === editForm.studentId);
    if (!student) return [];
    const enrolledIds = student.courseIds || student.enrolledCourses || [];
    return courses.filter(c => enrolledIds.includes(c.id));
  };

  const handleCourseToggle = (courseId: string) => {
    setFormCourseIds(prev =>
      prev.includes(courseId)
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
  };

  const openIssueModal = () => {
    if (students.length > 0) {
      setFormStudentId(students[0].id);
      const student = students[0];
      const enrolledIds = student.courseIds || student.enrolledCourses || [];
      setFormCourseIds(enrolledIds);
    }
    setFormTitle('Course Completion Certificate');
    setFormAwardDate(new Date().toISOString().split('T')[0]);
    // Prefill unique certificate number
    const generatedNum = `STA-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    setFormCertNumber(generatedNum);
    setFormDescription('');
    setFormType('Course Completion');
    setFormLink('');
    setFormStatus('Issued');
    setIsIssueModalOpen(true);
  };

  const handleSaveCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formCourseIds.length === 0) {
      setError("Please select at least one course!");
      return;
    }
    if (!formLink) {
      setError("Please enter a certificate link URL!");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const student = students.find(s => s.id === formStudentId);
      const selectedCourses = courses.filter(c => formCourseIds.includes(c.id));
      const joinedIds = formCourseIds.join(',');
      const joinedNames = selectedCourses.map(c => c.name).join(' + ');
      const processedUrl = convertGoogleDriveUrl(formLink);

      const newCertData = {
        studentId: formStudentId,
        studentName: student ? student.name : 'Unknown Student',
        registerNumber: student ? (student.registerNumber || student.rollNo || '') : '',
        courseId: joinedIds,
        courseName: joinedNames,
        certificateTitle: formTitle,
        certificateNumber: formCertNumber,
        issueDate: formAwardDate,
        description: formDescription,
        certificateType: formType,
        downloadUrl: processedUrl,
        uploadedBy: 'System Admin',
        status: formStatus,
      };

      await createCertificate(newCertData);
      setIsIssueModalOpen(false);
    } catch (err: any) {
      console.error('Error creating certificate:', err);
      setError(err.message || 'Failed to create certificate.');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (cert: Certificate) => {
    setError(null);
    const certCourseIds = cert.courseId ? cert.courseId.split(',').map(s => s.trim()) : [];
    setEditForm({
      id: cert.id,
      studentId: cert.studentId,
      studentName: cert.studentName || '',
      registerNumber: cert.registerNumber || '',
      courseId: cert.courseId,
      courseIds: certCourseIds,
      courseName: cert.courseName || '',
      certificateTitle: cert.certificateTitle || cert.courseName || 'Course Completion Certificate',
      certificateNumber: cert.certificateNumber || cert.certificateCode || '',
      issueDate: cert.issueDate || '',
      description: cert.description || cert.remarks || '',
      certificateType: cert.certificateType || 'Course Completion',
      downloadUrl: cert.downloadUrl || cert.certificateUrl || '',
      status: cert.status,
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm) return;
    if (editForm.courseIds.length === 0) {
      setError("Please select at least one course!");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const selectedCourses = courses.filter(c => editForm.courseIds.includes(c.id));
      const joinedIds = editForm.courseIds.join(',');
      const joinedNames = selectedCourses.map(c => c.name).join(' + ');
      const processedUrl = convertGoogleDriveUrl(editForm.downloadUrl);

      const updatedCert: Partial<Certificate> = {
        courseId: joinedIds,
        courseName: joinedNames,
        certificateTitle: editForm.certificateTitle,
        certificateNumber: editForm.certificateNumber,
        issueDate: editForm.issueDate,
        description: editForm.description,
        certificateType: editForm.certificateType,
        downloadUrl: processedUrl,
        status: editForm.status,
      };

      await updateCertificate(editForm.id, updatedCert);
      setIsEditModalOpen(false);
      setEditForm(null);
    } catch (err: any) {
      console.error('Error editing certificate:', err);
      setError(err.message || 'Failed to update certificate.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCertificate = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this certificate? This action cannot be undone.")) return;
    setLoading(true);
    setError(null);
    try {
      await deleteCertificate(id);
    } catch (err: any) {
      console.error('Error deleting certificate:', err);
      setError(err.message || 'Failed to delete certificate.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (cert: Certificate) => {
    setError(null);
    const url = cert.downloadUrl || cert.certificateUrl;
    if (!url) {
      setError("No download URL link available.");
      return;
    }
    window.open(url, '_blank');
  };

  const openPreview = (cert: Certificate) => {
    setError(null);
    const url = cert.downloadUrl || cert.certificateUrl;
    if (url) {
      window.open(url, '_blank');
    } else {
      setSelectedCert(cert);
      setIsPreviewModalOpen(true);
    }
  };

  const handleCopyLink = (cert: Certificate) => {
    setError(null);
    const url = cert.downloadUrl || cert.certificateUrl;
    if (!url) {
      setError("No link available to copy.");
      return;
    }
    navigator.clipboard.writeText(url).then(() => {
      alert("Certificate link copied to clipboard!");
    }).catch(err => {
      console.error('Failed to copy link: ', err);
      setError("Failed to copy certificate link.");
    });
  };

  const handlePrint = () => {
    window.print();
  };

  // Search & Filtering calculations
  const filteredCertificates = certificates.filter(c => {
    const studentMatch = (c.studentName || '').toLowerCase().includes(searchStudent.toLowerCase());
    const courseMatch = (c.courseName || '').toLowerCase().includes(searchCourse.toLowerCase());
    const typeMatch = filterType === 'all' || c.certificateType === filterType;
    const dateMatch = !filterDate || c.issueDate === filterDate;
    const statusMatch = filterStatus === 'all' || c.status.toLowerCase() === filterStatus.toLowerCase();
    return studentMatch && courseMatch && typeMatch && dateMatch && statusMatch;
  });

  const sortedCertificates = [...filteredCertificates].sort((a, b) => {
    const dateA = a.issueDate ? new Date(a.issueDate).getTime() : 0;
    const dateB = b.issueDate ? new Date(b.issueDate).getTime() : 0;
    return sortByDate === 'desc' ? dateB - dateA : dateA - dateB;
  });

  return (
    <PageWrapper className="flex-1 flex flex-col gap-6">
      <PageHeader
        title="Certificates"
        subtitle="Issue digital completion awards, manage direct links, and print verified credentials."
        icon={Award}
        iconColor="text-gold"
        breadcrumbRoot="Admin Portal"
        breadcrumbRootPath="/admin"
        actions={
          <Button
            variant="gold"
            size="sm"
            onClick={openIssueModal}
            leftIcon={<Plus className="h-4 w-4 mr-1.5" />}
            className="font-semibold shadow-lg shadow-gold/10"
          >
            Issue Award
          </Button>
        }
      />

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-200 px-4 py-3 rounded-xl flex items-center justify-between gap-3 text-xs font-semibold animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button 
            onClick={() => setError(null)}
            className="text-[10px] text-slate-400 hover:text-white uppercase font-bold tracking-wider"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Search and Filters panel */}
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {/* Search by Student */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by student..."
              value={searchStudent}
              onChange={e => setSearchStudent(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-white/5 bg-slate-950/60 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-gold/50 text-xs transition-all font-medium"
            />
          </div>

          {/* Search by Course */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by course..."
              value={searchCourse}
              onChange={e => setSearchCourse(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-white/5 bg-slate-950/60 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-gold/50 text-xs transition-all font-medium"
            />
          </div>

          {/* Filter by Certificate Type */}
          <div className="relative">
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-white/5 bg-slate-950/60 text-slate-300 text-xs focus:outline-none focus:border-gold/50 cursor-pointer font-medium"
            >
              <option value="all">All Certificate Types</option>
              <option value="Course Completion">Course Completion</option>
              <option value="Internship">Internship</option>
            </select>
          </div>

          {/* Filter by Issue Date */}
          <div className="relative flex items-center">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="date"
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-white/5 bg-slate-950/60 text-slate-300 text-xs focus:outline-none focus:border-gold/50 cursor-pointer font-medium font-mono"
              title="Filter by Issue Date"
            />
            {filterDate && (
              <button 
                onClick={() => setFilterDate('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-[10px]"
              >
                Clear
              </button>
            )}
          </div>

          {/* Sort by Date */}
          <div className="relative">
            <select
              value={sortByDate}
              onChange={e => setSortByDate(e.target.value as 'asc' | 'desc')}
              className="w-full px-3 py-2.5 rounded-xl border border-white/5 bg-slate-950/60 text-slate-300 text-xs focus:outline-none focus:border-gold/50 cursor-pointer font-medium"
            >
              <option value="desc">Award Date: Newest First</option>
              <option value="asc">Award Date: Oldest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* Ledger Table Container */}
      <GlassCard hoverable={false} className="bg-slate-950/40 border border-white/5 p-0 overflow-hidden flex-1">
        {loading && sortedCertificates.length === 0 ? (
          <div className="p-6">
            <Skeleton variant="text" count={6} />
          </div>
        ) : sortedCertificates.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 text-center text-slate-400">
            <Award className="h-12 w-12 text-slate-600 mb-4" />
            <p className="text-base font-semibold text-slate-300">No certificates available.</p>
            <p className="text-xs text-slate-500 mt-1">Try relaxing filters or issuing a new professional award</p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/2 select-none">
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">Student Name</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">Course & Title</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">Award Date</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">Certificate ID & Link</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedCertificates.map(cert => {
                  const TypeIcon = getCertificateTypeIcon(cert.certificateType || 'Course Completion');
                  const source = getLinkSource(cert.downloadUrl || cert.certificateUrl || '');
                  const sourceBadge = getSourceBadgeColor(source);

                  return (
                    <tr key={cert.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                      {/* Student Name */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-white">{cert.studentName}</span>
                          <span className="text-[10px] text-slate-450">{cert.registerNumber || 'No Register No.'}</span>
                        </div>
                      </td>
                      {/* Course */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <TypeIcon className="h-4 w-4 text-gold shrink-0" />
                          <div className="flex flex-col">
                            <span className="text-xs text-slate-200 font-medium">{cert.courseName}</span>
                            <span className="text-[10px] text-slate-450 font-semibold">{cert.certificateTitle || 'Certificate'}</span>
                          </div>
                        </div>
                      </td>
                      {/* Award Date */}
                      <td className="px-6 py-4">
                        <span className="text-xs text-slate-400">{cert.issueDate || 'Pending'}</span>
                      </td>
                      {/* ID and Link */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5 font-mono">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] text-slate-500 font-sans uppercase font-bold">ID:</span>
                            <span className="text-[10px] text-slate-200 font-bold">{cert.certificateNumber || cert.certificateCode}</span>
                          </div>
                          {(cert.downloadUrl || cert.certificateUrl) && (
                            <div className="flex items-center gap-1.5">
                              <Badge color={sourceBadge} variant="glass" className="text-[8px] px-1 py-0 font-bold uppercase tracking-wider font-sans">
                                {source}
                              </Badge>
                              <a 
                                href={cert.downloadUrl || cert.certificateUrl} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="text-[9px] text-sky-400 hover:underline flex items-center gap-0.5 truncate max-w-[120px]" 
                                title={cert.downloadUrl || cert.certificateUrl}
                              >
                                View Link
                                <ExternalLink className="h-2 w-2" />
                              </a>
                            </div>
                          )}
                        </div>
                      </td>
                      {/* Status Badge */}
                      <td className="px-6 py-4">
                        <Badge 
                          color={
                            cert.status === 'Approved' || cert.status === 'Issued' ? 'success' : 
                            cert.status === 'Pending' ? 'warning' : 'error'
                          }
                          variant="glass"
                          className="text-[9px] font-bold uppercase tracking-wider"
                        >
                          {cert.status}
                        </Badge>
                      </td>
                      {/* Action Panel */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openPreview(cert)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 border border-transparent hover:border-sky-500/20 transition-all"
                            title="Open Certificate Link"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleCopyLink(cert)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-gold hover:bg-gold/10 border border-transparent hover:border-gold/20 transition-all"
                            title="Copy Link to Clipboard"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDownload(cert)}
                            disabled={!(cert.downloadUrl || cert.certificateUrl)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/20 transition-all disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-slate-450"
                            title="Open Download URL"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(cert)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-gold hover:bg-gold/10 border border-transparent hover:border-gold/20 transition-all"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCertificate(cert.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
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
      </GlassCard>

      {/* Issue Certificate Modal */}
      <Modal isOpen={isIssueModalOpen} onClose={() => setIsIssueModalOpen(false)} title="Issue Professional Award" size="md">
        <form onSubmit={handleSaveCertificate} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4">
            {/* Student Dropdown */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-display">Student</label>
              <select
                value={formStudentId}
                onChange={e => setFormStudentId(e.target.value)}
                className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-gold/50 cursor-pointer font-medium"
              >
                {students.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.rollNo || s.registerNumber})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {/* Course Selector Checkboxes */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-display">Included Courses (Ticked elements will be combined)</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-3 rounded-xl border border-white/10 bg-slate-900/40 max-h-[140px] overflow-y-auto custom-scrollbar">
                {getSelectedStudentCourses().map(c => (
                  <label key={c.id} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formCourseIds.includes(c.id)}
                      onChange={() => handleCourseToggle(c.id)}
                      className="rounded border-white/10 bg-slate-950 text-gold focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    />
                    <span className="truncate">{c.code ? `${c.code} - ` : ''}{c.name}</span>
                  </label>
                ))}
                {getSelectedStudentCourses().length === 0 && (
                  <span className="text-slate-500 text-[10px]">No enrolled courses found for this student.</span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Certificate Title */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-display">Certificate Title</label>
              <input
                type="text"
                required
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                placeholder="e.g. Course Completion Certificate"
                className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-gold/50 transition-all font-semibold"
              />
            </div>

            {/* Certificate Number */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-display">Certificate Number</label>
              <input
                type="text"
                required
                value={formCertNumber}
                onChange={e => setFormCertNumber(e.target.value)}
                placeholder="STA-2026-XXXX"
                className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-gold/50 transition-all font-semibold font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Award Date */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-405 tracking-wider font-display flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                Award Date
              </label>
              <input
                type="date"
                required
                value={formAwardDate}
                onChange={e => setFormAwardDate(e.target.value)}
                className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-gold/50 transition-all font-semibold font-mono"
              />
            </div>

            {/* Certificate Type */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-display">Certificate Type</label>
              <select
                value={formType}
                onChange={e => setFormType(e.target.value)}
                className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-gold/50 cursor-pointer font-medium"
              >
                <option value="Course Completion">Course Completion</option>
                <option value="Internship">Internship</option>
              </select>
            </div>

            {/* Status Dropdown */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-display">Status</label>
              <select
                value={formStatus}
                onChange={e => setFormStatus(e.target.value as any)}
                className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-gold/50 cursor-pointer font-medium"
              >
                <option value="Issued">Issued</option>
                <option value="Approved">Approved</option>
                <option value="Pending">Pending</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>

          {/* Certificate Link Input (URL) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-display flex items-center gap-1.5">
              <LinkIcon className="h-3.5 w-3.5 text-gold" />
              Certificate Download Link
            </label>
            <input
              type="url"
              required
              value={formLink}
              onChange={e => setFormLink(e.target.value)}
              placeholder="e.g. https://drive.google.com/file/d/... or any public URL"
              className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-gold/50 transition-all font-semibold"
            />
            <span className="text-[9px] text-slate-500">Supports Google Drive, OneDrive, GitHub, Dropbox or direct PDF URLs.</span>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-display">Description (Optional)</label>
            <textarea
              value={formDescription}
              onChange={e => setFormDescription(e.target.value)}
              placeholder="Add summary description, credentials, or remarks..."
              rows={2}
              className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-gold/50 transition-all font-medium resize-none"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-white/5 pt-4 mt-2">
            <Button type="button" variant="glass" size="sm" onClick={() => setIsIssueModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="gold" size="sm" className="font-semibold shadow-lg shadow-gold/10">
              Save Certificate
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Certificate Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Certificate Award" size="md">
        {editForm && (
          <form onSubmit={handleSaveEdit} className="flex flex-col gap-4">
            {/* Student (Disabled/ReadOnly) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-display">Student</label>
              <input
                type="text"
                disabled
                value={`${editForm.studentName} (${editForm.registerNumber})`}
                className="w-full bg-slate-900/30 border border-white/5 rounded-xl px-3 py-2 text-xs text-slate-400 font-semibold cursor-not-allowed"
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
              {/* Course Selector Checkboxes */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-display">Included Courses (Ticked elements will be combined)</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-3 rounded-xl border border-white/10 bg-slate-900/40 max-h-[140px] overflow-y-auto custom-scrollbar">
                  {getSelectedEditStudentCourses().map(c => (
                    <label key={c.id} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={editForm.courseIds.includes(c.id)}
                        onChange={() => {
                          const alreadyChecked = editForm.courseIds.includes(c.id);
                          const updatedIds = alreadyChecked
                            ? editForm.courseIds.filter(id => id !== c.id)
                            : [...editForm.courseIds, c.id];
                          setEditForm({ ...editForm, courseIds: updatedIds });
                        }}
                        className="rounded border-white/10 bg-slate-950 text-gold focus:ring-0 focus:ring-offset-0 cursor-pointer"
                      />
                      <span className="truncate">{c.code ? `${c.code} - ` : ''}{c.name}</span>
                    </label>
                  ))}
                  {getSelectedEditStudentCourses().length === 0 && (
                    <span className="text-slate-500 text-[10px]">No enrolled courses found.</span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Status Dropdown */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-display">Status</label>
                <select
                  value={editForm.status}
                  onChange={e => setEditForm({ ...editForm, status: e.target.value as any })}
                  className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-gold/50 cursor-pointer font-medium"
                >
                  <option value="Issued">Issued</option>
                  <option value="Approved">Approved</option>
                  <option value="Pending">Pending</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              {/* Certificate Type */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-display">Certificate Type</label>
                <select
                  value={editForm.certificateType}
                  onChange={e => setEditForm({ ...editForm, certificateType: e.target.value })}
                  className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-gold/50 cursor-pointer font-medium"
                >
                  <option value="Course Completion">Course Completion</option>
                  <option value="Internship">Internship</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Certificate Title */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-display">Certificate Title</label>
                <input
                  type="text"
                  required
                  value={editForm.certificateTitle}
                  onChange={e => setEditForm({ ...editForm, certificateTitle: e.target.value })}
                  className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-gold/50 transition-all font-semibold"
                />
              </div>

              {/* Certificate Number */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-display">Certificate Number</label>
                <input
                  type="text"
                  required
                  value={editForm.certificateNumber}
                  onChange={e => setEditForm({ ...editForm, certificateNumber: e.target.value })}
                  className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-gold/50 transition-all font-semibold font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Award Date */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-405 tracking-wider font-display flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  Award Date
                </label>
                <input
                  type="date"
                  required
                  value={editForm.issueDate}
                  onChange={e => setEditForm({ ...editForm, issueDate: e.target.value })}
                  className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-gold/50 transition-all font-semibold font-mono"
                />
              </div>
            </div>

            {/* Certificate Link Input (URL) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-display flex items-center gap-1.5">
                <LinkIcon className="h-3.5 w-3.5 text-gold" />
                Certificate Download Link
              </label>
              <input
                type="url"
                required
                value={editForm.downloadUrl}
                onChange={e => setEditForm({ ...editForm, downloadUrl: e.target.value })}
                className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-gold/50 transition-all font-semibold"
              />
            </div>

            {/* Remarks / Description */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-display">Description (Optional)</label>
              <textarea
                value={editForm.description}
                onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Update description or remarks..."
                rows={2}
                className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-gold/50 transition-all font-medium resize-none"
              />
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-3 border-t border-white/5 pt-4 mt-2">
              <Button type="button" variant="glass" size="sm" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="gold" size="sm" className="font-semibold shadow-lg shadow-gold/10">
                Save Changes
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Details Fallback Preview Modal (If Link isn't opened) */}
      <Modal isOpen={isPreviewModalOpen} onClose={() => setIsPreviewModalOpen(false)} title="Certificate Details" size="lg">
        {selectedCert && (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
              <div className="flex flex-col gap-3">
                <div>
                  <span className="text-[9px] uppercase font-bold tracking-wider text-slate-500 block">Student Name</span>
                  <span className="text-xs font-semibold text-slate-200">{selectedCert.studentName}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold tracking-wider text-slate-500 block">Course Name</span>
                  <span className="text-xs font-semibold text-gold">{selectedCert.courseName}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold tracking-wider text-slate-500 block">Award Date</span>
                  <span className="text-xs font-semibold text-slate-200 font-mono">{selectedCert.issueDate}</span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div>
                  <span className="text-[9px] uppercase font-bold tracking-wider text-slate-500 block">Certificate Code</span>
                  <span className="text-xs font-semibold text-slate-200 font-mono">{selectedCert.certificateNumber || selectedCert.certificateCode}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold tracking-wider text-slate-500 block">Certificate Type</span>
                  <span className="text-xs font-semibold text-slate-200">{selectedCert.certificateType || 'Course Completion'}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold tracking-wider text-slate-500 block">Status</span>
                  <Badge 
                    color={
                      selectedCert.status === 'Approved' || selectedCert.status === 'Issued' ? 'success' : 
                      selectedCert.status === 'Pending' ? 'warning' : 'error'
                    }
                    variant="solid"
                    className="text-[8px] px-2 py-0.5 mt-0.5"
                  >
                    {selectedCert.status}
                  </Badge>
                </div>
              </div>

              {(selectedCert.description || selectedCert.remarks) && (
                <div className="md:col-span-2 mt-1 pt-3 border-t border-white/5">
                  <span className="text-[9px] uppercase font-bold tracking-wider text-slate-500 block">Description / Remarks</span>
                  <span className="text-xs text-slate-400 italic block mt-0.5">{selectedCert.description || selectedCert.remarks}</span>
                </div>
              )}
            </div>

            {/* Generated digital template preview fallback */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-display flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                Generated Digital Preview (Direct Link URL Unavailable)
              </label>
              
              <div
                id="print-section"
                className="w-full aspect-[1.414/1] bg-slate-900 border-[6px] border-double border-gold/40 rounded-xl p-6 text-center flex flex-col justify-between relative overflow-hidden text-slate-200 select-none shadow-2xl"
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-gold/5 rounded-full blur-[70px] pointer-events-none" />
                
                <div className="flex flex-col items-center gap-1 mt-1">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center font-display font-extrabold text-black text-sm shadow-[0_0_10px_rgba(212,175,55,0.3)]">
                    STA
                  </div>
                  <span className="font-display font-bold text-[9px] uppercase tracking-wider text-gold">
                    Sri Tech Academy
                  </span>
                </div>

                <div className="my-2">
                  <span className="text-[9px] font-display font-bold uppercase tracking-widest text-slate-400 block">
                    {selectedCert.certificateTitle || 'Certificate of Accomplishment'}
                  </span>
                  <span className="text-[8px] text-slate-500 font-sans italic mt-1 block">
                    This credential is proudly awarded to
                  </span>
                  <h2 className="text-lg font-display font-extrabold text-white mt-1.5 tracking-wide">
                    {selectedCert.studentName}
                  </h2>
                  <span className="text-[8px] text-slate-500 font-sans italic mt-1.5 block">
                    for successfully finishing all curricular structures and validations in
                  </span>
                  <h3 className="text-xs font-display font-bold text-gold mt-1 tracking-wide">
                    {selectedCert.courseName}
                  </h3>
                </div>

                <div className="grid grid-cols-3 items-end border-t border-white/5 pt-3">
                  <div className="flex flex-col items-start text-left">
                    <span className="text-[7px] uppercase font-bold text-slate-500">Date Issued</span>
                    <span className="text-[9px] text-slate-300 font-semibold mt-0.5">{selectedCert.issueDate}</span>
                  </div>

                  <div className="flex justify-center">
                    <div className="h-7 w-7 rounded-full border border-gold/30 flex items-center justify-center bg-gold/10 text-gold">
                      <Sparkles className="h-3.5 w-3.5" />
                    </div>
                  </div>

                  <div className="flex flex-col items-end text-right">
                    <span className="font-sans text-[9px] italic text-slate-300">Dr. Srikanth Rao</span>
                    <span className="text-[7px] uppercase font-bold text-slate-500 mt-0.5">Academy Director</span>
                  </div>
                </div>

                <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[6px] font-mono tracking-widest text-slate-600">
                  VERIFY CODE: {selectedCert.certificateNumber || selectedCert.certificateCode}
                </div>
              </div>
            </div>

            {/* Print & Download Action buttons */}
            <div className="flex items-center justify-end gap-3 mt-2">
              <Button variant="glass" size="sm" onClick={() => setIsPreviewModalOpen(false)}>
                Close Preview
              </Button>
              <Button
                variant="gold"
                size="sm"
                onClick={handlePrint}
                leftIcon={<Printer className="h-4 w-4 mr-1.5" />}
                className="font-semibold"
              >
                Print / Save PDF
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </PageWrapper>
  );
};

export default AdminCertificates;
