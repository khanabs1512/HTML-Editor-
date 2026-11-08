import React, { useState, useRef } from 'react';
import { Project, ProjectFile } from '../types';
import { exportProjectAsZip, importZipFile } from '../services/zipService';
import { dbService } from '../services/db';
import {
  X,
  Plus,
  FolderOpen,
  Download,
  Upload,
  Copy,
  Trash2,
  Edit2,
  Check,
  Calendar,
  Layers,
  Sparkles,
  Database,
  ArrowRight
} from 'lucide-react';

interface ProjectManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  activeProjectId: string;
  onSelectProject: (projectId: string) => void;
  onCreateProject: (name: string, templateType?: string) => void;
  onDeleteProject: (projectId: string) => void;
  onRenameProject: (projectId: string, newName: string) => void;
  onDuplicateProject: (projectId: string) => void;
  onImportComplete: () => void;
  onOpenImportModal?: () => void;
}

const TEMPLATES = [
  {
    id: 'blank',
    name: 'Blank HTML5 Project',
    desc: 'Clean starting point with index.html, style.css, and app.js.',
    icon: '📄',
  },
  {
    id: 'canvas',
    name: 'Interactive Canvas FX',
    desc: 'HTML5 60FPS particle physics simulation with touch interaction.',
    icon: '✨',
  },
  {
    id: 'synth',
    name: 'Web Audio Synthesizer',
    desc: 'Real-time synthesizer keyboard with oscillator & filter waveforms.',
    icon: '🎹',
  },
  {
    id: 'portfolio',
    name: 'Glassmorphism Portfolio',
    desc: 'Modern responsive personal landing page with dark glass styling.',
    icon: '💎',
  },
];

