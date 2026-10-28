/* 页头 / 页脚 —— 全局外壳，路由切换时更新导航态 */

import { SITE } from '../data/content.js';

const ICON_MARK = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
  <circle cx="6" cy="6" r="4.2" stroke="#fff" stroke-width="1.4"/>
  <circle cx="6" cy="6" r="1.4" fill="#fff"/>
</svg>`;

export function mountChrome(root) {
  const header = document.createElement('header');
  header.className = 'header';
  header.innerHTML = `
    <div class="header__inner">
      <a class="logo" href="#/">
        <span class="logo__mark">${ICON_MARK}</span>
        <span class="logo__text">
          <span class="logo__name">${SITE.name}</span>
          <span class="logo__sub">${SITE.nameEnUpper}</span>
        </span>
      </a>
      <nav class="nav" aria-label="主导航">
        <a class="nav__link" href="#/" data-nav="showcase">展示</a>
        <a class="nav__link" href="#/editor" data-nav="editor">编辑器</a>
      </nav>
      <div class="header__meta">
        <span class="tag header__version">${SITE.version} BETA</span>
      </div>
    </div>`;

  const footer = document.createElement('footer');
  footer.className = 'footer';
  footer.innerHTML = `
    <div class="footer__inner">
      <span class="footer__note">${SITE.name} · ${SITE.nameZh} — 个人项目 · 图片处理全部在本地完成，不上传服务器</span>
      <div class="footer__links">
        <a href="#/#changelog">更新日志</a>
        <a href="#/#effects">效果墙</a>
        <a href="#/editor">打开编辑器</a>
      </div>
    </div>`;

  root.appendChild(header);

  const view = document.createElement('main');
  view.id = 'view';
  root.appendChild(view);

  root.appendChild(footer);
}

/** 路由切换时高亮导航 */
export function setActiveNav(name) {
  document.querySelectorAll('[data-nav]').forEach((el) => {
    el.classList.toggle('nav__link--active', el.dataset.nav === name);
  });
}
