/* 装配：dist/bundle.js + dist/bundle.css + src/template.html → index.html（单文件，零外部请求）
 * 纯文件 I/O，不 spawn 子进程（本环境 node 无法 spawn）。
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));

const jsPath = join(root, 'dist', 'bundle.js');
const cssPath = join(root, 'dist', 'bundle.css');

if (!existsSync(jsPath) || !existsSync(cssPath)) {
  console.error('dist/bundle.js 或 dist/bundle.css 不存在，请先运行 bash build.sh');
  process.exit(1);
}

const js = readFileSync(jsPath, 'utf8');
const css = readFileSync(cssPath, 'utf8');
const tpl = readFileSync(join(root, 'src', 'template.html'), 'utf8');

// 用函数式替换，避免 minified 代码里的 $ 序列被当作替换模式
const html = tpl
  .replace('/*__CSS__*/', () => css)
  .replace('//__JS__', () => js);

writeFileSync(join(root, 'index.html'), html);
console.log(`built index.html (${(html.length / 1024).toFixed(1)} KB)`);
