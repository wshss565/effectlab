/* 编辑器视图（#/editor）
 * 左：效果开关列表 | 中：画布舞台（对比滑块） | 右：参数面板
 * 顶栏：打开图片 / 示例 / 对比 / 随机 / 清除 / 导出
 */

import { Pipeline } from '../editor/pipeline.js';
import { EFFECTS, getEffect, defaultParams } from '../editor/effects.js';
import { SAMPLES, renderSample } from '../editor/samples.js';
import { exportPNG, downloadBlob } from '../editor/exporter.js';
import { loadState, saveState } from '../editor/store.js';
import {
  loadPresets,
  savePresets,
  snapshotToPreset,
  presetEffectCount,
  parseImportedPresets,
} from '../editor/presets.js';

const PREVIEW_MAX = 1600; // 实时预览降采样上限（最长边）
const STORAGE_KEY_HINT = '状态已保存到本地';

let root = null;
let pipeline = null;
let glError = null;
let frameAvg = 0;
let exporting = false;
let statusTimer = 0;
let spaceCompare = false;
let rafId = 0;

const fxState = new Map(); // id -> { enabled, params }
let presets = []; // 预设列表

const state = {
  image: null, // { source, width, height, name }
  preview: null, // { source, width, height }
  selectedId: null,
  compare: null, // null | 0..1
};

const els = {};

/* ---------- 工具 ---------- */

function el(tag, className, html) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html !== undefined) node.innerHTML = html;
  return node;
}

function activeChain() {
  const chain = [];
  for (const fx of EFFECTS) {
    if (fx.status !== 'live') continue;
    const st = fxState.get(fx.id);
    if (st && st.enabled) chain.push({ effect: fx, params: st.params });
  }
  return chain;
}

function randomVividColor() {
  const hue = Math.floor(Math.random() * 360);
  const sat = 65 + Math.random() * 25;
  const light = 45 + Math.random() * 15;
  return hslToHex(hue, sat, light);
}

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const to = (x) => Math.round(255 * x).toString(16).padStart(2, '0');
  return `#${to(f(0))}${to(f(8))}${to(f(4))}`;
}

/* ---------- 持久化 ---------- */

function initFxState() {
  const saved = loadState();
  for (const fx of EFFECTS) {
    let st = { enabled: false, params: defaultParams(fx) };
    const s = saved && saved.effects && saved.effects[fx.id];
    if (s) {
      st.enabled = !!s.enabled;
      if (s.params) {
        for (const p of fx.params || []) {
          if (s.params[p.id] !== undefined) st.params[p.id] = s.params[p.id];
        }
      }
    }
    fxState.set(fx.id, st);
  }
  const firstLive = EFFECTS.find((f) => f.status === 'live');
  state.selectedId = (saved && saved.selected && getEffect(saved.selected)) || (firstLive && firstLive.id) || null;
}

function persist() {
  const effects = {};
  for (const fx of EFFECTS) {
    const st = fxState.get(fx.id);
    if (st) effects[fx.id] = { enabled: st.enabled, params: st.params };
  }
  saveState({ v: 1, selected: state.selectedId, effects });
}

/* ---------- DOM 构建 ---------- */

