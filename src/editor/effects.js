/* 效果注册表 —— 单一数据源，编辑器与展示页效果墙共用
 * status: 'live' 已实现 | 'planned' 规划中
 * params 类型: 'range'（min/max/step/default）| 'color'（default 为 #rrggbb）
 * glsl: 片元函数体，统一签名为 vec3 fx_<id>(vec3 c, vec2 uv)，
 *       参数 uniform 由管线按约定自动生成：u_fx_<id>_<paramId>
 *       color → vec3，range → float
 *       可用全局：u_tex（源图）、u_res（画布分辨率）、v_uv、共享函数 fx_hash(vec2)
 *       效果内自定义辅助函数必须加 fx_<id>_ 前缀，避免多效果串联时重名
 */

export const EFFECT_CATEGORIES = {
  Color: '色彩',
  Effects: '特效',
  Distort: '畸变',
  Blur: '模糊',
  Custom: '自定义',
};

export const EFFECTS = [
  /* ============ Phase 1：已实现 ============ */
  {
    id: 'duotone',
    name: 'Duotone',
    nameZh: '双色调',
    category: 'Color',
    status: 'live',
    desc: '把画面亮度映射到「暗部 — 亮部」两种颜色之间的渐变，海报与唱片封面常用。',
    params: [
      { id: 'shadow', label: '暗部颜色', type: 'color', default: '#1b1f8a' },
      { id: 'highlight', label: '亮部颜色', type: 'color', default: '#ffd166' },
    ],
    glsl: `
vec3 fx_duotone(vec3 c, vec2 uv) {
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  return mix(u_fx_duotone_shadow, u_fx_duotone_highlight, clamp(l, 0.0, 1.0));
}`,
  },
  {
    id: 'monochrome',
    name: 'Monochrome',
    nameZh: '单色',
    category: 'Color',
    status: 'live',
    desc: '灰度化后叠加单色染色，可调对比度。适合统一多张图片的色调。',
    params: [
      { id: 'tint', label: '染色', type: 'color', default: '#e8e8ea' },
      { id: 'contrast', label: '对比度', type: 'range', min: 0, max: 2, step: 0.01, default: 1 },
    ],
    glsl: `
vec3 fx_monochrome(vec3 c, vec2 uv) {
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  l = clamp((l - 0.5) * u_fx_monochrome_contrast + 0.5, 0.0, 1.0);
  return mix(vec3(0.0), u_fx_monochrome_tint, l);
}`,
  },
  {
    id: 'threshold',
    name: 'Threshold',
    nameZh: '阈值',
    category: 'Effects',
    status: 'live',
    desc: '以亮度阈值做硬切分，得到黑白双值画面；软化参数可得到灰边过渡。',
    params: [
      { id: 'level', label: '阈值', type: 'range', min: 0, max: 1, step: 0.01, default: 0.5 },
      { id: 'softness', label: '边缘软化', type: 'range', min: 0, max: 0.5, step: 0.01, default: 0.08 },
    ],
    glsl: `
vec3 fx_threshold(vec3 c, vec2 uv) {
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float edge = max(u_fx_threshold_softness, 0.0001);
  float m = smoothstep(u_fx_threshold_level - edge, u_fx_threshold_level + edge, l);
  return mix(vec3(0.0), vec3(1.0), m);
}`,
  },

  /* ============ Phase 2：已实现 ============ */
  {
    id: 'color-grading',
    name: 'Color Grading',
    nameZh: '调色',
    category: 'Color',
    status: 'live',
    desc: '亮度、对比度、饱和度与色温四联调，所有效果的通用前/后级。',
    params: [
      { id: 'brightness', label: '亮度', type: 'range', min: -0.5, max: 0.5, step: 0.01, default: 0 },
      { id: 'contrast', label: '对比度', type: 'range', min: 0, max: 2, step: 0.01, default: 1 },
      { id: 'saturation', label: '饱和度', type: 'range', min: 0, max: 2, step: 0.01, default: 1 },
      { id: 'temperature', label: '色温', type: 'range', min: -1, max: 1, step: 0.01, default: 0 },
    ],
    glsl: `
vec3 fx_color_grading(vec3 c, vec2 uv) {
  vec3 v = c + u_fx_color_grading_brightness;
  v = (v - 0.5) * u_fx_color_grading_contrast + 0.5;
  float l = dot(v, vec3(0.2126, 0.7152, 0.0722));
  v = mix(vec3(l), v, u_fx_color_grading_saturation);
  v.r += u_fx_color_grading_temperature * 0.12;
  v.b -= u_fx_color_grading_temperature * 0.12;
  return clamp(v, 0.0, 1.0);
}`,
  },
  {
    id: 'vhs',
    name: 'VHS',
    nameZh: '录像带',
    category: 'Effects',
    status: 'live',
    desc: '行抖动、色度分离、扫描线与噪点，模拟磁带录像的质感。',
    params: [
      { id: 'scanline', label: '扫描线', type: 'range', min: 0, max: 1, step: 0.01, default: 0.5 },
      { id: 'noise', label: '噪点', type: 'range', min: 0, max: 1, step: 0.01, default: 0.3 },
      { id: 'chroma', label: '色度分离', type: 'range', min: 0, max: 1, step: 0.01, default: 0.4 },
      { id: 'warp', label: '行抖动', type: 'range', min: 0, max: 1, step: 0.01, default: 0.4 },
    ],
    glsl: `
vec3 fx_vhs(vec3 c, vec2 uv) {
  float row = floor(uv.y * u_res.y * 0.34);
  float jitter = fx_hash(vec2(row, 3.0)) - 0.5;
  vec2 uvv = vec2(uv.x + jitter * 0.006 * u_fx_vhs_warp, uv.y);
  float shift = u_fx_vhs_chroma * 0.005;
  vec3 v;
  v.r = texture2D(u_tex, clamp(uvv + vec2(shift, 0.0), 0.0, 1.0)).r;
  v.g = texture2D(u_tex, clamp(uvv, 0.0, 1.0)).g;
  v.b = texture2D(u_tex, clamp(uvv - vec2(shift, 0.0), 0.0, 1.0)).b;
  float scan = 0.5 + 0.5 * sin(uvv.y * u_res.y * 3.14159265);
  v *= 1.0 - u_fx_vhs_scanline * 0.45 * (1.0 - scan);
  float n = fx_hash(uvv * u_res);
  v += (n - 0.5) * u_fx_vhs_noise * 0.3;
  return clamp(v, 0.0, 1.0);
}`,
  },
  {
    id: 'glitch',
    name: 'Glitch',
    nameZh: '故障',
    category: 'Distort',
    status: 'live',
    desc: '行块撕裂、RGB 通道错位与随机反色块，数字故障美学。',
    params: [
      { id: 'amount', label: '强度', type: 'range', min: 0, max: 1, step: 0.01, default: 0.5 },
      { id: 'block', label: '块大小', type: 'range', min: 0.01, max: 0.2, step: 0.01, default: 0.06 },
      { id: 'rgb', label: 'RGB 错位', type: 'range', min: 0, max: 1, step: 0.01, default: 0.5 },
      { id: 'seed', label: '随机种子', type: 'range', min: 0, max: 1, step: 0.01, default: 0.3 },
    ],
    glsl: `
vec3 fx_glitch(vec3 c, vec2 uv) {
  float seed = u_fx_glitch_seed * 97.0;
  float rows = max(24.0, u_res.y * u_fx_glitch_block);
  float row = floor(uv.y * rows);
  float r = fx_hash(vec2(row, seed));
  float tear = step(1.0 - u_fx_glitch_amount * 0.35, r);
  vec2 uvv = uv;
  uvv.x += (fx_hash(vec2(row, seed + 5.0)) - 0.5) * 0.25 * tear * u_fx_glitch_amount;
  float s = u_fx_glitch_rgb * 0.03 * u_fx_glitch_amount;
  vec3 v;
  v.r = texture2D(u_tex, clamp(uvv + vec2(s, 0.0), 0.0, 1.0)).r;
  v.g = texture2D(u_tex, clamp(uvv, 0.0, 1.0)).g;
  v.b = texture2D(u_tex, clamp(uvv - vec2(s, 0.0), 0.0, 1.0)).b;
  vec2 cell = floor(uv * vec2(18.0, 32.0));
  float blk = step(0.985 - u_fx_glitch_amount * 0.03, fx_hash(cell + seed));
  v = mix(v, 1.0 - v, blk * 0.85);
  return clamp(v, 0.0, 1.0);
}`,
  },
  {
    id: 'motion-blur',
    name: 'Motion Blur',
    nameZh: '动态模糊',
    category: 'Blur',
    status: 'live',
    desc: '沿指定方向做 12 次加权采样，给静态图加运动方向感。',
    params: [
      { id: 'angle', label: '方向（度）', type: 'range', min: 0, max: 360, step: 1, default: 45 },
      { id: 'distance', label: '距离', type: 'range', min: 0, max: 1, step: 0.01, default: 0.35 },
    ],
    glsl: `
vec3 fx_motion_blur(vec3 c, vec2 uv) {
  float rad = u_fx_motion_blur_angle * 0.0174533;
  vec2 dir = vec2(cos(rad), sin(rad));
  float dist = u_fx_motion_blur_distance * 0.12;
  vec3 sum = vec3(0.0);
  float total = 0.0;
  for (int i = 0; i < 12; i++) {
    float t = float(i) / 11.0 - 0.5;
    float w = 1.0 - abs(t) * 0.55;
    sum += texture2D(u_tex, clamp(uv + dir * dist * t, 0.0, 1.0)).rgb * w;
    total += w;
  }
  return sum / total;
}`,
  },
  {
    id: 'displacement',
    name: 'Displacement',
    nameZh: '位移',
    category: 'Custom',
    status: 'live',
    desc: '用程序化 value noise 扭曲像素位置，玻璃与流体质感。',
    params: [
      { id: 'scale', label: '噪声密度', type: 'range', min: 0.5, max: 8, step: 0.1, default: 3 },
      { id: 'strength', label: '强度', type: 'range', min: 0, max: 1, step: 0.01, default: 0.35 },
    ],
    glsl: `
float fx_displacement_vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = fx_hash(i);
  float b = fx_hash(i + vec2(1.0, 0.0));
  float cc = fx_hash(i + vec2(0.0, 1.0));
  float d = fx_hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(cc, d, f.x), f.y);
}
vec3 fx_displacement(vec3 c, vec2 uv) {
  vec2 p = uv * u_fx_displacement_scale;
  float n1 = fx_displacement_vnoise(p);
  float n2 = fx_displacement_vnoise(p + vec2(17.0, 5.0));
  vec2 off = (vec2(n1, n2) - 0.5) * u_fx_displacement_strength * 0.25;
  return texture2D(u_tex, clamp(uv + off, 0.0, 1.0)).rgb;
}`,
  },
  {
    id: 'stripe',
    name: 'Stripe',
    nameZh: '条纹',
    category: 'Effects',
    status: 'live',
    desc: '横向条纹相位偏移与明暗调制，老电视信号干扰感。',
    params: [
      { id: 'count', label: '条纹数量', type: 'range', min: 2, max: 40, step: 1, default: 12 },
      { id: 'offset', label: '相位', type: 'range', min: 0, max: 1, step: 0.01, default: 0.3 },
      { id: 'softness', label: '边缘软化', type: 'range', min: 0, max: 0.5, step: 0.01, default: 0.12 },
    ],
    glsl: `
vec3 fx_stripe(vec3 c, vec2 uv) {
  float phase = fract(uv.y * u_fx_stripe_count + u_fx_stripe_offset);
  float m = smoothstep(0.5 - u_fx_stripe_softness, 0.5 + u_fx_stripe_softness, phase);
  vec2 uvv = vec2(uv.x + (m - 0.5) * 0.18, uv.y);
  vec3 v = texture2D(u_tex, clamp(uvv, 0.0, 1.0)).rgb;
  return v * (0.72 + 0.28 * m);
}`,
  },
  {
    id: 'thermal',
    name: 'Thermal',
    nameZh: '热成像',
    category: 'Color',
    status: 'live',
    desc: '亮度映射到热成像伪彩色带（黑紫→红→橙→黄白）。',
    params: [
      { id: 'contrast', label: '对比度', type: 'range', min: 0.5, max: 2, step: 0.01, default: 1.2 },
    ],
    glsl: `
vec3 fx_thermal(vec3 c, vec2 uv) {
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  l = clamp((l - 0.5) * u_fx_thermal_contrast + 0.5, 0.0, 1.0);
  vec3 col = vec3(0.02, 0.0, 0.12);
  col = mix(col, vec3(0.35, 0.0, 0.55), smoothstep(0.05, 0.3, l));
  col = mix(col, vec3(0.85, 0.1, 0.15), smoothstep(0.3, 0.55, l));
  col = mix(col, vec3(1.0, 0.55, 0.05), smoothstep(0.55, 0.78, l));
  col = mix(col, vec3(1.0, 0.98, 0.75), smoothstep(0.78, 1.0, l));
  return col;
}`,
  },
  {
    id: 'jpeg-glitch',
    name: 'JPEG Glitch',
    nameZh: '有损故障',
    category: 'Distort',
    status: 'live',
    desc: '块量化、块内位移与色阶塌陷，模拟 JPEG 数据损坏。',
    params: [
      { id: 'quality', label: '画质', type: 'range', min: 0.02, max: 1, step: 0.01, default: 0.35 },
      { id: 'blocks', label: '块数量', type: 'range', min: 4, max: 64, step: 1, default: 16 },
      { id: 'shift', label: '块位移', type: 'range', min: 0, max: 1, step: 0.01, default: 0.4 },
    ],
    glsl: `
vec3 fx_jpeg_glitch(vec3 c, vec2 uv) {
  float n = u_fx_jpeg_glitch_blocks;
  vec2 cellId = floor(uv * n);
  vec2 q = (cellId + 0.5) / n;
  float blockiness = 1.0 - u_fx_jpeg_glitch_quality;
  vec2 uvv = mix(uv, q, blockiness);
  float r = fx_hash(cellId);
  uvv.x += (r - 0.5) * 0.08 * u_fx_jpeg_glitch_shift * blockiness;
  vec3 v = texture2D(u_tex, clamp(uvv, 0.0, 1.0)).rgb;
  float levels = floor(mix(3.0, 24.0, u_fx_jpeg_glitch_quality));
  v = floor(v * levels + 0.5) / levels;
  return clamp(v, 0.0, 1.0);
}`,
  },
  {
    id: 'apple-ii',
    name: 'Apple II',
    nameZh: '复古终端',
    category: 'Effects',
    status: 'live',
    desc: '4×4 Bayer 有序抖动到 1-bit，绿色磷光 + 扫描线，复古终端风。',
    params: [
      { id: 'pixel', label: '像素大小', type: 'range', min: 1, max: 6, step: 1, default: 2 },
      { id: 'glow', label: '磷光', type: 'range', min: 0, max: 1, step: 0.01, default: 0.35 },
    ],
    glsl: `
float fx_apple_ii_bayer2(vec2 a) {
  a = floor(a);
  return fract(a.x * 0.5 + a.y * a.y * 0.75);
}
float fx_apple_ii_bayer4(vec2 a) {
  return fx_apple_ii_bayer2(0.5 * a) * 0.25 + fx_apple_ii_bayer2(a);
}
vec3 fx_apple_ii(vec3 c, vec2 uv) {
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  vec2 px = uv * u_res / (2.0 * u_fx_apple_ii_pixel);
  float t = fx_apple_ii_bayer4(px) * 0.8;
  float v = step(t, l);
  vec3 phosphor = vec3(0.25, 1.0, 0.4);
  vec3 col = phosphor * v;
  col += phosphor * l * u_fx_apple_ii_glow * 0.35;
  col *= 0.82 + 0.18 * sin(uv.y * u_res.y * 3.14159265);
  return clamp(col, 0.0, 1.0);
}`,
  },

  /* ============ Phase 3+：远期 ============ */
  {
    id: 'instant-film', name: 'Instant Film', nameZh: '拍立得', category: 'Color', status: 'planned',
    desc: '褪色、暗角与粗颗粒，宝丽来即时成像。',
  },
  {
    id: 'hue-curves', name: 'Hue Curves', nameZh: '色相曲线', category: 'Color', status: 'planned',
    desc: '逐色相偏移与替换，精准控制每个色相的表现。',
  },
  {
    id: 'texture-blur', name: 'Texture Blur', nameZh: '纹理模糊', category: 'Blur', status: 'planned',
    desc: '保留边缘的结构性模糊，磨皮与柔光。',
  },
  {
    id: 'layer-mix', name: 'Layer Mix', nameZh: '双图混合', category: 'Custom', status: 'planned',
    desc: '载入第二张图，按混合模式叠加。',
  },
  {
    id: 'modulation', name: 'Modulation', nameZh: '调制', category: 'Effects', status: 'planned',
    desc: '信号调制式条纹与闪烁。',
  },
  {
    id: 'elastic-grid', name: 'Elastic Grid', nameZh: '弹性网格', category: 'Distort', status: 'planned',
    desc: '网格弹性畸变。',
  },
  {
    id: 'grid-split', name: 'Grid Split', nameZh: '网格分裂', category: 'Distort', status: 'planned',
    desc: '按网格切分并错位画面。',
  },
];

const BY_ID = new Map(EFFECTS.map((e) => [e.id, e]));

export function getEffect(id) {
  return BY_ID.get(id) || null;
}

export function liveEffects() {
  return EFFECTS.filter((e) => e.status === 'live');
}

/* 由效果 id 生成确定性的占位渐变（展示页效果墙缩略图用） */
export function effectGradient(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  const hue2 = (hue + 40 + (h % 60)) % 360;
  return `linear-gradient(135deg, hsl(${hue} 65% 42%), hsl(${hue2} 70% 22%) 60%, hsl(${(hue2 + 30) % 360} 60% 12%))`;
}

/* 效果默认参数快照 */
export function defaultParams(effect) {
  const out = {};
  for (const p of effect.params || []) out[p.id] = p.default;
  return out;
}
