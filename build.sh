#!/usr/bin/env bash
# 构建：esbuild 打包 JS/CSS（woff2 内联 dataurl）→ node 装配 → 单文件 index.html
# 用法：bash build.sh [--watch]
# 说明：本环境的 node 无法 spawn 子进程，故 esbuild 由 shell 驱动，node 仅做文件装配。
set -e
cd "$(dirname "$0")"

ESBUILD=./tools/bin/esbuild.exe
NODE="node"
TARGET="chrome110,safari16,firefox109"

if [ ! -f "$ESBUILD" ]; then
  echo "缺少 tools/bin/esbuild.exe —— 见 README「构建」一节" >&2
  exit 1
fi

bundle() {
  "$ESBUILD" src/main.js \
    --bundle --format=iife --minify "--target=$TARGET" \
    --outfile=dist/bundle.js
  "$ESBUILD" src/styles/main.css \
    --bundle --minify --loader:.woff2=dataurl "--target=$TARGET" \
    --outfile=dist/bundle.css
}

if [ "$1" = "--watch" ]; then
  "$ESBUILD" src/main.js \
    --bundle --format=iife --minify "--target=$TARGET" \
    --outfile=dist/bundle.js --watch &
  WATCH_PID1=$!
  "$ESBUILD" src/styles/main.css \
    --bundle --minify --loader:.woff2=dataurl "--target=$TARGET" \
    --outfile=dist/bundle.css --watch &
  WATCH_PID2=$!
  trap "kill $WATCH_PID1 $WATCH_PID2 2>/dev/null" EXIT
  echo "watch 模式：编辑 src/ 下的文件自动重建 index.html（Ctrl+C 退出）"
  LAST=0
  while true; do
    sleep 0.4
    if [ -f dist/bundle.js ]; then
      M=$(stat -c %Y dist/bundle.js 2>/dev/null || stat -f %m dist/bundle.js 2>/dev/null || echo 0)
      if [ "$M" != "$LAST" ]; then
        LAST=$M
        $NODE assemble.mjs
      fi
    fi
  done
else
  bundle
  $NODE assemble.mjs
fi