function buildDom(viewRoot) {
  const wrap = document.createElement('div');
  wrap.className = 'editor view';
  wrap.dataset.view = 'editor';
  wrap.innerHTML = `
    <div class="editor__bar">
      <button class="btn btn--sm" id="btn-open" type="button">打开图片</button>
      <input id="file-input" class="visually-hidden" type="file" accept="image/*">
      <div class="editor__samples">
        <span class="tag">示例</span>
        ${SAMPLES.map((s) => `<button class="btn btn--sm" data-sample="${s.id}">${s.name}</button>`).join('')}
      </div>
      <span class="editor__bar-spacer"></span>
      <button class="btn btn--sm" id="btn-compare">对比</button>
      <button class="btn btn--sm" id="btn-random">随机</button>
      <button class="btn btn--sm" id="btn-clear">清除</button>
      <div class="editor__export">
        <button class="btn btn--sm btn--primary" id="btn-export">导出 PNG</button>
        <div class="menu" id="export-menu" hidden>
          <button class="menu__item" data-scale="1">原尺寸<span class="mono">1x</span></button>
          <button class="menu__item" data-scale="2">二倍<span class="mono">2x</span></button>
          <button class="menu__item" data-scale="4">四倍<span class="mono">4x</span></button>
        </div>
      </div>
    </div>
    <div class="editor__body">
      <aside class="editor__fx">
        <div class="panel__title">效果 <span class="panel__count" id="fx-count"></span></div>
        <ul class="fx-list" id="fx-list"></ul>
        <div class="presets">
          <div class="panel__title">预设 <span class="panel__count" id="preset-count"></span></div>
          <div class="presets__new">
            <input id="preset-name" class="text-input" type="text" placeholder="新预设名称" maxlength="20">
            <button id="btn-preset-save" class="btn btn--sm" type="button">保存</button>
          </div>
          <ul class="preset-list" id="preset-list"></ul>
          <div class="presets__io">
            <button id="btn-preset-export" class="btn btn--sm btn--ghost" type="button">导出 JSON</button>
            <button id="btn-preset-import" class="btn btn--sm btn--ghost" type="button">导入 JSON</button>
            <input id="preset-file" class="visually-hidden" type="file" accept=".json,application/json">
          </div>
        </div>
      </aside>
      <main class="editor__stage">
        <div class="stage__wrap" id="stage-wrap">
          <div class="stage__empty" id="stage-empty">
            <span class="stage__empty-title">拖入图片，开始实验</span>
            <span class="stage__empty-hint">也可以点击「打开图片」、按 <kbd>Ctrl</kbd>+<kbd>V</kbd> 粘贴，或使用上方示例图</span>
          </div>
          <div class="stage__stack" id="stage-stack" hidden>
            <canvas class="stage__canvas stage__before" id="stage-before"></canvas>
            <canvas class="stage__canvas stage__gl" id="stage-gl"></canvas>
            <div class="stage__divider" id="stage-divider"></div>
          </div>
          <div class="gl-fallback" id="gl-fallback" hidden>
            <strong>当前浏览器不支持 WebGL</strong>
            <span>效果预览与导出不可用。请使用最新版 Chrome / Edge / Firefox / Safari 打开。</span>
          </div>
        </div>
        <div class="stage__status mono" id="stage-status"></div>
      </main>
      <aside class="editor__params" id="params-panel">
        <div class="panel__title">参数</div>
        <div id="params-body"></div>
      </aside>
    </div>`;

  els.fileInput = wrap.querySelector('#file-input');
  els.fxList = wrap.querySelector('#fx-list');
  els.fxCount = wrap.querySelector('#fx-count');
  els.stageWrap = wrap.querySelector('#stage-wrap');
  els.stageEmpty = wrap.querySelector('#stage-empty');
  els.stack = wrap.querySelector('#stage-stack');
  els.beforeCanvas = wrap.querySelector('#stage-before');
  els.glCanvas = wrap.querySelector('#stage-gl');
  els.divider = wrap.querySelector('#stage-divider');
  els.status = wrap.querySelector('#stage-status');
  els.paramsBody = wrap.querySelector('#params-body');
  els.btnCompare = wrap.querySelector('#btn-compare');
  els.btnRandom = wrap.querySelector('#btn-random');
  els.btnClear = wrap.querySelector('#btn-clear');
  els.btnExport = wrap.querySelector('#btn-export');
  els.exportMenu = wrap.querySelector('#export-menu');
  els.glFallback = wrap.querySelector('#gl-fallback');
  els.btnOpen = wrap.querySelector('#btn-open');
  els.presetCount = wrap.querySelector('#preset-count');
  els.presetList = wrap.querySelector('#preset-list');
  els.presetName = wrap.querySelector('#preset-name');
  els.presetSave = wrap.querySelector('#btn-preset-save');
  els.presetExport = wrap.querySelector('#btn-preset-export');
  els.presetImport = wrap.querySelector('#btn-preset-import');
  els.presetFile = wrap.querySelector('#preset-file');
  viewRoot.appendChild(wrap);
  root = wrap;
}

/* ---------- 预设 ---------- */

