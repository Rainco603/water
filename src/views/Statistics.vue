<template>
  <div class="statistics-page">

    <!-- 1. 数据统计（平均值 / 累计值，字段与类型可增删改） -->
    <div class="card-box">
      <div class="card-title">
        数据统计
        <span class="stat-window">
          <el-radio-group v-model="statWindow" size="mini" @change="fetchStatistics">
            <el-radio-button label="30m">30分钟</el-radio-button>
            <el-radio-button label="1h">1小时</el-radio-button>
            <el-radio-button label="2h">2小时</el-radio-button>
            <el-radio-button label="custom">自定义</el-radio-button>
          </el-radio-group>
        </span>
        <el-button size="mini" type="primary" plain style="margin-left: auto;" @click="openStatEdit"><svg-icon name="edit" :size="14"/>编辑</el-button>
      </div>
      <div class="stat-custom" v-if="statWindow === 'custom'">
        <span class="stat-custom-label">时间范围:</span>
        <roll-time-range-picker v-model="statCustomRange"></roll-time-range-picker>
      </div>
      <div class="stat-grid">
        <div
          v-for="c in statCards"
          :key="c.id"
          class="stat-card"
          :class="c.type === 'total' ? 'stat-card--total' : ''"
        >
          <div class="stat-card-label">
            <svg-icon :name="statIcon(c.field)" :size="15" class="stat-card-icon"/>
            {{ c.label }}
          </div>
          <div class="stat-card-value">
            {{ c.value }}<i v-if="c.unit" class="unit">{{ c.unit }}</i>
          </div>
        </div>
        <div v-if="statCards.length === 0" style="text-align:center;color:#909399;padding:20px;font-size:12px;grid-column:1/-1;">
          暂无统计卡片，点击【编辑】添加
        </div>
      </div>
    </div>

    <!-- 编辑数据统计卡片弹窗（字段来自实时传感数据，平均值/累计值可选） -->
    <el-dialog title="编辑数据统计卡片" :visible.sync="statEditVisible" width="94%" :modal-append-to-body="true">
      <div class="stat-edit-list">
        <div class="stat-edit-row" v-for="(c, index) in editStatCards" :key="c.id">
          <el-select v-model="c.field" size="mini" placeholder="选择字段" style="width: 110px;">
            <el-option v-for="s in sensorItems" :key="s.key" :label="s.label" :value="s.key"></el-option>
          </el-select>
          <el-select v-model="c.mode" size="mini" style="width: 96px;">
            <el-option label="平均值" value="avg"></el-option>
            <el-option label="累计值" value="total"></el-option>
          </el-select>
          <el-button size="mini" type="danger" plain @click="editStatCards.splice(index, 1)"><svg-icon name="delete" :size="14"/></el-button>
        </div>
        <div v-if="editStatCards.length === 0" style="text-align:center;color:#909399;padding:16px;font-size:12px;">
          暂无卡片，点击下方【添加卡片】新建
        </div>
      </div>
      <div style="margin-top: 10px;">
        <el-button size="mini" type="primary" plain @click="addStatCard"><svg-icon name="plus" :size="14"/>添加卡片</el-button>
      </div>
      <span slot="footer">
        <el-button size="mini" @click="statEditVisible = false">取消</el-button>
        <el-button size="mini" type="primary" @click="saveStatCards">保存</el-button>
      </span>
    </el-dialog>

    <!-- 2. 设备使用时长 -->
    <div class="card-box">
      <div class="card-title">
        设备使用时长
        <svg-icon name="duration" :size="16" class="card-title-icon"/>
        <span class="stat-window">
          <el-radio-group v-model="usageWindow" size="mini" @change="fetchUsageDurations">
            <el-radio-button label="1h">1小时</el-radio-button>
            <el-radio-button label="6h">6小时</el-radio-button>
            <el-radio-button label="24h">24小时</el-radio-button>
            <el-radio-button label="custom">自定义</el-radio-button>
          </el-radio-group>
        </span>
      </div>
      <div class="stat-custom" v-if="usageWindow === 'custom'">
        <span class="stat-custom-label">时间范围:</span>
        <roll-time-range-picker v-model="usageCustomRange"></roll-time-range-picker>
      </div>
      <div ref="usageChart" class="usage-chart" style="width: 100%; height: 180px;"></div>
    </div>

  </div>
</template>

<script>
import { SENSOR_DEFS } from '../utils/sensors'
import { unwrapData } from '../utils/request'
import * as echarts from 'echarts'
import RollTimeRangePicker from '../components/RollTimeRangePicker.vue'

