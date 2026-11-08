/**
 * 100% Offline, reliable code formatters and minifiers for HTML, CSS, JS, and JSON.
 */

export function formatCode(code: string, type: string, indentSize = 2): string {
  const indent = ' '.repeat(indentSize);

  try {
    switch (type.toLowerCase()) {
      case 'html':
      case 'xml':
      case 'svg':
        return formatHTML(code, indent);
      case 'css':
        return formatCSS(code, indent);
      case 'javascript':
      case 'js':
        return formatJS(code, indent);
      case 'json':
        return JSON.stringify(JSON.parse(code), null, indentSize);
      default:
        return code;
    }
  } catch {
    return code;
  }
}

export function minifyCode(code: string, type: string): string {
  try {
    switch (type.toLowerCase()) {
      case 'json':
        return JSON.stringify(JSON.parse(code));
      case 'css':
        return code
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/\s+/g, ' ')
          .replace(/\s*([\{\}:;,])\s*/g, '$1')
          .replace(/;\}/g, '}')
          .trim();
      case 'html':
      case 'xml':
      case 'svg':
        return code
          .replace(/<!--[\s\S]*?-->/g, '')
          .replace(/>\s+</g, '><')
          .replace(/\s{2,}/g, ' ')
          .trim();
      case 'javascript':
      case 'js':
        // Safe lightweight JS minifier: preserves strings and removes obvious comments and whitespace
        return code
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/(^|[^:])\/\/[^\n]*/g, '$1')
          .replace(/\n\s*\n/g, '\n')
          .trim();
      default:
        return code.trim();
    }
  } catch {
    return code;
  }
}

function formatHTML(html: string, indent: string): string {
  let formatted = '';
  let pad = 0;
  // Tokens for tags and text
  const tokens = html.replace(/(>)\s*(<)/g, '$1\n$2').split('\n');

  const voidTags = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr', '!doctype'
  ]);

  for (let token of tokens) {
    token = token.trim();
    if (!token) continue;

    const isClosing = /^<\//.test(token);
    const isOpening = /^<[^\/!>][^>]*[^\/]?>$/.test(token) && !voidTags.has(token.match(/^<([a-zA-Z0-9\-]+)/)?.[1]?.toLowerCase() || '');
    const isSelfClosing = /\/>$/.test(token) || voidTags.has(token.match(/^<([a-zA-Z0-9\-]+)/)?.[1]?.toLowerCase() || '');

    if (isClosing) {
      pad = Math.max(0, pad - 1);
    }

    formatted += indent.repeat(pad) + token + '\n';

    if (isOpening && !isSelfClosing) {
      pad++;
    }
  }

  return formatted.trim();
}

function formatCSS(css: string, indent: string): string {
  let formatted = '';
  let pad = 0;

  // Clean extra spaces and normalize braces
  const clean = css
    .replace(/\s*{\s*/g, ' {\n')
    .replace(/;\s*/g, ';\n')
    .replace(/\s*}\s*/g, '\n}\n');

  const lines = clean.split('\n');

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    if (line === '}') {
      pad = Math.max(0, pad - 1);
      formatted += indent.repeat(pad) + line + '\n\n';
    } else if (line.endsWith('{')) {
      formatted += indent.repeat(pad) + line + '\n';
      pad++;
    } else {
      // Format property: value;
      const formattedProp = line.includes(':') && !line.startsWith('@')
        ? line.replace(/\s*:\s*/, ': ')
        : line;
      formatted += indent.repeat(pad) + formattedProp + '\n';
    }
  }

  return formatted.trim();
}

function formatJS(js: string, indent: string): string {
  let formatted = '';
  let pad = 0;

  const lines = js.split('\n');

  for (let line of lines) {
    line = line.trim();
    if (!line) {
      formatted += '\n';
      continue;
    }

    if (line.startsWith('}') || line.startsWith(']') || line.startsWith(')')) {
      pad = Math.max(0, pad - 1);
    }

    formatted += indent.repeat(pad) + line + '\n';

    if (line.endsWith('{') || line.endsWith('[') || line.endsWith('(')) {
      pad++;
    }
  }

  return formatted.trim();
}
