// 把整個遊戲打包成單一 HTML 檔（方便直接分享或離線開啟）
// 用法：node tools/build-single.mjs  → 產生 dist/nightmare-doors.html
// 限制：只支援本專案用到的 import { a, b } from './x.js' 與 export function/const 寫法
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';

const root = resolve(dirname(new URL(import.meta.url).pathname), '..');
const order = [], seen = new Set(), mods = new Map();
const id = (p) => '__m_' + relative(root, p).replace(/[^a-zA-Z0-9]/g, '_');

function visit(file) {
  if (seen.has(file)) return;
  seen.add(file);
  let src = readFileSync(file, 'utf8');
  const imports = [];
  src = src.replace(/^import\s*\{([^}]*)\}\s*from\s*['"](.+?)['"];?\s*$/gm, (_, names, spec) => {
    const dep = resolve(dirname(file), spec);
    imports.push(dep);
    const bind = names.split(',').map((s) => s.trim()).filter(Boolean)
      .map((s) => s.replace(/^(\w+)\s+as\s+(\w+)$/, '$1: $2')).join(', ');
    return `const { ${bind} } = ${id(dep)};`;
  });
  const exported = [];
  src = src.replace(/^export\s+(async\s+function|function|const|let|class)\s+(\w+)/gm, (_, kw, name) => {
    exported.push(name);
    return `${kw} ${name}`;
  });
  imports.forEach(visit);
  mods.set(file, `const ${id(file)} = (() => {\n${src}\nreturn { ${exported.join(', ')} };\n})();`);
  order.push(file);
}
visit(resolve(root, 'src/main.js'));

const js = order.map((f) => mods.get(f)).join('\n\n');
const css = readFileSync(resolve(root, 'style.css'), 'utf8');
let html = readFileSync(resolve(root, 'index.html'), 'utf8')
  // 單一檔案版沒有圖示與 manifest 檔，拿掉這些連結
  .replace(/^\s*<link rel="(manifest|icon|apple-touch-icon)"[^>]*>\n/gm, '')
  .replace('<link rel="stylesheet" href="./style.css" />', () => `<link rel="icon" href="data:," />\n  <style>\n${css}\n</style>`)
  .replace('<script type="module" src="./src/main.js"></script>', () => `<script>\n(() => {\n${js}\n})();\n</script>`);
mkdirSync(resolve(root, 'dist'), { recursive: true });
writeFileSync(resolve(root, 'dist/nightmare-doors.html'), html);
console.log('built dist/nightmare-doors.html', (html.length / 1024).toFixed(1) + ' KB');
