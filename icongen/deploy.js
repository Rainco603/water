// 将生成好的图标部署到项目：Android res + Web favicon
const fs = require('fs')
const path = require('path')

const SRC = path.resolve(__dirname, 'icon-out')
const RES = path.resolve(__dirname, '..', 'android', 'app', 'src', 'main', 'res')
const PUB = path.resolve(__dirname, '..', 'public')

// Android 各密度目标目录
const dens = {
  mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4
}

// 拷贝 Android 图标
for (const [name, k] of Object.entries(dens)) {
  const launcher = Math.round(48 * k)
  const foreground = Math.round(108 * k)
  const dir = path.join(RES, `mipmap-${name}`)
  if (!fs.existsSync(dir)) continue

  const full = fs.readFileSync(path.join(SRC, `${name}-launcher-${launcher}.png`))
  const fg = fs.readFileSync(path.join(SRC, `${name}-foreground-${foreground}.png`))

  fs.writeFileSync(path.join(dir, 'ic_launcher.png'), full)
  fs.writeFileSync(path.join(dir, 'ic_launcher_round.png'), full)
  fs.writeFileSync(path.join(dir, 'ic_launcher_foreground.png'), fg)
  console.log('✓ mipmap-' + name, '(launcher ' + launcher + 'px, fg ' + foreground + 'px)')
}

// 自适应图标背景改为青绿深色
const bgXml = path.join(RES, 'values', 'ic_launcher_background.xml')
if (fs.existsSync(bgXml)) {
  fs.writeFileSync(bgXml,
    `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#0d9488</color>\n</resources>\n`)
  console.log('✓ ic_launcher_background.xml -> #0d9488')
}

// 打包 favicon.ico（Vista+ 支持 PNG-in-ICO，单 256，现代浏览器均支持）
function makeIcoSingle(pngPath) {
  const png = fs.readFileSync(pngPath)
  const icondir = Buffer.alloc(16)
  icondir.writeUInt8(0, 0)              // width (0=256)
  icondir.writeUInt8(0, 1)              // height
  icondir.writeUInt8(0, 2)              // color count
  icondir.writeUInt8(0, 3)              // reserved
  icondir.writeUInt16LE(1, 4)           // planes
  icondir.writeUInt16LE(32, 6)          // bpp
  icondir.writeUInt32LE(png.length, 8)  // image size
  icondir.writeUInt32LE(22, 12)         // offset (6 header + 16 dir)
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)            // reserved
  header.writeUInt16LE(1, 2)            // type ico
  header.writeUInt16LE(1, 4)            // count = 1
  return Buffer.concat([header, icondir, png])
}

const ico = makeIcoSingle(path.join(SRC, 'favicon-256.png'))
fs.writeFileSync(path.join(PUB, 'favicon.ico'), ico)
console.log('✓ public/favicon.ico')

console.log('全部完成')