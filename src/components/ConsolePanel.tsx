import React, { useState } from 'react';
import { ConsoleLogMessage } from '../types/index';
import {
  Trash2,
  Terminal,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  Search,
  ArrowRight,
  CornerDownLeft,
  Copy,
  Check,
  FileCode2
} from 'lucide-react';

interface ConsolePanelProps {
  logs: ConsoleLogMessage[];
  onClearLogs: () => void;
  onExecuteCode?: (code: string) => void;
  onSelectFileByPath?: (path: string, line?: number) => void;
}

export const ConsolePanel: React.FC<ConsolePanelProps> = ({
  logs,
  onClearLogs,
  onExecuteCode,
  onSelectFileByPath,
}) => {
  const [filter, setFilter] = useState<'all' | 'log' | 'info' | 'warn' | 'error'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [replInput, setReplInput] = useState('');
  const [copiedLogId, setCopiedLogId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const filteredLogs = logs.filter((log) => {
    if (filter !== 'all' && log.level !== filter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const content = log.args.join(' ').toLowerCase();
      return content.includes(q) || (log.source && log.source.toLowerCase().includes(q));
    }
    return true;
  });

  const errorCount = logs.filter((l) => l.level === 'error').length;
  const warnCount = logs.filter((l) => l.level === 'warn').length;

  const handleReplSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replInput.trim()) return;
    if (onExecuteCode) {
      onExecuteCode(replInput.trim());
    }
    setReplInput('');
  };

  const handleCopySingle = (log: ConsoleLogMessage) => {
    const text = log.args.join(' ') + (log.source ? ` (${log.source}:${log.line || 1})` : '');
    navigator.clipboard.writeText(text);
    setCopiedLogId(log.id);
    setTimeout(() => setCopiedLogId(null), 1500);
  };

  const handleCopyAll = () => {
    if (logs.length === 0) return;
    const allText = logs
      .map((l) => {
        const time = new Date(l.timestamp).toLocaleTimeString();
        const src = l.source ? ` [${l.source}:${l.line || 1}]` : '';
        return `[${time}] [${l.level.toUpperCase()}]${src} ${l.args.join(' ')}`;
      })
      .join('\n');
    navigator.clipboard.writeText(allText);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-200 font-mono text-xs select-text">
      {/* Console Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900 border-b border-slate-800 shrink-0 gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <div className="flex items-center gap-1 text-slate-300 font-semibold mr-2 font-sans text-xs shrink-0">
            <Terminal className="w-4 h-4 text-sky-400" />
            <span>Console</span>
          </div>

          {/* Level Filter Buttons */}
          <button
            onClick={() => setFilter('all')}
            className={`px-2 py-0.5 rounded text-[11px] font-sans font-medium transition ${
              filter === 'all' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({logs.length})
          </button>
          <button
            onClick={() => setFilter('error')}
            className={`px-2 py-0.5 rounded text-[11px] font-sans font-medium flex items-center gap-1 transition ${
              filter === 'error' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'text-slate-400 hover:text-rose-400'
            }`}
          >
            <AlertCircle className="w-3 h-3 text-rose-400" />
            Errors ({errorCount})
          </button>
          <button
            onClick={() => setFilter('warn')}
            className={`px-2 py-0.5 rounded text-[11px] font-sans font-medium flex items-center gap-1 transition ${
              filter === 'warn' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-slate-400 hover:text-amber-400'
            }`}
          >
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            Warnings ({warnCount})
          </button>
        </div>

        {/* Search, Copy All & Clear */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="relative hidden sm:block">
            <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Filter logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-md pl-6 pr-2 py-0.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 w-28 focus:w-40 transition-all"
            />
          </div>

          {/* Copy All Logs Button */}
          <button
            onClick={handleCopyAll}
            disabled={logs.length === 0}
            className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 hover:text-white transition text-[11px] font-sans"
            title="Copy all console logs to clipboard"
          >
            {copiedAll ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span className="hidden md:inline">{copiedAll ? 'Copied' : 'Copy All'}</span>
          </button>

          {/* Clear Console */}
          <button
            onClick={onClearLogs}
            className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition"
            title="Clear Console"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Log Output List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-1">
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-500 font-sans">
            <Terminal className="w-8 h-8 mb-2 opacity-40 text-slate-400" />
            <p className="text-xs">Console is clear. No log messages or errors recorded.</p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const time = new Date(log.timestamp).toLocaleTimeString([], {
              hour12: false,
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });

            const isError = log.level === 'error';
            const isWarn = log.level === 'warn';
            const isInfo = log.level === 'info';
            const isCopied = copiedLogId === log.id;

            return (
              <div
                key={log.id}
                className={`group py-1.5 px-2 flex items-start gap-2 hover:bg-slate-900/80 transition ${
                  isError
                    ? 'bg-rose-950/20 text-rose-300 border-l-2 border-rose-500'
                    : isWarn
                    ? 'bg-amber-950/20 text-amber-300 border-l-2 border-amber-500'
                    : 'text-slate-300'
                }`}
              >
                {/* Level Icon */}
                <div className="mt-0.5 shrink-0">
                  {isError && <AlertCircle className="w-3.5 h-3.5 text-rose-400" />}
                  {isWarn && <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
                  {isInfo && <Info className="w-3.5 h-3.5 text-sky-400" />}
                  {!isError && !isWarn && !isInfo && <ArrowRight className="w-3.5 h-3.5 text-slate-500" />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 break-words whitespace-pre-wrap leading-relaxed">
                  {log.args.map((arg, idx) => (
                    <span key={idx} className="mr-2">
                      {formatArg(arg)}
                    </span>
                  ))}
                  {log.source && (
                    <span
                      onClick={() => onSelectFileByPath && onSelectFileByPath(log.source || '', log.line)}
                      className="inline-flex items-center gap-1 text-[10px] text-sky-400 hover:text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 px-1.5 py-0.5 rounded font-mono ml-2 cursor-pointer transition"
                      title="Jump to source file"
                    >
                      <FileCode2 className="w-3 h-3" />
                      <span>{log.source}:{log.line || 1}</span>
                    </span>
                  )}
                </div>

                {/* Copy single message button */}
                <button
                  onClick={() => handleCopySingle(log)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition shrink-0"
                  title="Copy log text"
                >
                  {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>

                {/* Timestamp */}
                <div className="text-[10px] text-slate-600 shrink-0 font-sans mt-0.5">{time}</div>
              </div>
            );
          })
        )}
      </div>

      {/* Interactive JavaScript REPL Input */}
      {onExecuteCode && (
        <form
          onSubmit={handleReplSubmit}
          className="flex items-center gap-2 px-3 py-2 bg-slate-900 border-t border-slate-800 shrink-0"
        >
          <span className="text-sky-400 font-bold">&gt;</span>
          <input
            type="text"
            value={replInput}
            onChange={(e) => setReplInput(e.target.value)}
            placeholder="Evaluate JavaScript expression... (e.g. document.title, 2+2)"
            className="flex-1 bg-transparent text-slate-100 placeholder-slate-600 focus:outline-none text-xs"
          />
          <button
            type="submit"
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded text-[11px] font-sans flex items-center gap-1"
          >
            <CornerDownLeft className="w-3 h-3" />
            <span>Run</span>
          </button>
        </form>
      )}
    </div>
  );
};

function formatArg(arg: any): React.ReactNode {
  if (typeof arg === 'string') {
    return arg;
  }
  try {
    return JSON.stringify(arg, null, 2);
  } catch {
    return String(arg);
  }
}
