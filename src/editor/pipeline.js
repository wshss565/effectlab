/* WebGL 渲染管线
 * 一个全屏四边形 + 一个按效果链动态组装的 fragment shader：
 *   - 每个效果贡献一段 vec3 fx_<id>(vec3 c) 函数与自己的 uniform（u_fx_<id>_<paramId>）
 *   - main() 中按叠加顺序依次调用
 *   - 效果集合不变时复用已编译程序（signature 缓存）
 */

const VERT_SRC = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

/* 共享 prelude：所有效果可用的工具函数（统一 fx_ 前缀避免重名冲突） */
const PRELUDE = `
float fx_hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}`;

function hexToRgb(hex) {
  let h = String(hex || '#000000').replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error('Shader compile failed: ' + log);
  }
  return sh;
}

function glslType(param) {
  return param.type === 'color' ? 'vec3' : 'float';
}

/* uniform 名的唯一构造入口：GLSL 标识符不允许连字符，color-grading → color_grading。
   声明 / getUniformLocation / apply 上传三处必须走同一函数，漏一处就会静默丢 uniform */
function uniformName(effectId, paramId) {
  return `u_fx_${effectId.replace(/-/g, '_')}_${paramId}`;
}

export class Pipeline {
  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    const gl = canvas.getContext('webgl', {
      antialias: false,
      preserveDrawingBuffer: true, // 导出 toBlob 需要
      premultipliedAlpha: false,
    });
    if (!gl) throw new Error('WEBGL_UNAVAILABLE');
    this.gl = gl;
    this.canvas = canvas;
    this.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);

    // 全屏四边形（TRIANGLE_STRIP）
    this.posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    this.programs = new Map(); // signature -> { program, uniforms }
    this.texture = null;
    this.texWidth = 0;
    this.texHeight = 0;
    this.lastFrameMs = 0;
  }

  /** 上传图像（source 可为 ImageBitmap / HTMLCanvasElement / HTMLImageElement） */
  setImage(source, width, height) {
    const gl = this.gl;
    if (!this.texture) this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.texWidth = width;
    this.texHeight = height;
  }

  /** 调整绘制缓冲区尺寸（CSS 像素 × dpr） */
  resize(width, height) {
    const w = Math.max(1, Math.round(width));
    const h = Math.max(1, Math.round(height));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.gl.viewport(0, 0, w, h);
  }

  /**
   * 组装（或取缓存）效果链程序
   * @param {Array<{effect: object, params: object}>} chain 已启用效果的叠加顺序
   */
  _programFor(chain) {
    const signature = chain.map((c) => c.effect.id).join('+') || '__passthrough__';
    const cached = this.programs.get(signature);
    if (cached) return cached;

    const uniformDecls = [];
    const functions = [];
    const calls = [];
    for (const { effect } of chain) {
      // GLSL 标识符不允许连字符：color-grading → color_grading
      const gid = effect.id.replace(/-/g, '_');
      for (const p of effect.params) {
        uniformDecls.push(`uniform ${glslType(p)} ${uniformName(effect.id, p.id)};`);
      }
      functions.push(effect.glsl.trim());
      calls.push(`  c = fx_${gid}(c, v_uv);`);
    }

    const fragSrc = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_tex;
uniform vec2 u_res;
${PRELUDE}
${uniformDecls.join('\n')}
${functions.join('\n')}
void main() {
  vec4 src = texture2D(u_tex, v_uv);
  vec3 c = src.rgb;
${calls.join('\n')}
  gl_FragColor = vec4(c, src.a);
}`;

    const gl = this.gl;
    const program = gl.createProgram();
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT_SRC));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fragSrc));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error('Program link failed: ' + log);
    }

    const uniforms = {
      u_tex: gl.getUniformLocation(program, 'u_tex'),
      u_res: gl.getUniformLocation(program, 'u_res'),
    };
    for (const { effect } of chain) {
      for (const p of effect.params) {
        const name = uniformName(effect.id, p.id);
        const loc = gl.getUniformLocation(program, name);
        if (loc) uniforms[name] = loc;
      }
    }

    const entry = { program, uniforms, signature };
    this.programs.set(signature, entry);
    return entry;
  }

  /**
   * 应用效果链并绘制
   * @param {Array<{effect: object, params: object}>} chain
   * @returns {number} 本帧耗时（ms）
   */
  apply(chain) {
    if (!this.texture) return 0;
    const t0 = performance.now();
    const gl = this.gl;
    const { program, uniforms } = this._programFor(chain);

    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
    const aPos = gl.getAttribLocation(program, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(uniforms.u_tex, 0);
    gl.uniform2f(uniforms.u_res, this.canvas.width, this.canvas.height);

    for (const { effect, params } of chain) {
      for (const p of effect.params) {
        const loc = uniforms[uniformName(effect.id, p.id)];
        if (!loc) continue;
        const v = params[p.id];
        if (p.type === 'color') gl.uniform3fv(loc, hexToRgb(v));
        else gl.uniform1f(loc, Number(v));
      }
    }

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    this.lastFrameMs = performance.now() - t0;
    return this.lastFrameMs;
  }
}

export { hexToRgb };
