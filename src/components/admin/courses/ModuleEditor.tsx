import React, { useState, useEffect } from 'react';
import { CourseModule } from '../../../types';
import Button from '../../ui/Button';

interface ModuleEditorProps {
  module: Partial<CourseModule> | null;
  onSave: (title: string, isActive: boolean) => void;
  onCancel: () => void;
}

export const ModuleEditor: React.FC<ModuleEditorProps> = ({ module, onSave, onCancel }) => {
  const [title, setTitle] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (module) {
      setTitle(module.title || '');
      setIsActive(module.isActive !== undefined ? module.isActive : true);
    } else {
      setTitle('');
      setIsActive(true);
    }
  }, [module]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave(title.trim(), isActive);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label className="text-xs uppercase font-bold text-slate-400 tracking-wider">
          Module Title
        </label>
        <input
          type="text"
          placeholder="Enter module title (e.g., Loops & Iteration)..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-gold/50 transition-all font-medium"
          required
          autoFocus
        />
      </div>

      <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold text-slate-200">Module Status</span>
          <span className="text-xs text-slate-400">Enable or disable this module in the student syllabus</span>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold peer-checked:after:bg-slate-950 peer-checked:after:border-gold"></div>
        </label>
      </div>

      <div className="flex gap-3 justify-end mt-2">
        <Button
          type="button"
          variant="glass"
          size="sm"
          onClick={onCancel}
          className="px-5 font-semibold"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="gold"
          size="sm"
          disabled={!title.trim()}
          className="px-5 font-semibold shadow-lg shadow-gold/20"
        >
          {module?.id ? 'Save Changes' : 'Create Module'}
        </Button>
      </div>
    </form>
  );
};

export default ModuleEditor;
