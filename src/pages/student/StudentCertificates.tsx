import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Certificate, Course, Student } from '../../types';
import PageWrapper from '../../components/ui/PageWrapper';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Skeleton from '../../components/ui/Skeleton';
import PageHeader from '../../components/ui/PageHeader';
import { 
  Award, 
  Eye, 
  Plus, 
  Send, 
  CheckCircle2, 
  Sparkles, 
  Printer, 
  Download, 
  Search, 
  Calendar,
  GraduationCap,
  Briefcase,
  FileText,
  AlertCircle
} from 'lucide-react';
import {
  createCertificate,
  subscribeToStudentCertificates,
  studentService,
  courseService
} from '../../services';

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

export const StudentCertificates: React.FC = () => {
  const { user } = useAuth();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [studentProfile, setStudentProfile] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modals state
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);

  // Form states
  const [formCourseId, setFormCourseId] = useState('');
  const [requestSubmitted, setRequestSubmitted] = useState(false);

  // Search & Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCourse, setFilterCourse] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterDate, setFilterDate] = useState('');

  useEffect(() => {
    if (!user?.studentId) return;

    // Load courses for claiming
    const loadCourses = async () => {
      try {
        const [coursesData, studentsList] = await Promise.all([
          courseService.getAll(),
          studentService.getAll()
        ]);
        const profile = studentsList.find(s => s.id === user.studentId);
        if (profile) {
          setStudentProfile(profile);
          const enrolled = coursesData.filter(c => profile.courseIds.includes(c.id));
          setCourses(enrolled);
          if (enrolled.length > 0) {
            setFormCourseId(enrolled[0].id);
          }
        }
      } catch (err: any) {
        console.error('Failed to load courses metadata:', err);
        setError('Failed to load required metadata: ' + err.message);
      }
    };
    loadCourses();

    // Subscribe to student's own certificates in realtime
    const unsubscribe = subscribeToStudentCertificates(user.studentId, (certsData) => {
      setCertificates(certsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const openRequestModal = () => {
    setRequestSubmitted(false);
    setIsRequestModalOpen(true);
  };

  const handleRequestCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const selectedCourse = courses.find(c => c.id === formCourseId);
      const newRequest: Omit<Certificate, 'id'> = {
        studentId: user.studentId || '',
        studentName: user.name,
        registerNumber: studentProfile ? (studentProfile.registerNumber || studentProfile.rollNo || '') : '',
        courseId: formCourseId,
        courseName: selectedCourse ? selectedCourse.name : 'Unknown Course',
        certificateTitle: selectedCourse ? `${selectedCourse.name} Certificate` : 'Course Certificate',
        certificateNumber: `STA-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        issueDate: '',
        description: 'Student requested completion verification review.',
        certificateType: 'Course Completion',
        downloadUrl: '',
        uploadedBy: 'Student Portal',
        status: 'Pending'
      };

      await createCertificate(newRequest);
      setRequestSubmitted(true);
    } catch (err: any) {
      console.error('Error requesting certificate:', err);
      setError(err.message || 'Failed to submit claim request.');
      setIsRequestModalOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (cert: Certificate) => {
    setError(null);
    const url = cert.downloadUrl || cert.certificateUrl;
    if (url) {
      window.open(url, '_blank');
    } else {
      setSelectedCert(cert);
      setIsPreviewModalOpen(true);
    }
  };

  const handleDownload = (cert: Certificate) => {
    setError(null);
    const url = cert.downloadUrl || cert.certificateUrl;
    if (url) {
      window.open(url, '_blank');
    } else {
      setError("Direct download link is not available.");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Filter & search computation
  const filteredCertificates = certificates.filter(c => {
    // Security check: ensure student ONLY sees their own certificates
    if (c.studentId !== user?.studentId) return false;

    const title = (c.certificateTitle || '').toLowerCase();
    const courseName = (c.courseName || '').toLowerCase();
    const code = (c.certificateNumber || c.certificateCode || '').toLowerCase();
    const queryStr = searchQuery.toLowerCase();

    const searchMatch = title.includes(queryStr) || courseName.includes(queryStr) || code.includes(queryStr);
    
    // Support comma-separated combined course IDs (e.g. "c3,c4")
    const certCourseIds = c.courseId ? c.courseId.split(',').map(s => s.trim()) : [];
    const courseMatch = filterCourse === 'all' || certCourseIds.includes(filterCourse);
    
    const typeMatch = filterType === 'all' || c.certificateType === filterType;
    const dateMatch = !filterDate || c.issueDate === filterDate;

    return searchMatch && courseMatch && typeMatch && dateMatch;
  });

  return (
    <PageWrapper className="flex-1 flex flex-col gap-6">
      <PageHeader
        title="Certificates"
        subtitle="View earned awards, track pending certificate requests and download verified credentials."
        icon={Award}
        iconColor="text-gold"
        breadcrumbRoot="Student Portal"
        breadcrumbRootPath="/student"
        actions={
          <Button
            variant="gold"
            size="sm"
            onClick={openRequestModal}
            leftIcon={<Plus className="h-4 w-4 mr-1.5" />}
            className="font-semibold"
          >
            Claim Certificate
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

      {/* Filters Panel */}
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search certificates..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-white/5 bg-slate-950/60 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-gold/50 text-xs transition-all font-medium"
            />
          </div>

          {/* Filter Course */}
          <div className="relative">
            <select
              value={filterCourse}
              onChange={e => setFilterCourse(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-white/5 bg-slate-950/60 text-slate-300 text-xs focus:outline-none focus:border-gold/50 cursor-pointer font-medium"
            >
              <option value="all">All Enrolled Courses</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Filter Type */}
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

          {/* Filter Date */}
          <div className="relative flex items-center">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="date"
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-white/5 bg-slate-950/60 text-slate-300 text-xs focus:outline-none focus:border-gold/50 cursor-pointer font-medium font-mono"
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
        </div>
      </div>

      {/* Grid container */}
      <GlassCard hoverable={false} className="bg-slate-950/40 border border-white/5 p-0 overflow-hidden flex-1">
        {loading && filteredCertificates.length === 0 ? (
          <div className="p-6">
            <Skeleton variant="text" count={6} />
          </div>
        ) : filteredCertificates.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 text-center text-slate-400">
            <Award className="h-12 w-12 text-slate-600 mb-4" />
            <p className="text-base font-semibold text-slate-300">No certificates have been issued yet.</p>
            <p className="text-xs text-slate-500 mt-1">
              Finish your course checklists to 100% and request an approval review.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/2">
                  <th className="px-6 py-4 text-xs font-display font-bold uppercase tracking-wider text-slate-400">Course</th>
                  <th className="px-6 py-4 text-xs font-display font-bold uppercase tracking-wider text-slate-400">Certificate Title</th>
                  <th className="px-6 py-4 text-xs font-display font-bold uppercase tracking-wider text-slate-400">Issue Date</th>
                  <th className="px-6 py-4 text-xs font-display font-bold uppercase tracking-wider text-slate-400">Certificate Number</th>
                  <th className="px-6 py-4 text-xs font-display font-bold uppercase tracking-wider text-slate-400">Certificate Type</th>
                  <th className="px-6 py-4 text-xs font-display font-bold uppercase tracking-wider text-slate-400">Status</th>
                  <th className="px-6 py-4 text-xs font-display font-bold uppercase tracking-wider text-slate-400 text-right">Certificate Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCertificates.map(cert => {
                  const TypeIcon = getCertificateTypeIcon(cert.certificateType || 'Course Completion');

                  return (
                    <tr key={cert.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold text-white">{cert.courseName}</span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-gold">
                        {cert.certificateTitle || cert.courseName || 'Course Completion Certificate'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-slate-400">{cert.issueDate || 'Pending review'}</span>
                      </td>
                      <td className="px-6 py-4 font-mono">
                        <code className="text-[10px] text-slate-200 uppercase tracking-wider">
                          {cert.certificateNumber || cert.certificateCode}
                        </code>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
                          <TypeIcon className="h-3.5 w-3.5 text-gold shrink-0" />
                          {cert.certificateType || 'Course Completion'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge color={cert.status === 'Approved' || cert.status === 'Issued' ? 'success' : 'warning'}>
                          {cert.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {cert.status === 'Approved' || cert.status === 'Issued' ? (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="glass"
                              size="sm"
                              onClick={() => handleView(cert)}
                              leftIcon={<Eye className="h-3.5 w-3.5 mr-1" />}
                              className="text-[10px] font-semibold py-1.5 px-3 rounded-lg"
                            >
                              View
                            </Button>
                            <Button
                              variant="gold"
                              size="sm"
                              onClick={() => handleDownload(cert)}
                              leftIcon={<Download className="h-3.5 w-3.5 mr-1" />}
                              className="text-[10px] font-semibold py-1.5 px-3 rounded-lg shadow-md"
                            >
                              Download
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-500 italic">
                            Awaiting admin review
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* Claim Certificate Modal */}
      <Modal isOpen={isRequestModalOpen} onClose={() => setIsRequestModalOpen(false)} title="Claim Course Certificate">
        {requestSubmitted ? (
          <div className="flex flex-col items-center text-center py-6">
            <div className="h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 animate-bounce">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h4 className="text-base font-display font-bold text-white mb-1">Claim Request Dispatched!</h4>
            <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
              We have notified administration to verify your weekly lesson progress and exam results. You will find your verified certificate here once approved.
            </p>
            <Button variant="glass" size="sm" className="mt-6 font-semibold" onClick={() => setIsRequestModalOpen(false)}>
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleRequestCertificate} className="flex flex-col gap-5">
            {/* Select Course */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400 font-display">Target Syllabus Category</label>
              <select
                value={formCourseId}
                onChange={e => setFormCourseId(e.target.value)}
                className="glass-input px-3 py-2.5 rounded-xl text-slate-300 text-xs focus:outline-none focus:border-gold/50 cursor-pointer bg-slate-950"
              >
                {courses.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.code} - {c.name}
                  </option>
                ))}
              </select>
            </div>

            <p className="text-[10px] text-slate-500 leading-relaxed">
              * Note: Please make sure that you have checked all lecture checkboxes inside your "My Courses" LMS checker before requesting verification reviews.
            </p>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-3 border-t border-white/5 pt-4 mt-2">
              <Button type="button" variant="glass" size="sm" onClick={() => setIsRequestModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="gold"
                size="sm"
                leftIcon={<Send className="h-4 w-4 mr-1.5" />}
                className="font-semibold"
              >
                Dispatch Claim
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Certificate Print Preview Modal (If Link falls back to preview layout) */}
      <Modal isOpen={isPreviewModalOpen} onClose={() => setIsPreviewModalOpen(false)} title="My Digital Award" size="xl">
        {selectedCert && (
          <div className="flex flex-col items-center gap-6">
            {/* The Certificate Layout */}
            <div
              id="print-section"
              className="w-full aspect-[1.414/1] max-w-3xl bg-slate-900 border-8 border-double border-gold/40 rounded-xl p-8 md:p-12 text-center flex flex-col justify-between relative overflow-hidden text-slate-200 select-none print:bg-white print:text-black print:border-black shadow-2xl"
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gold/5 rounded-full blur-[100px] pointer-events-none print:hidden" />
              
              {/* Crest Logo */}
              <div className="flex flex-col items-center gap-1.5 mt-2">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center font-display font-extrabold text-black text-lg shadow-[0_0_15px_rgba(212,175,55,0.4)]">
                  STA
                </div>
                <span className="font-display font-bold text-xs uppercase tracking-[0.25em] text-gold print:text-black">
                  Sri Tech Academy
                </span>
              </div>

              {/* Central text */}
              <div className="my-4 md:my-6">
                <span className="text-[10px] md:text-xs font-display font-bold uppercase tracking-widest text-slate-400 print:text-slate-600 block">
                  {selectedCert.certificateTitle || 'Certificate of Accomplishment'}
                </span>
                
                <span className="text-[10px] md:text-xs text-slate-500 font-sans italic mt-2 block">
                  This credential is proudly awarded to
                </span>
                
                <h2 className="text-xl md:text-3xl font-display font-extrabold text-white print:text-black mt-3 text-glow tracking-wide">
                  {selectedCert.studentName}
                </h2>
                
                <span className="text-[10px] md:text-xs text-slate-500 font-sans italic mt-3 block">
                  for successfully finishing all curricular structures and code validations in
                </span>
                
                <h3 className="text-sm md:text-lg font-display font-bold text-gold print:text-black mt-2 tracking-wide">
                  {selectedCert.courseName}
                </h3>
              </div>

              {/* Footer and signatures */}
              <div className="grid grid-cols-3 items-end border-t border-white/5 print:border-black/10 pt-4 mb-2">
                {/* Issue date */}
                <div className="flex flex-col items-start text-left">
                  <span className="text-[8px] uppercase tracking-wider font-bold text-slate-500">Date Issued</span>
                  <span className="text-[10px] text-slate-300 print:text-black font-semibold mt-1">{selectedCert.issueDate}</span>
                </div>

                {/* Seal */}
                <div className="flex justify-center relative">
                  <div className="h-10 w-10 md:h-12 md:w-12 rounded-full border border-gold/30 flex items-center justify-center bg-gold/10 text-gold shadow-[0_0_15px_rgba(212,175,55,0.15)] shrink-0 print:border-black print:text-black">
                    <Sparkles className="h-4 w-4 md:h-5 md:w-5 animate-pulse text-gold" />
                  </div>
                </div>

                {/* Signature */}
                <div className="flex flex-col items-end text-right">
                  <span className="font-sans text-[10px] italic text-slate-300 print:text-black">Dr. Srikanth Rao</span>
                  <span className="h-[1px] w-24 bg-white/10 print:bg-black/10 my-1" />
                  <span className="text-[8px] uppercase tracking-wider font-bold text-slate-500">Academy Director</span>
                </div>
              </div>

              {/* Hash Verify */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[7px] md:text-[8px] font-mono tracking-widest text-slate-600 print:text-slate-400">
                VERIFY CODE: {selectedCert.certificateNumber || selectedCert.certificateCode}
              </div>
            </div>

            {/* Prints controls */}
            <div className="flex items-center gap-3">
              <Button variant="glass" size="sm" onClick={() => setIsPreviewModalOpen(false)}>
                Close Preview
              </Button>
              <Button
                type="button"
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

export default StudentCertificates;
