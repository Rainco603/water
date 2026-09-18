// 图表横屏全屏：移动端图表挤成一团时，点击「横屏」按钮让手机真正横过来（像看视频一样，
// 图表全屏 + 锁定横屏），退出全屏时自动解锁回竖屏。container 为图表外层 DOM 元素，
// chart 为 ECharts 实例。
//
// 用法：
//   1. 组件 `import chartFullscreen from '../mixins/chartFullscreen'` 并加入 `mixins`。
//   2. 图表外层 div 加 `ref="xxxWrap"`，标题栏加按钮：
//      <el-button @click="toggleChartFullscreen($refs.xxxWrap, chart)">横屏</el-button>
import { ScreenOrientation } from '@capacitor/screen-orientation'

export default {
  data() {
    return {
      fsActive: false, // 当前是否处于图表全屏状态（用于切换按钮图标）
      fsChart: null // 进入全屏时记录 ECharts 实例，退出/旋转后 resize
    }
  },
  mounted() {
    this._onFsChange = () => {
      const active = !!document.fullscreenElement
      this.fsActive = active
      if (active) {
        this._lockLandscape()
        this._resizeFsChart()
      } else {
        this._unlockOrientation()
        this._resizeFsChart()
      }
    }
    document.addEventListener('fullscreenchange', this._onFsChange)
  },
  beforeDestroy() {
    document.removeEventListener('fullscreenchange', this._onFsChange)
    this._unlockOrientation()
  },
  methods: {
    _unlockOrientation() {
      // 优先原生插件解锁（Android WebView 可靠），失败退回 Web Screen Orientation API
      try {
        ScreenOrientation.unlock().catch(() => {})
        return
      } catch (e) { /* 继续走 Web 兜底 */ }
      try {
        if (window.screen && window.screen.orientation && window.screen.orientation.unlock) {
          window.screen.orientation.unlock()
        }
      } catch (e) { /* 部分浏览器不支持，静默 */ }
    },
    _lockLandscape() {
      // 锁横屏：让手机真正横过来（像看视频），而不是放大竖屏。
      // 优先原生插件；浏览器/不支持时退回 Web Screen Orientation API，仍失败则静默降级。
      try {
        ScreenOrientation.lock({ orientation: 'landscape' }).catch(() => {})
        return
      } catch (e) { /* 继续走 Web 兜底 */ }
      try {
        const o = window.screen && window.screen.orientation
        if (o && o.lock) {
          const p = o.lock('landscape')
          if (p && typeof p.catch === 'function') p.catch(() => {})
        }
      } catch (e) { /* 静默 */ }
    },
    _resizeFsChart() {
      // 等浏览器完成全屏/横屏布局后再让 ECharts 重新测量容器尺寸（分两拍兜底旋转动画）
      const chart = this.fsChart
      ;[200, 600].forEach(ms => {
        setTimeout(() => {
          if (chart && chart.resize) { try { chart.resize() } catch (e) { /* 忽略 */ } }
        }, ms)
      })
    },
    // 进入/退出图表横屏全屏
    async toggleChartFullscreen(container, chart) {
      if (!container) return
      this.fsChart = chart
      if (document.fullscreenElement) {
        try { await document.exitFullscreen() } catch (e) { /* 忽略 */ }
        return
      }
      try {
        await container.requestFullscreen()
      } catch (e) {
        // 不支持全屏时尝试直接锁横屏（通常需先全屏，失败则静默）
        this._lockLandscape()
      }
      this._resizeFsChart()
    }
  }
}
