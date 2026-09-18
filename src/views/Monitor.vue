<template>
  <div class="home-page">

    <!-- 1. 监测单元（水槽）列表 -->
    <div class="card-box">
      <div class="card-title">
        监测单元列表
        <el-button size="mini" type="primary" plain style="margin-left: auto;" @click="openAddTankDialog"><svg-icon name="plus" :size="14"/>添加水槽</el-button>
      </div>
      <div class="tank-list">
        <div
          v-for="tank in tankList"
          :key="tank.id"
          class="tank-card"
          @click="goToDetail(tank.id)"
        >
          <span class="tank-delete" @click.stop="removeTank(tank)">×</span>
          <div class="tank-icon">💧</div>
          <div class="tank-name">{{ tank.name }}</div>
          <div class="tank-running">
            {{ runningCount }} 个执行器运行中
          </div>
          <div class="tank-status" :class="isSystemNormal ? 'status-normal' : 'status-danger'">
            {{ isSystemNormal ? '正常' : '异常' }}
          </div>
        </div>
      </div>
    </div>

    <!-- 添加水槽弹窗（移动端友好的全宽弹窗） -->
    <el-dialog title="添加水槽" :visible.sync="addTankDialogVisible" width="94%" :modal-append-to-body="true">
      <div class="form-item form-item--full">
        <span class="label">水槽名称：</span>
        <el-input v-model="addTankForm.name" size="small" :placeholder="addTankForm.defaultName" style="flex: 1;" maxlength="20"></el-input>
      </div>
      <span slot="footer">
        <el-button size="small" @click="addTankDialogVisible = false">取消</el-button>
        <el-button type="primary" size="small" @click="confirmAddTank">确定</el-button>
      </span>
    </el-dialog>

    <!-- 设备运行状态（运行中 / 关闭） -->
    <div class="card-box">
      <div class="card-title">设备运行状态 <svg-icon name="device-status" :size="16" class="card-title-icon"/></div>
      <div class="device-run-grid">
        <div class="device-run-card device-run-card--on">
          <div class="device-run-num">{{ runningCount }}</div>
          <div class="device-run-label">设备运行中</div>
        </div>
        <div class="device-run-card device-run-card--off">
          <div class="device-run-num">{{ stoppedCount }}</div>
          <div class="device-run-label">设备关闭</div>
        </div>
      </div>
    </div>

    <!-- 数据统计（平均值 / 累计值，字段与类型可增删改） -->
    <div class="card-box">
      <div class="card-title">
        数据统计
        <span class="stat-window">
          <el-radio-group v-model="statWindow" size="mini" @change="fetchStatistics">
            <el-radio-button label="30m">30分钟</el-radio-button>
            <el-radio-button label="1h">1小时</el-radio-button>
            <el-radio-button label="2h">2小时</el-radio-button>
          </el-radio-group>
        </span>
        <el-button size="mini" type="primary" plain style="margin-left: auto;" @click="openStatEdit"><svg-icon name="edit" :size="14"/>编辑</el-button>
      </div>
      <div class="stat-grid">
        <div
          v-for="c in statCards"
          :key="c.id"
          class="stat-card"
          :class="c.type === 'total' ? 'stat-card--total' : ''"
        >
          <div class="stat-card-label">
            <svg-icon :name="sensorIcon(c.field)" :size="15" class="stat-card-icon"/>
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

    <!-- 系统状态（正常 / 异常占比环形图） -->
    <div class="card-box">
      <div class="card-title">系统状态 <svg-icon name="system" :size="16" class="card-title-icon"/></div>
      <div v-if="systemTotal > 0" ref="systemChart" class="system-chart" style="width: 100%; height: 220px;"></div>
      <div v-else style="text-align:center;color:#909399;padding:24px;font-size:12px;">
        暂无阈值数据，无法统计系统状态
      </div>
    </div>

    <!-- 预计时间/温度（目标温度 ↔ 预计时长 双向推算） -->
    <div class="card-box">
      <div class="card-title">
        预计时间 / 温度
        <el-select v-model="predictField" size="mini" style="width: 110px; margin-left: 12px;" @change="onPredictFieldChange">
          <el-option v-for="s in temperatureFields" :key="s.key" :label="s.label" :value="s.key"></el-option>
        </el-select>
      </div>
      <div class="predict-row">
        <span class="predict-label">当前温度</span>
        <span class="predict-current">{{ predictCurrentText }}</span>
        <span class="predict-rate">
          变化速率
          <el-input-number v-model="predictRateInput" size="mini" :step="0.1" :precision="2" :controls="false" placeholder="自动" style="width: 72px;"></el-input-number>
          ℃/分
        </span>
      </div>
      <div class="predict-hint" v-if="!isManualRate">自动速率：{{ predictRateText }}（近 15 分钟加权推算，可手动填写）</div>
      <div class="predict-grid">
        <div class="predict-item">
          <div class="predict-item-label">填目标温度 → 预计时间</div>
          <div class="predict-input-row">
            <el-input-number v-model="predictTarget" size="small" :step="1" :precision="1" :controls="false" placeholder="目标温度" style="flex: 1;"></el-input-number>
            <span class="predict-unit">℃</span>
          </div>
          <div class="predict-result">{{ predictTimeText }}</div>
        </div>
        <div class="predict-item">
          <div class="predict-item-label">填分钟数 → 预计温度</div>
          <div class="predict-input-row">
            <el-input-number v-model="predictMinutes" size="small" :step="1" :precision="0" :controls="false" placeholder="分钟数" style="flex: 1;"></el-input-number>
            <span class="predict-unit">分钟</span>
          </div>
          <div class="predict-result">{{ predictTempText }}</div>
        </div>
      </div>
    </div>

    <!-- 实时传感器数据 -->
    <div class="card-box">
      <div class="card-title">
        实时传感数据
        <span class="time">{{ sensorData.timestamp }}</span>
        <el-button size="mini" type="primary" plain style="margin-left: 10px;" @click="openSensorEdit"><svg-icon name="edit" :size="14"/>编辑</el-button>
      </div>
      <!-- 桌面端：网格 -->
      <div class="desktop-only">
        <div class="data-grid">
          <div class="data-item" v-for="item in sensorItems" :key="item.key">
            <span class="data-label">{{ item.label }}</span>
            <span class="data-value">{{ sensorData[item.key] !== undefined ? sensorData[item.key] : '--' }} <i class="unit">{{ item.unit }}</i></span>
          </div>
        </div>
      </div>
      <!-- 移动端：卡片列表 -->
      <div class="mobile-only">
        <div class="sensor-card" v-for="item in sensorItems" :key="item.key">
          <div class="sensor-card-header">
            <svg-icon :name="sensorIcon(item.key)" :size="18" class="sensor-card-icon"/>
            <span class="sensor-card-label">{{ item.label }}</span>
            <span class="sensor-card-unit">{{ item.unit }}</span>
          </div>
          <div class="sensor-card-value">{{ sensorData[item.key] !== undefined ? sensorData[item.key] : '--' }}</div>
        </div>
      </div>
    </div>

    <!-- 编辑传感数据弹窗 -->
    <el-dialog title="编辑传感数据（名称 / 单位）" :visible.sync="sensorEditVisible" width="94%" :modal-append-to-body="true">
      <div class="sensor-edit-list">
        <div class="sensor-edit-row" v-for="(item, index) in editSensorItems" :key="index">
          <el-input v-model="item.key" size="mini" placeholder="字段(如 temp1)" style="width: 80px;"></el-input>
          <el-input v-model="item.label" size="mini" placeholder="名称" style="flex: 1; min-width: 80px;"></el-input>
          <el-input v-model="item.unit" size="mini" placeholder="单位" style="width: 70px;"></el-input>
          <el-button size="mini" type="danger" plain @click="removeSensorItem(index)"><svg-icon name="delete" :size="14"/></el-button>
        </div>
      </div>
      <div style="margin-top: 10px;">
        <el-button size="mini" type="primary" plain @click="addSensorItem"><svg-icon name="plus" :size="14"/>添加一项</el-button>
      </div>
      <span slot="footer">
        <el-button size="mini" @click="sensorEditVisible = false">取消</el-button>
        <el-button size="mini" type="primary" @click="saveSensorItems">保存</el-button>
      </span>
    </el-dialog>

  </div>
