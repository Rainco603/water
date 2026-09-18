// 传感器元数据：主页实时数据与记录页图表共用的默认定义
// key 对应后端返回的字段名，label/unit 为前端显示名与单位，color 为曲线颜色
export const SENSOR_DEFS = [
  { key: 'temp1', label: '水温 01', unit: '℃', color: '#14b8a6' },
  { key: 'temp2', label: '水温 02', unit: '℃', color: '#f59e0b' },
  { key: 'pressure', label: '管道压力', unit: 'kPa', color: '#3b82f6' },
  { key: 'flow', label: '管道流量', unit: 'L/min', color: '#ef4444' }
]

// 执行器默认定义（水泵、加热器等可控设备），状态用 0/1 表示（关闭/开启）
export const ACTUATOR_DEFS = [
  { key: 'pump', label: '水泵', color: '#14b8a6' },
  { key: 'heater', label: '加热器', color: '#f59e0b' }
]

// 执行器状态值 → 显示文本
export function actuatorStatusText(v) {
  if (v === 1 || v === '1' || v === true || v === 'true') return '开启'
  if (v === 0 || v === '0' || v === false || v === 'false') return '关闭'
  return '--'
}

// 执行器状态文本 → 颜色 class 后缀（配合 .act-on / .act-off 样式使用）
export function actuatorStatusClass(v) {
  if (v === 1 || v === '1' || v === true || v === 'true') return 'act-on'
  if (v === 0 || v === '0' || v === false || v === 'false') return 'act-off'
  return ''
}

// 颜色调色板（用于 API 返回的新增字段，按字段名 hash 分配颜色）
const COLOR_PALETTE = [
  '#14b8a6', '#f59e0b', '#3b82f6', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
  '#f97316', '#6366f1'
]

export function sensorLabel(key) {
  const def = SENSOR_DEFS.find(s => s.key === key)
  return def ? def.label : key
}

export function sensorUnit(key) {
  const def = SENSOR_DEFS.find(s => s.key === key)
  return def ? def.unit : ''
}

export function sensorColor(key) {
  const def = SENSOR_DEFS.find(s => s.key === key)
  if (def) return def.color
  // 动态字段：根据字段名 hash 从调色板取色，保证同一字段名颜色稳定
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash) + key.charCodeAt(i)
    hash |= 0
  }
  return COLOR_PALETTE[Math.abs(hash) % COLOR_PALETTE.length]
}

export function actuatorColor(key) {
  const def = ACTUATOR_DEFS.find(a => a.key === key)
  if (def) return def.color
  // 动态字段：按字段名 hash 取色（与 sensorColor 同逻辑，保证颜色稳定）
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash) + key.charCodeAt(i)
    hash |= 0
  }
  return COLOR_PALETTE[Math.abs(hash) % COLOR_PALETTE.length]
}

export function actuatorLabel(key) {
  const def = ACTUATOR_DEFS.find(a => a.key === key)
  if (def) return def.label
  // 回退到后端元数据/本地设备列表的命名（由调用方传入，这里只做兜底）
  return key
}

// 从后端获取传感器元数据字段列表
// 成功时自动缓存到 localStorage（key: iot_water_sensor_fields）
// 失败时尝试读 localStorage 缓存，再失败返回 null
export async function fetchSensorFields(http) {
  try {
    // 后端字段列表接口：/monitor/sensor/fields（返回字段元数据数组）
    const res = await http.get('/monitor/sensor/fields')
    const arr = Array.isArray(res) ? res
      : Array.isArray(res && res.data) ? res.data
      : Array.isArray(res && res.fields) ? res.fields
      : null
    if (Array.isArray(arr)) {
      localStorage.setItem('iot_water_sensor_fields', JSON.stringify(arr))
      return arr
    }
  } catch (e) { /* 后端不可用时使用缓存或默认值 */ }
  // 仅请求失败时才回退本地缓存
  try {
    const raw = localStorage.getItem('iot_water_sensor_fields')
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr)) return arr
    }
  } catch (e) { /* 缓存解析失败 */ }
  return null
}

// 将 API 返回的元数据转为 sensorItems 格式（仅保留启用的传感器类型字段）
// 输入: API 返回的 fields 数组 [{ field_name, display_name, unit, category, is_active, ... }]
// 输出: [{ key, label, unit }]  仅包含 category === 'sensor' 且 is_active !== 0
// 说明：category 是后端权威区分，不要再按字段名关键词猜测排除执行器
export function fieldsToSensorItems(fields) {
  if (!fields || !fields.length) return null
  return fields
    .filter(f => f.category === 'sensor' && f.is_active !== 0)
    .map(f => ({
      key: f.field_name,
      label: f.display_name || f.field_name,
      unit: f.unit || ''
    }))
}

