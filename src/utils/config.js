// ===== 后端服务地址（集中配置） =====
// 打包成 APP 后没有 dev 代理（vue.config.js 里的 /api 代理只在 npm run serve 时生效），
// 所以这里必须用绝对地址直连后端。手机需与后端处于同一局域网。
//
// 改后端地址只改这一处即可，SSE、导出数据库等都会自动跟随。
// 后端需开启 CORS（如 Flask 的 flask-cors），否则 WebView 跨域请求会被拦截。
export const DEFAULT_API_BASE = 'http://192.168.117.143:5001'
export const API_BASE_STORAGE_KEY = 'iot_water_api_base'

/** 读取实际使用的后端地址（localStorage 优先） */
export function getApiBase() {
  try {
    const saved = localStorage.getItem(API_BASE_STORAGE_KEY)
    if (saved && saved.trim()) return saved.trim()
  } catch (e) { /* 忽略 */ }
  return DEFAULT_API_BASE
}

/** 持久化新的后端地址（比赛现场换网后调用） */
export function setApiBase(url) {
  localStorage.setItem(API_BASE_STORAGE_KEY, url.trim())
}

/** 重置为编译时的默认地址 */
export function resetApiBase() {
  localStorage.removeItem(API_BASE_STORAGE_KEY)
}
