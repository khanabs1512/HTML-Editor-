import React, { useRef, useMemo, useState, useEffect } from 'react';
import CodeMirror, { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { xml } from '@codemirror/lang-xml';
import { oneDark } from '@codemirror/theme-one-dark';
import { dracula } from '@uiw/codemirror-theme-dracula';
import { githubLight } from '@uiw/codemirror-theme-github';
import { nord } from '@uiw/codemirror-theme-nord';
import { undo, redo } from '@codemirror/commands';

import { Project, ProjectFile, EditorSettings, EditorTheme, SaveStatus } from '../types/index';
import { MobileKeyboardToolbar } from './MobileKeyboardToolbar';
import {
  X,
  Code2,
  FileCode,
  FileJson,
  Image as ImageIcon,
  FileText,
  Copy,
  Sparkles,
  Search,
  Undo2,
  Redo2,
  Minus,
  Plus,
  Save,
  Replace,
  ChevronDown,
  ChevronUp,
  Check,
  CheckCircle2,
  AlertCircle,
  Loader2,
  HelpCircle,
  Hash,
  CornerDownRight,
  FilePlus,
  Upload
} from 'lucide-react';
import { formatCode } from '../services/formatters';

interface CodeEditorProps {
  project: Project;
  activeFile: ProjectFile | null;
  openFileIds: string[];
  settings: EditorSettings;
  saveStatus?: SaveStatus;
  lastSavedTime?: number;
  dirtyFileIds?: Set<string>;
  onChangeContent: (content: string) => void;
  onSelectFile: (fileId: string) => void;
  onCloseTab: (fileId: string) => void;
  onUpdateSettings: (settings: Partial<EditorSettings>) => void;
  onManualSave?: () => void;
  isMobile?: boolean;
  onCreateFile?: () => void;
  onImportFiles?: () => void;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  project,
  activeFile,
  openFileIds,
  settings,
  saveStatus = 'saved',
  lastSavedTime,
  dirtyFileIds = new Set(),
  onChangeContent,
  onSelectFile,
  onCloseTab,
  onUpdateSettings,
  onManualSave,
  isMobile = false,
  onCreateFile,
  onImportFiles,
}) => {
  const editorRef = useRef<ReactCodeMirrorRef>(null);

  // In-editor Find & Replace bar state
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [matchCount, setMatchCount] = useState<number>(0);
  const [activeMatchIndex, setActiveMatchIndex] = useState<number>(0);

  // Go to Line state
  const [showGoToLine, setShowGoToLine] = useState(false);
  const [targetLineInput, setTargetLineInput] = useState('');

  // Keyboard Shortcuts cheat sheet
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Determine language extension
  const languageExtension = useMemo(() => {
    if (!activeFile) return [];
    switch (activeFile.type) {
      case 'html':
        return [html()];
      case 'css':
        return [css()];
      case 'javascript':
        return [javascript({ jsx: true, typescript: true })];
      case 'json':
        return [json()];
      case 'xml':
      case 'svg':
        return [xml()];
      case 'markdown':
        return [markdown()];
      default:
        return [];
    }
  }, [activeFile?.type]);

  // Determine theme extension
  const themeExtension = useMemo(() => {
    switch (settings.theme) {
      case 'dracula':
        return dracula;
      case 'nord':
        return nord;
      case 'github-light':
        return githubLight;
      case 'vs-dark':
      case 'one-dark':
      default:
        return oneDark;
    }
  }, [settings.theme]);

  // Insert text at cursor (for mobile toolbar and snippets)
  const handleInsertText = (text: string) => {
    const view = editorRef.current?.view;
    if (!view) return;

    const { from, to } = view.state.selection.main;
    view.dispatch({
      changes: { from, to, insert: text },
      selection: { anchor: from + text.length },
    });
    view.focus();
  };

  const handleUndo = () => {
    const view = editorRef.current?.view;
    if (view) undo(view);
  };

  const handleRedo = () => {
    const view = editorRef.current?.view;
    if (view) redo(view);
  };

  const handleIndent = () => {
    handleInsertText(' '.repeat(settings.tabSize || 2));
  };

  const handleFormatCurrentFile = () => {
    if (!activeFile || activeFile.isBinary) return;
    const formatted = formatCode(activeFile.content, activeFile.type, settings.tabSize);
    onChangeContent(formatted);
  };

  // Jump to specific line number
  const handleJumpToLine = (e: React.FormEvent) => {
    e.preventDefault();
    const lineNum = parseInt(targetLineInput);
    if (!lineNum || isNaN(lineNum) || !editorRef.current?.view) return;

    const view = editorRef.current.view;
    const totalLines = view.state.doc.lines;
    const safeLine = Math.max(1, Math.min(lineNum, totalLines));
    const lineObj = view.state.doc.line(safeLine);

    view.dispatch({
      selection: { anchor: lineObj.from },
      scrollIntoView: true,
    });
    view.focus();
    setShowGoToLine(false);
    setTargetLineInput('');
  };

  // Find & Replace actions using text searches
  const handleFindNext = (direction: 'next' | 'prev' = 'next') => {
    if (!findQuery || !activeFile) return;
    const content = activeFile.content;
    const flags = caseSensitive ? 'g' : 'gi';
    const escaped = findQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, flags);
    const matches: number[] = [];
    let m;
    while ((m = regex.exec(content)) !== null) {
      matches.push(m.index);
    }

    setMatchCount(matches.length);
    if (matches.length === 0) return;

    const view = editorRef.current?.view;
    if (!view) return;

    const currentPos = view.state.selection.main.from;
    let targetIndex = 0;

    if (direction === 'next') {
      const nextMatch = matches.find((pos) => pos > currentPos);
      targetIndex = nextMatch !== undefined ? matches.indexOf(nextMatch) : 0;
    } else {
      const prevMatches = matches.filter((pos) => pos < currentPos);
      targetIndex = prevMatches.length > 0 ? matches.indexOf(prevMatches[prevMatches.length - 1]) : matches.length - 1;
    }

    setActiveMatchIndex(targetIndex + 1);
    const matchPos = matches[targetIndex];

    view.dispatch({
      selection: { anchor: matchPos, head: matchPos + findQuery.length },
      scrollIntoView: true,
    });
    view.focus();
  };

  const handleReplaceOne = () => {
    if (!findQuery || !activeFile) return;
    const view = editorRef.current?.view;
    if (!view) return;

    const { from, to } = view.state.selection.main;
    const selectedText = view.state.sliceDoc(from, to);

    const matches = caseSensitive ? selectedText === findQuery : selectedText.toLowerCase() === findQuery.toLowerCase();

    if (matches) {
      view.dispatch({
        changes: { from, to, insert: replaceQuery },
        selection: { anchor: from + replaceQuery.length },
      });
      handleFindNext('next');
    } else {
      handleFindNext('next');
    }
  };

  const handleReplaceAll = () => {
    if (!findQuery || !activeFile) return;
    const content = activeFile.content;
    const flags = caseSensitive ? 'g' : 'gi';
    const escaped = findQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, flags);

    const newContent = content.replace(regex, replaceQuery);
    onChangeContent(newContent);
    setMatchCount(0);
    setActiveMatchIndex(0);
  };

  // Keyboard shortcut listener for Ctrl+F, Ctrl+H, Ctrl+G, Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;
      if (isMod && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setShowFindReplace(true);
      } else if (isMod && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        setShowFindReplace(true);
      } else if (isMod && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        setShowGoToLine(true);
      } else if (isMod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (onManualSave) onManualSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onManualSave]);

  // If active file is an image
  if (activeFile?.isBinary) {
    return (
      <div className="flex flex-col h-full bg-slate-950 text-slate-300">
        <TabBar
          project={project}
          openFileIds={openFileIds}
          activeFileId={activeFile.id}
          dirtyFileIds={dirtyFileIds}
          onSelectFile={onSelectFile}
          onCloseTab={onCloseTab}
        />

        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-950/80">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full shadow-2xl flex flex-col items-center">
            <div className="p-2 bg-slate-950 rounded-xl border border-slate-800 max-h-64 flex items-center justify-center overflow-hidden mb-4">
              <img
                src={activeFile.dataUri}
                alt={activeFile.name}
                className="max-h-60 max-w-full object-contain rounded"
              />
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-white text-sm">{activeFile.name}</h3>
              <p className="text-xs text-slate-500 mt-1 font-mono">{activeFile.path}</p>
            </div>
            <div className="mt-4 flex gap-2 w-full">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`<img src="${activeFile.path}" alt="${activeFile.name}">`);
                }}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy &lt;img&gt; Tag</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-200 select-none overflow-hidden relative">
      {/* File Tabs Bar with Unsaved Dirty Indicators & Safe Close Confirmation */}
      <TabBar
        project={project}
        openFileIds={openFileIds}
        activeFileId={activeFile?.id || ''}
        dirtyFileIds={dirtyFileIds}
        onSelectFile={onSelectFile}
        onCloseTab={onCloseTab}
      />

      {/* Editor Sub-toolbar with Functional Buttons */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-xs shrink-0 gap-2">
        {/* Left: Active file path & Save Status */}
        <div className="flex items-center gap-2 text-slate-400 min-w-0">
          <span className="font-mono text-[11px] text-sky-400 font-medium truncate max-w-[140px] sm:max-w-xs">
            {activeFile?.path || 'No file selected'}
          </span>

          {/* Real-time Save Status Indicator */}
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-sans font-medium shrink-0">
            {saveStatus === 'saving' && (
              <span className="flex items-center gap-1 text-sky-400">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Saving...</span>
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="flex items-center gap-1 text-emerald-400">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>Saved</span>
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="flex items-center gap-1 text-rose-400">
                <AlertCircle className="w-3 h-3 text-rose-400" />
                <span>Save Error</span>
              </span>
            )}
          </div>
        </div>

        {/* Right: Functional Editor Actions */}
        <div className="flex items-center gap-1">
          {/* Manual Save Button */}
          {onManualSave && (
            <button
              onClick={onManualSave}
              className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 active:bg-sky-600 text-slate-200 text-[11px] font-medium border border-slate-700 transition"
              title="Save Changes (Ctrl+S / Cmd+S)"
            >
              <Save className="w-3 h-3 text-sky-400" />
              <span className="hidden md:inline">Save</span>
            </button>
          )}

          {/* Undo / Redo */}
          <button
            onClick={handleUndo}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleRedo}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>

          {/* Find & Replace Toggle */}
          <button
            onClick={() => setShowFindReplace(!showFindReplace)}
            className={`p-1 rounded border transition ${
              showFindReplace
                ? 'bg-sky-600 text-white border-sky-500'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="Find and Replace (Ctrl+F)"
          >
            <Search className="w-3.5 h-3.5" />
          </button>

          {/* Go to Line Button */}
          <button
            onClick={() => setShowGoToLine(true)}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
            title="Go to Line (Ctrl+G)"
          >
            <Hash className="w-3.5 h-3.5" />
          </button>

          {/* Font size adjustment */}
          <div className="hidden sm:flex items-center bg-slate-800 rounded-lg border border-slate-700 text-slate-300 px-1">
            <button
              onClick={() => onUpdateSettings({ fontSize: Math.max(10, settings.fontSize - 1) })}
              className="p-1 hover:text-white"
              title="Decrease Font Size"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="text-[11px] font-mono px-1">{settings.fontSize}px</span>
            <button
              onClick={() => onUpdateSettings({ fontSize: Math.min(26, settings.fontSize + 1) })}
              className="p-1 hover:text-white"
              title="Increase Font Size"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          {/* Format button */}
          <button
            onClick={handleFormatCurrentFile}
            className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium border border-slate-700 transition"
            title="Auto Format Code"
          >
            <Sparkles className="w-3 h-3 text-sky-400" />
            <span className="hidden sm:inline">Format</span>
          </button>

          {/* Keyboard Shortcuts Help */}
          <button
            onClick={() => setShowShortcuts(true)}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition"
            title="Keyboard Shortcuts"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Find and Replace Panel */}
      {showFindReplace && (
        <div className="px-3 py-2 bg-slate-900 border-b border-slate-800 text-xs shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Find Input */}
          <div className="flex items-center gap-1 flex-1">
            <div className="relative flex-1">
              <input
                type="text"
                autoFocus
                placeholder="Find in file..."
                value={findQuery}
                onChange={(e) => {
                  setFindQuery(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleFindNext(e.shiftKey ? 'prev' : 'next');
                  if (e.key === 'Escape') setShowFindReplace(false);
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
              {matchCount > 0 && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400">
                  {activeMatchIndex || 1}/{matchCount}
                </span>
              )}
            </div>

            <button
              onClick={() => handleFindNext('prev')}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
              title="Previous Match (Shift+Enter)"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleFindNext('next')}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
              title="Next Match (Enter)"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCaseSensitive(!caseSensitive)}
              className={`px-1.5 py-1 rounded text-[10px] font-mono font-bold transition ${
                caseSensitive ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
              title="Match Case"
            >
              Aa
            </button>
          </div>

          {/* Replace Input & Buttons */}
          <div className="flex items-center gap-1 flex-1">
            <input
              type="text"
              placeholder="Replace with..."
              value={replaceQuery}
              onChange={(e) => setReplaceQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleReplaceOne();
                if (e.key === 'Escape') setShowFindReplace(false);
              }}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-md px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
            <button
              onClick={handleReplaceOne}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
              title="Replace current match"
            >
              Replace
            </button>
            <button
              onClick={handleReplaceAll}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
              title="Replace all matches"
            >
              All
            </button>
            <button
              onClick={() => setShowFindReplace(false)}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white ml-1"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Go To Line Modal */}
      {showGoToLine && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-30 bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-2xl w-64 animate-in fade-in zoom-in-95">
          <form onSubmit={handleJumpToLine} className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
              <span className="flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-sky-400" />
                Go to Line
              </span>
              <button
                type="button"
                onClick={() => setShowGoToLine(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <input
              type="number"
              min="1"
              autoFocus
              placeholder="Line number..."
              value={targetLineInput}
              onChange={(e) => setTargetLineInput(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
            />
            <div className="flex justify-end gap-1">
              <button
                type="submit"
                className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-medium"
              >
                Jump
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Keyboard Shortcuts Dialog */}
      {showShortcuts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl text-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-sky-400" />
                Keyboard Shortcuts
              </span>
              <button onClick={() => setShowShortcuts(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-3 space-y-2 text-xs divide-y divide-slate-800">
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Save File</span>
                <kbd className="bg-slate-800 px-2 py-0.5 rounded font-mono text-[11px] text-sky-400">Ctrl + S</kbd>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Find in File</span>
                <kbd className="bg-slate-800 px-2 py-0.5 rounded font-mono text-[11px] text-sky-400">Ctrl + F</kbd>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Replace in File</span>
                <kbd className="bg-slate-800 px-2 py-0.5 rounded font-mono text-[11px] text-sky-400">Ctrl + H</kbd>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Go to Line</span>
                <kbd className="bg-slate-800 px-2 py-0.5 rounded font-mono text-[11px] text-sky-400">Ctrl + G</kbd>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Undo</span>
                <kbd className="bg-slate-800 px-2 py-0.5 rounded font-mono text-[11px] text-sky-400">Ctrl + Z</kbd>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Redo</span>
                <kbd className="bg-slate-800 px-2 py-0.5 rounded font-mono text-[11px] text-sky-400">Ctrl + Y</kbd>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Indent Line</span>
                <kbd className="bg-slate-800 px-2 py-0.5 rounded font-mono text-[11px] text-sky-400">Tab</kbd>
              </div>
            </div>
            <button
              onClick={() => setShowShortcuts(false)}
              className="mt-4 w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* CodeMirror Workspace */}
      <div className="flex-1 w-full h-full min-h-0 overflow-hidden relative">
        {activeFile ? (
          <CodeMirror
            ref={editorRef}
            value={activeFile.content}
            height="100%"
            theme={themeExtension}
            extensions={languageExtension}
            onChange={(val) => onChangeContent(val)}
            basicSetup={{
              lineNumbers: settings.lineNumbers,
              foldGutter: settings.foldGutter,
              autocompletion: true,
              closeBrackets: settings.autoCloseBrackets,
              bracketMatching: true,
              highlightActiveLine: true,
              indentOnInput: true,
              tabSize: settings.tabSize,
            }}
            style={{
              fontSize: `${settings.fontSize}px`,
              height: '100%',
            }}
          />
        ) : project.files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 p-6 text-center max-w-sm mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-sky-400 mb-4 shadow-lg">
              <Code2 className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-base text-white mb-1">No Files in Project</h3>
            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              All files in this project have been removed. Create a new file or import HTML and website files to resume editing.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              {onCreateFile && (
                <button
                  onClick={onCreateFile}
                  data-testid="editor-empty-create-file-btn"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold shadow-md transition flex items-center gap-1.5"
                >
                  <FilePlus className="w-4 h-4" />
                  <span>Create File</span>
                </button>
              )}
              {onImportFiles && (
                <button
                  onClick={onImportFiles}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
                >
                  <Upload className="w-4 h-4 text-sky-400" />
                  <span>Import Files</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <Code2 className="w-12 h-12 mb-3 text-slate-600" />
            <p className="text-sm font-medium text-slate-400">Select a file from the explorer to start editing</p>
            <p className="text-xs text-slate-500 mt-1">Or click an open tab above to switch views</p>
          </div>
        )}
      </div>

      {/* Mobile Keyboard Toolbar */}
      {isMobile && activeFile && (
        <MobileKeyboardToolbar
          onInsertText={handleInsertText}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onIndent={handleIndent}
          onOutdent={() => {}}
        />
      )}
    </div>
  );
};

interface TabBarProps {
  project: Project;
  openFileIds: string[];
  activeFileId: string;
  dirtyFileIds?: Set<string>;
  onSelectFile: (fileId: string) => void;
  onCloseTab: (fileId: string) => void;
}

const TabBar: React.FC<TabBarProps> = ({
  project,
  openFileIds,
  activeFileId,
  dirtyFileIds = new Set(),
  onSelectFile,
  onCloseTab,
}) => {
  const openFiles = openFileIds
    .map((id) => project.files.find((f) => f.id === id))
    .filter(Boolean) as ProjectFile[];

  const handleTabClose = (e: React.MouseEvent, file: ProjectFile) => {
    e.stopPropagation();
    if (dirtyFileIds.has(file.id)) {
      const confirmClose = window.confirm(`File "${file.name}" has unsaved changes. Close tab anyway?`);
      if (!confirmClose) return;
    }
    onCloseTab(file.id);
  };

  return (
    <div className="flex items-center overflow-x-auto bg-slate-900 border-b border-slate-800 scrollbar-none shrink-0">
      {openFiles.map((file) => {
        const isActive = file.id === activeFileId;
        const isDirty = dirtyFileIds.has(file.id);

        return (
          <div
            key={file.id}
            onClick={() => onSelectFile(file.id)}
            className={`group flex items-center gap-2 px-3 py-2 text-xs border-r border-slate-800/80 cursor-pointer font-mono whitespace-nowrap transition-colors ${
              isActive
                ? 'bg-slate-950 text-sky-400 font-medium border-t-2 border-t-sky-500'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            {getTabIcon(file.type)}
            <span>{file.name}</span>

            {/* Unsaved dirty dot indicator */}
            {isDirty && (
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" title="Unsaved changes" />
            )}

            <button
              onClick={(e) => handleTabClose(e, file)}
              className="p-0.5 rounded hover:bg-slate-800 text-slate-500 hover:text-slate-200 transition opacity-60 group-hover:opacity-100 ml-1"
              title="Close Tab"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

function getTabIcon(type: string) {
  switch (type) {
    case 'html': return <Code2 className="w-3.5 h-3.5 text-orange-400" />;
    case 'css': return <FileCode className="w-3.5 h-3.5 text-sky-400" />;
    case 'javascript': return <FileCode className="w-3.5 h-3.5 text-yellow-400" />;
    case 'json': return <FileJson className="w-3.5 h-3.5 text-emerald-400" />;
    case 'image': return <ImageIcon className="w-3.5 h-3.5 text-purple-400" />;
    default: return <FileText className="w-3.5 h-3.5 text-slate-400" />;
  }
}