function renderPresetList() {
  els.presetList.innerHTML = '';
  if (!presets.length) {
    els.presetList.appendChild(el('li', 'presets__empty', '还没有预设。调好效果后保存一个。'));
  }
  for (const p of presets) {
    const li = el('li', 'preset-item');
    li.dataset.preset = p.id;
    li.innerHTML = `
      <span class="preset-item__body">
        <span class="preset-item__name">${escapeHtml(p.name)}${p.builtin ? ' <span class="preset-item__meta">内置</span>' : ''}</span>
        <span class="preset-item__meta">${presetEffectCount(p)} 个效果</span>
      </span>
      <button class="btn btn--sm" data-apply="${p.id}" type="button">应用</button>
      <button class="preset-item__del" data-del="${p.id}" type="button" title="删除预设" aria-label="删除${escapeHtml(p.name)}">×</button>`;
    li.querySelector('[data-apply]').addEventListener('click', (e) => {
      e.stopPropagation();
      applyPreset(p.id);
    });
    li.querySelector('[data-del]').addEventListener('click', (e) => {
      e.stopPropagation();
      deletePreset(p.id);
    });
    els.presetList.appendChild(li);
  }
  els.presetCount.textContent = String(presets.length);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function applyPreset(id) {
  const preset = presets.find((p) => p.id === id);
  if (!preset) return;
  for (const fx of EFFECTS) {
    const st = fxState.get(fx.id);
    if (!st) continue;
    const p = preset.effects[fx.id];
    if (p) {
      st.enabled = true;
      for (const param of fx.params || []) {
        if (p.params && p.params[param.id] !== undefined) st.params[param.id] = p.params[param.id];
      }
    } else {
      st.enabled = false;
    }
  }
  renderFxList();
  renderParamsPanel();
  render();
  persist();
  flashStatus(`已应用预设「${preset.name}」`);
}

function saveCurrentAsPreset() {
  const enabledCount = activeChain().length;
  if (!enabledCount) {
    flashStatus('先启用至少一个效果再保存', true);
    return;
  }
  const name = (els.presetName.value || '').trim() || `预设 ${presets.length + 1}`;
  const preset = snapshotToPreset(name, fxState);
  presets.push(preset);
  savePresets(presets);
  renderPresetList();
  els.presetName.value = '';
  flashStatus(`已保存预设「${preset.name}」`);
}

function deletePreset(id) {
  const idx = presets.findIndex((p) => p.id === id);
  if (idx === -1) return;
  const [removed] = presets.splice(idx, 1);
  savePresets(presets);
  renderPresetList();
  flashStatus(`已删除预设「${removed.name}」`);
}

function exportPresets() {
  const blob = new Blob([JSON.stringify({ version: 1, presets }, null, 2)], { type: 'application/json' });
  downloadBlob(blob, 'effectlab-presets.json');
  flashStatus(`已导出 ${presets.length} 个预设`);
}

async function importPresetsFile(file) {
  if (!file) return;
  try {
    const text = await file.text();
    const incoming = parseImportedPresets(text);
    const existing = new Set(presets.map((p) => p.id));
    let added = 0;
    for (const p of incoming) {
      if (existing.has(p.id)) p.id = p.id + '-import-' + Date.now().toString(36);
      presets.push(p);
      added++;
    }
    savePresets(presets);
    renderPresetList();
    flashStatus(`已导入 ${added} 个预设`);
  } catch (e) {
    flashStatus(`导入失败：${e.message}`, true);
  }
}

/* ---------- 效果列表面板 ---------- */

function renderFxList() {
  els.fxList.innerHTML = '';
  for (const fx of EFFECTS) {
    const st = fxState.get(fx.id);
    const li = document.createElement('li');
    li.className =
      'fx-item' +
      (state.selectedId === fx.id ? ' fx-item--selected' : '') +
      (fx.status !== 'live' ? ' fx-item--planned' : '');
    li.dataset.fx = fx.id;
    li.innerHTML = `
      <input type="checkbox" class="fx-item__switch" ${st.enabled ? 'checked' : ''} ${
        fx.status !== 'live' ? 'disabled' : ''
      } aria-label="启用${fx.nameZh}">
      <span class="fx-item__body">
        <span class="fx-item__name">${fx.nameZh}<span class="fx-item__en">${fx.name}</span></span>
        <span class="fx-item__meta">${fx.status === 'live' ? fx.category : '规划中'}</span>
      </span>`;
    const cb = li.querySelector('input');
    cb.addEventListener('click', (e) => e.stopPropagation());
    cb.addEventListener('change', () => toggleEffect(fx.id, cb.checked));
    li.addEventListener('click', () => setSelected(fx.id));
    els.fxList.appendChild(li);
  }
  const liveCount = EFFECTS.filter((f) => f.status === 'live').length;
  els.fxCount.textContent = `${activeChain().length}/${liveCount}`;
}

function setSelected(id) {
  state.selectedId = id;
  els.fxList.querySelectorAll('.fx-item').forEach((li) => {
    li.classList.toggle('fx-item--selected', li.dataset.fx === id);
  });
  renderParamsPanel();
  persist();
}

function toggleEffect(id, on) {
  const st = fxState.get(id);
  if (!st) return;
  st.enabled = on;
  setSelected(id);
  renderFxList();
  render();
  persist();
}

/* ---------- 参数面板 ---------- */

function paramRow(fx, p, value) {
  if (p.type === 'color') {
    return `<div class="param param--color">
      <div class="param__head"><span class="param__label">${p.label}</span>
        <span class="param__swatch"><span class="param__value mono">${String(value).toUpperCase()}</span>
        <input type="color" class="color-input" value="${value}" data-param="${p.id}" data-effect="${fx.id}"></span>
      </div>
    </div>`;
  }
  return `<div class="param">
    <div class="param__head"><span class="param__label">${p.label}</span>
      <span class="param__value mono">${Number(value).toFixed(2)}</span></div>
    <input type="range" class="range" min="${p.min}" max="${p.max}" step="${p.step}" value="${value}"
      data-param="${p.id}" data-effect="${fx.id}">
  </div>`;
}

function renderParamsPanel() {
  const fx = state.selectedId ? getEffect(state.selectedId) : null;
  if (!fx) {
    els.paramsBody.innerHTML = `<div class="params__empty">在左侧选择一个效果，在这里调整它的参数。</div>`;
    return;
  }
  const st = fxState.get(fx.id);
  const head = `
    <div class="params__header">
      <span class="params__name">${fx.nameZh} <span class="fx-item__en">${fx.name}</span></span>
      <span class="params__desc">${fx.desc}</span>
      ${
        fx.status !== 'live'
          ? `<span class="params__desc" style="color:var(--text-warning)">该效果开发中，将在后续阶段上线。</span>`
          : ''
      }
    </div>`;
  if (fx.status !== 'live' || !fx.params || !fx.params.length) {
    els.paramsBody.innerHTML = head;
    return;
  }
  const rows = fx.params.map((p) => paramRow(fx, p, st.params[p.id])).join('');
  els.paramsBody.innerHTML = head + `<div class="params__list">${rows}</div>`;

  els.paramsBody.querySelectorAll('[data-param]').forEach((input) => {
    input.addEventListener('input', () => {
      const eid = input.dataset.effect;
      const pid = input.dataset.param;
      const isRange = input.type === 'range';
      const v = isRange ? Number(input.value) : input.value;
      setParam(eid, pid, v);
      const valueEl = input.closest('.param').querySelector('.param__value');
      if (valueEl) valueEl.textContent = isRange ? v.toFixed(2) : String(v).toUpperCase();
    });
  });
}

function setParam(effectId, paramId, value) {
  const st = fxState.get(effectId);
  if (!st) return;
  st.params[paramId] = value;
  render();
  persist();
}

/* ---------- 图像载入 ---------- */

function downscale(source, max) {
  const w = source.width;
  const h = source.height;
  const m = Math.max(w, h);
  if (m <= max) return { source, width: w, height: h };
  const k = max / m;
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * k));
  c.height = Math.max(1, Math.round(h * k));
  c.getContext('2d').drawImage(source, 0, 0, c.width, c.height);
  return { source: c, width: c.width, height: c.height };
}

