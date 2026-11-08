import React, { useState, useRef, useEffect } from 'react';
import { Project, ViewportPreset, ConsoleLogMessage } from '../types';
import { buildPreviewHTML } from '../services/previewBundler';
import {
  RotateCw,
  Maximize2,
  Minimize2,
  Smartphone,
  Tablet,
  Monitor,
  Sparkles,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  ExternalLink,
  Terminal,
  AlertCircle
} from 'lucide-react';

interface LivePreviewProps {
  project: Project;
  activeHtmlPath?: string;
  isAutoRefresh?: boolean;
  onOpenConsole?: () => void;
  errorCount?: number;
  evalCodeTrigger?: { code: string; timestamp: number } | null;
  onConsoleMessage?: (msg: ConsoleLogMessage) => void;
}

interface ViewportPresetInfo {
  id: ViewportPreset;
  name: string;
  width: number;
  height: number;
  icon: React.ReactNode;
}

const VIEWPORT_PRESETS: ViewportPresetInfo[] = [
  { id: 'responsive', name: 'Fluid', width: 0, height: 0, icon: <Monitor className="w-3.5 h-3.5" /> },
  { id: 'iphone15', name: 'iPhone 15', width: 393, height: 852, icon: <Smartphone className="w-3.5 h-3.5" /> },
  { id: 'pixel8', name: 'Pixel 8', width: 412, height: 915, icon: <Smartphone className="w-3.5 h-3.5" /> },
  { id: 'ipad', name: 'iPad Mini', width: 768, height: 1024, icon: <Tablet className="w-3.5 h-3.5" /> },
  { id: 'desktop', name: 'Desktop', width: 1024, height: 640, icon: <Monitor className="w-3.5 h-3.5" /> },
];

