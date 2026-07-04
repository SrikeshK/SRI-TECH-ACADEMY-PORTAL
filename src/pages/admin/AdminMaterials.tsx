import React, { useEffect, useState } from 'react';
import { Material, Course } from '../../types';
import {
  createMaterial,
  updateMaterial,
  deleteMaterial,
  subscribeToMaterials,
  subscribeToAllCourses
} from '../../services';
import PageWrapper from '../../components/ui/PageWrapper';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Skeleton from '../../components/ui/Skeleton';
import PageHeader from '../../components/ui/PageHeader';
import { Toast, ToastType } from '../../components/ui/Toast';
import { useAuth } from '../../context/AuthContext';
import { 
  Plus, 
  Search, 
  FileText, 
  Link as LinkIcon, 
  Video, 
  Trash2, 
  ExternalLink,
  Presentation,
  Archive,
  Copy,
  Edit,
  Eye,
  Clock,
  User,
  File
} from 'lucide-react';

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

// Helper to detect Link Source from URL
const getLinkSource = (url: string): string => {
  if (!url) return 'Direct Link';
  const urlLower = url.toLowerCase();
  if (urlLower.includes('drive.google.com')) return 'Google Drive';
  if (urlLower.includes('github.com')) return 'GitHub';
  if (urlLower.includes('onedrive.live.com') || urlLower.includes('1drv.ms') || urlLower.includes('sharepoint.com')) return 'OneDrive';
  if (urlLower.includes('dropbox.com')) return 'Dropbox';
  return 'Direct Link';
};

// Helper to style Source label
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