export default {
  name: 'StatisticsPage',
  components: { RollTimeRangePicker },
  data() {
    return {
      // 实时传感数据展示项（本地持久化，与主页共享）
      sensorItems: SENSOR_DEFS.map(s => ({ key: s.key, label: s.label, unit: s.unit })),
      // 设备控制项（本地持久化，与主页共享）
      devices: [
        { key: 'pump', label: '水泵' },
        { key: 'heater', label: '加热器' }
      ],
      // ===== 数据统计 =====
      statWindow: '1h',
      statResults: {},
      statCardsConfig: [],
      statNextId: 1,
      statEditVisible: false,
      editStatCards: [],
      statLoading: false,
      statTimer: null,
      // ===== 设备使用时长 =====
      usageWindow: '24h',
      usageResults: {},
      usageLoading: false,
      usageTimer: null,
      usageChart: null,
      statCustomRange: [],
      usageCustomRange: []
    }
  },
  created() {
    this.loadSensorItems()
    this.loadDevices()
    this.loadStatCards()
  },
  mounted() {
    this.fetchStatistics()
    this.fetchUsageDurations()

    this.statTimer = setInterval(() => this.fetchStatistics(), 60000)
    this.usageTimer = setInterval(() => this.fetchUsageDurations(), 60000)
    window.addEventListener('resize', this.resizeUsageChart)
  },
  beforeDestroy() {
    if (this.statTimer) clearInterval(this.statTimer)
    if (this.usageTimer) clearInterval(this.usageTimer)
    window.removeEventListener('resize', this.resizeUsageChart)
    if (this.usageChart) {
      this.usageChart.dispose()
      this.usageChart = null
    }
  },
  computed: {
    statCards() {
      return this.statCardsConfig.map(c => {
        const col = this.sensorItems.find(s => s.key === c.field)
        const label = col ? col.label : c.field
        const unit = col ? col.unit : ''
        if (c.mode === 'total') {
          const avg = this.statResults[c.field]
          const total = (avg === undefined || avg === null) ? null : avg * this.windowMinutes()
          return {
            id: c.id,
            type: 'total',
            label: label + '累计值',
            unit: c.field === 'flow' ? 'L' : unit,
            value: this.formatTotal(total)
          }
        }
        return {
          id: c.id,
          type: 'avg',
          label: label + '平均值',
          unit: unit,
          value: this.formatStat(c.field, this.statResults[c.field])
        }
      })
    }
  },
  watch: {
    statCustomRange(val) {
      if (this.statWindow === 'custom' && val && val.length === 2 && val[0] && val[1]) this.fetchStatistics()
    },
    usageCustomRange(val) {
      if (this.usageWindow === 'custom' && val && val.length === 2 && val[0] && val[1]) this.fetchUsageDurations()
    }
  },
  methods: {
    // ===== 本地数据加载（与主页共享 localStorage） =====
    loadSensorItems() {
      try {
        const raw = localStorage.getItem('iot_water_sensors')
        if (raw) {
          const arr = JSON.parse(raw)
          if (Array.isArray(arr) && arr.length) this.sensorItems = arr
        }
      } catch (e) { /* 本地数据解析失败时使用默认值 */ }
    },
    loadDevices() {
      try {
        const raw = localStorage.getItem('iot_water_devices')
        if (raw) {
          const arr = JSON.parse(raw)
          if (Array.isArray(arr) && arr.length) this.devices = arr
        }
      } catch (e) { /* 本地数据解析失败时使用默认值 */ }
    },

    // ===== 时间格式化与窗口 =====
    formatDate(date) {
      const pad = (n) => n < 10 ? '0' + n : n
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
    },
    windowMinutes() {
      return { '30m': 30, '1h': 60, '2h': 120 }[this.statWindow] || 60
    },
    windowToRange() {
      if (this.statWindow === 'custom') {
        return (this.statCustomRange && this.statCustomRange.length === 2 && this.statCustomRange[0] && this.statCustomRange[1])
          ? this.statCustomRange : []
      }
      const minutes = this.windowMinutes()
      const end = new Date()
      const start = new Date(end.getTime() - minutes * 60 * 1000)
      return [this.formatDate(start), this.formatDate(end)]
    },
    normalizePoints(res) {
      let arr = unwrapData(res)
      if (!Array.isArray(arr) && arr && Array.isArray(arr.data)) arr = arr.data
      return Array.isArray(arr) ? arr : []
    },

    // ===== 数据统计 =====
    formatStat(key, val) {
      if (val === undefined || val === null || val === '--') return '--'
      const n = Number(val)
      if (isNaN(n)) return '--'
      const digits = key === 'flow' ? 2 : 1
      return parseFloat(n.toFixed(digits)).toString()
    },
    formatTotal(val) {
      if (val === undefined || val === null) return '--'
      const n = Number(val)
      if (isNaN(n)) return '--'
      if (n >= 10000) return (n / 10000).toFixed(2) + '万'
      return parseFloat(n.toFixed(2)).toString()
    },
    defaultStatCards() {
      const cards = this.sensorItems.map(s => ({ id: this.statNextId++, field: s.key, mode: 'avg' }))
      if (this.sensorItems.some(i => i.key === 'flow')) {
        cards.push({ id: this.statNextId++, field: 'flow', mode: 'total' })
      }
      return cards
    },
    // 统计卡片图标映射（与 Home 传感卡片一致）
    statIcon() {
      return (key) => {
        if (/temp/i.test(key)) return 'temperature'
        if (/pressure/i.test(key)) return 'pressure'
        if (/flow/i.test(key)) return 'flow'
        if (/level|water|液位|水位/i.test(key)) return 'level-warn'
        return 'droplet'
      }
    },
    loadStatCards() {
      try {
        const raw = localStorage.getItem('iot_water_stat_cards')
        if (raw) {
          const arr = JSON.parse(raw)
          if (Array.isArray(arr) && arr.length) {
            this.statCardsConfig = arr
            const maxId = arr.reduce((m, c) => Math.max(m, Number(c.id) || 0), 0)
            this.statNextId = maxId + 1
            return
          }
        }
      } catch (e) { /* 解析失败走默认 */ }
      this.statCardsConfig = this.defaultStatCards()
    },
    persistStatCards() {
      localStorage.setItem('iot_water_stat_cards', JSON.stringify(this.statCardsConfig))
    },
    openStatEdit() {
      this.editStatCards = this.statCardsConfig.map(c => ({ ...c }))
      this.statEditVisible = true
    },
    addStatCard() {
      const first = this.sensorItems[0]
      this.editStatCards.push({
        id: this.statNextId++,
        field: first ? first.key : '',
        mode: 'avg'
      })
    },
    saveStatCards() {
      const list = this.editStatCards
        .filter(c => c.field)
        .map(c => ({ id: c.id, field: c.field, mode: c.mode === 'total' ? 'total' : 'avg' }))
      this.statCardsConfig = list
      this.persistStatCards()
      this.statEditVisible = false
      this.$message.success('数据统计卡片已保存')
      this.fetchStatistics()
    },
    async fetchStatistics() {
      if (this.statLoading) return
      const range = this.windowToRange()
      if (!range || range.length !== 2) {
        this.statResults = {}
        return
      }
      this.statLoading = true
      try {
        const [start, end] = range
        const cols = this.sensorItems
        if (!cols || !cols.length) {
          this.statResults = {}
          return
        }
        const results = await Promise.all(
          cols.map(col =>
            this.$http.get('/records/sensor/chart', {
              params: { sensor_type: col.key, start_time: start, end_time: end }
            })
          )
        )
        const newResults = {}
        results.forEach((res, i) => {
          const col = cols[i]
          const values = this.normalizePoints(res)
            .map(p => Number(p.value))
            .filter(v => !isNaN(v))
          newResults[col.key] = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null
        })
        // 累计值 = 平均值 × 窗口时长(分钟)，流量即体积(L)；这里只算各字段平均值，累计值在 statCards 里按需换算
        this.statResults = newResults
      } catch (e) {
        console.error('获取数据统计失败', e)
      } finally {
        this.statLoading = false
      }
    },

    // ===== 设备使用时长 =====
    usageToRange() {
      if (this.usageWindow === 'custom') {
        return (this.usageCustomRange && this.usageCustomRange.length === 2 && this.usageCustomRange[0] && this.usageCustomRange[1])
          ? this.usageCustomRange : []
      }
      const minutes = { '1h': 60, '6h': 360, '24h': 1440 }[this.usageWindow] || 1440
      const end = new Date()
      const start = new Date(end.getTime() - minutes * 60 * 1000)
      return [this.formatDate(start), this.formatDate(end)]
    },
    isOn(v) {
      return v === 1 || v === '1' || v === true || v === 'true'
    },
    parseTime(ts) {
      if (!ts) return NaN
      const t = new Date(String(ts).replace(/-/g, '/')).getTime()
      return isNaN(t) ? NaN : t
    },
    computeOnSeconds(points, endTime) {
      const pts = points
        .map(p => ({ t: this.parseTime(p.timestamp), v: p.value }))
        .filter(p => !isNaN(p.t))
        .sort((a, b) => a.t - b.t)
      let total = 0
      for (let i = 0; i < pts.length; i++) {
        if (!this.isOn(pts[i].v)) continue
        const nextT = i + 1 < pts.length ? pts[i + 1].t : endTime
        if (nextT > pts[i].t) total += (nextT - pts[i].t) / 1000
      }
      return total
    },
    async fetchUsageDurations() {
      if (this.usageLoading) return
      const range = this.usageToRange()
      if (!range || range.length !== 2) {
        this.usageResults = {}
        return
      }
      this.usageLoading = true
      try {
        const [start, end] = range
        const endTime = new Date(String(end).replace(/-/g, '/')).getTime()
        const devs = this.devices || []
        if (!devs.length) {
          this.usageResults = {}
          return
        }
        const results = await Promise.all(
          devs.map(d =>
            this.$http.get('/records/sensor/chart', {
              params: { sensor_type: d.key, start_time: start, end_time: end }
            })
          )
        )
        const newResults = {}
        results.forEach((res, i) => {
          newResults[devs[i].key] = this.computeOnSeconds(this.normalizePoints(res), endTime)
        })
        this.usageResults = newResults
        this.renderUsageChart()
      } catch (e) {
        console.error('获取设备使用时长失败', e)
      } finally {
        this.usageLoading = false
      }
    },
    formatDuration(seconds) {
      if (seconds === undefined || seconds === null || isNaN(seconds)) return '--'
      const s = Math.round(seconds)
      if (s < 60) return s + ' 秒'
      const minutes = Math.floor(s / 60)
      if (minutes < 60) return minutes + ' 分钟'
      const hours = Math.floor(minutes / 60)
      const rem = minutes % 60
      return rem ? hours + ' 小时 ' + rem + ' 分' : hours + ' 小时'
    },
    formatDurationAxis(seconds) {
      const s = Math.round(seconds)
      if (s < 60) return s + '秒'
      const minutes = Math.floor(s / 60)
      if (minutes < 60) return minutes + '分'
      const h = minutes / 60
      return (Math.round(h * 10) / 10) + '小时'
    },
    renderUsageChart() {
      const el = this.$refs.usageChart
      if (!el) return
      if (!this.usageChart) {
        this.usageChart = echarts.init(el)
      }
      const devs = this.devices || []
      const data = devs.map(d => ({
        name: d.label,
        value: this.usageResults[d.key] ?? 0
      }))
      const height = Math.max(140, data.length * 56 + 40)
      el.style.height = height + 'px'
      this.usageChart.resize()
      this.usageChart.setOption({
        grid: { left: 8, right: 60, top: 10, bottom: 10, containLabel: true },
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          formatter: (params) => {
            const p = params && params[0]
            return p ? p.name + '：' + this.formatDuration(p.value) : ''
          }
        },
        xAxis: {
          type: 'value',
          axisLabel: { formatter: (v) => this.formatDurationAxis(v), color: '#909399', fontSize: 10 },
          splitLine: { lineStyle: { color: '#ebeef5' } }
        },
        yAxis: {
          type: 'category',
          inverse: true,
          data: data.map(d => d.name),
          axisLabel: { color: '#606266', fontSize: 12 },
          axisLine: { lineStyle: { color: '#dcdfe6' } },
          axisTick: { show: false }
        },
        series: [{
          type: 'bar',
          data: data.map(d => d.value),
          barWidth: 16,
          itemStyle: { color: '#14b8a6', borderRadius: [0, 8, 8, 0] },
          label: {
            show: true,
            position: 'right',
            formatter: (p) => this.formatDuration(p.value),
            color: '#14b8a6',
            fontSize: 11
          }
        }]
      }, true)
    },
    resizeUsageChart() {
      if (this.usageChart) this.usageChart.resize()
    }
  }
}
</script>

<style scoped>
/* 数据统计卡片 */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
}

.stat-window {
  margin-left: 12px;
}

.stat-custom {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
}

.stat-custom-label {
  font-size: 12px;
  color: #909399;
  flex-shrink: 0;
}

.stat-card {
  background: #f5f7fa;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 14px 12px;
  text-align: center;
}

.stat-card-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.stat-card-icon {
  color: var(--primary);
}

.card-title-icon {
  color: var(--primary);
  margin-right: 4px;
}

.stat-card-value {
  font-size: 20px;
  font-weight: bold;
  color: #14b8a6;
}

.stat-card-value .unit {
  font-size: 12px;
  color: #909399;
  font-weight: normal;
  font-style: normal;
  margin-left: 2px;
}

.stat-card--total {
  background: #fffbf0;
  border-color: #fef0c7;
}

.stat-card--total .stat-card-value {
  color: #f59e0b;
}

/* 编辑统计卡片弹窗 */
.stat-edit-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 360px;
  overflow-y: auto;
}

.stat-edit-row {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

/* 设备使用时长横向条形图 */
.usage-chart {
  width: 100%;
  min-height: 140px;
}
</style>