function setImage(source, name) {
  const w = source.width;
  const h = source.height;
  state.image = { source, width: w, height: h, name: name || 'image' };
  state.preview = downscale(source, PREVIEW_MAX);
  if (pipeline) pipeline.setImage(state.preview.source, state.preview.width, state.preview.height);
  els.stageEmpty.hidden = true;
  els.stack.hidden = false;
  layoutStage();
  render();
}

async function loadFile(file) {
  if (!file) return;
  if (!file.type || !file.type.startsWith('image/')) {
    flashStatus('请拖入图片文件（PNG / JPG / WebP）', true);
    return;
  }
  try {
    const bmp = await createImageBitmap(file);
    setImage(bmp, file.name || 'image');
    flashStatus(`已载入 ${file.name || '图片'}`);
  } catch {
    flashStatus('图片解码失败，换一张试试', true);
  }
}

function loadSample(sample) {
  const canvas = renderSample(sample);
  setImage(canvas, `sample-${sample.id}`);
}

/* ---------- 舞台布局与渲染 ---------- */

function layoutStage() {
  if (!state.image || !pipeline) return;
  const availW = els.stageWrap.clientWidth - 48;
  const availH = els.stageWrap.clientHeight - 48;
  if (availW <= 0 || availH <= 0) return;
  const iw = state.image.width;
  const ih = state.image.height;
  const scale = Math.min(availW / iw, availH / ih);
  const dispW = Math.max(1, Math.round(iw * scale));
  const dispH = Math.max(1, Math.round(ih * scale));
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  els.stack.style.width = `${dispW}px`;
  els.stack.style.height = `${dispH}px`;
  els.beforeCanvas.width = Math.round(dispW * dpr);
  els.beforeCanvas.height = Math.round(dispH * dpr);
  pipeline.resize(dispW * dpr, dispH * dpr);
}

