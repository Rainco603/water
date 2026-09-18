<template>
  <div id="app">
    <!-- 顶部标题栏 -->
    <header class="app-header">
      <div class="logo">
        <span class="logo-badge"><img class="icon" src="./assets/logo.png" alt="logo"></span>
        <span class="logo-text">IoT 水系统智能监控平台</span>
      </div>
      <svg-icon name="droplet" :size="20" class="header-drop"></svg-icon>
    </header>

    <!-- 主要内容区域 (路由出口) -->
    <main class="app-main">
      <router-view />
    </main>

    <!-- 底部导航栏 -->
    <footer v-if="!hideTab" class="app-footer">
      <router-link to="/" class="tab-item" active-class="active">
        <svg-icon name="home" :size="22"></svg-icon>
        <span class="text">主页</span>
      </router-link>
      <router-link to="/records" class="tab-item" active-class="active">
        <svg-icon name="record" :size="22"></svg-icon>
        <span class="text">记录</span>
      </router-link>
      <router-link to="/alarms" class="tab-item" active-class="active">
        <svg-icon name="alarm" :size="22"></svg-icon>
        <span class="text">报警</span>
      </router-link>
      <router-link to="/statistics" class="tab-item" active-class="active">
        <svg-icon name="statistics" :size="22"></svg-icon>
        <span class="text">统计</span>
      </router-link>
      <router-link to="/config" class="tab-item" active-class="active">
        <svg-icon name="settings" :size="22"></svg-icon>
        <span class="text">配置</span>
      </router-link>
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
      alarmTimer: null,
      seenAlarms: {}, // 记录已弹窗的报警，避免重复弹
      alarmInitialized: false,
      sseEventSource: null
    }
  },
  computed: {
    hideTab() {
      return this.$route.meta.hideTab
    }
  },
  mounted() {
    // 全局轮询活跃告警，发现新报警就弹窗提示（1-5b）
    this.fetchActiveAlarms()
    this.alarmTimer = setInterval(this.fetchActiveAlarms, 5000)
    // 建立 SSE 长连接：接收后端实时事件推送（若不连接，后端事件队列会堆积占满）
    this.initSSE()
  },
  beforeDestroy() {
    if (this.alarmTimer) {
      clearInterval(this.alarmTimer)
    }
    if (this.sseEventSource) {
      this.sseEventSource.close()
      this.sseEventSource = null
    }
  },
  methods: {
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

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
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
}

.header-drop {
  opacity: 0.85;
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
</style>
