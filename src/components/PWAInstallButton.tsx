import React, { useState } from 'react';
import { Download, Smartphone, X, CheckCircle, Share2, PlusSquare } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already installed and running standalone, do not show button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className={`flex items-center gap-1.5 font-medium transition-all shadow-sm rounded-lg active:scale-95 ${
          compact
            ? 'p-2 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 text-xs'
            : 'px-3 py-1.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs'
        }`}
        title="Install CodeStudio PWA on your device for offline use"
      >
        <Download className="w-3.5 h-3.5" />
        {!compact && <span>Install App</span>}
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center gap-1.5 font-medium transition-all rounded-lg ${
            compact
              ? 'p-2 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 text-xs'
              : 'px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 border border-sky-500/30 text-xs'
          }`}
          title="Install on iPhone / iPad"
        >
          <Smartphone className="w-3.5 h-3.5" />
          {!compact && <span>Add to Home</span>}
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl text-slate-100 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-sky-500/20 rounded-lg text-sky-400">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-semibold text-white">Install CodeStudio on iOS</h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-3.5 text-sm text-slate-300">
                <div className="flex items-start gap-3 bg-slate-800/60 p-3 rounded-xl border border-slate-800">
                  <div className="p-1.5 bg-slate-700 rounded-lg text-sky-400 mt-0.5">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-white block">Step 1: Tap Share</strong>
                    Tap the Safari <span className="text-sky-400 font-medium">Share</span> button at the bottom of the screen.
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-slate-800/60 p-3 rounded-xl border border-slate-800">
                  <div className="p-1.5 bg-slate-700 rounded-lg text-sky-400 mt-0.5">
                    <PlusSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-white block">Step 2: Add to Home Screen</strong>
                    Scroll down and select <span className="text-sky-400 font-medium">&quot;Add to Home Screen&quot;</span>.
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-slate-800/60 p-3 rounded-xl border border-slate-800">
                  <div className="p-1.5 bg-emerald-500/20 rounded-lg text-emerald-400 mt-0.5">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-white block">Step 3: 100% Offline Access</strong>
                    Launch CodeStudio anytime directly from your home screen without internet!
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-sky-600 hover:bg-sky-500 py-2.5 text-sm font-semibold text-white transition shadow-lg shadow-sky-600/25"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
