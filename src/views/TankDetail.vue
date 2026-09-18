<template>
  <div class="tank-detail-page">
    <!-- 返回按钮 -->
    <div class="back-btn" @click="goBack">
      <i class="el-icon-back"></i> 返回主页
    </div>

    <!-- 1. 水槽基本信息与状态 -->
    <div class="card-box">
      <div class="card-title">
        水槽 0{{ tankId }} - 实时状态
        <el-button size="mini" type="primary" plain icon="el-icon-edit" style="margin-left: 10px;" @click="openEditDialog">编辑</el-button>
      </div>

      <!-- 桌面端：水槽可视化 + 动态卡片网格 -->
      <div class="desktop-only">
        <div class="detail-header">
          <div class="tank-visual">
            <div class="tank-body">
              <div class="water" :style="{ height: waterLevel + '%' }"></div>
            </div>
            <div class="tank-name">水槽 0{{ tankId }}</div>
          </div>
          <div class="status-info">
            <!-- 传感器卡片 -->
            <div class="info-item" v-for="s in displaySensors" :key="s.key">
              <span class="i-label">{{ s.label }}</span>
              <span class="i-value">{{ sensorData[s.key] !== undefined ? sensorData[s.key] : '--' }} <i class="unit">{{ s.unit }}</i></span>
              <span class="i-stat">
                <span class="i-stat-tag">平均</span>
                <span class="i-stat-val">{{ formatStat(s.key, sensorAvg(s.key)) }}</span>
                <span class="i-stat-unit">{{ s.unit }}</span>
              </span>
            </div>
            <!-- 执行器状态卡片 -->
            <div class="info-item" v-for="d in displayDevices" :key="d.key">
              <span class="i-label">{{ d.label }}</span>
              <span class="i-value" :class="deviceStatus[d.key] ? 'text-success' : 'text-gray'">
                {{ deviceStatus[d.key] ? '开启中' : '已停止' }}
              </span>
              <el-button
                :type="deviceStatus[d.key] ? 'danger' : 'success'"
                size="mini"
                :disabled="!online"
                @click="toggleDevice(d.key, !deviceStatus[d.key])"
              >
                {{ deviceStatus[d.key] ? '关闭' : '开启' }}
              </el-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 移动端：卡片列表 -->
      <div class="mobile-only">
        <div class="tank-info-card">
          <div class="tank-info-visual">
            <div class="tank-body tank-body--sm">
              <div class="water" :style="{ height: waterLevel + '%' }"></div>
            </div>
            <div class="tank-name">水槽 0{{ tankId }}</div>
          </div>
          <!-- 传感器卡片 -->
          <div class="tank-sensor-card" v-for="s in displaySensors" :key="s.key">
            <div class="tank-sensor-header">
              <span class="tank-sensor-label">{{ s.label }}</span>
              <span class="tank-sensor-unit">{{ s.unit }}</span>
            </div>
            <div class="tank-sensor-value">{{ sensorData[s.key] !== undefined ? sensorData[s.key] : '--' }}</div>
            <div class="tank-sensor-stat">
              <span class="i-stat-tag">平均</span>
              <span class="i-stat-val">{{ formatStat(s.key, sensorAvg(s.key)) }}</span>
              <span class="i-stat-unit">{{ s.unit }}</span>
            </div>
          </div>
          <!-- 执行器卡片 -->
          <div class="tank-device-card" v-for="d in displayDevices" :key="d.key">
            <div class="tank-device-name">{{ d.label }}</div>
            <div class="tank-device-status" :class="deviceStatus[d.key] ? 'status-normal' : 'status-warn'">
              {{ deviceStatus[d.key] ? '开启中' : '已停止' }}
            </div>
            <el-button
              :type="deviceStatus[d.key] ? 'danger' : 'success'"
              size="small"
              :disabled="!online"
              @click="toggleDevice(d.key, !deviceStatus[d.key])"
              round
            >
              {{ deviceStatus[d.key] ? '关闭' : '开启' }}
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 2. 历史趋势曲线（自动显示所有选中的传感器） -->
    <div class="card-box" v-if="displaySensors.length > 0">
      <div class="card-title">
        历史趋势曲线
        <el-button size="mini" type="text" :icon="fsActive ? 'el-icon-close' : 'el-icon-full-screen'" style="margin-left: auto;" @click="toggleChartFullscreen($refs.chartWrap, chart)">横屏</el-button>
      </div>
      <div class="chart-filter">
        <span class="label">快捷时间:</span>
        <el-select v-model="quickRange" size="mini" style="width: 130px">
          <el-option label="自定义" value="custom"></el-option>
          <el-option label="最近15分钟" value="15m"></el-option>
          <el-option label="最近30分钟" value="30m"></el-option>
          <el-option label="最近1小时" value="1h"></el-option>
        </el-select>
        <span class="label" v-show="quickRange === 'custom'">时间范围:</span>
        <roll-time-range-picker v-show="quickRange === 'custom'" v-model="timeRange"></roll-time-range-picker>
        <el-button type="primary" size="mini" @click="fetchChartData" round>查 询</el-button>
      </div>
      <div class="chart-wrap" ref="chartWrap">
        <div ref="chart" style="width: 100%; height: 300px;"></div>
        <div class="chart-empty" v-if="chartEmpty">
          <i class="el-icon-data-line"></i>
          <span>{{ chartEmptyText }}</span>
        </div>
        <el-button class="fs-exit" v-show="fsActive" size="mini" type="danger" round icon="el-icon-close" @click.stop="toggleChartFullscreen($refs.chartWrap, chart)">退出横屏</el-button>
      </div>
    </div>

    <!-- 编辑显示字段弹窗 -->
    <el-dialog title="编辑显示字段" :visible.sync="editDialogVisible" width="500px" :modal-append-to-body="true" custom-class="edit-dialog">
      <div class="edit-dialog-body">
        <!-- 传感器区 -->
        <div class="edit-section">
          <div class="edit-section-head">
            <span class="edit-section-icon el-icon-cpu"></span>
            <span class="edit-section-title">传感器</span>
            <span class="edit-section-count" v-if="editForm.sensors.length">{{ editForm.sensors.length }} 项</span>
          </div>
          <div class="edit-current" v-if="editForm.sensors.length">
            <span class="edit-current-label">当前显示：</span>
            <span class="edit-tag" v-for="key in editForm.sensors" :key="key">
              {{ sensorLabel(key) }}（{{ sensorUnit(key) }}）
              <i class="el-icon-close" @click="removeSensor(key)"></i>
            </span>
          </div>
          <div class="edit-hint" v-else>暂未选择任何传感器</div>
          <div class="edit-divider"></div>
          <div class="edit-add-label">点击勾选添加到显示</div>
          <div class="edit-check-list">
            <el-checkbox-group v-model="editForm.sensors">
              <el-checkbox v-for="s in availableSensors" :key="s.key" :label="s.key">
                {{ s.label }}
                <span class="edit-check-unit">{{ s.unit }}</span>
              </el-checkbox>
            </el-checkbox-group>
          </div>
        </div>

        <!-- 执行器区 -->
        <div class="edit-section">
          <div class="edit-section-head">
            <span class="edit-section-icon el-icon-set-up"></span>
            <span class="edit-section-title">执行器状态</span>
            <span class="edit-section-count" v-if="editForm.devices.length">{{ editForm.devices.length }} 项</span>
          </div>
          <div class="edit-current" v-if="editForm.devices.length">
            <span class="edit-current-label">当前显示：</span>
            <span class="edit-tag" v-for="key in editForm.devices" :key="key">
              {{ deviceLabel(key) }}
              <i class="el-icon-close" @click="removeDevice(key)"></i>
            </span>
          </div>
          <div class="edit-hint" v-else>暂未选择任何执行器</div>
          <div class="edit-divider"></div>
          <div class="edit-add-label">点击勾选添加到显示</div>
          <div class="edit-check-list">
            <el-checkbox-group v-model="editForm.devices">
              <el-checkbox v-for="d in availableDevices" :key="d.key" :label="d.key">
                {{ d.label }}
              </el-checkbox>
            </el-checkbox-group>
          </div>
        </div>
      </div>
      <span slot="footer">
        <el-button size="small" @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" size="small" @click="confirmEdit">确定</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import * as echarts from 'echarts';
