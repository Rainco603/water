<template>
  <div id="app">
    <!-- 顶部标题栏 -->
    <header class="app-header">
      <div class="header-left">
        <button v-if="!hideTab" class="hamburger" @click="openDrawer" aria-label="打开导航菜单">
          <svg-icon name="menu" :size="22"></svg-icon>
        </button>
        <div class="logo">
          <span class="logo-badge"><img class="icon" src="./assets/logo.png" alt="logo"></span>
          <span class="logo-text">IoT 水系统智能监控平台</span>
        </div>
      </div>
      <svg-icon name="droplet" :size="20" class="header-drop"></svg-icon>
    </header>

    <!-- 主要内容区域 (路由出口) -->
    <main class="app-main">
      <router-view />
    </main>

    <!-- 左侧抽屉导航（7 大功能区全量入口） -->
    <el-drawer
      title="功能导航"
      :visible.sync="drawerVisible"
      direction="ltr"
      size="260px"
      :append-to-body="true"
      class="nav-drawer"
    >
      <div class="drawer-body">
        <div
          v-for="item in navItems"
          :key="item.path"
          class="drawer-item"
          :class="{ active: $route.path === item.path }"
          @click="navTo(item.path)"
        >
          <svg-icon :name="item.icon" :size="20" class="drawer-icon"></svg-icon>
          <div class="drawer-text">
            <span class="drawer-title">{{ item.title }}</span>
            <span class="drawer-sub">{{ item.sub }}</span>
          </div>
        </div>
      </div>
    </el-drawer>

    <!-- 底部导航栏（3 快捷入口：实时监测 / 设备控制 / 更多） -->
    <footer v-if="!hideTab" class="app-footer">
      <router-link to="/" class="tab-item" active-class="active">
        <svg-icon name="monitor" :size="22"></svg-icon>
        <span class="text">实时监测</span>
      </router-link>
      <router-link to="/control" class="tab-item" active-class="active">
        <svg-icon name="control" :size="22"></svg-icon>
        <span class="text">设备控制</span>
      </router-link>
      <div class="tab-item" @click="openDrawer">
        <svg-icon name="more" :size="22"></svg-icon>
        <span class="text">更多</span>
      </div>
    </footer>
  </div>
</template>

<script>
import { getApiBase } from './utils/config'
import { unwrapData } from './utils/request'