export const LivePreview: React.FC<LivePreviewProps> = ({
  project,
  activeHtmlPath = 'index.html',
  onOpenConsole,
  errorCount = 0,
  evalCodeTrigger,
  onConsoleMessage,
}) => {
  const [currentPreset, setCurrentPreset] = useState<ViewportPreset>('responsive');
  const [isLandscape, setIsLandscape] = useState(false);
  const [scale, setScale] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Compute bundled HTML
  const bundledHtml = React.useMemo(() => {
    return buildPreviewHTML(project, activeHtmlPath);
  }, [project, activeHtmlPath, refreshKey]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setRefreshKey((k) => k + 1);
    setTimeout(() => setIsRefreshing(false), 400);
  };

  // Strict PostMessage source validation: Only accept messages from the currently active iframe contentWindow
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      // 1. Reject if source does not match active iframe contentWindow
      if (!iframeRef.current || !iframeRef.current.contentWindow) return;
      if (e.source !== iframeRef.current.contentWindow) return;

      // 2. Reject invalid structure or type
      if (!e.data || typeof e.data !== 'object') return;
      if (e.data.type !== 'CODESTUDIO_CONSOLE') return;

      // 3. Whitelist log levels
      const validLevels = ['log', 'info', 'warn', 'error'] as const;
      const level = validLevels.includes(e.data.level) ? e.data.level : 'log';

      // 4. Payload size limits (prevent memory exhaustion and DOS)
      const rawArgs = Array.isArray(e.data.args) ? e.data.args : [e.data.args];
      const safeArgs = rawArgs.slice(0, 30).map((arg: any) => String(arg ?? '').slice(0, 3000));

      const safeMsg: ConsoleLogMessage = {
        id: 'log-' + Math.random().toString(36).substring(2, 9),
        level,
        args: safeArgs,
        timestamp: typeof e.data.timestamp === 'number' && Number.isFinite(e.data.timestamp) ? e.data.timestamp : Date.now(),
        line: typeof e.data.line === 'number' && Number.isFinite(e.data.line) ? e.data.line : undefined,
        source: typeof e.data.source === 'string' ? e.data.source.slice(0, 100) : undefined,
      };

      if (onConsoleMessage) {
        onConsoleMessage(safeMsg);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onConsoleMessage, refreshKey]);

  // Handle REPL code execution in iframe context
  useEffect(() => {
    if (evalCodeTrigger && iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          {
            type: 'EVAL_CODE',
            code: evalCodeTrigger.code,
          },
          '*'
        );
      } catch (err) {
        console.error('Failed to postMessage to preview iframe:', err);
      }
    }
  }, [evalCodeTrigger]);

  const activePresetInfo = VIEWPORT_PRESETS.find((p) => p.id === currentPreset) || VIEWPORT_PRESETS[0];

  const getDimensions = () => {
    if (activePresetInfo.id === 'responsive') {
      return { width: '100%', height: '100%' };
    }
    const w = isLandscape ? activePresetInfo.height : activePresetInfo.width;
    const h = isLandscape ? activePresetInfo.width : activePresetInfo.height;
    return { width: `${w}px`, height: `${h}px` };
  };

  const dims = getDimensions();

  return (
    <div
      className={`flex flex-col bg-slate-950 text-slate-100 ${
        isFullscreen ? 'fixed inset-0 z-50' : 'h-full w-full'
      }`}
    >
      {/* Live Preview Control Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900 border-b border-slate-800 text-xs shrink-0 gap-2">
        {/* Device Viewport Selectors */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700">
            {VIEWPORT_PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => setCurrentPreset(p.id)}
                className={`flex items-center gap-1 px-2 py-1 rounded-md transition text-[11px] font-medium ${
                  currentPreset === p.id
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`}
                title={p.name}
              >
                {p.icon}
                <span className="hidden md:inline">{p.name}</span>
              </button>
            ))}
          </div>

          {/* Orientation Rotate (for fixed presets) */}
          {currentPreset !== 'responsive' && (
            <button
              onClick={() => setIsLandscape(!isLandscape)}
              className={`p-1.5 rounded-lg border transition ${
                isLandscape
                  ? 'bg-sky-500/20 text-sky-400 border-sky-500/40'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
              title="Rotate Device Orientation"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Zoom controls */}
          <div className="hidden lg:flex items-center bg-slate-800 rounded-lg border border-slate-700 px-1 py-0.5 text-slate-300">
            <button
              onClick={() => setScale((s) => Math.max(0.5, parseFloat((s - 0.1).toFixed(1))))}
              className="p-1 hover:text-white"
              title="Zoom Out"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <span className="text-[10px] font-mono px-1.5">{Math.round(scale * 100)}%</span>
            <button
              onClick={() => setScale((s) => Math.min(1.5, parseFloat((s + 0.1).toFixed(1))))}
              className="p-1 hover:text-white"
              title="Zoom In"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Console Error Pill */}
          {onOpenConsole && (
            <button
              onClick={onOpenConsole}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg border transition font-mono text-[11px] ${
                errorCount > 0
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
              title="Open JavaScript Console"
            >
              {errorCount > 0 ? (
                <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
              ) : (
                <Terminal className="w-3.5 h-3.5 text-sky-400" />
              )}
              <span>{errorCount > 0 ? `${errorCount} error${errorCount > 1 ? 's' : ''}` : 'Console'}</span>
            </button>
          )}

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            className={`p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition ${
              isRefreshing ? 'animate-spin text-sky-400' : ''
            }`}
            title="Reload Preview"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition"
            title={isFullscreen ? 'Exit Fullscreen' : 'Full Screen Preview'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Preview Canvas Container */}
      <div className="flex-1 w-full h-full overflow-auto bg-slate-950 flex items-center justify-center p-0 sm:p-2 relative">
        <div
          className={`transition-all duration-200 flex items-center justify-center ${
            currentPreset !== 'responsive'
              ? 'rounded-2xl shadow-2xl border-4 border-slate-800 bg-black overflow-hidden'
              : 'w-full h-full'
          }`}
          style={{
            width: dims.width,
            height: dims.height,
            transform: scale !== 1 ? `scale(${scale})` : undefined,
            transformOrigin: 'center center',
          }}
        >
          <iframe
            ref={iframeRef}
            key={refreshKey}
            srcDoc={bundledHtml}
            title="Live Preview"
            sandbox="allow-scripts allow-modals allow-forms"
            className="w-full h-full border-none bg-white block"
          />
        </div>
      </div>
    </div>
  );
};
