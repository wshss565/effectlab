/* 展示页视图（#/） */

import { EFFECTS, effectGradient, liveEffects } from '../editor/effects.js';
import { FEATURES, PRINCIPLES, WORKS, CHANGELOG, SITE } from '../data/content.js';

function el(tag, className, html) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html !== undefined) node.innerHTML = html;
  return node;
}

function fxCard(effect, extraClass = '') {
  const card = el('button', `fx-card ${extraClass}`.trim());
  card.type = 'button';
  card.dataset.effect = effect.id;
  card.innerHTML = `
    <span class="fx-card__thumb" style="background:${effectGradient(effect.id)}">
      <span class="fx-card__glyph">${effect.nameZh.slice(0, 2)}</span>
    </span>
    <span class="fx-card__status ${effect.status === 'live' ? 'fx-card__status--live' : ''}">${
      effect.status === 'live' ? 'LIVE' : 'SOON'
    }</span>
    <span class="fx-card__body">
      <span class="fx-card__name">${effect.nameZh} <span class="fx-card__cat">${effect.name}</span></span>
      <span class="fx-card__cat">${effect.category}</span>
    </span>`;
  card.addEventListener('click', () => {
    location.hash = `#/editor?effect=${effect.id}`;
  });
  return card;
}

export function mountShowcase(root) {
  const view = el('section', 'view');
  view.id = 'view-showcase';
  view.dataset.view = 'showcase';

  /* ---- Hero ---- */
  const hero = el('section', 'hero layout-full');
  const heroInner = el('div', 'hero__inner');
  heroInner.appendChild(el('span', 'tag tag--accent', SITE.heroTag));
  heroInner.appendChild(el('h1', 'hero__title', SITE.heroTitle));
  heroInner.appendChild(el('p', 'hero__desc', SITE.heroDesc));
  const cta = el('div', 'hero__cta');
  const btnPrimary = el('a', 'btn btn--primary btn--lg', SITE.heroCtaPrimary);
  btnPrimary.href = '#/editor';
  const btnSecondary = el('a', 'btn btn--lg', SITE.heroCtaSecondary);
  btnSecondary.href = '#/#effects';
  cta.append(btnPrimary, btnSecondary);
  heroInner.appendChild(cta);
  const stats = el('div', 'hero__stats');
  const liveCount = liveEffects().length;
  const plannedCount = EFFECTS.length - liveCount;
  const statItems = [
    { value: String(liveCount), label: '已上线效果' },
    { value: String(plannedCount), label: '规划中效果' },
    { value: '0', label: '服务器请求' },
    { value: '<2ms', label: '单帧渲染耗时' },
  ];
  for (const s of statItems) {
    stats.appendChild(el('div', 'stat', `<span class="stat__value">${s.value}</span><span class="stat__label">${s.label}</span>`));
  }
  heroInner.appendChild(stats);
  hero.appendChild(heroInner);
  view.appendChild(hero);

  /* ---- 效果 marquee ---- */
  const marquee = el('section', 'section--tight layout-full');
  const track = el('div', 'marquee__track');
  const cards = EFFECTS.map((e) => fxCard(e));
  for (const c of cards) track.appendChild(c);
  for (const c of cards) track.appendChild(c.cloneNode(true)); // 复制一份实现无缝滚动
  marquee.appendChild(el('div', 'marquee', ''));
  marquee.firstChild.appendChild(track);
  view.appendChild(marquee);

  /* ---- 效果墙 ---- */
  const wall = el('section', 'section layout-wide');
  wall.id = 'effects';
  wall.appendChild(el('div', 'section__head', `
    <span class="tag">EFFECT LIBRARY</span>
    <h2 class="section__title">效果墙</h2>
    <p class="section__desc">点击任意效果，直达编辑器并自动启用。标注 SOON 的效果正在开发中。</p>`));
  const grid = el('div', 'fx-grid');
  for (const e of EFFECTS) grid.appendChild(fxCard(e, e.status === 'live' ? '' : 'fx-card--planned'));
  wall.appendChild(grid);
  view.appendChild(wall);

  /* ---- 特性 ---- */
  const features = el('section', 'section layout-wide');
  features.appendChild(el('div', 'section__head', `
    <span class="tag">FEATURES</span>
    <h2 class="section__title">为快速实验而建</h2>`));
  const fgrid = el('div', 'feature-grid');
  FEATURES.forEach((f, i) => {
    fgrid.appendChild(el('div', 'feature-card', `
      <span class="feature-card__num">0${i + 1}</span>
      <span class="feature-card__title">${f.title}</span>
      <span class="feature-card__desc">${f.desc}</span>`));
  });
  features.appendChild(fgrid);
  view.appendChild(features);

  /* ---- 理念 ---- */
  const principles = el('section', 'section layout-wide');
  principles.appendChild(el('div', 'section__head', `
    <span class="tag">PRINCIPLES</span>
    <h2 class="section__title">一个人做工具的原则</h2>`));
  const igrid = el('div', 'info-grid');
  for (const p of PRINCIPLES) {
    igrid.appendChild(el('div', 'info-item', `
      <span class="info-item__title">${p.title}</span>
      <span class="info-item__desc">${p.desc}</span>`));
  }
  principles.appendChild(igrid);
  view.appendChild(principles);

  /* ---- 作品画廊 ---- */
  const gallery = el('section', 'section layout-wide');
  gallery.id = 'works';
  gallery.appendChild(el('div', 'section__head', `
    <span class="tag">WORKS</span>
    <h2 class="section__title">作品画廊</h2>
    <p class="section__desc">其他项目与这个站的产出。画廊内容在 Phase 4 补充完整。</p>`));
  const ggrid = el('div', 'gallery-grid');
  for (const w of WORKS) {
    const card = el('a', `gallery-card${w.todo ? ' gallery-card--todo' : ''}`);
    card.href = w.link;
    card.innerHTML = `
      <span class="gallery-card__cover" style="background:${w.gradient}"><span>${w.glyph}</span></span>
      <span class="gallery-card__body">
        <span class="gallery-card__title">${w.title}<span class="arrow">→</span></span>
        <span class="gallery-card__desc">${w.desc}</span>
      </span>`;
    ggrid.appendChild(card);
  }
  gallery.appendChild(ggrid);
  view.appendChild(gallery);

  /* ---- Changelog ---- */
  const changelog = el('section', 'section layout-wide');
  changelog.id = 'changelog';
  changelog.appendChild(el('div', 'section__head', `
    <span class="tag">CHANGELOG</span>
    <h2 class="section__title">更新日志</h2>`));
  const list = el('div', 'changelog');
  for (const c of CHANGELOG) {
    list.appendChild(el('div', 'changelog__item', `
      <span class="changelog__date">${c.date} · ${c.version}</span>
      <span><span class="changelog__title">${c.title}</span><span class="changelog__desc">${c.desc}</span></span>`));
  }
  changelog.appendChild(list);
  view.appendChild(changelog);

  /* ---- CTA ---- */
  const ctaSection = el('section', 'cta');
  ctaSection.innerHTML = `
    <h2 class="cta__title">打开编辑器，试试看</h2>
    <p class="cta__desc">拖一张图进去，或者直接用内置示例。全部在本地完成。</p>
    <div class="cta__actions">
      <a class="btn btn--primary btn--lg" href="#/editor">打开编辑器</a>
      <a class="btn btn--lg" href="#/#effects">先看效果墙</a>
    </div>`;
  view.appendChild(ctaSection);

  root.appendChild(view);
}

export function activateShowcase() {
  const view = document.getElementById('view-showcase');
  if (view) view.classList.add('view--active');
  document.title = `${SITE.name} — 浏览器端实时特效实验室`;
}

export function deactivateShowcase() {
  const view = document.getElementById('view-showcase');
  if (view) view.classList.remove('view--active');
}
