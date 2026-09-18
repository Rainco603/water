<template>
  <svg
    class="svg-icon"
    :style="{ width: size + 'px', height: size + 'px' }"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <g v-html="inner"></g>
  </svg>
</template>

<script>
// 统一 2px 描边线性图标（24×24 网格），随 currentColor 继承颜色，高清屏清晰不糊。
// 与 Element UI 字体图标对应的名称：plus/edit/delete/refresh/undo/download/close/
// fullscreen/back/line-chart/cpu/setup/arrow-up/arrow-down 等。
const ICONS = {
  home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  record: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
  alarm: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
  statistics: '<path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  edit: '<path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>',
  delete: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>',
  refresh: '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
  undo: '<polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  close: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  fullscreen: '<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>',
  back: '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
  'line-chart': '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
  cpu: '<rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>',
  setup: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  'arrow-up': '<polyline points="18 15 12 9 6 15"/>',
  'arrow-down': '<polyline points="6 9 12 15 18 9"/>',
  droplet: '<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>',
  search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',

  /* ===== 卡片专属图标（24×24 2px 描边，与全站线性风统一） ===== */
  // 水槽（Home 监测单元列表 / TankDetail 详情页）
  tank: '<path d="M4 6a8 8 0 0 1 16 0v5a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z"/><path d="M4 8h16"/>',
  // 水温（实时传感 / 传感器卡片）
  temperature: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M15 10.5a3 3 0 0 1 0 4.5 3.5 3.5 0 1 1-6 0 3 3 0 0 1 0-4.5"/>',
  // 压力（压力计 + 指针）
  pressure: '<circle cx="12" cy="14" r="8"/><path d="M12 14l4-4"/><circle cx="12" cy="14" r="1.5"/>',
  // 流量（水滴 + 对勾）
  flow: '<path d="M12 2.7l5.66 5.66a8 8 0 1 1-11.31 0z"/><polyline points="9 13 11 15 15 11"/>',
  // 水泵（涡轮/叶轮）
  pump: '<circle cx="12" cy="12" r="3.5"/><circle cx="12" cy="12" r="8"/><path d="M12 3.5v3M20.5 12h-3M12 20.5v-3M3.5 12h3"/>',
  // 加热器（波浪热力）
  heater: '<path d="M4 17h16"/><path d="M6 17V6"/><path d="M6 8c1.2-1.5 2.4 0 3.6-1.5S12 6.5 12 5"/>',
  // 设备使用时长（时钟）
  duration: '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/>',
  // 设备运行状态（开关/运行指示灯）
  'device-status': '<circle cx="12" cy="12" r="9"/><path d="M8.5 12a3.5 3.5 0 0 1 7 0"/>',
  // 系统状态（仪表盘/系统）
  system: '<circle cx="12" cy="12" r="9"/><path d="M12 12l4-4M8 12h4"/>',
  // 高温（温度计 + 加号）
  'temp-high': '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M15 10.5a3 3 0 0 1 0 4.5 3.5 3.5 0 1 1-6 0 3 3 0 0 1 0-4.5"/><path d="M12 5v3M10.5 6.5h3"/>',
  // 低温（温度计 + 减号）
  'temp-low': '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M15 10.5a3 3 0 0 1 0 4.5 3.5 3.5 0 1 1-6 0 3 3 0 0 1 0-4.5"/><path d="M10.5 6.5h3"/>',
  // 压力异常（警示圈 + 感叹号）
  'pressure-warn': '<circle cx="12" cy="12" r="9"/><path d="M12 7.5V13"/><circle cx="12" cy="16.5" r="0.5"/>',
  // 流量异常（警示三角 + 水滴）
  'flow-warn': '<path d="M12 3l10 17H2z"/><path d="M12 9v6"/><circle cx="12" cy="17.5" r="0.5"/>',
  // 水位异常（警示圈 + 水位线）
  'level-warn': '<circle cx="12" cy="12" r="9"/><path d="M12 3v4M3 12h4"/><path d="M8 13l2.5-3 2 2 2.5-3L20 14"/>'
}

export default {
  name: 'SvgIcon',
  props: {
    name: { type: String, required: true },
    size: { type: [Number, String], default: 16 }
  },
  computed: {
    inner() {
      return ICONS[this.name] || ''
    }
  }
}
</script>

<style scoped>
.svg-icon {
  display: inline-block;
  vertical-align: -0.125em;
  flex-shrink: 0;
}
</style>