export const AdminMaterials: React.FC = () => {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('All');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [viewingMaterial, setViewingMaterial] = useState<Material | null>(null);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formType, setFormType] = useState<'PDF' | 'PPT' | 'DOC' | 'DOCX' | 'ZIP' | 'Video' | 'External Resource' | 'Other'>('PDF');
  const [formUrl, setFormUrl] = useState('');
  const [formCourseId, setFormCourseId] = useState('');
  const [formModuleId, setFormModuleId] = useState('');
  const [formWriter, setFormWriter] = useState('');

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: ToastType; visible: boolean }>({
    message: '',
    type: 'success',
    visible: false
  });

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ message, type, visible: true });
  };

  useEffect(() => {
    // Realtime subscription to courses
    const unsubscribeCourses = subscribeToAllCourses((coursesData) => {
      setCourses(coursesData);
      if (coursesData.length > 0 && !formCourseId) {
        setFormCourseId(coursesData[0].id);
        const defaultModules = coursesData[0].modules || [];
        if (defaultModules.length > 0) {
          setFormModuleId(defaultModules[0].id);
        }
      }
    });

    // Realtime subscription to materials
    const unsubscribeMaterials = subscribeToMaterials((materialsData) => {
      setMaterials(materialsData);
      setLoading(false);
    });

    return () => {
      unsubscribeCourses();
      unsubscribeMaterials();
    };
  }, []);

  // When formCourseId changes in form, update formModuleId list and pick the first module as default
  const handleCourseChange = (courseId: string) => {
    setFormCourseId(courseId);
    const targetCourse = courses.find(c => c.id === courseId);
    if (targetCourse && targetCourse.modules && targetCourse.modules.length > 0) {
      setFormModuleId(targetCourse.modules[0].id);
    } else {
      setFormModuleId('');
    }
  };

  const openAddModal = () => {
    setEditingMaterial(null);
    setFormTitle('');
    setFormDesc('');
    setFormType('PDF');
    setFormUrl('');
    setFormWriter('');
    if (courses.length > 0) {
      const defaultCourse = courses[0];
      setFormCourseId(defaultCourse.id);
      if (defaultCourse.modules && defaultCourse.modules.length > 0) {
        setFormModuleId(defaultCourse.modules[0].id);
      } else {
        setFormModuleId('');
      }
    }
    setIsModalOpen(true);
  };

  const openEditModal = (mat: Material) => {
    setEditingMaterial(mat);
    setFormTitle(mat.title);
    setFormDesc(mat.description || '');
    setFormType((mat.type as any) || 'PDF');
    setFormUrl(mat.downloadUrl || mat.fileUrl || '');
    setFormCourseId(mat.courseId);
    setFormModuleId(mat.moduleId || '');
    setFormWriter(mat.uploadedBy || '');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setIsModalOpen(false);

    try {
      const processedUrl = convertGoogleDriveUrl(formUrl);

      if (editingMaterial) {
        // Edit mode
        const updatedFields: Partial<Material> = {
          title: formTitle,
          description: formDesc,
          courseId: formCourseId,
          moduleId: formModuleId,
          type: formType,
          downloadUrl: processedUrl,
          fileUrl: processedUrl, // backward compatibility
          fileType: formType.toLowerCase(), // backward compatibility
          status: editingMaterial.status || 'Active',
          uploadedBy: formWriter || editingMaterial.uploadedBy || user?.name || 'System Admin'
        };

        await updateMaterial(editingMaterial.id, updatedFields);
        showToast('Resource link updated successfully');
      } else {
        // Add mode
        const newMaterialData: Omit<Material, 'id'> = {
          title: formTitle,
          description: formDesc,
          courseId: formCourseId,
          moduleId: formModuleId,
          type: formType,
          downloadUrl: processedUrl,
          fileUrl: processedUrl, // backward compatibility
          fileType: formType.toLowerCase(), // backward compatibility
          uploadedBy: formWriter || user?.name || 'System Admin',
          status: 'Active'
        };

        await createMaterial(newMaterialData);
        showToast('New resource link added successfully');
      }
    } catch (err) {
      console.error('Error saving study material:', err);
      showToast('Failed to save study resource', 'error');
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this study resource? Students will no longer be able to download it.')) {
      setLoading(true);
      try {
        await deleteMaterial(id);
        showToast('Resource deleted successfully');
      } catch (err) {
        console.error('Error deleting material:', err);
        showToast('Failed to delete resource', 'error');
        setLoading(false);
      }
    }
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    showToast('Download link copied to clipboard!', 'success');
  };

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

  const getModuleTitle = (courseId: string, moduleId?: string) => {
    if (!moduleId) return 'General';
    const course = courses.find(c => c.id === courseId);
    const mod = course?.modules?.find(m => m.id === moduleId);
    return mod ? mod.title : 'General';
  };

  const formatDateStr = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const filteredMaterials = materials.filter(m => {
    const matchesSearch =
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesCourse = selectedCourseFilter === 'All' || m.courseId === selectedCourseFilter;
    
    return matchesSearch && matchesCourse;
  });

  const activeCourseForm = courses.find(c => c.id === formCourseId);
  const activeCourseFormModules = activeCourseForm?.modules || [];

  return (
    <PageWrapper className="flex-1 flex flex-col gap-6">
      <PageHeader
        title="Materials Refactor"
        subtitle="Manage resource downloadable links (Google Drive, GitHub, OneDrive) for enrolled cohorts."
        icon={FileText}
        iconColor="text-indigo-400"
        breadcrumbRoot="Admin Portal"
        breadcrumbRootPath="/admin"
        actions={
          <Button
            variant="gold"
            size="sm"
            onClick={openAddModal}
            leftIcon={<Plus className="h-4 w-4 mr-1.5" />}
            className="font-semibold"
          >
            Add Material
          </Button>
        }
      />
      
      {/* Search & filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search materials..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-white/5 bg-slate-950/60 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-gold/50 text-sm transition-all"
          />
        </div>

        <select
          value={selectedCourseFilter}
          onChange={e => setSelectedCourseFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-white/5 bg-slate-950/60 text-slate-300 text-xs focus:outline-none focus:border-gold/50 cursor-pointer"
        >
          <option value="All">All Courses</option>
          {courses.map(course => (
            <option key={course.id} value={course.id}>
              {course.code} - {course.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-6">
          <Skeleton variant="rectangular" className="h-48 w-full rounded-2xl" />
        </div>
      ) : filteredMaterials.length === 0 ? (
        <GlassCard className="flex flex-col items-center justify-center p-16 text-center text-slate-400">
          <FileText className="h-12 w-12 text-slate-600 mb-4 animate-pulse" />
          <p className="text-base font-semibold text-slate-300 font-display">No materials uploaded yet.</p>
          <p className="text-xs text-slate-500 mt-1">Add downloadable references, notes, or code packages above</p>
        </GlassCard>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto rounded-2xl border border-white/5 bg-slate-950/40 backdrop-blur-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-slate-900/40 text-slate-400 text-[10px] font-bold uppercase tracking-wider font-display">
                  <th className="px-6 py-4">Resource Info</th>
                  <th className="px-6 py-4">Course</th>
                  <th className="px-6 py-4">Module</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Source</th>
                  <th className="px-6 py-4">Uploaded</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300 text-xs">
                {filteredMaterials.map(mat => {
                  const assignedCourse = courses.find(c => c.id === mat.courseId);
                  const source = getLinkSource(mat.downloadUrl || mat.fileUrl || '');
                  const displayType = mat.type || mat.fileType || 'Link';
                  return (
                    <tr key={mat.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-white/5 border border-white/5 group-hover:scale-105 transition-transform">
                            {getMaterialIcon(displayType)}
                          </div>
                          <div>
                            <span className="font-semibold text-white block text-xs tracking-wide">{mat.title}</span>
                            <span className="text-[10px] text-slate-500 block line-clamp-1 max-w-xs">{mat.description || 'No description provided.'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-200">
                        {assignedCourse ? assignedCourse.name : 'General'}
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        {getModuleTitle(mat.courseId, mat.moduleId)}
                      </td>
                      <td className="px-6 py-4">
                        <Badge color="gold" className="text-[9px] uppercase font-bold px-2 py-0.5">
                          {displayType}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge color={getSourceBadgeColor(source)} className="text-[9px] uppercase font-bold px-2 py-0.5">
                          {source}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-slate-400 font-sans">
                        {formatDateStr(mat.createdAt || mat.uploadedAt || mat.uploadDate)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setViewingMaterial(mat)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 active:scale-95 transition-all"
                            title="View Metadata"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleCopyLink(mat.downloadUrl || mat.fileUrl || '')}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-gold hover:bg-white/5 active:scale-95 transition-all"
                            title="Copy Download URL"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          <a
                            href={mat.downloadUrl || mat.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-white/5 active:scale-95 transition-all"
                            title="Open Link"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                          <button
                            onClick={() => openEditModal(mat)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-white/5 active:scale-95 transition-all"
                            title="Edit Resource"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(mat.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/5 active:scale-95 transition-all"
                            title="Delete Resource"
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

          {/* Mobile Card Grid View */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:hidden gap-6">
            {filteredMaterials.map(mat => {
              const assignedCourse = courses.find(c => c.id === mat.courseId);
              const source = getLinkSource(mat.downloadUrl || mat.fileUrl || '');
              const displayType = mat.type || mat.fileType || 'Link';
              return (
                <GlassCard
                  key={mat.id}
                  className="bg-slate-950/40 border border-white/5 flex flex-col p-6 h-full relative group hover:border-gold/25 transition-all duration-300 rounded-2xl"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                      {getMaterialIcon(displayType)}
                    </div>
                    <div className="flex gap-1.5">
                      <Badge color="gold" className="text-[8px] uppercase tracking-wider font-semibold">
                        {displayType}
                      </Badge>
                      <Badge color={getSourceBadgeColor(source)} className="text-[8px] uppercase tracking-wider font-semibold">
                        {source}
                      </Badge>
                    </div>
                  </div>

                  <h3 className="text-sm font-display font-bold text-white tracking-wide truncate group-hover:text-gold transition-colors">
                    {mat.title}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-sans mt-2.5 leading-relaxed flex-grow line-clamp-2">
                    {mat.description || 'No description provided.'}
                  </p>

                  <div className="flex flex-col gap-2 border-t border-white/5 pt-4 mt-5">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-sans">
                      <span>Course: <span className="text-slate-300 font-medium">{assignedCourse ? assignedCourse.name : 'Unassigned'}</span></span>
                      <span>Module: <span className="text-slate-300 font-medium">{getModuleTitle(mat.courseId, mat.moduleId)}</span></span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-sans">
                      <span>Uploaded: <span className="text-slate-300 font-medium">{formatDateStr(mat.createdAt || mat.uploadedAt || mat.uploadDate)}</span></span>
                      {mat.uploadedBy && (
                        <span>By: <span className="text-slate-300 font-medium">{mat.uploadedBy}</span></span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 border-t border-white/5 pt-3.5 mt-3.5">
                    <button
                      onClick={() => setViewingMaterial(mat)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
                      title="View Metadata"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleCopyLink(mat.downloadUrl || mat.fileUrl || '')}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-gold hover:bg-white/5"
                      title="Copy Link"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <a
                      href={mat.downloadUrl || mat.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-white/5"
                      title="Open Resource URL"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    <button
                      onClick={() => openEditModal(mat)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-white/5"
                      title="Edit Material"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(mat.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/5"
                      title="Delete Material"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        </>
      )}

      {/* View Metadata Detail Modal */}
      <Modal
        isOpen={viewingMaterial !== null}
        onClose={() => setViewingMaterial(null)}
        title="Study Resource Details"
      >
        {viewingMaterial && (
          <div className="flex flex-col gap-4 font-sans text-xs text-slate-300 leading-relaxed">
            <div className="flex items-center gap-3 border-b border-white/5 pb-4">
              <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                {getMaterialIcon(viewingMaterial.type || viewingMaterial.fileType || '')}
              </div>
              <div>
                <h3 className="text-sm font-display font-bold text-white tracking-wide">{viewingMaterial.title}</h3>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                  {viewingMaterial.id}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-b border-white/5 pb-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">Course Cohort</span>
                <span className="text-white font-medium text-xs">
                  {courses.find(c => c.id === viewingMaterial.courseId)?.name || 'General'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">Syllabus Module</span>
                <span className="text-white font-medium text-xs">
                  {getModuleTitle(viewingMaterial.courseId, viewingMaterial.moduleId)}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">Resource Type</span>
                <Badge color="gold" className="text-[9px] uppercase font-bold mt-0.5">
                  {viewingMaterial.type || viewingMaterial.fileType}
                </Badge>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">Link Source</span>
                <Badge color={getSourceBadgeColor(getLinkSource(viewingMaterial.downloadUrl || viewingMaterial.fileUrl || ''))} className="text-[9px] uppercase font-bold mt-0.5">
                  {getLinkSource(viewingMaterial.downloadUrl || viewingMaterial.fileUrl || '')}
                </Badge>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">Uploaded On</span>
                <span className="text-slate-200 flex items-center gap-1 font-sans">
                  <Clock className="h-3.5 w-3.5 text-slate-600" />
                  {formatDateStr(viewingMaterial.createdAt || viewingMaterial.uploadedAt || viewingMaterial.uploadDate)}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">Uploader</span>
                <span className="text-slate-200 flex items-center gap-1">
                  <User className="h-3.5 w-3.5 text-slate-600" />
                  {viewingMaterial.uploadedBy || 'System Admin'}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1 border-b border-white/5 pb-4">
              <span className="text-[10px] uppercase font-bold text-slate-500">Resource Description</span>
              <p className="text-slate-400 font-sans">{viewingMaterial.description || 'No description provided.'}</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-500">Direct Download Link</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={viewingMaterial.downloadUrl || viewingMaterial.fileUrl || ''}
                  className="flex-1 bg-slate-900/60 border border-white/5 rounded-xl px-3 py-2 text-slate-400 text-xs focus:outline-none"
                />
                <Button
                  variant="glass"
                  size="sm"
                  onClick={() => handleCopyLink(viewingMaterial.downloadUrl || viewingMaterial.fileUrl || '')}
                  className="shrink-0"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <Button variant="glass" size="sm" onClick={() => setViewingMaterial(null)}>
                Close Details
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add / Edit Resource Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingMaterial ? "Edit Learning Resource" : "Add Learning Resource"}
      >
        <form onSubmit={handleSave} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 font-display">Material Title</label>
            <input
              type="text"
              required
              value={formTitle}
              onChange={e => setFormTitle(e.target.value)}
              placeholder="e.g. C Programming Cheat Sheet"
              className="glass-input px-4 py-2.5 rounded-xl text-slate-100 placeholder-slate-600 text-xs w-full"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 font-display">Description</label>
            <textarea
              rows={2}
              required
              value={formDesc}
              onChange={e => setFormDesc(e.target.value)}
              placeholder="Provide a quick overview of what the student is downloading..."
              className="glass-input px-4 py-2.5 rounded-xl text-slate-100 placeholder-slate-600 text-xs w-full resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400 font-display">Course</label>
              <select
                value={formCourseId}
                onChange={e => handleCourseChange(e.target.value)}
                className="glass-input px-3 py-2.5 rounded-xl text-slate-300 text-xs focus:outline-none focus:border-gold/50 cursor-pointer"
              >
                {courses.map(course => (
                  <option key={course.id} value={course.id}>
                    {course.code} - {course.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400 font-display">Module</label>
              <select
                value={formModuleId}
                onChange={e => setFormModuleId(e.target.value)}
                className="glass-input px-3 py-2.5 rounded-xl text-slate-300 text-xs focus:outline-none focus:border-gold/50 cursor-pointer"
              >
                {activeCourseFormModules.length === 0 ? (
                  <option value="">General / Introduction</option>
                ) : (
                  activeCourseFormModules.map(mod => (
                    <option key={mod.id} value={mod.id}>
                      {mod.title}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 font-display">Writer / Author</label>
            <input
              type="text"
              value={formWriter}
              onChange={e => setFormWriter(e.target.value)}
              placeholder="e.g. Dr. Srikanth Rao or leave blank for auto"
              className="glass-input px-4 py-2.5 rounded-xl text-slate-100 placeholder-slate-600 text-xs w-full"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 font-display">Material Type</label>
            <select
              value={formType}
              onChange={e => setFormType(e.target.value as any)}
              className="glass-input px-3 py-2.5 rounded-xl text-slate-300 text-xs focus:outline-none focus:border-gold/50 cursor-pointer"
            >
              <option value="PDF">PDF Document</option>
              <option value="PPT">PPT Presentation</option>
              <option value="DOC">Word Document (DOC)</option>
              <option value="DOCX">Word Document (DOCX)</option>
              <option value="ZIP">ZIP Archive</option>
              <option value="Video">Video Streaming URL</option>
              <option value="External Resource">External Resource / Repository</option>
              <option value="Other">Other Type</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-400 font-display">Resource Link</label>
              <span className="text-[10px] text-slate-500 font-sans">Google Drive, GitHub, OneDrive, Dropbox, direct PDFs</span>
            </div>
            <input
              type="url"
              required
              value={formUrl}
              onChange={e => setFormUrl(e.target.value)}
              placeholder="e.g. https://drive.google.com/file/d/FILE_ID/view"
              className="glass-input px-4 py-2.5 rounded-xl text-slate-100 placeholder-slate-600 text-xs w-full"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-white/5 pt-4 mt-2">
            <Button type="button" variant="glass" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="gold" size="sm" className="font-semibold">
              {editingMaterial ? "Save Changes" : "Save Resource"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Toast notifications feedback */}
      <Toast
        isVisible={toast.visible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, visible: false })}
      />
    </PageWrapper>
  );
};

export default AdminMaterials;