export default {
  name: 'App',
  data() {
    return {
      drawerVisible: false,
      // 7 大功能区导航项（抽屉全量入口）
      navItems: [
        { path: '/', icon: 'monitor', title: '实时监测', sub: 'Realtime Monitor' },
        { path: '/control', icon: 'control', title: '设备控制', sub: 'Device Control' },
        { path: '/records', icon: 'record', title: '历史数据', sub: 'History' },
        { path: '/alarms', icon: 'alarm', title: '报警管理', sub: 'Alarms' },
        { path: '/rules', icon: 'rules', title: '智能规则引擎', sub: 'Rules Engine' },
        { path: '/statistics', icon: 'statistics', title: '统计分析', sub: 'Statistics' },
        { path: '/ops', icon: 'settings', title: '系统运维', sub: 'Operations' }
      ],
      alarmTimer: null,
      seenAlarms: {}, // 记录已弹窗的报警，避免重复弹
      alarmInitialized: false,
      sseEventSource: null,
      // 定时任务执行引擎（常驻：不随路由切换销毁，保证离开控制页任务仍能触发）
      scheduleTimer: null,
      schedules: [],      // 定时任务列表副本（由控制页保存后通过事件同步）
      scheduleFired: {},  // 当日已触发的动作去重表 key=`${id}__${time}__${action}` -> 日期字符串
      scheduleBackendEnabled: false, // 后端接管调度开关（schedule_backend_enabled='1' 时前端停本地调度，避免双触发）
      scheduleTickCount: 0           // 调度循环计数，用于周期性刷新后端调度开关
    }
  },
  computed: {
    hideTab() {
      return this.$route.meta.hideTab
    }
  },
  mounted() {
    // 首次用户交互时解锁音频（移动端浏览器需用户手势后才能出声）
    this.unlockAudio()
    // 全局轮询活跃告警，发现新报警就弹窗提示（1-5b）
    this.fetchActiveAlarms()
    this.alarmTimer = setInterval(this.fetchActiveAlarms, 5000)
    // 建立 SSE 长连接：接收后端实时事件推送（若不连接，后端事件队列会堆积占满）
    this.initSSE()
    // 定时任务：常驻加载 + 每秒调度（自动模式下触发；后端接管时前端停本地调度）
    this.loadSchedules()
    this.refreshScheduleBackendFlag()
    this.scheduleTimer = setInterval(() => this.tickSchedules(), 1000)
    window.addEventListener('schedules-changed', this.handleSchedulesChanged)
  },
  beforeDestroy() {
    if (this.alarmTimer) {
      clearInterval(this.alarmTimer)
    }
    if (this.sseEventSource) {
      this.sseEventSource.close()
      this.sseEventSource = null
    }
    if (this.scheduleTimer) {
      clearInterval(this.scheduleTimer)
      this.scheduleTimer = null
    }
    window.removeEventListener('schedules-changed', this.handleSchedulesChanged)
  },
  methods: {
    openDrawer() {
      this.drawerVisible = true
    },
    navTo(path) {
      this.drawerVisible = false
      if (this.$route.path !== path) {
        this.$router.push(path)
      }
    },

    // 建立 SSE 长连接：接收后端实时事件推送
    // 注意：后端把事件放进队列推送，前端必须保持连接并读取事件，否则队列会占满
    initSSE() {
      try {
        const es = new EventSource(getApiBase() + '/api/system/stream')
        this.sseEventSource = es
        es.onmessage = (event) => {
          // 忽略标准 SSE 心跳（data: heartbeat\n\n）
          if (event.data === 'heartbeat') return
          let msg
          try { msg = JSON.parse(event.data) } catch (e) { return }
          if (!msg || msg.type !== 'alarm') return
          const a = msg.data || {}
          const isRecovery = a.src === 'recovery' || a.level === 'info'
          const isSafety = a.src === 'safety'
          const isDanger = a.level === 'danger' || isSafety
          if (!isRecovery) this.playAlarmSound()
          this.$notify({
            title: isRecovery ? '恢复正常' : (isSafety ? '安全保护' : (isDanger ? '严重报警' : '报警提醒')),
            message: a.alarm || '',
            type: isRecovery ? 'success' : (isDanger ? 'error' : 'warning'),
            duration: isRecovery ? 4000 : 6000,
            position: 'top-right'
          })
        }
        es.onerror = () => {
          // EventSource 会自动重连；此处静默处理，避免刷屏与额外开销
        }
      } catch (e) {
        // 创建失败静默处理
      }
    },

    async fetchActiveAlarms() {
      try {
        let res = await this.$http.get('/monitor/alarm/active')
        res = unwrapData(res)
        const alarms = Array.isArray(res) ? res : []
        // 首次只记录已有报警，不弹窗（避免打开页面就刷屏）
        if (!this.alarmInitialized) {
          alarms.forEach(a => { this.seenAlarms[this.alarmKey(a)] = true })
          this.alarmInitialized = true
          return
        }
        alarms.forEach(a => {
          const key = this.alarmKey(a)
          if (!this.seenAlarms[key]) {
            this.seenAlarms[key] = true
            // 区分恢复事件(info/recovery)、安全保护(safety)、严重报警(danger)与普通提醒
            const isRecovery = a.src === 'recovery' || a.level === 'info'
            const isSafety = a.src === 'safety'
            const isDanger = a.level === 'danger' || isSafety
            if (!isRecovery) this.playAlarmSound()
            this.$notify({
              title: isRecovery ? '恢复正常' : (isSafety ? '安全保护' : (isDanger ? '严重报警' : '报警提醒')),
              message: a.alarm,
              type: isRecovery ? 'success' : (isDanger ? 'error' : 'warning'),
              duration: isRecovery ? 4000 : 6000,
              position: 'top-right'
            })
          }
        })
      } catch (e) {
        // 后端未启动时静默处理
      }
    },
    alarmKey(a) {
      return `${a.timestamp}__${a.alarm}`
    },

    // ===== 定时任务执行引擎（常驻） =====
    // 加载定时任务列表（后端 API 优先，失败/空时回退本地 localStorage 缓存，离线也能继续调度）
    async loadSchedules() {
      try {
        let res = await this.$http.get('/schedules')
        res = unwrapData(res)
        if (res && Array.isArray(res)) {
          this.schedules = res
          return
        }
      } catch (e) {
        // 后端不可用，回退本地缓存
      }
      this.loadSchedulesFromStorage()
    },
    // 从本地 localStorage 读取定时任务兜底（与控制页共用同一 key）
    loadSchedulesFromStorage() {
      try {
        const raw = localStorage.getItem('iot_water_schedules')
        if (raw) {
          const arr = JSON.parse(raw)
          if (Array.isArray(arr)) this.schedules = arr
        }
      } catch (e) { /* 忽略 */ }
    },
    // 控制页保存定时任务后通过事件同步，立即刷新本地副本，避免轮询延迟
    handleSchedulesChanged() {
      this.loadSchedules()
    },
    // 读取后端是否接管定时调度：schedule_backend_enabled='1' 时后端执行，前端停本地调度
    async refreshScheduleBackendFlag() {
      try {
        let res = await this.$http.get('/config/all')
        res = unwrapData(res)
        let map = null
        if (Array.isArray(res)) {
          map = {}
          res.forEach(i => { if (i && i.key !== undefined && i.key !== null) map[i.key] = i.value })
        } else if (res && typeof res === 'object') {
          map = res
        }
        if (!map) return
        const v = map.schedule_backend_enabled
        this.scheduleBackendEnabled = v === '1' || v === 1 || v === true
      } catch (e) {
        // 后端未返回该键时维持默认（false = 前端调度），静默处理
      }
    },
    // 每秒调度：仅在自动模式下触发；后端接管（schedule_backend_enabled='1'）时前端停本地调度，避免双触发
    tickSchedules() {
      // 周期性刷新后端调度开关（约每 30 秒一次，防止后端动态切换后前端仍按旧状态跑）
      this.scheduleTickCount = (this.scheduleTickCount + 1) % 30
      if (this.scheduleTickCount === 0) {
        this.refreshScheduleBackendFlag()
      }

      // 后端接管调度时，前端本地调度直接让位
      if (this.scheduleBackendEnabled) return

      const now = new Date()
      const todayStr = now.toDateString()
      // 读取控制模式：手动模式下定时任务一律不触发（由用户手动控制设备）
      let mode = 'auto'
      try {
        mode = localStorage.getItem('iot_water_control_mode') || 'auto'
      } catch (e) { /* 忽略 */ }
      if (mode !== 'auto') return

      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
      const currentDay = now.getDay() // 0=周日, 6=周六

      // 清理过期去重表：只保留今天的记录
      const fired = this.scheduleFired
      Object.keys(fired).forEach(k => {
        if (fired[k] !== todayStr) delete fired[k]
      })

      this.schedules.forEach(schedule => {
        if (schedule.enabled === false || schedule.enabled === 0) return

        // 检查重复模式
        let shouldFire = false
        if (schedule.repeat === 'daily') {
          shouldFire = true
        } else if (schedule.repeat === 'weekdays') {
          shouldFire = currentDay >= 1 && currentDay <= 5
        } else if (schedule.repeat === 'weekend') {
          shouldFire = currentDay === 0 || currentDay === 6
        } else if (schedule.repeat === 'once') {
          // 仅一次：跨天也只在首次到达的时间点执行一次（用 lastFired 持久标记）
          if (schedule.lastFired) {
            // 已执行过，永久跳过
            return
          }
          shouldFire = true
        }
        if (!shouldFire) return

        // 逐个动作比对（支持同一设备多个时间点）
        ;(schedule.actions || []).forEach(act => {
          if (!act || !act.time) return
          if (act.time !== currentTime) return
          const dedupeKey = `${schedule.id}__${act.time}__${act.action}`
          if (fired[dedupeKey] === todayStr) return // 本秒已触发过，去重
          fired[dedupeKey] = todayStr
          this.executeScheduledAction(schedule.deviceId, act.action === 1)
          // 仅一次任务：触发后立即持久化 lastFired，避免下次启动重复执行
          if (schedule.repeat === 'once') {
            schedule.lastFired = now.toISOString()
            this.persistSchedules()
          }
        })
      })
    },
    // 定时任务下发控制（后端统一裁决；不依赖前端在线状态，交由后端判定）
    async executeScheduledAction(device, value) {
      const payload = { [device]: value ? 1 : 0 }
      try {
        const res = await this.$http.post('/monitor/device/control', payload)
        if (res.code === 0) {
          this.$notify({
            title: '定时任务',
            message: `已${value ? '开启' : '关闭'} ${this.scheduleDeviceLabel(device)}`,
            type: 'success',
            duration: 3000,
            position: 'top-right'
          })
        } else {
          this.$notify({
            title: '定时任务失败',
            message: res.msg || '控制失败',
            type: 'error',
            duration: 4000,
            position: 'top-right'
          })
        }
      } catch (error) {
        const status = error && error.response && error.response.status
        const data = error && error.response && error.response.data
        if (status === 409) {
          this.$notify({
            title: '定时任务未执行',
            message: (data && data.msg) || '该设备正被定流量任务占用',
            type: 'warning',
            duration: 4000,
            position: 'top-right'
          })
          return
        }
        this.$notify({
          title: '定时任务失败',
          message: status ? `控制失败（后端返回 ${status}）` : '控制请求失败，请检查后端',
          type: 'error',
          duration: 4000,
          position: 'top-right'
        })
      }
    },
    // 设备显示名（从本地设备配置读取，用于通知文案）
    scheduleDeviceLabel(deviceId) {
      try {
        const raw = localStorage.getItem('iot_water_devices')
        const arr = raw ? JSON.parse(raw) : []
        const d = arr.find(x => x.key === deviceId)
        return d ? d.label : deviceId
      } catch (e) {
        return deviceId
      }
    },
    // 持久化定时任务列表（用于「仅一次」任务回写 lastFired）
    async persistSchedules() {
      try {
        await this.$http.post('/schedules', { schedules: this.schedules })
      } catch (e) {
        // 静默
      }
    },
    // 首次用户交互时解锁音频上下文（移动端浏览器要求用户手势后才能出声）
    unlockAudio() {
      const unlock = () => {
        try {
          const Ctx = window.AudioContext || window.webkitAudioContext
          if (Ctx) {
            const ctx = this._audioCtx || (this._audioCtx = new Ctx())
            if (ctx.state === 'suspended') ctx.resume()
          }
        } catch (e) { /* 忽略音频解锁异常 */ }
      }
      window.addEventListener('touchstart', unlock, { once: true })
      window.addEventListener('pointerdown', unlock, { once: true })
    },
    // 播放一声「叮」报警音效（Web Audio 合成，无需音频文件，离线可用）
    playAlarmSound() {
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext
        if (!Ctx) return
        const ctx = this._audioCtx || (this._audioCtx = new Ctx())
        if (ctx.state === 'suspended') ctx.resume()
        const now = ctx.currentTime
        // 单音「叮」（E6），清脆短促
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.value = 1318.51 // E6
        gain.gain.setValueAtTime(0.0001, now)
        gain.gain.exponentialRampToValueAtTime(0.35, now + 0.012)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(now)
        osc.stop(now + 0.65)
      } catch (e) { /* 忽略播放异常 */ }
    }
  }
}
</script>