</template>

<script>
import { SENSOR_DEFS, fetchSensorFields, fieldsToSensorItems, reconcileByBackend } from '../utils/sensors'
import { unwrapData } from '../utils/request'
import * as echarts from 'echarts'

export default {
  name: 'MonitorPage',
  data() {
    return {
      // 水槽列表（本地持久化，支持增删）
      tankList: [
        { id: '1', name: '水槽 01', status: '正常' },
        { id: '2', name: '水槽 02', status: '正常' }
      ],
      addTankDialogVisible: false,
      addTankForm: { name: '', defaultName: '水槽 01' },
      // 实时传感数据展示项（本地持久化，支持增删改名称/单位）
      sensorItems: SENSOR_DEFS.map(s => ({ key: s.key, label: s.label, unit: s.unit })),
      sensorEditVisible: false,
      editSensorItems: [],
      // 用户显式删除过的传感字段（黑名单），避免刷新后被后端/数据自动加回
      deletedSensorKeys: [],
      // 实时传感数据
      sensorData: {
        timestamp: '--',
        temp1: 0,
        temp2: 0,
        pressure: 0,
        flow: 0
      },
      // 设备状态（动态：key 为设备字段名，value 0/1）
      deviceStatus: {},
      // 设备控制项（只读，来自本地持久化；编辑在「设备控制」页进行）
      devices: [
        { key: 'pump', label: '水泵' },
        { key: 'heater', label: '加热器' }
      ],
      // 智能判定结果（仅取 status 用于监测单元列表的正常/异常判断）
      judgeResult: {
        time: '--',
        status: 'normal',
        message: '等待数据...',
        action: 'none'
      },
      timer: null,
      polling: false, // 轮询防重入锁：上一次请求未返回时不重复发起
      // 系统状态（正常/异常占比，从统计分析页迁入）
      systemNormal: 0,
      systemAbnormal: 0,
      sysChart: null,
      // 预计时间/温度
      predictField: 'temp1', // 当前推算的温度字段
      predictRateInput: null, // 手动填写的温度变化速率(℃/分)，null 表示用自动推算
      predictRateAuto: null, // 近 15 分钟历史数据加权回归出的速率(℃/分)
      predictTarget: null, // 目标温度输入
      predictMinutes: null, // 分钟数输入
      predictHistoryLoading: false,
      predictTimer: null,
      // ===== 数据统计（平均值 / 累计值，可增删改） =====
      statWindow: '1h',
      statResults: {},
      statCardsConfig: [],
      statNextId: 1,
      statEditVisible: false,
      editStatCards: [],
      statLoading: false,
      statTimer: null
    }
  },
  created() {
    this.loadTankList()
    this.loadSensorItems()
    this.loadDeletedSensorKeys()
    this.loadDevices()
    this.loadStatCards()
    // 确保默认温度字段有效（用户可能已删除 temp1）
    if (!this.temperatureFields.some(s => s.key === this.predictField)) {
      this.predictField = this.temperatureFields.length ? this.temperatureFields[0].key : 'temp1'
    }
  },
  mounted() {
    this.initSensorFields()
    this.pollData()

    this.timer = setInterval(() => this.pollData(), 3000)
    // 预计时间/温度：初始推算一次速率，之后每 60 秒刷新
    this.fetchPredictRate()
    this.predictTimer = setInterval(() => this.fetchPredictRate(), 60000)
    // 数据统计：初始拉取一次，之后每 60 秒刷新
    this.fetchStatistics()
    this.statTimer = setInterval(() => this.fetchStatistics(), 60000)
    window.addEventListener('resize', this.resizeSystemChart)
    // 初始化添加水槽表单默认名
    const nextId = Math.max(0, ...this.tankList.map(t => Number(t.id))) + 1
    this.addTankForm.defaultName = '水槽 ' + String(nextId).padStart(2, '0')
  },
  beforeDestroy() {
    if (this.timer) {
      clearInterval(this.timer)
    }
    if (this.predictTimer) {
      clearInterval(this.predictTimer)
    }
    if (this.statTimer) {
      clearInterval(this.statTimer)
    }
    window.removeEventListener('resize', this.resizeSystemChart)
    if (this.sysChart) {
      this.sysChart.dispose()
      this.sysChart = null
    }
  },
  computed: {
    // 运行中的执行器数量（deviceStatus 值为 1 视为运行中）
    runningCount() {
      return this.devices.filter(d => this.isOn(this.deviceStatus[d.key])).length
    },
    // 关闭的执行器数量
    stoppedCount() {
      return this.devices.length - this.runningCount
    },
    // 系统整体状态是否正常（来自智能判定结果，无数据时默认正常）
    isSystemNormal() {
      const s = this.judgeResult && this.judgeResult.status
      return s === 'normal' || s === undefined || s === null || s === '' || s === '--'
    },
    // 温度字段（单位含 ℃ 或字段名含 temp），无匹配时回退全部传感字段
    temperatureFields() {
      const list = this.sensorItems.filter(s => (s.unit || '').indexOf('℃') >= 0 || /temp/i.test(s.key))
      return list.length ? list : this.sensorItems
    },
    // 传感器卡片图标映射
    sensorIcon() {
      return (key) => {
        if (/temp/i.test(key)) return 'temperature'
        if (/pressure/i.test(key)) return 'pressure'
        if (/flow/i.test(key)) return 'flow'
        if (/level|water|液位|水位/i.test(key)) return 'level-warn'
        return 'droplet'
      }
    },
    // 当前温度数值（解析失败返回 null）
    predictCurrent() {
      const n = Number(this.sensorData[this.predictField])
      return isNaN(n) ? null : n
    },
    predictCurrentText() {
      return this.predictCurrent === null ? '--' : this.predictCurrent + ' ℃'
    },
    // 是否手动填写了速率（否则用自动推算）
    isManualRate() {
      return this.predictRateInput !== null && this.predictRateInput !== undefined && this.predictRateInput !== ''
    },
    // 生效的速率：手动优先，否则自动；无数据返回 null
    predictRate() {
      if (this.isManualRate) {
        const n = Number(this.predictRateInput)
        return isNaN(n) ? null : n
      }
      return this.predictRateAuto
    },
    predictRateText() {
      const r = this.predictRate
      if (r === null || r === undefined) return '暂无'
      const v = parseFloat(r.toFixed(4))
      return (v > 0 ? '+' : '') + v + ' ℃/分'
    },
    // 目标温度 → 预计分钟数
    predictTimeText() {
      if (this.predictCurrent === null) return '等待实时温度数据…'
      const target = Number(this.predictTarget)
      if (this.predictTarget === null || this.predictTarget === undefined || isNaN(target)) return '请输入目标温度'
      const rate = this.predictRate
      if (rate === null || rate === undefined) return '暂无速率数据，无法估算'
      if (Math.abs(rate) < 1e-9) {
        return target === this.predictCurrent ? '当前已达标' : '速率接近 0，无法估算'
      }
      const minutes = (target - this.predictCurrent) / rate
      if (minutes < 0) return '按当前速率无法达到该温度'
      return '预计 ' + this.formatPredictDuration(minutes)
    },
    // 分钟数 → 预计温度
    predictTempText() {
      if (this.predictCurrent === null) return '等待实时温度数据…'
      const minutes = Number(this.predictMinutes)
      if (this.predictMinutes === null || this.predictMinutes === undefined || isNaN(minutes)) return '请输入分钟数'
      const rate = this.predictRate
      if (rate === null || rate === undefined) return '暂无速率数据，无法估算'
      const temp = this.predictCurrent + rate * minutes
      return '预计 ' + temp.toFixed(1) + ' ℃'
    },
    // 系统状态统计总量与正常率
    systemTotal() {
      return this.systemNormal + this.systemAbnormal
    },
    systemNormalPercent() {
      return this.systemTotal ? Math.round(this.systemNormal / this.systemTotal * 100) : 0
    },
    // 数据统计卡片（平均值 / 累计值；累计值 = 平均值 × 窗口分钟数，流量即体积 L）
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
  methods: {
    goToDetail(id) {
      this.$router.push({ name: 'TankDetail', params: { id: id } })
    },
    isOn(v) {
      return v === 1 || v === '1' || v === true || v === 'true'
    },

    // ===== 水槽增删 =====
    loadTankList() {
      try {
        const raw = localStorage.getItem('iot_water_tanks')
        if (raw) {
          const arr = JSON.parse(raw)
          if (Array.isArray(arr) && arr.length) this.tankList = arr
        }
      } catch (e) { /* 本地数据解析失败时使用默认值 */ }
    },
    saveTankList() {
      localStorage.setItem('iot_water_tanks', JSON.stringify(this.tankList))
    },
    openAddTankDialog() {
      this.addTankForm.name = ''
      this.addTankDialogVisible = true
    },
    confirmAddTank() {
      const name = (this.addTankForm.name && this.addTankForm.name.trim()) || this.addTankForm.defaultName
      const nextId = Math.max(0, ...this.tankList.map(t => Number(t.id))) + 1
      this.tankList.push({ id: String(nextId), name, status: '正常' })
      this.saveTankList()
      this.addTankDialogVisible = false
      this.$message.success('已添加 ' + name)
    },
    removeTank(tank) {
      this.$confirm(`确定删除「${tank.name}」吗？`, '提示', { type: 'warning' })
        .then(() => {
          this.tankList = this.tankList.filter(t => t.id !== tank.id)
          this.saveTankList()
          this.$message.success('已删除')
        }).catch(() => {})
    },

    // ===== 传感数据名称/单位增删改 =====
    loadSensorItems() {
      try {
        const raw = localStorage.getItem('iot_water_sensors')
        if (raw) {
          const arr = JSON.parse(raw)
          if (Array.isArray(arr) && arr.length) this.sensorItems = arr
        }
      } catch (e) { /* 本地数据解析失败时使用默认值 */ }
    },
    loadDeletedSensorKeys() {
      try {
        const raw = localStorage.getItem('iot_water_sensor_deleted')
        if (raw) {
          const arr = JSON.parse(raw)
          if (Array.isArray(arr)) this.deletedSensorKeys = arr
        }
      } catch (e) { /* 忽略 */ }
    },
    saveSensorItemsToStorage() {
      localStorage.setItem('iot_water_sensors', JSON.stringify(this.sensorItems))
    },
    openSensorEdit() {
      this.editSensorItems = this.sensorItems.map(s => ({ ...s }))
      this.sensorEditVisible = true
    },
    addSensorItem() {
      this.editSensorItems.push({ key: '', label: '', unit: '' })
    },
    removeSensorItem(index) {
      this.editSensorItems.splice(index, 1)
    },
    saveSensorItems() {
      const newItems = this.editSensorItems
        .filter(s => s.key && s.key.trim() && s.label && s.label.trim())
        .map(s => ({ key: s.key.trim(), label: s.label.trim(), unit: (s.unit || '').trim() }))
      // 同步删除黑名单：被用户删掉的字段记录下来，刷新后不再被后端/数据自动加回
      const oldKeys = new Set(this.sensorItems.map(s => s.key))
      const newKeys = new Set(newItems.map(s => s.key))
      const del = new Set(this.deletedSensorKeys)
      oldKeys.forEach(k => { if (!newKeys.has(k)) del.add(k) })
      newKeys.forEach(k => del.delete(k))
      this.deletedSensorKeys = Array.from(del)
      localStorage.setItem('iot_water_sensor_deleted', JSON.stringify(this.deletedSensorKeys))
      this.sensorItems = newItems
      this.saveSensorItemsToStorage()
      this.sensorEditVisible = false
      this.$message.success('传感数据配置已保存')
      // 同步到后端元数据（新增/更新），后台静默执行，失败不影响本地保存
      this.syncSensorMetaToBackend()
    },

    // ===== 设备列表（只读，编辑在「设备控制」页） =====
    loadDevices() {
      try {
        const raw = localStorage.getItem('iot_water_devices')
        if (raw) {
          const arr = JSON.parse(raw)
          if (Array.isArray(arr) && arr.length) this.devices = arr
        }
      } catch (e) { /* 本地数据解析失败时使用默认值 */ }
    },

    // 同步传感器元数据到后端（新增/更新；删除的字段禁用）
    async syncSensorMetaToBackend() {
      for (const item of this.sensorItems) {
        try {
          await this.$http.post('/sensor/meta', {
            field_name: item.key,
            display_name: item.label,
            unit: item.unit || '',
            data_type: 'number',
            category: 'sensor'
          })
        } catch (e) { /* 后端不可用，忽略 */ }
      }
      for (const key of this.deletedSensorKeys) {
        try {
          await this.$http.delete(`/sensor/meta/${key}`)
        } catch (e) { /* 忽略 */ }
      }
    },

    // 从后端 API 加载传感器元数据，更新 sensorItems
    async initSensorFields() {
      const fields = await fetchSensorFields(this.$http)
      if (!fields) return
      const items = fieldsToSensorItems(fields)
      if (!items || !items.length) return
      // 以后端元数据为权威：后端已删除的字段剔除，新增的补入，用户改过的名称/单位保留
      this.sensorItems = reconcileByBackend(this.sensorItems, items, this.deletedSensorKeys)
      this.saveSensorItemsToStorage()
    },

    // 统一轮询入口：并发请求三组实时数据，带防重入锁，避免弱网下请求叠加导致不稳定
    async pollData() {
      if (this.polling) return
      this.polling = true
      try {
        await Promise.all([
          this.fetchRealTimeData(),
          this.fetchDeviceStatus(),
          this.fetchJudgeResult()
        ])
      } finally {
        this.polling = false
      }
    },

    async fetchRealTimeData() {
      try {
        let res = await this.$http.get('/monitor/sensor/latest')
        res = unwrapData(res)
        if (res) {
          this.sensorData = { ...this.sensorData, ...res }
        }
      } catch (error) {
        console.error('获取传感数据失败', error)
      }
      // 基于最新传感数据计算系统正常/异常占比并渲染环形图
      this.updateSystemStatus()
    },

    async fetchDeviceStatus() {
      try {
        let res = await this.$http.get('/monitor/device/status')
        res = unwrapData(res)
        const status = {}
        this.devices.forEach(d => {
          status[d.key] = res[d.key] ?? res[d.key + '_status'] ?? this.sensorData[d.key] ?? 0
        })
        this.deviceStatus = status
      } catch (error) {
        // device/status 不可用时，回退到 sensor/latest 里的执行器字段
        const status = {}
        this.devices.forEach(d => { status[d.key] = this.sensorData[d.key] ?? 0 })
        this.deviceStatus = status
      }
    },

    async fetchJudgeResult() {
      try {
        let res = await this.$http.get('/monitor/judge/latest')
        res = unwrapData(res)
        if (res) this.applyJudgeResult(res)
      } catch (error) {
        // 后端可能只有 /monitor/judge 而无 /judge/latest，回退再试一次
        try {
          let res = await this.$http.get('/monitor/judge')
          res = unwrapData(res)
          if (res) this.applyJudgeResult(res)
        } catch (e) {
          console.error('获取判定结果失败', e)
        }
      }
    },
    applyJudgeResult(res) {
      this.judgeResult = {
        time: res.time || '--',
        status: res.status || 'normal',
        message: this.judgeStatusText(res.status),
        action: res.action || 'none'
      }
    },

    judgeStatusText(status) {
      const map = {
        normal: '系统正常',
        temp_high: '水温过高',
        temp_low: '水温过低',
        pressure_abnormal: '压力异常',
        flow_abnormal: '流量异常',
        alarm: '存在异常'
      }
      return map[status] || status || '等待数据'
    },

    // ===== 数据统计（平均值 / 累计值，可增删改） =====
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
    // 统计窗口分钟数
    windowMinutes() {
      return { '30m': 30, '1h': 60, '2h': 120 }[this.statWindow] || 60
    },
    windowToRange() {
      const minutes = this.windowMinutes()
      const end = new Date()
      const start = new Date(end.getTime() - minutes * 60 * 1000)
      return [this.formatDate(start), this.formatDate(end)]
    },
    defaultStatCards() {
      const cards = this.sensorItems.map(s => ({ id: this.statNextId++, field: s.key, mode: 'avg' }))
      if (this.sensorItems.some(i => i.key === 'flow')) {
        cards.push({ id: this.statNextId++, field: 'flow', mode: 'total' })
      }
      return cards
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
    // 拉取各字段平均值（累计值 = 平均值 × 窗口分钟数，在 statCards 计算属性里换算）
    async fetchStatistics() {
      if (this.statLoading) return
      this.statLoading = true
      try {
        const [start, end] = this.windowToRange()
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
        this.statResults = newResults
      } catch (e) {
        console.error('获取数据统计失败', e)
      } finally {
        this.statLoading = false
      }
    },

    // ===== 系统状态（正常/异常占比，从统计分析页迁入） =====
    // 字段默认报警上下限（与报警页一致）
    defaultThreshold(field) {
      if (/^temp/.test(field)) return { min: 5, max: 60 }
      if (field === 'pressure') return { min: 20, max: 150 }
      if (field === 'flow') return { min: 0.2, max: 5 }
      return { min: 0, max: 100 }
    },
    // 读取本地阈值（与报警页共享 localStorage）
    loadThresholds() {
      try {
        const raw = localStorage.getItem('iot_water_thresholds')
        if (raw) {
          const obj = JSON.parse(raw)
          if (obj && typeof obj === 'object') return obj
        }
      } catch (e) { /* 解析失败用默认 */ }
      return {}
    },
    // 统计各传感器是否在报警上下限内，渲染正常/异常占比环形图（复用已拉取的实时数据，避免重复请求）
    updateSystemStatus() {
      try {
        const latest = this.sensorData || {}
        const thresholds = this.loadThresholds()
        let normal = 0
        let abnormal = 0
        this.sensorItems.forEach(s => {
          const v = Number(latest[s.key])
          if (isNaN(v)) return
          const min = thresholds[s.key + '_min'] !== undefined ? Number(thresholds[s.key + '_min']) : this.defaultThreshold(s.key).min
          const max = thresholds[s.key + '_max'] !== undefined ? Number(thresholds[s.key + '_max']) : this.defaultThreshold(s.key).max
          if (v >= min && v <= max) { normal++ } else { abnormal++ }
        })
        this.systemNormal = normal
        this.systemAbnormal = abnormal
      } catch (e) {
        this.systemNormal = 0
        this.systemAbnormal = 0
      }
      this.$nextTick(() => this.renderSystemChart())
    },
    renderSystemChart() {
      const el = this.$refs.systemChart
      if (!el) return
      let chart = echarts.getInstanceByDom(el)
      if (!chart) chart = echarts.init(el)
      this.sysChart = chart
      const total = this.systemTotal
      chart.setOption({
        tooltip: {
          trigger: 'item',
          formatter: p => `${p.name}：${p.value} 项（${p.percent}%）`
        },
        legend: {
          bottom: 0,
          icon: 'circle',
          itemWidth: 8,
          itemHeight: 8,
          textStyle: { color: '#606266', fontSize: 12 },
          data: ['正常', '异常']
        },
        title: {
          text: total ? this.systemNormalPercent + '%' : '--',
          subtext: '正常率',
          left: 'center',
          top: '32%',
          textStyle: { fontSize: 24, fontWeight: 'bold', color: '#14b8a6' },
          subtextStyle: { fontSize: 12, color: '#909399' }
        },
        series: [{
          type: 'pie',
          radius: ['55%', '72%'],
          center: ['50%', '42%'],
          avoidLabelOverlap: true,
          label: { show: false },
          labelLine: { show: false },
          emphasis: { scaleSize: 4 },
          itemStyle: { borderColor: '#ffffff', borderWidth: 2 },
          data: [
            { name: '正常', value: this.systemNormal, itemStyle: { color: '#67c23a' } },
            { name: '异常', value: this.systemAbnormal, itemStyle: { color: '#f56c6c' } }
          ]
        }]
      }, true)
    },
    resizeSystemChart() {
      if (this.sysChart) this.sysChart.resize()
    },

    // ===== 预计时间/温度 =====
    onPredictFieldChange() {
      this.fetchPredictRate()
    },
    // 时间戳 → 毫秒（解析失败返回 NaN）
    parseTime(ts) {
      if (!ts) return NaN
      const t = new Date(String(ts).replace(/-/g, '/')).getTime()
      return isNaN(t) ? NaN : t
    },
    // 图表接口返回归一化为点数组 [{timestamp, value}]
    normalizePoints(res) {
      let arr = unwrapData(res)
      if (!Array.isArray(arr) && arr && Array.isArray(arr.data)) arr = arr.data
      return Array.isArray(arr) ? arr : []
    },
    // 时间 → 'YYYY-MM-DD HH:MM:SS'
    formatDate(date) {
      const pad = (n) => n < 10 ? '0' + n : n
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
    },
    // 时间加权线性回归斜率（℃/分）：x 为相对首点的分钟数，近期点权重更高（时间衰减 τ=5 分钟），
    // 使速率更贴近当前变化趋势，而非整段历史平均
    linearSlope(points) {
      if (!points || points.length < 2) return null
      const t0 = points[0].t
      const tau = 5 * 60 * 1000 // 时间衰减常数 5 分钟
      let sw = 0, swx = 0, swy = 0, swxy = 0, swx2 = 0
      points.forEach(p => {
        const dt = p.t - t0
        const x = dt / 60000 // 分钟（浮点，保留秒级精度）
        const y = p.v
        const w = Math.exp(-dt / tau)
        sw += w; swx += w * x; swy += w * y; swxy += w * x * y; swx2 += w * x * x
      })
      const denom = sw * swx2 - swx * swx
      if (Math.abs(denom) < 1e-9) return null
      return (sw * swxy - swx * swy) / denom
    },
    // 拉取近 15 分钟温度历史，加权线性回归推算变化速率(℃/分)
    async fetchPredictRate() {
      if (this.predictHistoryLoading) return
      this.predictHistoryLoading = true
      try {
        const field = this.predictField
        const end = new Date()
        const start = new Date(end.getTime() - 15 * 60 * 1000)
        const res = await this.$http.get('/records/sensor/chart', {
          params: { sensor_type: field, start_time: this.formatDate(start), end_time: this.formatDate(end) }
        })
        const points = this.normalizePoints(res)
          .map(p => ({ t: this.parseTime(p.timestamp), v: Number(p.value) }))
          .filter(p => !isNaN(p.t) && !isNaN(p.v))
          .sort((a, b) => a.t - b.t)
        this.predictRateAuto = this.linearSlope(points)
      } catch (e) {
        this.predictRateAuto = null
      } finally {
        this.predictHistoryLoading = false
      }
    },
    // 分钟数 → 可读时长文案（精确到秒）
    formatPredictDuration(mins) {
      if (!isFinite(mins)) return '--'
      const totalSeconds = Math.round(mins * 60)
      if (totalSeconds < 60) return totalSeconds + ' 秒'
      const h = Math.floor(totalSeconds / 3600)
      const m = Math.floor((totalSeconds % 3600) / 60)
      const s = totalSeconds % 60
      if (h > 0) return h + ' 小时 ' + m + ' 分 ' + s + ' 秒'
      return m + ' 分 ' + s + ' 秒'
    }
  }
}
</script>


<style scoped>
/* 水槽列表样式 */
.tank-list {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.tank-card {
  position: relative;
  flex: 1;
  min-width: 120px;
  background: #ffffff;
  border: 1px solid #ebeef5;
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
}

.tank-card:hover {
  border-color: #14b8a6;
  background: #f0fdfa;
}

.tank-delete {
  position: absolute;
  top: 6px;
  right: 10px;
  color: #c0c4cc;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}

.tank-delete:hover {
  color: #f56c6c;
}

.tank-icon {
  font-size: 26px;
  margin-bottom: 8px;
}

.tank-name {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 6px;
}

.tank-running {
  font-size: 12px;
  color: #606266;
  margin-bottom: 6px;
}

.tank-status {
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 10px;
  display: inline-block;
  background: rgba(103, 194, 58, 0.1);
}

.tank-status.status-danger {
  background: rgba(245, 108, 108, 0.1);
}

/* 实时数据网格布局 */
.data-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.data-item {
  background: #f5f7fa;
  padding: 14px 12px;
  border-radius: 12px;
  text-align: center;
  border: 1px solid #f0f2f5;
}

.data-label {
  color: #909399;
  font-size: 12px;
  display: block;
  margin-bottom: 6px;
}

.data-value {
  color: #14b8a6;
  font-size: 22px;
  font-weight: bold;
}

.data-value .unit {
  font-style: normal;
  font-size: 12px;
  color: #909399;
  font-weight: normal;
}

/* 卡片标题右侧时间样式 */
.time {
  margin-left: auto;
  font-size: 12px;
  color: #909399;
  font-weight: normal;
}

/* 编辑传感数据弹窗 */
.sensor-edit-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 360px;
  overflow-y: auto;
}

.sensor-edit-row {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

/* 预计时间/温度 */
.predict-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.predict-label {
  font-size: 12px;
  color: #909399;
}

.predict-current {
  font-size: 20px;
  font-weight: bold;
  color: #14b8a6;
}

.predict-rate {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #909399;
  margin-left: auto;
}

.predict-hint {
  font-size: 12px;
  color: #909399;
  margin: 6px 0 12px;
}

.predict-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.predict-item {
  background: #f5f7fa;
  border: 1px solid #f0f2f5;
  border-radius: 12px;
  padding: 14px 12px;
}

.predict-item-label {
  font-size: 12px;
  color: #606266;
  margin-bottom: 8px;
}

.predict-input-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.predict-unit {
  font-size: 12px;
  color: #909399;
  flex-shrink: 0;
}

.predict-result {
  margin-top: 8px;
  font-size: 15px;
  font-weight: 600;
  color: #14b8a6;
}

/* 设备运行状态卡片 */
.device-run-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.device-run-card {
  border-radius: 12px;
  padding: 24px 12px;
  text-align: center;
}

.device-run-num {
  font-size: 34px;
  font-weight: bold;
  line-height: 1.2;
}

.device-run-label {
  font-size: 13px;
  margin-top: 8px;
}

.device-run-card--on {
  background: rgba(103, 194, 58, 0.1);
  border: 1px solid rgba(103, 194, 58, 0.35);
}
.device-run-card--on .device-run-num { color: #67c23a; }
.device-run-card--on .device-run-label { color: #67c23a; }

.device-run-card--off {
  background: rgba(144, 147, 153, 0.1);
  border: 1px solid rgba(144, 147, 153, 0.3);
}
.device-run-card--off .device-run-num { color: #909399; }
.device-run-card--off .device-run-label { color: #909399; }

/* 系统状态环形图 */
.system-chart {
  width: 100%;
  min-height: 220px;
}

/* 数据统计卡片 */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
}

.stat-window {
  margin-left: 12px;
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

/* 编辑数据统计卡片弹窗 */
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

.card-title-icon {
  color: var(--primary);
  margin-right: 4px;
}

/* ===== 响应式：手机端显示卡片，隐藏网格 ===== */
.mobile-only { display: none; }
.desktop-only { display: block; }

@media (max-width: 640px) {
  .desktop-only { display: none !important; }
  .mobile-only { display: block !important; }

  /* 监测单元列表：手机端一行一个水槽卡片 */
  .tank-card {
    flex-basis: 100%;
    min-width: 100%;
  }

  .card-title {
    flex-wrap: wrap;
    gap: 8px;
  }

  /* 弹窗全宽 */
  .el-dialog {
    width: 94% !important;
  }

  /* 表单行竖排 */
  .form-item--full {
    flex-direction: column;
    align-items: stretch;
  }
  .form-item--full .label {
    margin-bottom: 4px;
  }

  .card-title .time {
    width: 100%;
    margin-left: 0;
    margin-top: 4px;
  }

  /* 传感器卡片 */
  .sensor-card {
    background: #f5f7fa;
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 14px;
    margin-bottom: 10px;
  }
  .sensor-card-header {
    display: flex;
    justify-content: flex-start;
    align-items: center;
    gap: 6px;
    margin-bottom: 8px;
  }
  .sensor-card-icon {
    color: var(--primary);
  }
  .sensor-card-label {
    font-size: 13px;
    color: var(--text-2);
  }
  .sensor-card-unit {
    font-size: 12px;
    color: var(--text-3);
  }
  .sensor-card-value {
    font-size: 22px;
    font-weight: bold;
    color: var(--primary);
    margin-bottom: 6px;
  }

  /* 预计时间/温度：手机端两列改单列 */
  .predict-grid {
    grid-template-columns: 1fr;
  }
  .predict-rate {
    margin-left: 0;
    width: 100%;
  }
}
</style>
