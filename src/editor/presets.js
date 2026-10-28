/* 预设系统：localStorage 持久化 + 内置预设种子 + JSON 导入导出
 * 存储键：effectlab:presets:v1
 * 预设结构：{ id, name, builtin, createdAt, effects: { effectId: { enabled, params } } }
 *   —— 只保存 enabled=true 的效果及其参数，保持 JSON 精简
 */

import { EFFECTS, defaultParams } from './effects.js';

const KEY = 'effectlab:presets:v1';

/** 内置预设：首次运行（无存储）时种子入库，展示效果组合的用法 */
const BUILTINS = [
  {
    id: 'builtin-neon-poster',
    name: '霓虹海报',
    effects: {
      duotone: { enabled: true, params: { shadow: '#0a0a3c', highlight: '#ff2d95' } },
      glitch: { enabled: true, params: { amount: 0.35, block: 0.05, rgb: 0.6, seed: 0.42 } },
    },
  },
  {
    id: 'builtin-newsprint',
    name: '报纸印刷',
    effects: {
      monochrome: { enabled: true, params: { tint: '#d8d4c8', contrast: 1.35 } },
      threshold: { enabled: true, params: { level: 0.52, softness: 0.12 } },
    },
  },
  {
    id: 'builtin-vhs-rewind',
    name: '录像带回溯',
    effects: {
      'color-grading': { enabled: true, params: { brightness: -0.04, contrast: 1.1, saturation: 0.75, temperature: -0.25 } },
      vhs: { enabled: true, params: { scanline: 0.6, noise: 0.35, chroma: 0.5, warp: 0.45 } },
    },
  },
];

function normalizePreset(raw, fallbackId) {
  if (!raw || typeof raw !== 'object') return null;
  const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim().slice(0, 40) : '未命名预设';
  const effects = {};
  if (raw.effects && typeof raw.effects === 'object') {
    for (const [eid, val] of Object.entries(raw.effects)) {
      const fx = EFFECTS.find((e) => e.id === eid);
      if (!fx || !val || val.enabled !== true) continue;
      const params = {};
      for (const p of fx.params || []) {
        if (val.params && val.params[p.id] !== undefined) params[p.id] = val.params[p.id];
      }
      effects[eid] = { enabled: true, params };
    }
  }
  if (!Object.keys(effects).length) return null;
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : fallbackId,
    name,
    builtin: !!raw.builtin,
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now(),
    effects,
  };
}

/** 读取预设列表；首次运行种子化内置预设 */
export function loadPresets() {
  let list = null;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        list = parsed.map((p, i) => normalizePreset(p, 'p-' + Date.now() + '-' + i)).filter(Boolean);
      }
    }
  } catch {
    list = null;
  }
  if (!list || !list.length) {
    list = BUILTINS.map((b) => ({
      id: b.id,
      name: b.name,
      builtin: true,
      createdAt: 0,
      effects: b.effects,
    }));
    savePresets(list);
  }
  return list;
}

export function savePresets(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* 隐私模式等场景下静默失败 */
  }
}

/** 从当前编辑器状态快照生成预设（只含启用效果） */
export function snapshotToPreset(name, fxState) {
  const effects = {};
  for (const fx of EFFECTS) {
    const st = fxState.get(fx.id);
    if (st && st.enabled && fx.status === 'live') {
      effects[fx.id] = { enabled: true, params: { ...st.params } };
    }
  }
  return {
    id: 'p-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7),
    name: name.slice(0, 40),
    builtin: false,
    createdAt: Date.now(),
    effects,
  };
}

/** 预设中引用的效果数量（用于列表展示） */
export function presetEffectCount(preset) {
  return Object.keys(preset.effects || {}).length;
}

/** 导入校验：接受 { presets: [...] } 或 [...] */
export function parseImportedPresets(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('不是合法的 JSON 文件');
  }
  const arr = Array.isArray(data) ? data : Array.isArray(data && data.presets) ? data.presets : null;
  if (!arr) throw new Error('JSON 结构应为预设数组或 { presets: [...] }');
  const out = [];
  for (const item of arr) {
    const p = normalizePreset(item, 'p-' + Date.now().toString(36) + '-' + out.length);
    if (p) out.push(p);
  }
  if (!out.length) throw new Error('没有可导入的有效预设');
  return out;
}
