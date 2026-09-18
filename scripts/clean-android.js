// 清理 Android 构建产物（APK + 中间产物 + Gradle 缓存），不碰源码
// 用法：npm run clean:android
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const dirs = [
  'android/app/build', // 含 app-debug.apk
  'android/build',
  'android/.gradle',
  'android/capacitor-cordova-android-plugins/build'
]

for (const d of dirs) {
  const full = path.join(root, d)
  if (fs.existsSync(full)) {
    fs.rmSync(full, { recursive: true, force: true })
    console.log('已删除 ' + d)
  } else {
    console.log('跳过（不存在） ' + d)
  }
}

console.log('✅ Android 构建产物已清理，源码未受影响，下次构建会自动重建。')