export const ProjectManagerModal: React.FC<ProjectManagerModalProps> = ({
  isOpen,
  onClose,
  projects,
  activeProjectId,
  onSelectProject,
  onCreateProject,
  onDeleteProject,
  onRenameProject,
  onDuplicateProject,
  onImportComplete,
  onOpenImportModal,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('blank');
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const zipInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    onCreateProject(newProjectName.trim(), selectedTemplate);
    setNewProjectName('');
    setIsCreating(false);
  };

  const handleStartRename = (proj: Project) => {
    setEditingProjectId(proj.id);
    setEditingName(proj.name);
  };

  const handleSaveRename = (projectId: string) => {
    if (editingName.trim()) {
      onRenameProject(projectId, editingName.trim());
    }
    setEditingProjectId(null);
  };

  const handleZipImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const { name, files, folders } = await importZipFile(e.target.files[0]);
        const newProj: Project = {
          id: 'proj-' + Math.random().toString(36).substring(2, 9),
          name: name,
          description: `Imported from ${e.target.files[0].name}`,
          files: files,
          folders: folders,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          tags: ['Imported', 'ZIP'],
        };
        await dbService.saveProject(newProj);
        onImportComplete();
        onSelectProject(newProj.id);
      } catch (err: any) {
        alert('ZIP Import Error: ' + (err.message || err));
      } finally {
        e.target.value = '';
      }
    }
  };

  const handleExportBackup = async () => {
    const backupJson = await dbService.exportAllData();
    const blob = new Blob([backupJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `codestudio-workspace-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 300);
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const text = await e.target.files[0].text();
        const confirmed = window.confirm(
          'Restore Backup:\nClick OK to MERGE backup projects with existing workspace projects safely.\nClick Cancel to abort.'
        );
        if (!confirmed) return;

        const res = await dbService.importAllData(text, 'merge');
        alert(`Restore Complete: ${res.importedCount} new projects imported, ${res.mergedCount} conflicting projects merged safely.`);
        onImportComplete();
      } catch (err: any) {
        alert('Backup Restore Error: ' + (err.message || err));
      } finally {
        e.target.value = '';
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-2xl max-h-[85vh] rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl flex flex-col text-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-sky-500/15 text-sky-400 rounded-xl">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Project Manager</h2>
              <p className="text-xs text-slate-400">Manage offline projects stored safely in your device browser</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hidden File Inputs */}
        <input type="file" ref={zipInputRef} accept=".zip" onChange={handleZipImport} className="hidden" />
        <input type="file" ref={backupInputRef} accept=".json" onChange={handleImportBackup} className="hidden" />

        {/* Action Bar */}
        <div className="px-5 py-3 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-lg shadow-sky-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </button>

          <div className="flex items-center gap-2">
            {onOpenImportModal && (
              <button
                onClick={() => {
                  onClose();
                  onOpenImportModal();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 text-xs font-medium border border-sky-500/30 transition"
                title="Import HTML file, website folder, or ZIP archive"
              >
                <Upload className="w-3.5 h-3.5 text-sky-400" />
                <span>Import Files</span>
              </button>
            )}
            <button
              onClick={() => zipInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
              title="Import an existing project from a ZIP archive"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import ZIP</span>
            </button>
            <button
              onClick={handleExportBackup}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
              title="Download full workspace backup as JSON"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Backup All</span>
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Create Project Panel */}
          {isCreating && (
            <form onSubmit={handleCreateSubmit} className="mb-6 p-4 rounded-xl bg-slate-950 border border-sky-500/40 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-sky-400" />
                  Create New Project
                </h3>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Project Name</label>
                <input
                  type="text"
                  autoFocus
                  required
                  placeholder="e.g. My Awesome Website"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">Select Template</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {TEMPLATES.map((tmpl) => (
                    <div
                      key={tmpl.id}
                      onClick={() => setSelectedTemplate(tmpl.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition ${
                        selectedTemplate === tmpl.id
                          ? 'bg-sky-600/15 border-sky-500 text-white'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{tmpl.icon}</span>
                        <div className="font-semibold text-xs">{tmpl.name}</div>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">{tmpl.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-md"
                >
                  Create Project
                </button>
              </div>
            </form>
          )}

          {/* Project List */}
          <div className="space-y-2.5">
            {projects.map((proj) => {
              const isActive = proj.id === activeProjectId;
              const isEditing = editingProjectId === proj.id;
              const dateStr = new Date(proj.updatedAt).toLocaleDateString([], {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });

              return (
                <div
                  key={proj.id}
                  className={`p-3.5 rounded-xl border transition flex items-center justify-between gap-3 ${
                    isActive
                      ? 'bg-slate-800/80 border-sky-500/50 shadow-md'
                      : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/40'
                  }`}
                >
                  {/* Left info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="bg-slate-900 border border-sky-500 px-2 py-0.5 rounded text-xs text-white"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveRename(proj.id)}
                            className="p-1 text-emerald-400 hover:bg-slate-800 rounded"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <h4
                          onClick={() => {
                            onSelectProject(proj.id);
                            onClose();
                          }}
                          className="font-bold text-xs sm:text-sm text-white hover:text-sky-400 cursor-pointer truncate"
                        >
                          {proj.name}
                        </h4>
                      )}

                      {isActive && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-sky-500/20 text-sky-400 font-semibold border border-sky-500/30">
                          Active
                        </span>
                      )}
                    </div>

                    {proj.description && (
                      <p className="text-xs text-slate-400 mt-0.5 truncate">{proj.description}</p>
                    )}

                    <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1.5 font-mono">
                      <span className="flex items-center gap-1">
                        <Layers className="w-3 h-3 text-slate-400" />
                        {proj.files.length} file{proj.files.length === 1 ? '' : 's'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {dateStr}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {!isActive && (
                      <button
                        onClick={() => {
                          onSelectProject(proj.id);
                          onClose();
                        }}
                        className="px-2.5 py-1 rounded-lg bg-sky-600/20 text-sky-400 hover:bg-sky-600 hover:text-white text-xs font-medium transition"
                      >
                        Open
                      </button>
                    )}

                    <button
                      onClick={() => handleStartRename(proj)}
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                      title="Rename"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => onDuplicateProject(proj.id)}
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                      title="Duplicate"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => exportProjectAsZip(proj)}
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                      title="Export as ZIP"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete "${proj.name}"?`)) {
                          onDeleteProject(proj.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                      title="Delete Project"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div>
            Total Projects: <span className="font-semibold text-slate-200">{projects.length}</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
