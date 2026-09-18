// 生成「IoT 水系统」App 图标（Vue + Capacitor Android）
// 用 sharp 渲染 SVG → PNG，输出 Android mipmap 各密度及 Web favicon
const sharp = require('C:/Users/Rainc/AppData/Local/Temp/iconbuild/node_modules/sharp')
const fs = require('fs')
const path = require('path')

const OUT = path.resolve(__dirname, 'icon-out')
fs.mkdirSync(OUT, { recursive: true })

// ==== 前景图形（透明底，供 adaptive icon 与完整图标复用） ====
const GRAPHIC_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="wf" cx="0.42" cy="0.3" r="0.95">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#e0fffb"/>
    </radialGradient>
  </defs>

  <!-- 水滴（上圆下尖） -->
  <path d="M256 186 C196 254 160 322 194 396 C216 446 296 446 318 396 C352 322 316 254 256 186 Z"
        fill="url(#wf)" stroke="#ffffff" stroke-width="5"/>
  <!-- 水滴高光 -->
  <path d="M214 360 C204 328 216 296 234 278" stroke="#ffffff" stroke-width="7" fill="none"
        opacity="0.6" stroke-linecap="round"/>

  <!-- IoT 无线信号弧（圆心在水滴上方） -->
  <g stroke="#ffffff" fill="none" stroke-width="15" stroke-linecap="round">
    <path d="M196 186 A 82 82 0 0 1 316 186" opacity="0.95"/>
    <path d="M224 216 A 46 46 0 0 1 288 216" opacity="0.6"/>
  </g>
  <!-- 信号顶部圆点（数据节点） -->
  <circle cx="256" cy="140" r="9" fill="#ffffff"/>

  <!-- 底部水波纹 -->
  <g stroke="#ffffff" fill="none" stroke-width="10" stroke-linecap="round">
    <path d="M182 452 q 20 -13 40 0 t 40 0 t 40 0" opacity="0.95"/>
    <path d="M198 474 q 17 -11 34 0 t 34 0 t 34 0" opacity="0.55"/>
  </g>
</svg>`

// ==== 完整图标（渐变圆角方背景 + 前景图形） ====
const FULL_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2dd4bf"/>
      <stop offset="0.55" stop-color="#14b8a6"/>
      <stop offset="1" stop-color="#0d9488"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="512" height="512" rx="110" fill="url(#bg)"/>
  <g transform="translate(0,4)">
${GRAPHIC_SVG.replace('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">', '').replace('</svg>', '')}
  </g>
</svg>`

async function render(svg, size, outFile) {
  await sharp(Buffer.from(svg), { density: 300 })
    .resize(size, size)
    .png()
    .toFile(outFile)
  console.log('✓', path.basename(outFile), size + 'px')
}

async function run() {
  // Android 各密度（dp -> px）
  const dens = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 }
  for (const [name, k] of Object.entries(dens)) {
    const launcher = Math.round(48 * k)
    const foreground = Math.round(108 * k)
    await render(FULL_SVG, launcher, path.join(OUT, `${name}-launcher-${launcher}.png`))
    await render(GRAPHIC_SVG, foreground, path.join(OUT, `${name}-foreground-${foreground}.png`))
  }
  // Web favicon（多尺寸 256 主图，供后续打包 ico）
  await render(FULL_SVG, 256, path.join(OUT, 'favicon-256.png'))
  console.log('done')
}

run().catch(e => { console.error(e); process.exit(1) })