function drawFrame() {
  if (!pipeline || !state.image) return;
  try {
    const ms = pipeline.apply(activeChain());
    frameAvg = frameAvg ? frameAvg * 0.9 + ms * 0.1 : ms;
  } catch (e) {
    // 单个效果组合编译/渲染失败不应让整个循环静默死掉
    flashStatus('渲染失败：' + (e && e.message ? e.message : e), true);
    return;
  }
  const bctx = els.beforeCanvas.getContext('2d');
  bctx.clearRect(0, 0, els.beforeCanvas.width, els.beforeCanvas.height);
  bctx.drawImage(state.image.source, 0, 0, els.beforeCanvas.width, els.beforeCanvas.height);
  updateStatus();
}

function render() {
  if (rafId) return;
  rafId = requestAnimationFrame(() => {
    rafId = 0;
    drawFrame();
  });
}

function applyCompareClip() {
  if (state.compare === null) {
    els.glCanvas.style.clipPath = 'none';
    els.divider.classList.remove('stage__divider--visible');
  } else {
    const p = Math.min(Math.max(state.compare, 0), 1);
    els.glCanvas.style.clipPath = `inset(0 0 0 ${p * 100}%)`;
    els.divider.style.left = `${p * 100}%`;
    els.divider.classList.add('stage__divider--visible');
  }
}

function updateStatus() {
  const parts = [];
  if (state.image) parts.push(`原图 <b>${state.image.width} × ${state.image.height}</b>`);
  parts.push(`效果 <b>${activeChain().length}</b> 启用`);
  parts.push(`帧耗时 <b>${frameAvg ? frameAvg.toFixed(2) : '0.00'}</b> ms`);
  if (state.preview && state.preview.width !== state.image.width) {
    parts.push(`预览 <b>${state.preview.width}</b>px`);
  }
  els.status.innerHTML = parts.join('<span style="color:var(--color-gray-700)"> · </span>');
}

function flashStatus(msg, isError) {
  clearTimeout(statusTimer);
  els.status.innerHTML = `<span class="${isError ? 'status--warn' : ''}">${msg}</span>`;
  statusTimer = setTimeout(updateStatus, 2400);
}

/* ---------- 交互：随机 / 清除 / 对比 / 导出 ---------- */

