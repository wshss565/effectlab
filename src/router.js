/* hash 路由：#/ 展示页 · #/editor 编辑器 · #/editor?effect=xxx 直达效果
 * 两个视图常驻 DOM，切换时只切显示态（避免 WebGL 上下文反复创建） */

import { mountChrome, setActiveNav } from './components/chrome.js';
import { mountShowcase, activateShowcase, deactivateShowcase } from './views/showcase.js';
import { mountEditor, activateEditor, deactivateEditor } from './views/editor.js';

let current = null;

function parseHash() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const qIndex = raw.indexOf('?');
  const path = qIndex === -1 ? raw : raw.slice(0, qIndex);
  const params = new URLSearchParams(qIndex === -1 ? '' : raw.slice(qIndex + 1));
  return { path, params };
}

function route() {
  const { path, params } = parseHash();
  const next = path.startsWith('/editor') ? 'editor' : 'showcase';

  if (next === current) {
    if (next === 'editor') activateEditor(params);
    return;
  }
  if (current === 'editor') deactivateEditor();
  if (current === 'showcase') deactivateShowcase();
  current = next;
  setActiveNav(next);
  if (next === 'editor') activateEditor(params);
  else activateShowcase();
}

export function startRouter() {
  mountChrome(document.getElementById('app'));

  const view = document.getElementById('view');
  mountShowcase(view);
  mountEditor(view);

  window.addEventListener('hashchange', route);
  route();
}
