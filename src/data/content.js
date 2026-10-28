/* 展示页内容数据 —— Phase 4 完善作品画廊时只改这里 */

export const SITE = {
  name: 'Effectlab',
  nameEnUpper: 'EFFECTLAB',
  nameZh: '效果实验室',
  version: 'v0.2',
  heroTag: 'BROWSER-NATIVE IMAGE EFFECTS · 个人项目',
  heroTitle: '效果，即刻呈现。',
  heroDesc:
    '在浏览器里给图片套上双色调、故障、录像带、热成像等 12 种实时特效。全部本地处理，不上传服务器，断网也能用。',
  heroCtaPrimary: '打开编辑器',
  heroCtaSecondary: '浏览效果墙',
};

export const FEATURES = [
  {
    title: '实时预览',
    desc: '每次参数调整立即更新画面，实验以毫秒计。',
  },
  {
    title: '效果叠加',
    desc: '多个效果串联应用，叠加顺序即栈序，随时开关任何一个。',
  },
  {
    title: '对比滑块',
    desc: '拖动分割线或按住空格，随时对照原图与效果后画面。',
  },
  {
    title: '本地隐私',
    desc: '图片处理全部在浏览器内完成，不上传、不存储、不跟踪。',
  },
  {
    title: '预设系统',
    desc: '效果组合存为预设随时套用，支持 JSON 导入导出，内置 3 个组合示范。',
  },
  {
    title: '一键导出',
    desc: '按原尺寸或 2x / 4x 放大导出 PNG，导出与预览同管线。',
  },
];

export const PRINCIPLES = [
  {
    title: '离线优先',
    desc: '工具应该在断网时也能工作。所有处理都发生在本地。',
  },
  {
    title: '少即是多',
    desc: '砍掉菜单噪音，只保留塑造画面效果的核心控制。',
  },
  {
    title: '持续打磨',
    desc: '频繁小步更新，每次都有可见的改进。',
  },
  {
    title: '一个人维护',
    desc: '没有委员会设计。自己用，所以每个按钮都得顺手。',
  },
];

export const WORKS = [
  {
    title: '西语学习网站',
    desc: 'A1–C1 词书 + FSRS 间隔重复 + 云端发音的四步学习闭环。',
    link: '#',
    gradient: 'linear-gradient(135deg, #c84b31, #2b1055)',
    glyph: 'ES',
    todo: false,
  },
  {
    title: '音乐锐评网站',
    desc: '导入歌单 → 自动配封面 → 打分锐评 → 统计导出。',
    link: '#',
    gradient: 'linear-gradient(135deg, #1762f4, #0a1633)',
    glyph: 'MR',
    todo: false,
  },
  {
    title: 'Effectlab 本身',
    desc: '你正在看的这个站。编辑器的产出可直接作为展示素材。',
    link: '#/editor',
    gradient: 'linear-gradient(135deg, #4a97ff, #111112)',
    glyph: 'FX',
    todo: false,
  },
  {
    title: '待补充',
    desc: '更多作品与案例，内容就绪后替换此占位卡片。',
    link: '#',
    gradient: 'linear-gradient(135deg, #262628, #1a1a1b)',
    glyph: '??',
    todo: true,
  },
];

export const CHANGELOG = [
  {
    date: '2026-10-21',
    version: 'v0.2',
    title: '效果库扩充 + 预设系统',
    desc: '新增 9 个效果（调色 / 录像带 / 故障 / 动态模糊 / 位移 / 条纹 / 热成像 / 有损故障 / 复古终端）；预设保存、应用、删除与 JSON 导入导出，内置 3 个组合预设；上传链路加固；编辑器视口锁定（面板内滚、页面不滚）；修复连字符效果 id 的 uniform 丢失问题（调色 / 有损故障 / 复古终端的参数与渲染）。',
  },
  {
    date: '2026-10-21',
    version: 'v0.1',
    title: '编辑器上线',
    desc: 'Duotone / Monochrome / Threshold 三个效果，参数面板、对比滑块、PNG 导出、localStorage 状态恢复。',
  },
  {
    date: '2026-10-21',
    version: 'v0.0',
    title: '项目立项',
    desc: '对标 effect.app 的信息架构与设计系统，确定单文件 + WebGL 效果链技术路线。',
  },
];
