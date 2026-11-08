export interface CodeSnippet {
  id: string;
  title: string;
  category: 'HTML' | 'CSS' | 'JavaScript' | 'Web APIs';
  description: string;
  code: string;
  targetType: 'html' | 'css' | 'javascript';
}

export const CODE_SNIPPETS: CodeSnippet[] = [
  {
    id: 'snip-html5',
    title: 'Modern HTML5 Template',
    category: 'HTML',
    description: 'Clean HTML5 document shell with responsive viewport and meta tags.',
    targetType: 'html',
    code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <main class="container">
    <h1>Hello World</h1>
  </main>
  <script src="app.js"></script>
</body>
</html>`,
  },
  {
    id: 'snip-meta-tags',
    title: 'Essential SEO & Mobile Meta Tags',
    category: 'HTML',
    description: 'Viewport-fit, theme-color, and OpenGraph sharing tags.',
    targetType: 'html',
    code: `<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<meta name="theme-color" content="#0f172a">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta property="og:title" content="Page Title">
<meta property="og:description" content="Description of this application.">`,
  },
  {
    id: 'snip-flex-center',
    title: 'Perfect Centering (Flexbox)',
    category: 'CSS',
    description: 'Horizontally and vertically center elements with full viewport height.',
    targetType: 'css',
    code: `.center-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  margin: 0;
}`,
  },
  {
    id: 'snip-css-grid',
    title: 'Responsive Auto-Fit Grid',
    category: 'CSS',
    description: 'Dynamic grid that wraps items automatically without media queries.',
    targetType: 'css',
    code: `.responsive-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  padding: 1rem;
}`,
  },
  {
    id: 'snip-glassmorphism',
    title: 'Glassmorphism Card Effect',
    category: 'CSS',
    description: 'Frosted glass look with backdrop-filter, border reflection, and shadow.',
    targetType: 'css',
    code: `.glass-card {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
  padding: 24px;
}`,
  },
  {
    id: 'snip-fetch-api',
    title: 'Async Fetch with Error Handling',
    category: 'JavaScript',
    description: 'Robust async/await fetch request with try/catch and HTTP status verification.',
    targetType: 'javascript',
    code: `async function fetchData(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(\`HTTP error! status: \${response.status}\`);
    }
    const data = await response.json();
    console.log("Data fetched:", data);
    return data;
  } catch (error) {
    console.error("Fetch request failed:", error);
    throw error;
  }
}`,
  },
  {
    id: 'snip-canvas-loop',
    title: 'Canvas 60FPS Animation Loop',
    category: 'Web APIs',
    description: 'Full-bleed canvas setup with window resize handler and requestAnimationFrame.',
    targetType: 'javascript',
    code: `const canvas = document.querySelector('canvas') || document.createElement('canvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

function animate(time) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Custom drawing logic here
  
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);`,
  },
  {
    id: 'snip-audio-beep',
    title: 'Web Audio Oscillator Beep',
    category: 'Web APIs',
    description: 'Play a clean synthesizer tone without any external audio files.',
    targetType: 'javascript',
    code: `function playTone(freq = 440, type = 'sine', duration = 0.3) {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);

  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + duration);
}`,
  },
  {
    id: 'snip-storage',
    title: 'Safe LocalStorage Store',
    category: 'JavaScript',
    description: 'Typed helper to save and load JSON state from local storage safely.',
    targetType: 'javascript',
    code: `const Storage = {
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }
};`,
  },
];