// 执行器字段关键词：自动发现时用来排除"像执行器"的字段名（heater1、pump2 等）
const ACTUATOR_KEYWORDS = [
  'pump', 'heater', 'valve', 'motor', 'relay', 'switch', 'fan',
  'light', 'lamp', 'led', 'solenoid', 'actuator', 'cooler', 'chiller',
  'buzzer', 'servo', 'stepper',
]

// 判断字段名是否像执行器（去掉空格/下划线/连字符后按前缀匹配）
// 例：heater1、pump2、heater_status → true；temp1、pressure、flow → false
export function isActuatorField(key) {
  if (!key) return false
  const k = String(key).toLowerCase().replace(/[\s_-]+/g, '')
  return ACTUATOR_KEYWORDS.some(w => k === w || k.startsWith(w))
}

// 以后端元数据为权威，与本地用户自定义（名称/单位）合并：
// 用于保证用户手动增删改（名称/单位/删除）刷新后不丢失，同时后端新增字段仍能自动出现
export function mergeByKey(items, newItems, deletedKeys) {
  const list = items || []
  const existing = new Set(list.map(s => s.key))
  const del = new Set(deletedKeys || [])
  const extra = (newItems || []).filter(it => it && it.key && !existing.has(it.key) && !del.has(it.key))
  return extra.length ? list.concat(extra) : list
}

// 以后端元数据为权威，与本地用户自定义（名称/单位）合并：
// 1. 后端当前登记的 active 字段全部保留（除非在 deletedKeys 黑名单）
// 2. 后端字段有同名本地项时，用本地项的 label/unit（保留用户改名/改单位）
// 3. 本地有而后端已删除（软删/移除）的字段被剔除，不再残留
export function reconcileByBackend(localItems, apiItems, deletedKeys) {
  const local = Array.isArray(localItems) ? localItems : []
  const api = Array.isArray(apiItems) ? apiItems : []
  const del = new Set(deletedKeys || [])
  const localMap = {}
  local.forEach(it => { if (it && it.key) localMap[it.key] = it })
  return api
    .filter(it => it && it.key && !del.has(it.key))
    .map(it => {
      const l = localMap[it.key]
      if (!l) return it
      return {
        ...it,
        label: (l.label !== undefined && l.label !== '') ? l.label : it.label,
        unit: (l.unit !== undefined) ? l.unit : it.unit
      }
    })
}

// 从 API 元数据中提取执行器字段（水泵/加热器等可控设备）
// 输入: API 返回的 fields 数组；输出: [{ key, label }] 仅 category === 'actuator' 且 is_active !== 0
export function fieldsToDeviceItems(fields) {
  if (!fields || !fields.length) return null
  return fields
    .filter(f => f.category === 'actuator' && f.is_active !== 0)
    .map(f => ({ key: f.field_name, label: f.display_name || f.field_name }))
}

// 读取本地用户维护的传感器列表（Home 页实时数据增删改后写入），没有则返回 null
// 作为各功能区（报警上下限、记录查询）与实时数据同步的权威来源
export function loadLocalSensors() {
  try {
    const raw = localStorage.getItem('iot_water_sensors')
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr) && arr.length) return arr
    }
  } catch (e) { /* 忽略 */ }
  return null
}

// 读取用户显式删除过的传感器字段黑名单（Home 页维护），防止被后端/实时数据自动加回
export function loadDeletedSensorKeys() {
  try {
    const raw = localStorage.getItem('iot_water_sensor_deleted')
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr)) return arr
    }
  } catch (e) { /* 忽略 */ }
  return []
}

// 读取本地用户维护的执行器（设备）列表（Home 页"设备控制"增删改后写入 localStorage 的 iot_water_devices）
// 返回 [{ key, label }] 或 null（无本地数据时由调用方回退到后端元数据/default）
export function loadLocalActuators() {
  try {
    const raw = localStorage.getItem('iot_water_devices')
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr) && arr.length) {
        return arr
          .filter(d => d && d.key)
          .map(d => ({ key: d.key, label: d.label || d.key }))
      }
    }
  } catch (e) { /* 忽略 */ }
  return null
}