function randomize() {
  let count = 0;
  for (const fx of EFFECTS) {
    if (fx.status !== 'live') continue;
    const st = fxState.get(fx.id);
    if (!st || !st.enabled) continue;
    for (const p of fx.params) {
      if (p.type === 'color') {
        st.params[p.id] = randomVividColor();
      } else {
        const raw = p.min + Math.random() * (p.max - p.min);
        const snapped = Math.round((raw - p.min) / p.step) * p.step + p.min;
        st.params[p.id] = Number(Math.min(p.max, Math.max(p.min, snapped)).toFixed(4));
      }
      count++;
    }
  }
  if (!count) {
    flashStatus('先启用至少一个效果', true);
    return;
  }
  renderParamsPanel();
  render();
  persist();
  flashStatus('已随机参数');
}

function clearAll() {
  for (const fx of EFFECTS) {
    const st = fxState.get(fx.id);
    if (st) st.enabled = false;
  }
  renderFxList();
  render();
  persist();
  flashStatus('已清除全部效果');
}

function toggleCompare() {
  state.compare = state.compare === null ? 0.5 : null;
  applyCompareClip();
  els.btnCompare.classList.toggle('btn--primary', state.compare !== null);
}

async function doExport(scale) {
  if (!state.image || !pipeline || exporting) return;
  exporting = true;
  els.btnExport.disabled = true;
  flashStatus(`正在导出 ${scale}x …`);
  try {
    const blob = await exportPNG(
      activeChain(),
      state.image.source,
      state.image.width,
      state.image.height,
      scale,
      pipeline.maxTextureSize
    );
    downloadBlob(blob, `effectlab-${state.image.name.replace(/\.[^.]+$/, '')}-${scale}x.png`);
    flashStatus(`已导出 ${scale}x PNG`);
  } catch (e) {
    flashStatus(`导出失败：${e.message}`, true);
  } finally {
    exporting = false;
    els.btnExport.disabled = false;
  }
}

/* ---------- 事件绑定 ---------- */

function isEditorActive() {
  return root.classList.contains('view--active');
}

function bindEvents() {
  els.btnOpen.addEventListener('click', () => els.fileInput.click());
  els.fileInput.addEventListener('change', () => {
    if (els.fileInput.files && els.fileInput.files[0]) loadFile(els.fileInput.files[0]);
    els.fileInput.value = '';
  });

  els.presetSave.addEventListener('click', saveCurrentAsPreset);
  els.presetName.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveCurrentAsPreset();
    e.stopPropagation();
  });
  els.presetExport.addEventListener('click', exportPresets);
  els.presetImport.addEventListener('click', () => els.presetFile.click());
  els.presetFile.addEventListener('change', () => {
    if (els.presetFile.files && els.presetFile.files[0]) importPresetsFile(els.presetFile.files[0]);
    els.presetFile.value = '';
  });

  root.querySelectorAll('[data-sample]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const sample = SAMPLES.find((s) => s.id === btn.dataset.sample);
      if (sample) loadSample(sample);
    });
  });

  els.btnCompare.addEventListener('click', toggleCompare);
  els.btnRandom.addEventListener('click', randomize);
  els.btnClear.addEventListener('click', clearAll);

  els.btnExport.addEventListener('click', (e) => {
    e.stopPropagation();
    els.exportMenu.hidden = !els.exportMenu.hidden;
  });
  els.exportMenu.querySelectorAll('[data-scale]').forEach((item) => {
    item.addEventListener('click', () => {
      els.exportMenu.hidden = true;
      doExport(Number(item.dataset.scale));
    });
  });
  document.addEventListener('click', () => {
    els.exportMenu.hidden = true;
  });

  /* 拖拽 */
  els.stageWrap.addEventListener('dragover', (e) => {
    e.preventDefault();
    els.stack.classList.add('stage__stack--dragover');
    els.stageEmpty.classList.add('stage__stack--dragover');
  });
  const clearDrag = () => {
    els.stack.classList.remove('stage__stack--dragover');
    els.stageEmpty.classList.remove('stage__stack--dragover');
  };
  els.stageWrap.addEventListener('dragleave', clearDrag);
  els.stageWrap.addEventListener('drop', (e) => {
    e.preventDefault();
    clearDrag();
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    loadFile(file);
  });
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => e.preventDefault());

  /* 对比分割线拖动 */
  let dragging = false;
  const onMove = (e) => {
    if (!dragging) return;
    const rect = els.stack.getBoundingClientRect();
    state.compare = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    applyCompareClip();
  };
  els.stack.addEventListener('pointerdown', (e) => {
    if (e.target === els.divider || e.button !== 0) {
      dragging = true;
      els.stack.setPointerCapture(e.pointerId);
      onMove(e);
    }
  });
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', () => {
    dragging = false;
  });

  /* 尺寸变化 */
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => {
      layoutStage();
      render();
    }).observe(els.stageWrap);
  } else {
    window.addEventListener('resize', () => {
      layoutStage();
      render();
    });
  }

  /* 键盘 */
  window.addEventListener('keydown', (e) => {
    if (!isEditorActive()) return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
    if (e.code === 'Space') {
      e.preventDefault();
      if (state.compare === null) {
        spaceCompare = true;
        state.compare = 0.5;
        applyCompareClip();
      }
    } else if (e.key === 'r' || e.key === 'R') {
      randomize();
    } else if (e.key === 'e' || e.key === 'E') {
      doExport(1);
    }
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space' && spaceCompare && isEditorActive()) {
      spaceCompare = false;
      state.compare = null;
      applyCompareClip();
    }
  });

  /* 粘贴图片 */
  window.addEventListener('paste', (e) => {
    if (!isEditorActive()) return;
    const items = e.clipboardData && e.clipboardData.items;
    if (!items) return;
    for (const it of items) {
      if (it.type && it.type.startsWith('image/')) {
        const file = it.getAsFile();
        if (file) loadFile(file);
        break;
      }
    }
  });
}

