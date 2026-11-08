import React from 'react';
import { Undo2, Redo2, Indent, Outdent, Code, Hash, CornerDownLeft } from 'lucide-react';

interface MobileKeyboardToolbarProps {
  onInsertText: (text: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onIndent: () => void;
  onOutdent: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

const QUICK_KEYS = [
  '<', '>', '/', '=', '"', "'", '{', '}', '(', ')', '[', ']', ';', ':', '.', '$', '_', '+', '-', '*', '!', '?', '&', '|'
];

export const MobileKeyboardToolbar: React.FC<MobileKeyboardToolbarProps> = ({
  onInsertText,
  onUndo,
  onRedo,
  onIndent,
  onOutdent,
  canUndo = true,
  canRedo = true,
}) => {
  return (
    <div className="flex items-center gap-1 overflow-x-auto px-2 py-1.5 bg-slate-900 border-t border-slate-800 text-slate-200 select-none scrollbar-none touch-pan-x z-20">
      {/* Action buttons */}
      <div className="flex items-center gap-1 border-r border-slate-700 pr-1.5 shrink-0">
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          className="p-1.5 rounded-md hover:bg-slate-800 active:bg-slate-700 disabled:opacity-30 text-slate-300"
          title="Undo"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          className="p-1.5 rounded-md hover:bg-slate-800 active:bg-slate-700 disabled:opacity-30 text-slate-300"
          title="Redo"
        >
          <Redo2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onIndent}
          className="p-1.5 rounded-md hover:bg-slate-800 active:bg-slate-700 text-slate-300 font-mono text-xs font-semibold px-2"
          title="Tab / Indent"
        >
          Tab
        </button>
      </div>

      {/* Quick symbol keys */}
      <div className="flex items-center gap-1 shrink-0">
        {QUICK_KEYS.map((char) => (
          <button
            key={char}
            type="button"
            onClick={() => onInsertText(char)}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800/80 hover:bg-slate-700 active:bg-sky-600 active:text-white font-mono text-sm font-semibold text-slate-200 transition-colors shadow-sm"
          >
            {char}
          </button>
        ))}
      </div>

      {/* Tag wrappers */}
      <div className="flex items-center gap-1 border-l border-slate-700 pl-1.5 shrink-0">
        <button
          type="button"
          onClick={() => onInsertText('</>')}
          className="h-8 px-2 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-sky-600 font-mono text-xs text-sky-400"
          title="Insert </>"
        >
          &lt;/&gt;
        </button>
        <button
          type="button"
          onClick={() => onInsertText('<!--  -->')}
          className="h-8 px-2 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-sky-600 font-mono text-xs text-slate-400"
          title="Insert Comment"
        >
          &lt;!-- --&gt;
        </button>
      </div>
    </div>
  );
};
