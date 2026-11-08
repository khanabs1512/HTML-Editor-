import { Project, ProjectFile, EditorSettings } from '../types/index';

const DB_NAME = 'CodeStudioDB';
const DB_VERSION = 1;
const STORE_PROJECTS = 'projects';
const STORE_SETTINGS = 'settings';

const DEFAULT_SETTINGS: EditorSettings = {
  fontSize: 14,
  theme: 'one-dark',
  tabSize: 2,
  wordWrap: true,
  lineNumbers: true,
  foldGutter: true,
  autoCloseBrackets: true,
  autoSave: true,
  autoSaveDelay: 800,
  appTheme: 'dark',
};

const SEED_PROJECTS: Project[] = [
  {
    id: 'starter-particles',
    name: 'Interactive Canvas Particle Playground',
    description: 'HTML5 Canvas particle physics engine with touch & mouse force fields and glowing neon effects.',
    createdAt: Date.now() - 1000 * 60 * 60 * 24,
    updatedAt: Date.now(),
    tags: ['HTML5', 'Canvas', 'Interactive', 'JavaScript'],
    files: [
      {
        id: 'file-p1',
        name: 'index.html',
        path: 'index.html',
        type: 'html',
        lastModified: Date.now(),
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Particle Playground</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div id="ui-overlay">
    <header class="glass-header">
      <div class="logo">
        <span class="dot"></span>
        <h1>Particle Nexus</h1>
      </div>
      <div class="stats">
        <span id="particle-count">Particles: 120</span>
        <span id="fps">FPS: 60</span>
      </div>
    </header>

    <div class="controls-panel">
      <label>Particle Count:
        <input type="range" id="slider-count" min="30" max="300" value="120">
      </label>
      <label>Connection Distance:
        <input type="range" id="slider-dist" min="50" max="180" value="110">
      </label>
      <div class="button-row">
        <button id="btn-burst" class="btn primary">💥 Pulse Burst</button>
        <button id="btn-color" class="btn secondary">🎨 Cycle Neon Palette</button>
      </div>
    </div>

    <footer class="instruction">
      <p>Touch or move mouse across the screen to interact with the gravitational field.</p>
    </footer>
  </div>

  <canvas id="canvas"></canvas>

  <script src="app.js"></script>
</body>
</html>`,
      },
      {
        id: 'file-p2',
        name: 'style.css',
        path: 'style.css',
        type: 'css',
        lastModified: Date.now(),
        content: `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

body, html {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #090d16;
  color: #f8fafc;
}

#canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

#ui-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 10;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 16px;
}

.glass-header {
  pointer-events: auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(15, 23, 42, 0.7);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  padding: 12px 20px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo h1 {
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  background: linear-gradient(135deg, #38bdf8, #818cf8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #38bdf8;
  box-shadow: 0 0 10px #38bdf8;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.3); opacity: 0.6; }
}

.stats {
  font-size: 0.85rem;
  color: #94a3b8;
  display: flex;
  gap: 16px;
}

.controls-panel {
  pointer-events: auto;
  align-self: flex-start;
  background: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 320px;
  margin-top: 10px;
}

.controls-panel label {
  font-size: 0.8rem;
  color: #cbd5e1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

input[type="range"] {
  accent-color: #38bdf8;
  cursor: pointer;
}

.button-row {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.btn {
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn.primary {
  background: #0284c7;
  color: #fff;
}
.btn.primary:hover {
  background: #0369a1;
}

.btn.secondary {
  background: rgba(255, 255, 255, 0.1);
  color: #e2e8f0;
}
.btn.secondary:hover {
  background: rgba(255, 255, 255, 0.2);
}

.instruction {
  text-align: center;
  font-size: 0.8rem;
  color: #64748b;
  padding: 8px;
  background: rgba(15, 23, 42, 0.5);
  border-radius: 20px;
  align-self: center;
}`,
      },
      {
        id: 'file-p3',
        name: 'app.js',
        path: 'app.js',
        type: 'javascript',
        lastModified: Date.now(),
        content: `// Interactive Canvas Physics Engine
console.log("Particle Nexus starting up...");

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let width = (canvas.width = window.innerWidth);
let height = (canvas.height = window.innerHeight);

window.addEventListener("resize", () => {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
});

const mouse = {
  x: width / 2,
  y: height / 2,
  active: false,
  radius: 140,
};

window.addEventListener("mousemove", (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
  mouse.active = true;
});

window.addEventListener("touchmove", (e) => {
  if (e.touches.length > 0) {
    mouse.x = e.touches[0].clientX;
    mouse.y = e.touches[0].clientY;
    mouse.active = true;
  }
}, { passive: true });

window.addEventListener("mouseleave", () => (mouse.active = false));
window.addEventListener("touchend", () => (mouse.active = false));

const palettes = [
  ["#38bdf8", "#818cf8", "#c084fc"],
  ["#4ade80", "#22d3ee", "#a78bfa"],
  ["#f43f5e", "#fb923c", "#facc15"],
  ["#06b6d4", "#3b82f6", "#ec4899"],
];
let paletteIndex = 0;

class Particle {
  constructor(x, y) {
    this.x = x ?? Math.random() * width;
    this.y = y ?? Math.random() * height;
    this.vx = (Math.random() - 0.5) * 1.8;
    this.vy = (Math.random() - 0.5) * 1.8;
    this.radius = Math.random() * 2.5 + 1.5;
    this.color = palettes[paletteIndex][Math.floor(Math.random() * palettes[paletteIndex].length)];
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;

    // Screen wrap
    if (this.x < 0) this.x = width;
    if (this.x > width) this.x = 0;
    if (this.y < 0) this.y = height;
    if (this.y > height) this.y = 0;

    // Mouse attraction / repulsion
    if (mouse.active) {
      const dx = mouse.x - this.x;
      const dy = mouse.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist < mouse.radius) {
        const force = (1 - dist / mouse.radius) * 3;
        this.vx += (dx / dist) * force * 0.15;
        this.vy += (dy / dist) * force * 0.15;
      }
    }

    // Gentle friction
    this.vx *= 0.985;
    this.vy *= 0.985;
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 10;
    ctx.shadowColor = this.color;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

let particles = [];
let targetCount = 120;
let connectionDistance = 110;

function initParticles() {
  particles = [];
  for (let i = 0; i < targetCount; i++) {
    particles.push(new Particle());
  }
}
initParticles();

// Animation Loop
let lastTime = performance.now();
let frameCount = 0;
let fps = 60;

function animate(currentTime) {
  frameCount++;
  if (currentTime - lastTime >= 1000) {
    fps = frameCount;
    frameCount = 0;
    lastTime = currentTime;
    const fpsElem = document.getElementById("fps");
    if (fpsElem) fpsElem.textContent = \`FPS: \${fps}\`;
  }

  ctx.clearRect(0, 0, width, height);

  // Connect particles
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x;
      const dy = particles[i].y - particles[j].y;
      const dist = Math.hypot(dx, dy);

      if (dist < connectionDistance) {
        const alpha = (1 - dist / connectionDistance) * 0.35;
        ctx.beginPath();
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(particles[j].x, particles[j].y);
        ctx.strokeStyle = \`rgba(56, 189, 248, \${alpha})\`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }

  // Update & Draw
  for (const p of particles) {
    p.update();
    p.draw();
  }

  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);

// Controls
const sliderCount = document.getElementById("slider-count");
const sliderDist = document.getElementById("slider-dist");
const countLabel = document.getElementById("particle-count");

sliderCount.addEventListener("input", (e) => {
  targetCount = parseInt(e.target.value);
  if (countLabel) countLabel.textContent = \`Particles: \${targetCount}\`;
  while (particles.length < targetCount) particles.push(new Particle());
  while (particles.length > targetCount) particles.pop();
});

sliderDist.addEventListener("input", (e) => {
  connectionDistance = parseInt(e.target.value);
});

document.getElementById("btn-burst").addEventListener("click", () => {
  for (const p of particles) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 12 + 6;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed;
  }
  console.log("💥 Pulse burst triggered!");
});

document.getElementById("btn-color").addEventListener("click", () => {
  paletteIndex = (paletteIndex + 1) % palettes.length;
  for (const p of particles) {
    p.color = palettes[paletteIndex][Math.floor(Math.random() * palettes[paletteIndex].length)];
  }
  console.log("🎨 Palette cycled to index", paletteIndex);
});
`,
      },
    ],
  },
  {
    id: 'starter-web-synth',
    name: 'Virtual Audio Synthesizer',
    description: 'Web Audio API real-time keyboard synth with oscillators, ADSR envelope, filter controls, and visualizer.',
    createdAt: Date.now() - 1000 * 60 * 60 * 12,
    updatedAt: Date.now(),
    tags: ['WebAudio', 'Interactive', 'JavaScript', 'Sound'],
    files: [
      {
        id: 'file-s1',
        name: 'index.html',
        path: 'index.html',
        type: 'html',
        lastModified: Date.now(),
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pocket Web Synth</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="synth-case">
    <div class="synth-top">
      <div class="brand">
        <h2>STUDIO-8</h2>
        <span class="sub">VIRTUAL ANALOGUE SYNTHESIZER</span>
      </div>
      <div class="screen">
        <canvas id="scope" width="200" height="60"></canvas>
      </div>
    </div>

    <div class="knob-grid">
      <div class="control-box">
        <label>WAVEFORM</label>
        <select id="wave-type">
          <option value="sawtooth">Sawtooth ⚡</option>
          <option value="sine">Sine Wave 〰</option>
          <option value="square">Square █</option>
          <option value="triangle">Triangle ◬</option>
        </select>
      </div>
      <div class="control-box">
        <label>CUTOFF (Hz)</label>
        <input type="range" id="filter-cutoff" min="100" max="8000" value="2800">
      </div>
      <div class="control-box">
        <label>RESONANCE</label>
        <input type="range" id="filter-q" min="1" max="20" value="4">
      </div>
      <div class="control-box">
        <label>MASTER VOL</label>
        <input type="range" id="master-vol" min="0" max="1" step="0.05" value="0.7">
      </div>
    </div>

    <div class="keys-container" id="keyboard">
      <!-- Keys generated by JS -->
    </div>
  </div>

  <script src="synth.js"></script>
</body>
</html>`,
      },
      {
        id: 'file-s2',
        name: 'style.css',
        path: 'style.css',
        type: 'css',
        lastModified: Date.now(),
        content: `body {
  margin: 0;
  min-height: 100vh;
  background: #0f172a;
  display: flex;
  justify-content: center;
  align-items: center;
  font-family: -apple-system, sans-serif;
  padding: 16px;
  box-sizing: border-box;
}

.synth-case {
  background: #1e293b;
  border: 2px solid #334155;
  border-radius: 20px;
  padding: 24px;
  max-width: 600px;
  width: 100%;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
}

.synth-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.brand h2 {
  margin: 0;
  font-size: 1.5rem;
  letter-spacing: 2px;
  color: #38bdf8;
}

.brand .sub {
  font-size: 0.65rem;
  letter-spacing: 1.5px;
  color: #94a3b8;
}

.screen {
  background: #090d16;
  border: 1px solid #38bdf844;
  border-radius: 8px;
  padding: 4px;
}

.knob-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: 12px;
  background: #0f172a;
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 24px;
}

.control-box label {
  display: block;
  font-size: 0.65rem;
  font-weight: 700;
  color: #94a3b8;
  margin-bottom: 6px;
  letter-spacing: 1px;
}

select, input[type="range"] {
  width: 100%;
  background: #1e293b;
  color: #f8fafc;
  border: 1px solid #475569;
  border-radius: 6px;
  padding: 6px;
  box-sizing: border-box;
}

.keys-container {
  display: flex;
  position: relative;
  height: 180px;
  background: #0f172a;
  padding: 10px;
  border-radius: 12px;
  user-select: none;
  -webkit-user-select: none;
}

.key {
  flex: 1;
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  border-radius: 0 0 6px 6px;
  cursor: pointer;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 8px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
  transition: background 0.1s;
}

.key.active {
  background: #38bdf8;
  color: #0f172a;
}

.key.black {
  position: absolute;
  width: 7%;
  height: 60%;
  background: #1e293b;
  color: #94a3b8;
  z-index: 2;
  border: 1px solid #000;
}

.key.black.active {
  background: #0284c7;
  color: #fff;
}`,
      },
      {
        id: 'file-s3',
        name: 'synth.js',
        path: 'synth.js',
        type: 'javascript',
        lastModified: Date.now(),
        content: `// Web Audio Synthesizer
let audioCtx = null;
let masterGain = null;
let filter = null;
let analyser = null;

const notes = [
  { note: "C4", freq: 261.63, isBlack: false },
  { note: "C#4", freq: 277.18, isBlack: true, left: "7.5%" },
  { note: "D4", freq: 293.66, isBlack: false },
  { note: "D#4", freq: 311.13, isBlack: true, left: "20.5%" },
  { note: "E4", freq: 329.63, isBlack: false },
  { note: "F4", freq: 349.23, isBlack: false },
  { note: "F#4", freq: 369.99, isBlack: true, left: "46.5%" },
  { note: "G4", freq: 392.00, isBlack: false },
  { note: "G#4", freq: 415.30, isBlack: true, left: "59.5%" },
  { note: "A4", freq: 440.00, isBlack: false },
  { note: "A#4", freq: 466.16, isBlack: true, left: "72.5%" },
  { note: "B4", freq: 493.88, isBlack: false },
  { note: "C5", freq: 523.25, isBlack: false },
];

function initAudio() {
  if (audioCtx) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  audioCtx = new AudioContext();

  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 256;

  filter = audioCtx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = parseFloat(document.getElementById("filter-cutoff").value);
  filter.Q.value = parseFloat(document.getElementById("filter-q").value);

  masterGain = audioCtx.createGain();
  masterGain.gain.value = parseFloat(document.getElementById("master-vol").value);

  filter.connect(masterGain);
  masterGain.connect(analyser);
  analyser.connect(audioCtx.destination);

  drawVisualizer();
  console.log("Audio Engine Initialized!");
}

const activeOscillators = new Map();

function playNote(freq) {
  initAudio();
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }

  const osc = audioCtx.createOscillator();
  const noteGain = audioCtx.createGain();

  const waveType = document.getElementById("wave-type").value;
  osc.type = waveType;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

  // Attack envelope
  noteGain.gain.setValueAtTime(0, audioCtx.currentTime);
  noteGain.gain.linearRampToValueAtTime(0.4, audioCtx.currentTime + 0.02);

  osc.connect(noteGain);
  noteGain.connect(filter);

  osc.start();
  activeOscillators.set(freq, { osc, gain: noteGain });
}

function stopNote(freq) {
  if (!activeOscillators.has(freq)) return;
  const { osc, gain } = activeOscillators.get(freq);
  // Release envelope
  gain.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
  setTimeout(() => {
    try { osc.stop(); osc.disconnect(); } catch (e) {}
  }, 160);
  activeOscillators.delete(freq);
}

// Build Keyboard
const keyboard = document.getElementById("keyboard");
notes.forEach((n) => {
  const key = document.createElement("div");
  key.className = \`key \${n.isBlack ? "black" : "white"}\`;
  if (n.isBlack && n.left) key.style.left = n.left;
  key.textContent = n.note;

  const start = (e) => {
    e.preventDefault();
    key.classList.add("active");
    playNote(n.freq);
  };
  const end = (e) => {
    e.preventDefault();
    key.classList.remove("active");
    stopNote(n.freq);
  };

  key.addEventListener("mousedown", start);
  key.addEventListener("mouseup", end);
  key.addEventListener("mouseleave", end);
  key.addEventListener("touchstart", start, { passive: false });
  key.addEventListener("touchend", end, { passive: false });

  keyboard.appendChild(key);
});

// Controls listeners
document.getElementById("filter-cutoff").addEventListener("input", (e) => {
  if (filter) filter.frequency.setTargetAtTime(parseFloat(e.target.value), audioCtx.currentTime, 0.05);
});
document.getElementById("filter-q").addEventListener("input", (e) => {
  if (filter) filter.Q.setTargetAtTime(parseFloat(e.target.value), audioCtx.currentTime, 0.05);
});
document.getElementById("master-vol").addEventListener("input", (e) => {
  if (masterGain) masterGain.gain.setTargetAtTime(parseFloat(e.target.value), audioCtx.currentTime, 0.05);
});

// Oscilloscope Visualizer
const scopeCanvas = document.getElementById("scope");
const sCtx = scopeCanvas.getContext("2d");

function drawVisualizer() {
  requestAnimationFrame(drawVisualizer);
  if (!analyser) return;

  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteTimeDomainData(dataArray);

  sCtx.fillStyle = "#090d16";
  sCtx.fillRect(0, 0, scopeCanvas.width, scopeCanvas.height);

  sCtx.lineWidth = 2;
  sCtx.strokeStyle = "#38bdf8";
  sCtx.beginPath();

  const sliceWidth = (scopeCanvas.width * 1.0) / bufferLength;
  let x = 0;

  for (let i = 0; i < bufferLength; i++) {
    const v = dataArray[i] / 128.0;
    const y = (v * scopeCanvas.height) / 2;
    if (i === 0) sCtx.moveTo(x, y);
    else sCtx.lineTo(x, y);
    x += sliceWidth;
  }

  sCtx.lineTo(scopeCanvas.width, scopeCanvas.height / 2);
  sCtx.stroke();
}
`,
      },
    ],
  },
];

class DatabaseService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private async getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const idb = typeof window !== 'undefined' && window.indexedDB 
        ? window.indexedDB 
        : (typeof globalThis !== 'undefined' ? (globalThis as any).indexedDB : null);

      if (!idb) {
        reject(new Error('IndexedDB not supported'));
        return;
      }

      const request = idb.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: any) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
          const projectStore = db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
          projectStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
          db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  private async hasSeeded(): Promise<boolean> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_SETTINGS, 'readonly');
        const req = tx.objectStore(STORE_SETTINGS).get('has_seeded_initial_projects');
        req.onsuccess = () => resolve(!!req.result?.value);
        req.onerror = () => resolve(false);
      });
    } catch {
      return false;
    }
  }

  private async markSeeded(): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_SETTINGS, 'readwrite');
        const req = tx.objectStore(STORE_SETTINGS).put({ key: 'has_seeded_initial_projects', value: true });
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
      });
    } catch {}
  }

  async getAllProjects(): Promise<Project[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_PROJECTS, 'readonly');
        const store = tx.objectStore(STORE_PROJECTS);
        const request = store.getAll();

        request.onsuccess = async () => {
          let projects = (request.result as Project[]) || [];
          const seeded = await this.hasSeeded();
          if (!seeded && projects.length === 0) {
            // First time ever running: Seed initial projects once
            await this.seedInitialProjects();
            projects = await this.getAllProjects();
          }
          // Sort by updatedAt descending
          projects.sort((a, b) => b.updatedAt - a.updatedAt);
          resolve(projects);
        };
        request.onerror = () => reject(request.error);
      });
    } catch {
      // LocalStorage fallback
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem('codestudio_projects');
        if (raw) {
          try { return JSON.parse(raw); } catch {}
        }
      }
      return SEED_PROJECTS;
    }
  }

  private async seedInitialProjects(): Promise<void> {
    for (const p of SEED_PROJECTS) {
      await this.saveProject(p);
    }
    await this.markSeeded();
  }

  async resetStarterProjects(): Promise<Project[]> {
    try {
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_PROJECTS, 'readwrite');
        const store = tx.objectStore(STORE_PROJECTS);
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {}

    for (const p of SEED_PROJECTS) {
      await this.saveProject(p);
    }
    await this.markSeeded();
    return this.getAllProjects();
  }

  async getProject(id: string): Promise<Project | null> {
    const projects = await this.getAllProjects();
    return projects.find((p) => p.id === id) || null;
  }

  async saveProject(project: Project): Promise<void> {
    const now = Date.now();
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_PROJECTS, 'readwrite');
        const store = tx.objectStore(STORE_PROJECTS);

        // Check for stale write: if existing project in DB is newer, avoid overwriting
        const getReq = store.get(project.id);
        getReq.onsuccess = () => {
          const existing = getReq.result as Project | undefined;
          if (existing && existing.updatedAt > project.updatedAt && existing.updatedAt > now) {
            // Existing is strictly newer, resolve without overwriting
            resolve();
            return;
          }

          project.updatedAt = now;
          const putReq = store.put(project);
          putReq.onsuccess = () => resolve();
          putReq.onerror = () => {
            if (putReq.error && putReq.error.name === 'QuotaExceededError') {
              reject(new Error('Browser storage quota exceeded. Export project backups or clear unused assets.'));
            } else {
              reject(putReq.error || new Error('Failed to save project'));
            }
          };
        };

        getReq.onerror = () => {
          project.updatedAt = now;
          const putReq = store.put(project);
          putReq.onsuccess = () => resolve();
          putReq.onerror = () => reject(putReq.error);
        };
      });
    } catch (err: any) {
      try {
        project.updatedAt = now;
        const all = await this.getAllProjects();
        const idx = all.findIndex((p) => p.id === project.id);
        if (idx >= 0) all[idx] = project;
        else all.unshift(project);
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('codestudio_projects', JSON.stringify(all));
        }
      } catch (localErr: any) {
        throw new Error('Failed to persist project in IndexedDB or fallback storage: ' + (localErr.message || localErr));
      }
    }
  }

  async deleteProject(id: string): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_PROJECTS, 'readwrite');
        const store = tx.objectStore(STORE_PROJECTS);
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      const all = (await this.getAllProjects()).filter((p) => p.id !== id);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('codestudio_projects', JSON.stringify(all));
      }
    }
  }

  async getSettings(): Promise<EditorSettings> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_SETTINGS, 'readonly');
        const store = tx.objectStore(STORE_SETTINGS);
        const req = store.get('editor_settings');
        req.onsuccess = () => {
          if (req.result && req.result.value) {
            resolve({ ...DEFAULT_SETTINGS, ...req.result.value });
          } else {
            resolve(DEFAULT_SETTINGS);
          }
        };
        req.onerror = () => resolve(DEFAULT_SETTINGS);
      });
    } catch {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem('codestudio_settings');
        if (raw) {
          try { return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }; } catch {}
        }
      }
      return DEFAULT_SETTINGS;
    }
  }

  async saveSettings(settings: EditorSettings): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_SETTINGS, 'readwrite');
        const store = tx.objectStore(STORE_SETTINGS);
        const req = store.put({ key: 'editor_settings', value: settings });
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('codestudio_settings', JSON.stringify(settings));
      }
    }
  }

  async exportAllData(): Promise<string> {
    const projects = await this.getAllProjects();
    const settings = await this.getSettings();
    const payload = {
      app: 'CodeStudio',
      version: 1,
      exportedAt: new Date().toISOString(),
      projects,
      settings,
    };
    return JSON.stringify(payload, null, 2);
  }

  async importAllData(
    jsonStr: string,
    mode: 'merge' | 'replace' = 'merge'
  ): Promise<{ importedCount: number; mergedCount: number }> {
    let data: any;
    try {
      data = JSON.parse(jsonStr);
    } catch (e: any) {
      throw new Error('Invalid JSON format: ' + (e.message || e));
    }

    if (!data.projects || !Array.isArray(data.projects)) {
      throw new Error('Invalid backup file: missing required "projects" array.');
    }

    // Validate projects structure
    for (let i = 0; i < data.projects.length; i++) {
      const p = data.projects[i];
      if (!p.id || !p.name || !Array.isArray(p.files)) {
        throw new Error(`Project at index ${i} is corrupted (missing id, name, or files).`);
      }
      for (const f of p.files) {
        if (!f.id || !f.name || !f.path) {
          throw new Error(`File in project "${p.name}" is corrupted.`);
        }
      }
    }

    let importedCount = 0;
    let mergedCount = 0;

    if (mode === 'replace') {
      const existing = await this.getAllProjects();
      for (const p of existing) {
        await this.deleteProject(p.id);
      }
    }

    const currentProjects = await this.getAllProjects();
    const existingIds = new Set(currentProjects.map((p) => p.id));

    for (const proj of data.projects) {
      if (mode === 'merge' && existingIds.has(proj.id)) {
        // Generate new ID and rename slightly to avoid colliding
        const mergedProj: Project = {
          ...proj,
          id: 'proj-' + Math.random().toString(36).substring(2, 9),
          name: `${proj.name} (Restored)`,
          updatedAt: Date.now(),
        };
        await this.saveProject(mergedProj);
        mergedCount++;
      } else {
        await this.saveProject(proj);
        importedCount++;
      }
    }

    if (data.settings && typeof data.settings === 'object') {
      await this.saveSettings({ ...DEFAULT_SETTINGS, ...data.settings });
    }

    return { importedCount, mergedCount };
  }

  async getStorageUsage(): Promise<{ usageMB: number; projectsCount: number; filesCount: number }> {
    const projects = await this.getAllProjects();
    let totalBytes = 0;
    let filesCount = 0;
    for (const p of projects) {
      for (const f of p.files) {
        filesCount++;
        totalBytes += (f.content?.length || 0) * 2;
        if (f.dataUri) totalBytes += f.dataUri.length;
      }
    }
    return {
      usageMB: parseFloat((totalBytes / (1024 * 1024)).toFixed(2)),
      projectsCount: projects.length,
      filesCount,
    };
  }
}

export const dbService = new DatabaseService();
