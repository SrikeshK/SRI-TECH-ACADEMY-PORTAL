import React, { useState } from 'react';
import { motion, Reorder } from 'framer-motion';
import { Plus, GripVertical, Edit2, Trash2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { CourseModule } from '../../../types';
import Button from '../../ui/Button';
import Modal from '../../ui/Modal';
import ModuleEditor from './ModuleEditor';

interface ModuleManagerProps {
  modules: CourseModule[];
  onUpdate: (modules: CourseModule[]) => void;
}

const ModuleManager: React.FC<ModuleManagerProps> = ({ modules, onUpdate }) => {
  // Add / Edit Modal states
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState<CourseModule | null>(null);

  // Delete Confirmation States
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [moduleToDelete, setModuleToDelete] = useState<CourseModule | null>(null);

  // Disable Confirmation States
  const [disableConfirmOpen, setDisableConfirmOpen] = useState(false);
  const [moduleToDisable, setModuleToDisable] = useState<CourseModule | null>(null);

  const handleOpenAdd = () => {
    setSelectedModule(null);
    setEditorOpen(true);
  };

  const handleOpenEdit = (module: CourseModule) => {
    setSelectedModule(module);
    setEditorOpen(true);
  };

  const handleSaveModule = (title: string, isActive: boolean) => {
    if (selectedModule) {
      // Edit existing
      const updated = modules.map((m) =>
        m.id === selectedModule.id ? { ...m, title, isActive } : m
      );
      onUpdate(updated);
    } else {
      // Create new
      const newModule: CourseModule = {
        id: `m-${Date.now()}`,
        title,
        order: modules.length + 1,
        isActive
      };
      onUpdate([...modules, newModule]);
    }
    setEditorOpen(false);
    setSelectedModule(null);
  };

  const handleOpenDelete = (module: CourseModule) => {
    setModuleToDelete(module);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (moduleToDelete) {
      const updated = modules
        .filter((m) => m.id !== moduleToDelete.id)
        .map((m, index) => ({ ...m, order: index + 1 }));
      onUpdate(updated);
    }
    setDeleteConfirmOpen(false);
    setModuleToDelete(null);
  };

  const handleToggleActive = (module: CourseModule) => {
    if (module.isActive) {
      // Disabling -> Ask confirmation
      setModuleToDisable(module);
      setDisableConfirmOpen(true);
    } else {
      // Enabling -> Enable directly
      const updated = modules.map((m) =>
        m.id === module.id ? { ...m, isActive: true } : m
      );
      onUpdate(updated);
    }
  };

  const handleConfirmDisable = () => {
    if (moduleToDisable) {
      const updated = modules.map((m) =>
        m.id === moduleToDisable.id ? { ...m, isActive: false } : m
      );
      onUpdate(updated);
    }
    setDisableConfirmOpen(false);
    setModuleToDisable(null);
  };

  const handleReorder = (newOrder: CourseModule[]) => {
    const updated = newOrder.map((m, index) => ({ ...m, order: index + 1 }));
    onUpdate(updated);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center mb-2">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-lg font-display font-bold text-white">Course Syllabus</h3>
          <p className="text-xs text-slate-400">Drag to reorder. Enable/disable or edit modules details.</p>
        </div>
        <Button
          variant="gold"
          size="sm"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={handleOpenAdd}
          className="font-semibold shadow-lg shadow-gold/10"
        >
          Add Module
        </Button>
      </div>

      <Reorder.Group axis="y" values={modules} onReorder={handleReorder} className="flex flex-col gap-3">
        {modules.map((module) => (
          <Reorder.Item
            key={module.id}
            value={module}
            className="group"
          >
            <div className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
              module.isActive
                ? 'bg-white/5 border-white/5 hover:border-gold/30'
                : 'bg-slate-900/40 border-white/5 opacity-60'
            }`}>
              {/* Drag Handle */}
              <div className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-gold transition-colors">
                <GripVertical className="h-5 w-5" />
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-gold font-mono text-xs font-bold w-6">{module.order}.</span>
                  <span className="text-slate-200 text-sm font-semibold">{module.title}</span>
                  {!module.isActive && (
                    <span className="text-[9px] uppercase tracking-wider font-bold bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                      Disabled
                    </span>
                  )}
                </div>
              </div>

              {/* Module Actions */}
              <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleOpenEdit(module)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-gold hover:bg-white/5 transition-all"
                  title="Edit Module"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleToggleActive(module)}
                  className={`p-1.5 rounded-lg transition-all ${
                    module.isActive ? 'text-emerald-400 hover:bg-emerald-400/10' : 'text-slate-500 hover:bg-white/5'
                  }`}
                  title={module.isActive ? 'Disable Module' : 'Enable Module'}
                >
                  {module.isActive ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => handleOpenDelete(module)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/5 transition-all"
                  title="Delete Module"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </Reorder.Item>
        ))}
      </Reorder.Group>

      {modules.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-white/5 rounded-2xl">
          <p className="text-slate-500 text-sm italic">No modules added yet. Start by adding your first module.</p>
        </div>
      )}

      {/* Module Editor Modal */}
      <Modal
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={selectedModule ? 'Edit Syllabus Module' : 'Add Syllabus Module'}
        size="md"
      >
        <ModuleEditor
          module={selectedModule}
          onSave={handleSaveModule}
          onCancel={() => setEditorOpen(false)}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Delete Syllabus Module"
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 text-rose-400 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span className="text-xs font-semibold">Warning: This action cannot be undone.</span>
          </div>
          <p className="text-sm text-slate-300">
            Are you sure you want to delete the module <span className="font-semibold text-white">"{moduleToDelete?.title}"</span>? This will permanently remove it from the syllabus and clear any student completion progress for this module.
          </p>
          <div className="flex justify-end gap-3 mt-2">
            <Button variant="glass" size="sm" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="gold"
              size="sm"
              onClick={handleConfirmDelete}
              className="bg-rose-600 hover:bg-rose-700 text-white border-rose-700 font-semibold shadow-lg shadow-rose-600/10"
            >
              Delete Permanently
            </Button>
          </div>
        </div>
      </Modal>

      {/* Disable Confirmation Modal */}
      <Modal
        isOpen={disableConfirmOpen}
        onClose={() => setDisableConfirmOpen(false)}
        title="Disable Syllabus Module"
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 text-amber-400 bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span className="text-xs font-semibold">Notice: Module will be hidden from students.</span>
          </div>
          <p className="text-sm text-slate-300">
            Are you sure you want to disable <span className="font-semibold text-white">"{moduleToDisable?.title}"</span>? This will hide this module from the students and ignore it in course progress calculations.
          </p>
          <div className="flex justify-end gap-3 mt-2">
            <Button variant="glass" size="sm" onClick={() => setDisableConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="gold"
              size="sm"
              onClick={handleConfirmDisable}
              className="font-semibold"
            >
              Confirm Disable
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ModuleManager;
