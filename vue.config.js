
const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  // 相对路径：打包成 Capacitor APP 时资源需用相对路径加载（否则 file/本地服务下 /js 会 404）
  publicPath: './',
  // 关闭生产 sourcemap：避免 .js.map 被打进 APP/APK，显著减小体积（调试如需可临时打开）
  productionSourceMap: false,
  transpileDependencies: true,
  devServer: {
    proxy: {
      '/api': {
        target: 'http://192.168.117.143:5001',
        changeOrigin: true
      }
    }
  }
})