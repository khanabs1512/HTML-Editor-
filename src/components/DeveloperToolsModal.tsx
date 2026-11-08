import React, { useState } from 'react';
import { Project, ProjectFile } from '../types';
import { CODE_SNIPPETS, CodeSnippet } from '../services/snippets';
import { formatCode, minifyCode } from '../services/formatters';
import {
  X,
  Sparkles,
  FileCode,
  Minimize2,
  Code2,
  Search,
  Copy,
  Plus,
  Check,
  ArrowRight,
  Zap,
  AlignLeft
} from 'lucide-react';

interface DeveloperToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  activeFile: ProjectFile | null;
  onUpdateFileContent: (fileId: string, newContent: string) => void;
  onInsertSnippet: (code: string) => void;
  onSelectFile: (fileId: string) => void;
}

type ToolTab = 'snippets' | 'format' | 'minify' | 'search';

export const DeveloperToolsModal: React.FC<DeveloperToolsModalProps> = ({
  isOpen,
  onClose,
  project,
  activeFile,
  onUpdateFileContent,
  onInsertSnippet,
  onSelectFile,
}) => {
  const [activeTab, setActiveTab] = useState<ToolTab>('snippets');
  const [snippetCategory, setSnippetCategory] = useState<string>('All');
  const [searchProjectQuery, setSearchProjectQuery] = useState('');
  const [copiedSnippetId, setCopiedSnippetId] = useState<string | null>(null);
  const [formatSuccess, setFormatSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const categories = ['All', 'HTML', 'CSS', 'JavaScript', 'Web APIs'];

  const filteredSnippets = CODE_SNIPPETS.filter((s) => {
    if (snippetCategory !== 'All' && s.category !== snippetCategory) return false;
    return true;
  });

  const handleCopySnippet = (snippet: CodeSnippet) => {
    navigator.clipboard.writeText(snippet.code);
    setCopiedSnippetId(snippet.id);
    setTimeout(() => setCopiedSnippetId(null), 1500);
  };

  const handleInsert = (snippet: CodeSnippet) => {
    onInsertSnippet(snippet.code);
    onClose();
  };

  const handleFormatFile = (file: ProjectFile) => {
    const formatted = formatCode(file.content, file.type, 2);
    onUpdateFileContent(file.id, formatted);
    setFormatSuccess(`Formatted ${file.name}`);
    setTimeout(() => setFormatSuccess(null), 2000);
  };

  const handleMinifyFile = (file: ProjectFile) => {
    const minified = minifyCode(file.content, file.type);
    onUpdateFileContent(file.id, minified);
    setFormatSuccess(`Minified ${file.name}`);
    setTimeout(() => setFormatSuccess(null), 2000);
  };

  // Project search results
  const searchResults: Array<{ file: ProjectFile; line: number; text: string }> = [];
  if (searchProjectQuery.trim().length >= 2) {
    const q = searchProjectQuery.toLowerCase();
    for (const f of project.files) {
      if (f.isBinary) continue;
      const lines = f.content.split('\n');
      lines.forEach((line, idx) => {
        if (line.toLowerCase().includes(q)) {
          searchResults.push({
            file: f,
            line: idx + 1,
            text: line.trim(),
          });
        }
      });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-2xl max-h-[85vh] rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl flex flex-col text-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-tr from-sky-500 to-indigo-600 text-white rounded-xl shadow-md shadow-sky-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Developer Toolbox</h2>
              <p className="text-xs text-slate-400">Offline code formatters, snippets library, minifiers, and search</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-5 shrink-0 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('snippets')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'snippets'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>Code Snippets</span>
          </button>
          <button
            onClick={() => setActiveTab('format')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'format'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlignLeft className="w-4 h-4" />
            <span>Code Formatter</span>
          </button>
          <button
            onClick={() => setActiveTab('minify')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'minify'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Minimize2 className="w-4 h-4" />
            <span>Minifier</span>
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'search'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Project Search</span>
          </button>
        </div>

        {/* Status Toast */}
        {formatSuccess && (
          <div className="bg-emerald-500/15 border-b border-emerald-500/30 text-emerald-400 text-xs py-2 px-5 flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>{formatSuccess}</span>
          </div>
        )}

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* 1. Snippets Tab */}
          {activeTab === 'snippets' && (
            <div className="space-y-4">
              {/* Category pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSnippetCategory(cat)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                      snippetCategory === cat
                        ? 'bg-sky-600 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Snippet cards */}
              <div className="grid grid-cols-1 gap-3">
                {filteredSnippets.map((snippet) => (
                  <div
                    key={snippet.id}
                    className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-xs text-white">{snippet.title}</h4>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-sky-400 font-mono">
                            {snippet.category}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{snippet.description}</p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleCopySnippet(snippet)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                          title="Copy Code"
                        >
                          {copiedSnippetId === snippet.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        {activeFile && (
                          <button
                            onClick={() => handleInsert(snippet)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-sm transition"
                            title="Insert into current active file"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Insert</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Code Preview snippet */}
                    <pre className="mt-3 p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-24">
                      {snippet.code.slice(0, 160)}
                      {snippet.code.length > 160 ? '...' : ''}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. Formatter Tab */}
          {activeTab === 'format' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                Automatically clean indentation, fix spacing, and beautify your project code files 100% offline.
              </p>

              <div className="space-y-2">
                {project.files
                  .filter((f) => !f.isBinary)
                  .map((file) => (
                    <div
                      key={file.id}
                      className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2">
                        <FileCode className="w-4 h-4 text-sky-400" />
                        <span className="font-mono text-xs font-medium text-white">{file.name}</span>
                        <span className="text-[10px] text-slate-500 uppercase">({file.type})</span>
                      </div>
                      <button
                        onClick={() => handleFormatFile(file)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-sky-600 text-slate-200 hover:text-white text-xs font-medium transition"
                      >
                        Format Code
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* 3. Minifier Tab */}
          {activeTab === 'minify' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                Compress HTML, CSS, and JavaScript files to reduce bundle size for deployment.
              </p>

              <div className="space-y-2">
                {project.files
                  .filter((f) => !f.isBinary)
                  .map((file) => (
                    <div
                      key={file.id}
                      className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2">
                        <FileCode className="w-4 h-4 text-purple-400" />
                        <span className="font-mono text-xs font-medium text-white">{file.name}</span>
                        <span className="text-[10px] text-slate-500">
                          {((file.content?.length || 0) / 1024).toFixed(1)} KB
                        </span>
                      </div>
                      <button
                        onClick={() => handleMinifyFile(file)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-purple-600 text-slate-200 hover:text-white text-xs font-medium transition"
                      >
                        Minify File
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* 4. Project Search Tab */}
          {activeTab === 'search' && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search code across all project files..."
                  value={searchProjectQuery}
                  onChange={(e) => setSearchProjectQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              {searchProjectQuery.trim().length < 2 ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  Type at least 2 characters to search across all files in this project.
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  No matches found for &quot;{searchProjectQuery}&quot;.
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-xs text-slate-400">
                    Found {searchResults.length} match{searchResults.length === 1 ? '' : 'es'}:
                  </div>
                  {searchResults.map((res, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        onSelectFile(res.file.id);
                        onClose();
                      }}
                      className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-sky-500/50 cursor-pointer transition text-xs"
                    >
                      <div className="flex items-center justify-between text-slate-400 mb-1">
                        <span className="font-mono text-sky-400 font-semibold">{res.file.name}</span>
                        <span className="text-[10px]">Line {res.line}</span>
                      </div>
                      <div className="font-mono text-slate-200 truncate bg-slate-900 p-1.5 rounded">
                        {res.text}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end text-xs text-slate-400 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