/* ---------- 视图生命周期 ---------- */

export function mountEditor(viewRoot) {
  root = viewRoot;
  initFxState();
  presets = loadPresets();
  buildDom(viewRoot);

  try {
    pipeline = new Pipeline(els.glCanvas);
  } catch (e) {
    glError = e;
    els.glFallback.hidden = false;
    els.stack.hidden = true;
    els.btnExport.disabled = true;
    els.btnRandom.disabled = true;
  }

  renderFxList();
  renderParamsPanel();
  renderPresetList();
  bindEvents();
  updateStatus();

  // 控制台调试接口（个人工具，方便在 DevTools 里把玩与自动化验收）
  window.__effectlab = {
    version: '0.1',
    state: () => ({
      hasImage: !!state.image,
      imageSize: state.image ? [state.image.width, state.image.height] : null,
      chain: activeChain().map((c) => c.effect.id),
      selected: state.selectedId,
      compare: state.compare,
      frameMs: frameAvg,
      glError: glError ? glError.message : null,
      maxTextureSize: pipeline ? pipeline.maxTextureSize : null,
    }),
    export: (scale) => doExport(scale),
    renderNow: () => drawFrame(),
    setParam: (effectId, paramId, value) => setParam(effectId, paramId, value),
    toggle: (effectId, on) => toggleEffect(effectId, on),
    clear: () => clearAll(),
    loadSample: (id) => {
      const s = SAMPLES.find((x) => x.id === id);
      if (s) loadSample(s);
    },
    presets: () => presets.map((p) => ({ id: p.id, name: p.name, builtin: p.builtin, count: presetEffectCount(p) })),
    applyPreset,
    savePreset: saveCurrentAsPreset,
    deletePreset,
  };
}

export function activateEditor(params) {
  root.classList.add('view--active');
  const app = document.getElementById('app');
  if (app) app.classList.add('app--locked'); // 锁视口：面板内滚，页面不整体滚动
  document.title = '编辑器 — Effectlab';

  const effectId = params && params.get ? params.get('effect') : null;
  if (effectId) {
    const fx = getEffect(effectId);
    if (fx && fx.status === 'live') {
      const st = fxState.get(fx.id);
      if (st) st.enabled = true;
      renderFxList();
      persist();
    }
    setSelected(effectId);
  }

  if (!state.image) loadSample(SAMPLES[0]);
  layoutStage();
  render();
}

export function deactivateEditor() {
  root.classList.remove('view--active');
  const app = document.getElementById('app');
  if (app) app.classList.remove('app--locked');
}