import RollTimeRangePicker from '../components/RollTimeRangePicker.vue';
import { unwrapData } from '../utils/request';
import { resolveQuickRange } from '../utils/quickRange';
import { SENSOR_DEFS, ACTUATOR_DEFS, fetchSensorFields, fieldsToSensorItems, fieldsToDeviceItems, reconcileByBackend, loadLocalSensors, loadDeletedSensorKeys } from '../utils/sensors';
import chartFullscreen from '../mixins/chartFullscreen';

export default {
  name: 'TankDetail',
  components: { RollTimeRangePicker },
  mixins: [chartFullscreen],
  data() {
    return {
      sensorData: {},
      deviceStatus: {},
      timeRange: [],
      // 快捷时间：'custom'=自定义时间范围；'15m'/'30m'/'1h'=最近15/30分钟/1小时（与时间范围互斥）
      quickRange: 'custom',
      chart: null,
      timer: null,
      disposed: false,
      online: true,
      heartbeatTimeout: 30,
      chartEmpty: false,
      chartEmptyText: '后端连接失败或暂无数据，无法加载历史曲线',

      // 该水槽的显示配置（从 localStorage 按水槽独立加载）
      tankDisplayConfig: { sensors: [], devices: [] },
      // 编辑弹窗临时数据
      editDialogVisible: false,
      editForm: { sensors: [], devices: [] },
      // 所有可用传感器/执行器（全量，用于添加选择）
      availableSensors: [],
      availableDevices: []
    }
  },
  computed: {
    tankId() {
      return this.$route.params.id || '1'
    },
    currentTemp() {
      const tempKey = `temp${this.tankId}`;
      return this.sensorData[tempKey] !== undefined ? this.sensorData[tempKey] : '--';
    },
    waterLevel() {
      const temp = parseFloat(this.currentTemp);
      if (isNaN(temp)) return 50;
      return 40 + (temp % 10);
    },
    // 当前水槽要显示的传感器列表
    displaySensors() {
      const keys = new Set(this.tankDisplayConfig.sensors || [])
      if (!keys.size) {
        // 默认显示当前水槽的温度 + 全局流量和压力
        return [
          { key: `temp${this.tankId}`, label: `水温 ${this.tankId}`, unit: '℃' },
          { key: 'flow', label: '管道流量', unit: 'L/min' },
          { key: 'pressure', label: '管道压力', unit: 'kPa' }
        ]
      }
      // availableSensors 可能还在异步加载中，过滤结果为空时兜底返回默认列表，保证图表卡片不消失
      const filtered = this.availableSensors.filter(s => keys.has(s.key))
      if (filtered.length) return filtered
      return [
        { key: `temp${this.tankId}`, label: `水温 ${this.tankId}`, unit: '℃' },
        { key: 'flow', label: '管道流量', unit: 'L/min' },
        { key: 'pressure', label: '管道压力', unit: 'kPa' }
      ]
    },
    // 当前水槽要显示的执行器列表
    displayDevices() {
      const keys = new Set(this.tankDisplayConfig.devices || [])
      if (!keys.size) return []
      const filtered = this.availableDevices.filter(d => keys.has(d.key))
      if (filtered.length) return filtered
      // availableDevices 异步加载中，兜底返回默认执行器清单，保证执行器卡片不消失
      return ACTUATOR_DEFS.filter(a => keys.has(a.key)).map(a => ({ key: a.key, label: a.label }))
    }
  },
  watch: {
    tankId() {
      // 切换水槽时重新加载配置和图表
      this.loadTankDisplayConfig()
      this.fetchChartData()
    }
  },
  mounted() {
    this.initChart();
    this.loadTankDisplayConfig()
    this.loadAllFields()

    const end = new Date();
    const start = new Date(end.getTime() - 3600 * 1000);
    this.timeRange = [this.formatDate(start), this.formatDate(end)];

    this.fetchRealTimeData();
    this.fetchChartData();
    this.timer = setInterval(() => {
      this.fetchRealTimeData();
    }, 3000);

    window.addEventListener('resize', this.resizeChart);
  },
  beforeDestroy() {
    this.disposed = true;
    if (this.timer) clearInterval(this.timer);
    window.removeEventListener('resize', this.resizeChart);
    if (this.chart) {
      this.chart.dispose();
      this.chart = null;
    }
  },
  methods: {
    goBack() {
      this.$router.history.length > 1 ? this.$router.go(-1) : this.$router.push('/')
    },

    initChart() {
      this.chart = echarts.init(this.$refs.chart)
      const option = {
        backgroundColor: 'transparent',
        tooltip: { trigger: 'axis' },
        legend: { data: [], type: 'scroll', top: 0, textStyle: { color: '#909399' } },
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
        xAxis: { type: 'category', data: [], axisLabel: { color: '#909399' }, axisLine: { lineStyle: { color: '#dcdfe6' } } },
        yAxis: { type: 'value', axisLabel: { color: '#909399' }, axisLine: { lineStyle: { color: '#dcdfe6' } }, splitLine: { lineStyle: { color: '#ebeef5' } } },
        series: []
      }
      this.chart.setOption(option)
    },

    // ===== 加载该水槽的显示配置 =====
    loadTankDisplayConfig() {
      try {
        const raw = localStorage.getItem(`iot_water_tank_${this.tankId}_display`)
        if (raw) {
          const cfg = JSON.parse(raw)
          if (cfg && typeof cfg === 'object') {
            this.tankDisplayConfig = {
              sensors: Array.isArray(cfg.sensors) ? cfg.sensors : [],
              devices: Array.isArray(cfg.devices) ? cfg.devices : []
            }
            return
          }
        }
      } catch (e) { /* 解析失败用默认 */ }
      // 默认：温度 + 流量 + 压力
      this.tankDisplayConfig = {
        sensors: [`temp${this.tankId}`, 'flow', 'pressure'],
        devices: ['pump', 'heater']
      }
    },

    // ===== 保存该水槽的显示配置 =====
    saveTankDisplayConfig() {
      localStorage.setItem(`iot_water_tank_${this.tankId}_display`, JSON.stringify(this.tankDisplayConfig))
    },

    // ===== 加载所有可用传感器和执行器 =====
    async loadAllFields() {
      // 加载传感器列表（本地维护 + 后端元数据）
      const localSensors = loadLocalSensors()
      const deletedKeys = new Set(loadDeletedSensorKeys())
      const fields = await fetchSensorFields(this.$http)
      let items = localSensors
      if (fields) {
        const apiItems = fieldsToSensorItems(fields)
        if (apiItems && apiItems.length) {
          items = reconcileByBackend(items, apiItems, deletedKeys)
        }
      }
      if (!items || !items.length) {
        items = SENSOR_DEFS.map(s => ({ key: s.key, label: s.label, unit: s.unit }))
      }
      // 过滤掉用户已删除的字段
      this.availableSensors = (items || []).filter(s => !deletedKeys.has(s.key))

      // 加载执行器列表（本地维护 + 后端元数据 + 默认）
      let devices = []
      try {
        const raw = localStorage.getItem('iot_water_devices')
        if (raw) {
          const arr = JSON.parse(raw)
          if (Array.isArray(arr) && arr.length) devices = arr
        }
      } catch (e) { /* 忽略 */ }
      if (!devices.length) {
        // 后端元数据缺失时回退到执行器默认清单（pump/heater）
        devices = ACTUATOR_DEFS.map(a => ({ key: a.key, label: a.label }))
      }
      if (fields) {
        const devItems = fieldsToDeviceItems(fields) || []
        if (devItems.length) {
          const devMap = {}
          devices.forEach(d => { if (d && d.key) devMap[d.key] = d })
          const merged = devItems.map(d => ({
            key: d.key,
            label: devMap[d.key] ? devMap[d.key].label : d.label
          }))
          const existingKeys = new Set(devices.map(d => d.key))
          merged.forEach(d => { if (!existingKeys.has(d.key)) devices.push(d) })
        }
      }
      this.availableDevices = devices.filter(d => d && d.key)
    },

    // ===== 打开编辑弹窗 =====
    openEditDialog() {
      this.editForm = {
        sensors: [...(this.tankDisplayConfig.sensors || [])],
        devices: [...(this.tankDisplayConfig.devices || [])]
      }
      this.editDialogVisible = true
    },

    // ===== 确认编辑 =====
    confirmEdit() {
      // 至少保留一个传感器
      if (!this.editForm.sensors || !this.editForm.sensors.length) {
        this.$message.warning('请至少选择一个显示字段')
        return
      }
      this.tankDisplayConfig.sensors = [...this.editForm.sensors]
      this.tankDisplayConfig.devices = [...this.editForm.devices]
      this.saveTankDisplayConfig()
      this.editDialogVisible = false
      this.$message.success('显示配置已保存')
      // 刷新图表
      this.fetchChartData()
    },

    // ===== 删除已选传感器/执行器 =====
    removeSensor(key) {
      this.editForm.sensors = this.editForm.sensors.filter(k => k !== key)
    },
    removeDevice(key) {
      this.editForm.devices = this.editForm.devices.filter(k => k !== key)
    },

    // ===== 辅助：显示名称 =====
    sensorLabel(key) {
      const s = (this.availableSensors || []).find(x => x.key === key)
      return s ? s.label : key
    },
    sensorUnit(key) {
      const s = (this.availableSensors || []).find(x => x.key === key)
      return s ? s.unit : ''
    },
    deviceLabel(key) {
      const d = (this.availableDevices || []).find(x => x.key === key)
      return d ? d.label : key
    },

    // ===== 设备控制 =====
    async toggleDevice(device, value) {
      if (!this.online) {
        this.$message.warning('设备离线，无法下发控制指令')
        return
      }
      const payload = { [device]: value ? 1 : 0 }
      try {
        const res = await this.$http.post('/monitor/device/control', payload)
        if (res.code === 0) {
          this.$message.success(res.msg || '指令已下发')
          this.$set(this.deviceStatus, device, value ? 1 : 0)
        } else {
          this.$message.error(res.msg || '控制失败')
        }
      } catch (error) {
        this.$message.error('控制请求失败')
      }
    },

    async fetchRealTimeData() {
      try {
        let res = await this.$http.get('/monitor/sensor/latest');
        res = unwrapData(res);
        if (res) {
          this.sensorData = res;
          this.updateOnline(res.timestamp)
        }
        let devRes = await this.$http.get('/monitor/device/status')
        devRes = unwrapData(devRes);
        if (devRes) {
          // 文档：/monitor/device/status 返回 { field_name: 0/1 }（如 { pump: 0, heater: 0 }）
          // 按当前显示的执行器 field_name 动态读取，兼容 _status 后缀
          const status = {}
          this.displayDevices.forEach(d => {
            status[d.key] = devRes[d.key] ?? devRes[d.key + '_status'] ?? this.sensorData[d.key] ?? 0
          })
          this.deviceStatus = status
        }
      } catch (error) {
        console.error('获取传感数据失败', error);
        this.online = false
      }
    },

    updateOnline(timestamp) {
      if (!timestamp) { this.online = false; return }
      const t = new Date(String(timestamp).replace(/-/g, '/')).getTime()
      if (isNaN(t)) { this.online = true; return }
      this.online = (Date.now() - t) / 1000 <= this.heartbeatTimeout
    },

    // ===== 图表：自动请求所有选中的传感器 + 执行器数据 =====
    async fetchChartData() {
      const targets = [...this.displaySensors, ...this.displayDevices]
      if (!targets.length) {
        this.updateChart([], [])
        return
      }
      this.chartEmpty = false
      try {
        const range = resolveQuickRange(this.quickRange, this.timeRange, this.formatDate)
        const hasRange = range && range.length === 2
        const base = {
          start_time: hasRange ? range[0] : undefined,
          end_time: hasRange ? range[1] : undefined
        }
        const results = await Promise.all(
          targets.map(t =>
            this.$http.get('/records/sensor/chart', { params: { ...base, sensor_type: t.key } })
          )
        )
        const points = results.map(r => {
          let arr = unwrapData(r)
          if (!Array.isArray(arr) && arr && Array.isArray(arr.data)) arr = arr.data
          return Array.isArray(arr) ? arr : []
        })
        if (!points.some(arr => arr.length)) {
          this.chartEmpty = true
          this.chartEmptyText = this.online ? '所选时间范围内暂无数据' : '后端连接失败，无法加载历史曲线'
          this.updateChart([], [])
          return
        }
        this.chartEmpty = false
        const series = targets.map((t, i) => this.buildSeries(t, points[i]))
        const xData = this.pickXData(points)
        this.updateChart(xData, series)
      } catch (error) {
        console.error('获取图表数据失败', error)
        this.chartEmpty = true
        this.chartEmptyText = '后端连接失败，无法加载历史曲线'
        this.updateChart([], [])
      }
    },

    buildSeries(target, data) {
      const isActuator = this.displayDevices.some(d => d.key === target.key)
      const color = isActuator ? this.actuatorColor(target.key) : this.sensorColor(target.key)
      const name = target.label || target.key
      if (isActuator) {
        return {
          name,
          type: 'line',
          data: (Array.isArray(data) ? data : []).map(d => d.value),
          step: 'start',
          symbol: 'none',
          showSymbol: false,
          lineStyle: { color, width: 2 },
          itemStyle: { color },
          unit: '状态'
        }
      }
      const isPrimary = target.key === `temp${this.tankId}`
      return {
        name,
        type: 'line',
        data: (Array.isArray(data) ? data : []).map(d => d.value),
        smooth: true,
        showSymbol: false,
        itemStyle: { color },
        lineStyle: { color },
        areaStyle: isPrimary ? { color: color + '26' } : undefined,
        unit: target.unit || ''
      }
    },

    pickXData(dataArrays) {
      for (const arr of dataArrays) {
        if (arr && arr.length) return arr.map(d => d.timestamp);
      }
      return [];
    },

    updateChart(xData, series) {
      if (this.disposed || !this.chart) return;
      // 有数据到达时隐藏空状态提示
      if (Array.isArray(xData) && xData.length) this.chartEmpty = false
      // 按单位分配 Y 轴：执行器用 '状态' 作为独立 unit，单独配置 0/1 标签
      const unitIndex = {}
      const yAxes = []
      series.forEach(s => {
        const unit = s.unit || ''
        if (!(unit in unitIndex)) {
          const idx = yAxes.length
          unitIndex[unit] = idx
          const onLeft = idx % 2 === 0
          const isActuatorAxis = unit === '状态'
          yAxes.push({
            type: 'value',
            name: isActuatorAxis ? '状态' : unit,
            scale: !isActuatorAxis,
            min: isActuatorAxis ? -0.15 : undefined,
            max: isActuatorAxis ? 1.15 : undefined,
            interval: isActuatorAxis ? 1 : undefined,
            position: onLeft ? 'left' : 'right',
            offset: Math.floor(idx / 2) * 46,
            nameTextStyle: { color: '#909399', fontSize: 10 },
            axisLabel: {
              color: '#909399',
              fontSize: 10,
              formatter: isActuatorAxis ? (v => v === 1 ? '开启' : '关闭') : undefined
            },
            axisLine: { show: true, lineStyle: { color: '#dcdfe6' } },
            splitLine: { show: idx === 0, lineStyle: { color: '#ebeef5' } }
          })
        }
        s.yAxisIndex = unitIndex[unit]
      })
      const finalYAxes = yAxes.length ? yAxes : [{
        type: 'value', scale: true,
        axisLabel: { color: '#909399', fontSize: 10 },
        axisLine: { show: true, lineStyle: { color: '#dcdfe6' } },
        splitLine: { show: true, lineStyle: { color: '#ebeef5' } }
      }]
      this.chart.setOption({
        legend: { data: series.map(s => s.name), type: 'scroll', top: 0, textStyle: { color: '#909399' } },
        tooltip: { trigger: 'axis' },
        grid: { left: 8, right: 12, bottom: 46, top: 34, containLabel: true },
        xAxis: { type: 'category', data: xData, boundaryGap: false, axisLabel: { color: '#909399', hideOverlap: true }, axisLine: { lineStyle: { color: '#dcdfe6' } } },
        yAxis: finalYAxes,
        dataZoom: [
          { type: 'inside', start: 0, end: 100 },
          { type: 'slider', start: 0, end: 100, height: 16, bottom: 8, borderColor: '#dcdfe6' }
        ],
        series
      }, { replaceMerge: ['yAxis', 'series'] })
    },

    resizeChart() {
      if (!this.chart) return;
      try { this.chart.resize(); } catch (e) { /* 忽略 */ }
    },

    formatDate(date) {
      const pad = (n) => n < 10 ? '0' + n : n;
      return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    },

    // ===== 统计辅助 =====
    sensorAvg(key) {
      // 简化：返回最近缓存数据的平均值（这里用固定值模拟）
      const val = this.sensorData[key]
      if (val === undefined || val === null || val === '') return '--'
      const n = Number(val)
      if (isNaN(n)) return '--'
      return n.toFixed(1)
    },

    formatStat(key, val) {
      if (val === undefined || val === null || val === '--') return '--'
      return val
    },

    sensorColor(key) {
      const map = {
        temp1: '#14b8a6', temp2: '#f59e0b', temp3: '#3b82f6',
        pressure: '#3b82f6', flow: '#ef4444'
      }
      if (map[key]) return map[key]
      let hash = 0
      for (let i = 0; i < key.length; i++) {
        hash = ((hash << 5) - hash) + key.charCodeAt(i)
        hash |= 0
      }
      const palette = ['#14b8a6', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']
      return palette[Math.abs(hash) % palette.length]
    },
    actuatorColor(key) {
      const map = { pump: '#14b8a6', heater: '#f59e0b' }
      if (map[key]) return map[key]
      let hash = 0
      for (let i = 0; i < key.length; i++) {
        hash = ((hash << 5) - hash) + key.charCodeAt(i)
        hash |= 0
      }
      const palette = ['#14b8a6', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']
      return palette[Math.abs(hash) % palette.length]
    }
  }
}
</script>

<style scoped>
.back-btn {
  display: inline-block;
  margin-bottom: 14px;
  color: #14b8a6;
  cursor: pointer;
  font-size: 14px;
}

/* ===== 桌面端实时状态 ===== */
.detail-header {
  display: flex;
  gap: 30px;
  align-items: flex-start;
  padding: 10px;
}

.tank-visual {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.tank-body {
  width: 100px;
  height: 150px;
  border: 3px solid #c0c4cc;
  border-top: none;
  border-radius: 0 0 10px 10px;
  position: relative;
  overflow: hidden;
  background: #f5f7fa;
}

.water {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  background: linear-gradient(to top, rgba(20, 184, 166, 0.85), rgba(20, 184, 166, 0.25));
  transition: height 0.5s ease;
}

.tank-name {
  font-size: 14px;
  color: #606266;
  font-weight: 600;
}

.status-info {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: #f5f7fa;
  padding: 10px 12px;
  border-radius: 10px;
}

.i-label {
  font-size: 12px;
  color: #909399;
}

.i-value {
  font-size: 18px;
  font-weight: bold;
  color: #14b8a6;
}

.i-value .unit {
  font-style: normal;
  font-size: 12px;
  color: #909399;
  font-weight: normal;
}

.i-stat {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  color: #606266;
  margin-top: 2px;
}

.i-stat-tag {
  color: #909399;
  font-size: 10px;
}

.i-stat-val {
  font-weight: 600;
  color: #303133;
}

.i-stat-unit {
  font-size: 10px;
  color: #909399;
}

.text-success { color: #67c23a !important; }
.text-gray { color: #909399 !important; }

/* ===== 移动端卡片 ===== */
.tank-info-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.tank-info-visual {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.tank-body--sm {
  width: 80px;
  height: 120px;
}

.tank-sensor-card {
  background: #f5f7fa;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 14px;
}

.tank-sensor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.tank-sensor-label {
  font-size: 13px;
  color: var(--text-2);
}

.tank-sensor-unit {
  font-size: 12px;
  color: var(--text-3);
}

.tank-sensor-value {
  font-size: 22px;
  font-weight: bold;
  color: var(--primary);
  margin-bottom: 4px;
}

.tank-sensor-stat {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--text-2);
}

.tank-device-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #f5f7fa;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 14px;
  gap: 10px;
}

.tank-device-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-2);
}

.tank-device-status {
  font-size: 15px;
  font-weight: 600;
}

.status-normal { color: #67c23a; }
.status-warn { color: #e6a23c; }

/* ===== 图表筛选 ===== */
.chart-filter {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.chart-filter .label {
  font-size: 12px;
  color: #606266;
}

.chart-filter .roll-time-range-picker {
  flex: 1;
  min-width: 200px;
}

/* ===== 图表空状态 ===== */
.chart-wrap {
  position: relative;
  margin-top: 15px;
}

.chart-empty {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #909399;
  font-size: 13px;
  background: #fafbfc;
  border: 1px dashed #dcdfe6;
  border-radius: 8px;
  z-index: 2;
}

.chart-empty i {
  font-size: 32px;
  color: #c0c4cc;
}

/* ===== 编辑弹窗 ===== */
.edit-dialog .el-dialog__body {
  padding: 20px 24px;
}

.edit-section {
  margin-bottom: 20px;
  padding: 16px;
  background: #fafbfc;
  border-radius: 8px;
  border: 1px solid #ebeef5;
}

.edit-section:last-child {
  margin-bottom: 0;
}

.edit-section-head {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
}

.edit-section-icon {
  font-size: 16px;
  color: #14b8a6;
}

.edit-section-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.edit-section-count {
  font-size: 12px;
  color: #909399;
  background: #f0f2f5;
  padding: 1px 8px;
  border-radius: 10px;
  margin-left: 4px;
}

.edit-current {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding: 8px 10px;
  background: #fff;
  border-radius: 6px;
  border: 1px dashed #dcdfe6;
}

.edit-current-label {
  font-size: 12px;
  color: #909399;
  flex-shrink: 0;
}

.edit-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  background: rgba(20, 184, 166, 0.1);
  color: #14b8a6;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
  transition: background 0.2s;
}

.edit-tag:hover {
  background: rgba(20, 184, 166, 0.18);
}

.edit-tag .el-icon-close {
  cursor: pointer;
  font-size: 11px;
  color: #909399;
  transition: color 0.2s;
}

.edit-tag .el-icon-close:hover {
  color: #f56c6c;
}

.edit-divider {
  height: 1px;
  background: #ebeef5;
  margin: 4px 0 10px;
}

.edit-add-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 8px;
}

.edit-hint {
  font-size: 13px;
  color: #c0c4cc;
  padding: 6px 0 10px;
}

.edit-check-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.edit-check-list .el-checkbox {
  margin-right: 12px;
  margin-bottom: 4px;
  border: none;
}

.edit-check-list .el-checkbox.is-checked {
  background: rgba(20, 184, 166, 0.06);
}

.edit-check-unit {
  font-size: 11px;
  color: #909399;
  margin-left: 2px;
}

/* 移动端适配 */
@media (max-width: 640px) {
  .edit-dialog {
    width: 94% !important;
  }

  .edit-dialog .el-dialog__body {
    padding: 14px;
  }

  .edit-section {
    padding: 12px;
  }

  .edit-current {
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
  }

  .edit-check-list .el-checkbox {
    width: 100%;
    margin-right: 0;
  }
}

/* ===== 响应式 ===== */
@media (max-width: 640px) {
  .desktop-only { display: none !important; }
  .mobile-only { display: block !important; }

  .chart-filter {
    flex-direction: column;
    align-items: stretch;
  }
  .chart-filter .roll-time-range-picker {
    width: 100%;
  }
  .chart-filter .el-select {
    width: 100% !important;
  }
  .chart-filter .el-button {
    width: 100%;
    margin-top: 8px;
  }
}

.desktop-only { display: block; }
.mobile-only { display: none; }

@media (max-width: 640px) {
  .desktop-only { display: none !important; }
  .mobile-only { display: block !important; }
}
</style>
