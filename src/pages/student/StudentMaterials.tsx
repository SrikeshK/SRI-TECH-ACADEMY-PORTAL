import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { databaseService } from '../../firebase/service'; // used in non-Firebase fallback paths
import { Material, Course, Student } from '../../types';
import {
  subscribeToAllCourses,
  subscribeToStudentMaterials,
  courseProgressService,
  USE_FIREBASE_MATERIALS
} from '../../services';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import PageWrapper from '../../components/ui/PageWrapper';
import GlassCard from '../../components/ui/GlassCard';
import Badge from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import PageHeader from '../../components/ui/PageHeader';
import { 
  FileText, 
  Link as LinkIcon, 
  Video, 
  Download, 
  Search, 
  HelpCircle, 
  ArrowLeft, 
  User, 
  Clock, 
  Calendar,
  Lock,
  ArrowRight,
  ExternalLink,
  Loader2,
  BookOpen,
  Presentation,
  Archive,
  File
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const StudentMaterials: React.FC = () => {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State for selected course in "step 2" view
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  
  // State for search query
  const [searchQuery, setSearchQuery] = useState('');
  
  // State for managing download animations per material ID
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, string[]>>({}); // courseId -> completedModuleIds

  useEffect(() => {
    if (!user?.studentId) return;

    let unsubscribeStudent: () => void = () => {};
    let unsubscribeCourses: () => void = () => {};

    if (USE_FIREBASE_MATERIALS) {
      // 1. Subscribe to student's own doc to get enrolledCourseIds in real-time
      const studentDocRef = doc(db, 'students', user.studentId);
      unsubscribeStudent = onSnapshot(
        studentDocRef,
        (docSnap) => {
          if (docSnap.exists()) {
            const studentData = docSnap.data() as Student;
            const enrolledIds = studentData.courseIds || studentData.enrolledCourses || [];
            setEnrolledCourseIds(enrolledIds);
          }
        },
        (error) => {
          console.error('[StudentMaterials] Error subscribing to student profile:', error);
        }
      );

      // 2. Subscribe to all courses in real-time to get up-to-date course metadata
      unsubscribeCourses = subscribeToAllCourses((coursesData) => {
        setAllCourses(coursesData);
      });
    } else {
      // Mock mode fallback
      const fetchMockData = async () => {
        try {
          const [coursesData, studentsList] = await Promise.all([
            databaseService.getCourses(),
            databaseService.getStudents()
          ]);
          const studentProfile = studentsList.find(s => s.id === user.studentId);
          if (studentProfile) {
            const enrolledIds = studentProfile.courseIds || studentProfile.enrolledCourses || [];
            setEnrolledCourseIds(enrolledIds);
            setAllCourses(coursesData);
          }
        } catch (err) {
          console.error('[StudentMaterials] Mock fetch error:', err);
        }
      };
      fetchMockData();
    }

    return () => {
      unsubscribeStudent();
      unsubscribeCourses();
    };
  }, [user]);

  // Subscribe to course progress for enrolled courses
  useEffect(() => {
    if (!user?.studentId) return;
    const unsub = courseProgressService.subscribeToAllStudentProgress(user.studentId, (list) => {
      const map: Record<string, string[]> = {};
      list.forEach(p => { map[p.courseId] = p.completedModuleIds || []; });
      setProgressMap(map);
    });
    return () => unsub();
  }, [user]);

  // Sync enrolled courses and selected course in real-time
  useEffect(() => {
    const enrolled = allCourses.filter(c => enrolledCourseIds.includes(c.id));
    setCourses(enrolled);

    setSelectedCourse((prev) => {
      if (!prev) return null;
      const refreshed = enrolled.find((c) => c.id === prev.id);
      return refreshed ?? null;
    });
  }, [allCourses, enrolledCourseIds]);

  // Subscribe to study materials for enrolled courses
  useEffect(() => {
    if (enrolledCourseIds.length === 0) {
      setMaterials([]);
      if (USE_FIREBASE_MATERIALS) {
        setLoading(false);
      }
      return;
    }

    let unsubscribeMaterials: () => void = () => {};

    if (USE_FIREBASE_MATERIALS) {
      unsubscribeMaterials = subscribeToStudentMaterials(enrolledCourseIds, (materialsData) => {
        setMaterials(materialsData);
        setLoading(false);
      });
    } else {
      // Mock mode fallback: filter mock materials in memory
      databaseService.getMaterials().then((materialsData) => {
        const relevant = materialsData.filter((m) => enrolledCourseIds.includes(m.courseId));
        setMaterials(relevant);
        setLoading(false);
      });
    }

    return () => {
      unsubscribeMaterials();
    };
  }, [enrolledCourseIds]);

  // Reset search query when changing views
  const handleBackToCourses = () => {
    setSelectedCourse(null);
    setSearchQuery('');
  };

  const handleSelectCourse = (course: Course) => {
    setSelectedCourse(course);
    setSearchQuery('');
  };

  // Get material icon with custom theme color
  const getMaterialIcon = (type: string) => {
    const t = type.toLowerCase();
    switch (t) {
      case 'pdf':
        return <FileText className="h-5 w-5 text-rose-400 shrink-0" />;
      case 'ppt':
        return <Presentation className="h-5 w-5 text-amber-400 shrink-0" />;
      case 'doc':
      case 'docx':
        return <FileText className="h-5 w-5 text-blue-400 shrink-0" />;
      case 'zip':
        return <Archive className="h-5 w-5 text-amber-500 shrink-0" />;
      case 'video':
        return <Video className="h-5 w-5 text-sky-400 shrink-0" />;
      case 'external resource':
      case 'external link':
      case 'link':
        return <LinkIcon className="h-5 w-5 text-gold shrink-0" />;
      default:
        return <File className="h-5 w-5 text-slate-400 shrink-0" />;
    }
  };

  // Get file size deterministically or N/A
  const getMockFileSize = (mat: Material) => {
    const type = (mat.type || mat.fileType || 'link').toLowerCase();
    if (type === 'link' || type === 'external resource' || type === 'external link') return 'N/A';
    if (type === 'video') return 'Streaming';
    
    // Hash title string to get a consistent simulated file size
    const charCodeSum = mat.title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const size = (1.2 + (charCodeSum % 150) / 10).toFixed(1);
    return `${size} MB`;
  };

  // Resolve uploader name from course instructor
  const getUploaderName = (courseId: string) => {
    const course = courses.find(c => c.id === courseId);
    return course?.instructor || 'System Admin';
  };

  // Helper to get module title
  const getModuleTitle = (courseId: string, moduleId?: string) => {
    if (!moduleId) return 'General';
    const course = courses.find(c => c.id === courseId);
    const mod = course?.modules?.find(m => m.id === moduleId);
    return mod ? mod.title : 'General';
  };

  // Format date helper (GB locale prints "03 July 2026")
  const formatDateStr = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  // Dynamic simulation of downloading / opening files
  const handleDownload = (material: Material) => {
    setDownloadingId(material.id);
    
    // Simulate premium loading animation before opening the link
    setTimeout(() => {
      setDownloadingId(null);
      window.open(material.downloadUrl || material.fileUrl || '#', '_blank', 'noopener,noreferrer');
    }, 1200);
  };

  // Course card details calculations
  const getCourseDetails = (courseId: string) => {
    const courseMaterials = materials.filter(m => m.courseId === courseId);
    const count = courseMaterials.length;
    
    // Last updated date
    const dates = courseMaterials
      .map(m => m.uploadedAt || m.uploadDate || '')
      .filter(Boolean)
      .map(d => new Date(d).getTime());
      
    let lastUpdated = 'Never';
    if (dates.length > 0) {
      const latestTime = Math.max(...dates);
      const latestDate = new Date(latestTime);
      const now = new Date();
      if (latestDate.toDateString() === now.toDateString()) {
        lastUpdated = 'Today';
      } else {
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        if (latestDate.toDateString() === yesterday.toDateString()) {
          lastUpdated = 'Yesterday';
        } else {
          lastUpdated = latestDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
          });
        }
      }
    }
    
    // Progress calculation
    const course = courses.find(c => c.id === courseId);
    let progress = 0;
    if (course && user?.studentId) {
      const activeModules = course.modules?.filter(m => m.isActive) || [];
      const completedIds = progressMap[courseId] || [];
      const completedCount = activeModules.filter(m => completedIds.includes(m.id)).length;
      progress = activeModules.length > 0 ? Math.round((completedCount / activeModules.length) * 100) : 0;
    }

    return { count, lastUpdated, progress };
  };

  // Enforce Access Control check
  const isEnrolledIn = (courseId: string) => {
    return courses.some(c => c.id === courseId);
  };

  // Filtering lists depending on view state
  const filteredCourses = courses.filter(course =>
    course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (course.code || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMaterials = materials.filter(m => {
    if (!selectedCourse) return false;
    // Section 4 & Section 9: Ensure materials only match the selected course, which is verified enrolled
    if (m.courseId !== selectedCourse.id) return false;
    
    return (
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.description || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const getCourseTheme = (courseName: string, index: number) => {
    const themes = [
      { color: 'text-gold bg-gold/10 border-gold/20', bar: 'bg-gold', glow: 'shadow-gold/5 border-gold/20 hover:border-gold/50' },
      { color: 'text-sky-400 bg-sky-950/30 border-sky-500/20', bar: 'bg-sky-500', glow: 'shadow-sky-500/5 border-sky-500/20 hover:border-sky-500/50' },
      { color: 'text-emerald-400 bg-emerald-950/30 border-emerald-500/20', bar: 'bg-emerald-500', glow: 'shadow-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/50' },
      { color: 'text-rose-400 bg-rose-950/30 border-rose-500/20', bar: 'bg-rose-500', glow: 'shadow-rose-500/5 border-rose-500/20 hover:border-rose-500/50' }
    ];
    
    const nameLower = courseName.toLowerCase();
    if (nameLower.includes('python')) return themes[2]; // Emerald
    if (nameLower.includes('java')) return themes[1]; // Blue
    if (nameLower.includes('c++') || nameLower.includes('tally')) return themes[0]; // Gold
    if (nameLower.includes('c') || nameLower === 'c') return themes[3]; // Rose
    return themes[index % themes.length];
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring' as const, stiffness: 300, damping: 24 }
    }
  };

  if (loading) {
    return (
      <PageWrapper className="flex-1 flex flex-col gap-6">
        <Skeleton variant="rectangular" className="h-10 w-48 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton variant="card" count={3} />
        </div>
      </PageWrapper>
    );
  }

  // --- Step 2: Course Material View ---
  if (selectedCourse) {
    // Access control check
    if (!isEnrolledIn(selectedCourse.id)) {
      return (
        <PageWrapper className="flex-1 flex flex-col gap-6">
          <GlassCard className="flex flex-col items-center justify-center p-16 text-center text-rose-400 border border-rose-500/20 rounded-2xl bg-rose-950/10">
            <Lock className="h-12 w-12 text-rose-500 mb-4 animate-bounce" />
            <h3 className="text-lg font-display font-extrabold text-white tracking-wide">
              Access Restricted
            </h3>
            <p className="text-xs text-slate-400 mt-2 max-w-sm">
              You are not enrolled in the {selectedCourse.name} syllabus. Access to these files has been blocked.
            </p>
            <button
              onClick={handleBackToCourses}
              className="mt-6 px-4 py-2 text-xs font-semibold rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-200 transition-all flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" /> Return to Course Materials
            </button>
          </GlassCard>
        </PageWrapper>
      );
    }

    return (
      <PageWrapper className="flex-1 flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          {/* Custom Breadcrumb-style display */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="cursor-pointer hover:text-slate-300 transition-colors font-display" onClick={handleBackToCourses}>
              My Course Materials
            </span>
            <span className="text-slate-700">&gt;</span>
            <span className="text-gold font-semibold font-display">{selectedCourse.name}</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4 mt-2">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBackToCourses}
                className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-white hover:bg-white/10 hover:border-white/10 active:scale-95 transition-all shrink-0"
                title="Back to Courses"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                  {selectedCourse.code || 'STA-COHORT'} &bull; Syllabus Resources
                </span>
                <h2 className="text-xl md:text-2xl font-display font-extrabold text-white tracking-tight leading-none mt-1">
                  {selectedCourse.name} Materials
                </h2>
              </div>
            </div>

            {/* Search Input inside Course Materials */}
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search resources..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-white/5 bg-slate-950/60 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-gold/50 text-sm transition-all"
              />
            </div>
          </div>
        </div>

        {/* Section 5: Empty states - no materials for this course */}
        {filteredMaterials.length === 0 ? (
          <GlassCard className="flex flex-col items-center justify-center p-16 text-center text-slate-400">
            <HelpCircle className="h-12 w-12 text-slate-600 mb-4 animate-pulse" />
            <p className="text-base font-semibold text-slate-300">
              {searchQuery ? 'No matching resources found' : 'No study resources have been uploaded for this course yet.'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {searchQuery ? 'Try clearing your search query' : 'Your instructor will publish slide packages and notes soon.'}
            </p>
          </GlassCard>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch"
          >
            {filteredMaterials.map(mat => {
              const displayType = mat.type || mat.fileType || 'Link';
              const fileTypeLower = displayType.toLowerCase();
              const fileSize = getMockFileSize(mat);
              const isDownloading = downloadingId === mat.id;

              return (
                <motion.div key={mat.id} variants={itemVariants} className="h-full">
                  <GlassCard className="bg-slate-950/40 border border-white/5 flex flex-col p-6 h-full relative group hover:border-gold/20 hover:shadow-[0_4px_24px_rgba(212,175,55,0.03)] transition-all duration-300 rounded-2xl">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                        {getMaterialIcon(displayType)}
                      </div>
                      <Badge color="gold" className="text-[8px] uppercase tracking-wider font-semibold">
                        {displayType}
                      </Badge>
                    </div>

                    <h3 className="text-sm font-display font-bold text-white tracking-wide line-clamp-1 group-hover:text-gold transition-colors">
                      {mat.title}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-sans mt-2 leading-relaxed flex-grow line-clamp-2">
                      {mat.description || 'No description provided.'}
                    </p>

                    {/* File Info Area */}
                    <div className="border-t border-white/5 pt-4 mt-5 flex flex-col gap-2.5">
                      <div className="flex flex-col gap-1 text-[10px] text-slate-500 font-sans">
                        <span className="block font-sans">
                          Module: <span className="text-slate-300 font-medium">{getModuleTitle(mat.courseId, mat.moduleId)}</span>
                        </span>
                        <span className="flex items-center gap-1 mt-1 font-sans">
                          <Calendar className="h-3 w-3 text-slate-600 animate-pulse-slow font-sans" />
                          Uploaded: <span className="text-slate-300 font-medium">{formatDateStr(mat.createdAt || mat.uploadedAt || mat.uploadDate)}</span>
                        </span>
                      </div>

                      {/* Download Button with Loader Animation */}
                      <button
                        onClick={() => handleDownload(mat)}
                        disabled={isDownloading}
                        className={`w-full py-2.5 mt-2 rounded-xl border flex items-center justify-center text-xs font-semibold transition-all gap-1.5 active:scale-[0.98] select-none ${
                          isDownloading 
                            ? 'bg-gold/5 border-gold/20 text-gold cursor-default' 
                            : 'bg-gold/10 hover:bg-gold hover:text-black border-gold/20 text-gold hover:shadow-[0_0_15px_rgba(212,175,55,0.15)]'
                        }`}
                      >
                        {isDownloading ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            {fileTypeLower === 'link' || fileTypeLower === 'external resource' || fileTypeLower === 'external link' || fileTypeLower === 'video' ? 'Redirecting...' : 'Downloading...'}
                          </>
                        ) : (
                          <>
                            {fileTypeLower === 'link' || fileTypeLower === 'external resource' || fileTypeLower === 'external link' || fileTypeLower === 'video' ? 'Open URL' : 'Download'}
                            {fileTypeLower === 'link' || fileTypeLower === 'external resource' || fileTypeLower === 'external link' || fileTypeLower === 'video' ? (
                              <ExternalLink className="h-3.5 w-3.5 animate-pulse-slow" />
                            ) : (
                              <Download className="h-3.5 w-3.5 animate-pulse-slow" />
                            )}
                          </>
                        )}
                      </button>
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </PageWrapper>
    );
  }

  // --- Step 1: Course List View ---
  return (
    <PageWrapper className="flex-1 flex flex-col gap-6">
      <PageHeader
        title="My Course Materials"
        subtitle="Access all learning assets, document slides, files, and lectures associated with your active academic cohorts."
        icon={BookOpen}
        iconColor="text-gold"
        breadcrumbRoot="Student Portal"
        breadcrumbRootPath="/student"
      />

      {/* Course search bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search enrolled course..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-white/5 bg-slate-950/60 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-gold/50 text-sm transition-all"
          />
        </div>
        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
          Enrolled Cohorts: {courses.length}
        </span>
      </div>

      {/* Section 5: Empty states - student has no enrolled course */}
      {courses.length === 0 ? (
        <GlassCard className="flex flex-col items-center justify-center p-16 text-center text-slate-400 border border-white/5 rounded-2xl">
          <Lock className="h-12 w-12 text-slate-600 mb-4 animate-pulse-slow" />
          <p className="text-base font-semibold text-slate-300">No active course enrollments found.</p>
          <p className="text-xs text-slate-500 mt-1">
            Please coordinate with the admin desk to enroll in a batch and enable syllabus study packages.
          </p>
        </GlassCard>
      ) : filteredCourses.length === 0 ? (
        <GlassCard className="flex flex-col items-center justify-center p-16 text-center text-slate-400 border border-white/5 rounded-2xl">
          <HelpCircle className="h-12 w-12 text-slate-600 mb-4" />
          <p className="text-base font-semibold text-slate-300">No matching enrolled course found</p>
          <p className="text-xs text-slate-500 mt-1">Try double checking your spelling or filters.</p>
        </GlassCard>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch"
        >
          {filteredCourses.map((course, idx) => {
            const theme = getCourseTheme(course.name, idx);
            const { count, lastUpdated, progress } = getCourseDetails(course.id);

            return (
              <motion.div
                key={course.id}
                variants={itemVariants}
                className="h-full"
              >
                <GlassCard
                  onClick={() => handleSelectCourse(course)}
                  className={`bg-slate-950/40 border ${theme.glow} flex flex-col p-6 h-full relative cursor-pointer hover:scale-[1.02] active:scale-[0.99] transition-all duration-300 group rounded-2xl`}
                >
                  <div className="flex flex-col flex-grow">
                    <div className="flex justify-between items-start gap-3">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold font-display">
                        {course.code || 'STA-COHORT'}
                      </span>
                      <Badge color={progress === 100 ? 'success' : 'gold'} className="text-[8px] uppercase tracking-wider font-bold font-sans">
                        {progress === 100 ? 'Completed' : 'Active'}
                      </Badge>
                    </div>

                    <h3 className="text-base font-display font-extrabold text-white mt-1 group-hover:text-gold transition-colors tracking-tight">
                      {course.name}
                    </h3>
                    
                    {/* Materials info */}
                    <div className="flex items-center justify-between mt-6 border-t border-white/5 pt-4 text-xs font-sans">
                      <span className="text-[8px] uppercase font-bold text-slate-500 tracking-wider">Resources</span>
                      <span className="text-slate-300 font-medium">
                        {count === 1 ? '1 Resource' : `${count} Study Resources`}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar and View Materials button */}
                  <div className="mt-5 border-t border-white/5 pt-4">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1.5 font-sans">
                      <span>Course Progress</span>
                      <span className="font-semibold text-slate-200">{progress}% Completed</span>
                    </div>

                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 mb-4">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${theme.bar}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span className="flex items-center gap-1 font-sans">
                        <Clock className="h-3.5 w-3.5 text-slate-600 animate-pulse-slow" />
                        Updated: {lastUpdated}
                      </span>
                      
                      <div className="text-gold font-semibold flex items-center gap-1 text-[11px] group-hover:translate-x-1 transition-transform">
                        View Materials
                        <ArrowRight className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </PageWrapper>
  );
};

export default StudentMaterials;