<style>
/* 全局基础样式 */
#app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background-color: #f0f2f5;
}

/* 顶部标题样式（青绿渐变） */
.app-header {
  height: 56px;
  background: var(--primary-gradient);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  flex-shrink: 0;
  color: #ffffff;
  box-shadow: 0 2px 10px rgba(13, 148, 136, 0.25);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

/* 汉堡按钮 */
.hamburger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.15);
  color: #ffffff;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.2s;
}
.hamburger:active {
  background: rgba(255, 255, 255, 0.3);
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.logo-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
}

.logo-badge .icon {
  width: 22px;
  height: 22px;
  display: block;
}

.logo-text {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-drop {
  opacity: 0.85;
  flex-shrink: 0;
}

/* 主内容区样式 */
.app-main {
  flex: 1;
  overflow-y: auto;
  padding: 14px;
  box-sizing: border-box;
}

/* 底部导航样式 */
.app-footer {
  height: 60px;
  background-color: #ffffff;
  border-top: 1px solid #ebeef5;
  display: flex;
  justify-content: space-around;
  align-items: center;
  flex-shrink: 0;
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.05);
}

/* ===== 抽屉导航 ===== */
.nav-drawer .el-drawer__body {
  padding: 0;
}

.drawer-body {
  display: flex;
  flex-direction: column;
  padding: 8px 0;
}

.drawer-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 20px;
  cursor: pointer;
  color: var(--text-1);
  transition: background 0.2s, color 0.2s;
  border-left: 3px solid transparent;
}

.drawer-item:hover {
  background: #f5f7fa;
}

.drawer-item.active {
  background: rgba(20, 184, 166, 0.08);
  border-left-color: var(--primary);
  color: var(--primary);
}

.drawer-icon {
  flex-shrink: 0;
}

.drawer-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.drawer-title {
  font-size: 15px;
  font-weight: 600;
}

.drawer-sub {
  font-size: 11px;
  color: var(--text-3);
}

.drawer-item.active .drawer-sub {
  color: var(--primary);
  opacity: 0.7;
}

/* 手机端标题字号略缩，避免汉堡挤占 */
@media (max-width: 640px) {
  .logo-text {
    font-size: 14px;
  }
}
</style>
