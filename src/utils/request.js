import axios from 'axios'
import { getApiBase } from './config'

// 创建 axios 实例
// baseURL 不在创建时写死，改用请求拦截器动态注入，支持比赛现场实时修改后端地址
const service = axios.create({
  timeout: 15000 // 内网弱网下放宽超时，减少误判失败导致的「数据不稳定」
})

// 每次请求前动态拼接 baseURL（优先读 localStorage 里的用户配置）
service.interceptors.request.use(
  config => {
    config.baseURL = getApiBase() + '/api'
    // 统一添加token示例
    // config.headers.Authorization = `Bearer ${localStorage.getItem('token')}`
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 响应拦截器
service.interceptors.response.use(
  response => {
    return response.data
  },
  error => {
    console.error('请求异常：', error.response || error)
    return Promise.reject(error)
  }
)

// 统一解包响应体：后端接口统一返回 { code, msg, data }。
// - code === 0 时取 data；code !== 0 时抛出错误（由调用方 catch 处理）。
// - 兼容旧版直接返回数据（数组 / 扁平对象）的情况：直接返回。
// - 分页接口返回 { code, total, page, page_size, data }：data 仍在原位（不要误伤）。
export function unwrapData(res) {
  if (res && typeof res === 'object' && !Array.isArray(res) && res.code !== undefined) {
    if (res.code !== 0) throw new Error(res.msg || '请求失败')
    // code===0 时：分页接口 data 保留，单数据接口 data 替换
    if (res.total !== undefined) return res
    return res.data !== undefined ? res.data : res
  }
  // 旧版 / 未包裹的直接返回
  return res
}

// 仅解包分页接口的数据列表（{ code, total, page, page_size, data } → data 数组）
export function unwrapList(res) {
  if (res && typeof res === 'object' && !Array.isArray(res)) {
    if (res.code === 0 && Array.isArray(res.data)) return res
    if (Array.isArray(res.data)) return res
  }
  return res
}

export default service