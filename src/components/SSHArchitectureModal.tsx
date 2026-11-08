import React, { useState } from 'react';
import { Project } from '../types';
import {
  X,
  Zap,
  ShieldCheck,
  Server,
  Lock,
  Download,
  Copy,
  Check,
  Terminal,
  ExternalLink,
  KeyRound,
  FileCode
} from 'lucide-react';

interface SSHArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
}

export const SSHArchitectureModal: React.FC<SSHArchitectureModalProps> = ({
  isOpen,
  onClose,
  project,
}) => {
  const [host, setHost] = useState('example.com');
  const [port, setPort] = useState('22');
  const [username, setUsername] = useState('deploy_user');
  const [remotePath, setRemotePath] = useState('/var/www/html');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const rsyncCommand = `rsync -avz -e "ssh -p ${port}" --exclude=".git" ./ ${username}@${host}:${remotePath}`;

  const configJson = JSON.stringify(
    {
      project: project.name,
      ssh: {
        host,
        port: parseInt(port) || 22,
        user: username,
        remotePath,
        auth: "key-based",
        instructions: "Never store private keys in frontend web clients. Use SSH Agent or server-side sync bridge."
      }
    },
    null,
    2
  );

  const handleCopyCommand = () => {
    navigator.clipboard.writeText(rsyncCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadConfig = () => {
    const blob = new Blob([configJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'deploy-config.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-2xl max-h-[85vh] rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl flex flex-col text-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/15 text-amber-400 rounded-xl">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">SSH / SFTP Architecture</h2>
              <p className="text-xs text-slate-400">Secure remote deployment blueprint &amp; configuration generator</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Security Notice Box */}
          <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/30 flex items-start gap-3">
            <Lock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300 leading-relaxed">
              <strong className="text-white block font-semibold mb-0.5">Strict Zero-Credential Frontend Security</strong>
              In accordance with enterprise security practices, CodeStudio is an offline-first PWA and will{' '}
              <span className="text-amber-400 font-medium">never</span> solicit or store raw SSH passwords or private keys in browser localStorage or IndexedDB.
              Remote deployment connects via a secure server bridge or standard CLI deployment workflows.
            </div>
          </div>

          {/* Architecture Diagram Info */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
            <h3 className="text-xs font-semibold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              Production Deployment Flow
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-center text-xs">
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <span className="block font-bold text-white mb-1">1. Local PWA</span>
                <span className="text-slate-400 text-[11px]">Source code &amp; assets in offline IndexedDB</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <span className="block font-bold text-sky-400 mb-1">2. Secure Bridge</span>
                <span className="text-slate-400 text-[11px]">ZIP Export / Webhook / Authenticated Node proxy</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <span className="block font-bold text-emerald-400 mb-1">3. Remote Server</span>
                <span className="text-slate-400 text-[11px]">Apache, Nginx, or Cloud VPS target directory</span>
              </div>
            </div>
          </div>

          {/* Target Server Parameters */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-200">Remote Target Server Configuration</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Host / Domain</label>
                <input
                  type="text"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-mono focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">SSH Port</label>
                <input
                  type="text"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-mono focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">SSH Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-mono focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Remote Web Directory</label>
                <input
                  type="text"
                  value={remotePath}
                  onChange={(e) => setRemotePath(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-mono focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          </div>

          {/* Sync Command */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-sky-400" />
                Terminal Sync Command
              </span>
              <button
                onClick={handleCopyCommand}
                className="flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300 transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-emerald-400 overflow-x-auto">
              {rsyncCommand}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <button
            onClick={handleDownloadConfig}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>Export deploy-config.json</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
