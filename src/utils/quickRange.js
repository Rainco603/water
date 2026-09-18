// 快捷时间窗口：与「自定义时间范围」互斥。
// 各查询页（历史记录/水槽详情/报警/判定记录/操作日志）共用的时间窗口解析逻辑。
// quickRange 取值：'custom'（自定义，走 timeRange）| '15m' | '30m' | '1h'

export const QUICK_RANGE_MINUTES = { '15m': 15, '30m': 30, '1h': 60 }

// 根据快捷时间 + 自定义时间范围，返回实际用于查询的 [start_time, end_time]
// quickRange 为空或 'custom' 时直接用自定义 timeRange；否则按窗口相对当前时间计算
export function resolveQuickRange(quickRange, timeRange, formatDate) {
  const minutes = QUICK_RANGE_MINUTES[quickRange]
  if (minutes) {
    const end = new Date()
    const start = new Date(end.getTime() - minutes * 60 * 1000)
    return [formatDate(start), formatDate(end)]
  }
  return timeRange
}
