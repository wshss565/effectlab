/* 导出：PNG，原尺寸 / 1x / 2x / 4x 缩放重渲染 */

import { Pipeline } from './pipeline.js';

/**
 * @param {Array<{effect: object, params: object}>} chain 效果链
 * @param {CanvasImageSource} source 原始图（全尺寸）
 * @param {number} origW
 * @param {number} origH
 * @param {number} scale 1 / 2 / 4
 * @param {number} maxTextureSize GL 纹理上限
 * @returns {Promise<Blob>}
 */
export function exportPNG(chain, source, origW, origH, scale = 1, maxTextureSize = 4096) {
  let w = Math.round(origW * scale);
  let h = Math.round(origH * scale);
  // 超纹理上限时收敛到上限尺寸（等比）
  const maxDim = Math.max(w, h);
  if (maxDim > maxTextureSize) {
    const k = maxTextureSize / maxDim;
    w = Math.round(w * k);
    h = Math.round(h * k);
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, w);
  canvas.height = Math.max(1, h);

  const pipeline = new Pipeline(canvas);
  pipeline.setImage(source, origW, origH);
  pipeline.resize(canvas.width, canvas.height);
  pipeline.apply(chain);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('toBlob failed'));
    }, 'image/png');
  });
}

/** 触发浏览器下载 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
