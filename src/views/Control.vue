<template>
  <div class="home-page">

    <!-- 设备控制（含自动/手动模式切换 + 设备在线状态） -->
    <div class="card-box">
      <div class="card-title">
        设备控制
        <span class="mode-group">
          <span class="mode-tip">模式</span>
          <el-radio-group v-model="controlMode" size="mini" @change="onModeChange">
            <el-radio-button label="auto">自动</el-radio-button>
            <el-radio-button label="manual">手动</el-radio-button>
          </el-radio-group>
        </span>
        <el-button size="mini" type="primary" plain style="margin-left: auto;" @click="openDeviceEdit"><svg-icon name="edit" :size="14"/>编辑</el-button>
      </div>
      <div class="mode-hint" :class="!online ? 'mode-hint-offline' : ''">
        <span class="hint-dot" :class="online ? 'dot-online' : 'dot-offline'"></span>
        <span v-if="!online">设备离线，无法下发控制指令</span>
        <span v-else-if="controlMode === 'auto'">自动模式：设备由系统自动控制，切换「手动」后可手动操作</span>
        <span v-else>手动模式：可手动控制设备</span>
      </div>
      <!-- 桌面端：网格 -->
      <div class="desktop-only">
        <div class="control-grid">
          <div class="control-item" v-for="d in devices" :key="d.key">
            <svg-icon :name="deviceIcon(d.key)" :size="22" class="control-item-icon"/>
            <span class="conn-tag" :class="online ? 'conn-online' : 'conn-offline'">
              <i class="conn-dot"></i>{{ online ? '在线' : '离线' }}
            </span>
            <div class="control-label">{{ d.label }}</div>
            <div class="control-status" :class="deviceStatus[d.key] ? 'status-normal' : 'status-warn'">
              {{ deviceStatus[d.key] ? '运行中' : '已停止' }}
            </div>
            <el-button
              :type="deviceStatus[d.key] ? 'danger' : 'success'"
              size="mini"
              :disabled="!online || controlMode === 'auto'"
              @click="toggleDevice(d.key, !deviceStatus[d.key])"
            >
              {{ deviceStatus[d.key] ? '关闭' : '开启' }}{{ d.label }}
            </el-button>
          </div>
        </div>
      </div>
      <!-- 移动端：卡片列表 -->
      <div class="mobile-only">
        <div class="control-card" v-for="d in devices" :key="d.key">
          <div class="control-card-header">
            <svg-icon :name="deviceIcon(d.key)" :size="18" class="control-card-icon"/>
            <span class="control-card-name">{{ d.label }}</span>
            <span class="conn-tag" :class="online ? 'conn-online' : 'conn-offline'">
              <i class="conn-dot"></i>{{ online ? '在线' : '离线' }}
            </span>
          </div>
          <div class="control-card-status" :class="deviceStatus[d.key] ? 'status-normal' : 'status-warn'">
            {{ deviceStatus[d.key] ? '运行中' : '已停止' }}
          </div>
          <el-button
            :type="deviceStatus[d.key] ? 'danger' : 'success'"
            size="small"
            :disabled="!online || controlMode === 'auto'"
            @click="toggleDevice(d.key, !deviceStatus[d.key])"
            round
          >
            {{ deviceStatus[d.key] ? '关闭' : '开启' }}
          </el-button>
        </div>
      </div>
      <div class="undo-row">
        <el-button size="mini" plain type="warning" @click="undoLastControl"><svg-icon name="undo" :size="14"/>撤销上次手动控制</el-button>
      </div>
    </div>

    <!-- 编辑设备弹窗 -->
    <el-dialog title="编辑设备（名称 / 控制字段）" :visible.sync="deviceEditVisible" width="94%" :modal-append-to-body="true">
      <div class="sensor-edit-list">
        <div class="sensor-edit-row" v-for="(d, index) in editDevices" :key="index">
          <el-input v-model="d.key" size="mini" placeholder="字段(如 pump)" style="width: 90px;"></el-input>
          <el-input v-model="d.label" size="mini" placeholder="名称" style="flex: 1; min-width: 80px;"></el-input>
          <el-button size="mini" type="danger" plain @click="removeDevice(index)"><svg-icon name="delete" :size="14"/></el-button>
        </div>
      </div>
      <div style="margin-top: 10px;">
        <el-button size="mini" type="primary" plain @click="addDevice"><svg-icon name="plus" :size="14"/>添加设备</el-button>
      </div>
      <span slot="footer">
        <el-button size="mini" @click="deviceEditVisible = false">取消</el-button>
        <el-button size="mini" type="primary" @click="saveDevices">保存</el-button>
      </span>
    </el-dialog>

    <!-- 定时任务管理（仅前端本地，切换手动模式后生效） -->
    <div class="card-box">
      <div class="card-title">
        定时任务
        <el-button size="mini" type="primary" plain style="margin-left: auto;" @click="openScheduleAdd"><svg-icon name="plus" :size="14"/>添加任务</el-button>
      </div>
      <!-- 桌面端：表格 -->
      <div class="desktop-only" v-if="schedules.length">
        <div class="table-scroll">
          <table class="custom-table">
            <thead>
              <tr>
                <th>设备</th>
                <th>动作</th>
                <th>时间</th>
                <th>重复</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(s, index) in schedules" :key="s.id">
                <td>{{ deviceLabel(s.deviceId) }}</td>
                <td>
                  <span v-for="(act, i) in (s.actions || [])" :key="i" class="status-tag" :class="act.action === 1 ? 'status-normal' : 'status-warn'" style="margin-right: 4px;">
                    {{ act.action === 1 ? '开' : '关' }}{{ act.time }}
                  </span>
                  <span v-if="!s.actions || !s.actions.length" class="status-tag status-warn">未设置</span>
                </td>
                <td>{{ repeatText(s.repeat) }}</td>
                <td>
                  <el-button size="mini" type="text" @click="openScheduleEdit(index)">编辑</el-button>
                  <el-button size="mini" type="text" style="color: #f56c6c;" @click="removeSchedule(index)">删除</el-button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <!-- 移动端：卡片 -->
      <div class="mobile-only" v-if="schedules.length">
        <div class="schedule-card" v-for="(s, index) in schedules" :key="s.id">
          <div class="schedule-card-row">
            <span class="schedule-card-label">设备</span>
            <span class="schedule-card-value">{{ deviceLabel(s.deviceId) }}</span>
          </div>
          <div class="schedule-card-row">
            <span class="schedule-card-label">动作</span>
            <span>
              <span v-for="(act, i) in (s.actions || [])" :key="i" class="status-tag" :class="act.action === 1 ? 'status-normal' : 'status-warn'" style="margin-right: 4px;">
                {{ act.action === 1 ? '开' : '关' }}{{ act.time }}
              </span>
              <span v-if="!s.actions || !s.actions.length" class="status-tag status-warn">未设置</span>
            </span>
          </div>
          <div class="schedule-card-row">
            <span class="schedule-card-label">重复</span>
            <span class="schedule-card-value">{{ repeatText(s.repeat) }}</span>
          </div>
          <div class="schedule-card-actions">
            <el-button size="mini" type="text" @click="openScheduleEdit(index)">编辑</el-button>
            <el-button size="mini" type="text" style="color: #f56c6c;" @click="removeSchedule(index)">删除</el-button>
          </div>
        </div>
      </div>
      <div v-if="!schedules.length" style="text-align: center; color: #909399; padding: 20px; font-size: 12px;">
        暂无定时任务
      </div>
    </div>

    <!-- 定流量输送（按目标累计升数自动开关水泵，达到目标后自动关泵） -->
    <div class="card-box">
      <div class="card-title">
        定流量输送
        <el-button size="mini" type="primary" plain style="margin-left: auto;" @click="openTransferAdd"><svg-icon name="plus" :size="14"/>添加路径</el-button>
      </div>

      <!-- 进行中任务进度（优先展示） -->
      <div v-if="activeTransfer" class="transfer-progress">
        <div class="transfer-progress-head">
          <span class="transfer-progress-title">{{ tankName(activeTransfer.source) }} → {{ tankName(activeTransfer.target) }}</span>
          <span class="status-tag status-normal">输送中</span>
        </div>
        <div class="transfer-progress-meta">水泵：{{ deviceLabel(activeTransfer.device) }} · 目标 {{ formatLiters(activeTransfer.target_liters) }} L</div>
        <el-progress :percentage="transferPercent" :show-text="false"></el-progress>
        <div class="transfer-progress-meta">已输送 {{ formatLiters(activeTransfer.accumulated_liters) }} / {{ formatLiters(activeTransfer.target_liters) }} L</div>
        <div class="transfer-progress-meta">累计流量：{{ formatLiters(sensorData.flow_total) }} L</div>
        <el-button size="mini" type="danger" plain @click="stopActiveTransfer">停止输送</el-button>
      </div>

      <!-- 桌面端：路径表格 -->
      <div class="desktop-only" v-if="transferPaths.length">
        <div class="table-scroll">
          <table class="custom-table">
            <thead>
              <tr>
                <th>进水端</th>
                <th>出水端</th>
                <th>水泵编号</th>
                <th>目标升数(L)</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(p, index) in transferPaths" :key="p.id">
                <td>{{ tankName(p.source) }}</td>
                <td>{{ tankName(p.target) }}</td>
                <td>{{ deviceLabel(p.device) }}</td>
                <td>{{ formatLiters(p.target_liters) }}</td>
                <td>
                  <el-button size="mini" type="primary" plain :disabled="!!activeTransfer || !online" @click="startTransfer(p)">开始输送</el-button>
                  <el-button size="mini" type="text" @click="openTransferEdit(index)">编辑</el-button>
                  <el-button size="mini" type="text" style="color: #f56c6c;" @click="removeTransferPath(index)">删除</el-button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 移动端：路径卡片 -->
      <div class="mobile-only" v-if="transferPaths.length">
        <div class="schedule-card" v-for="(p, index) in transferPaths" :key="p.id">
          <div class="schedule-card-row">
            <span class="schedule-card-label">路径</span>
            <span class="schedule-card-value">{{ tankName(p.source) }} → {{ tankName(p.target) }}</span>
          </div>
          <div class="schedule-card-row">
            <span class="schedule-card-label">水泵</span>
            <span class="schedule-card-value">{{ deviceLabel(p.device) }}</span>
          </div>
          <div class="schedule-card-row">
            <span class="schedule-card-label">目标</span>
            <span class="schedule-card-value">{{ formatLiters(p.target_liters) }} L</span>
          </div>
          <div class="schedule-card-actions">
            <el-button size="mini" type="primary" plain :disabled="!!activeTransfer || !online" @click="startTransfer(p)">开始输送</el-button>
            <el-button size="mini" type="text" @click="openTransferEdit(index)">编辑</el-button>
            <el-button size="mini" type="text" style="color: #f56c6c;" @click="removeTransferPath(index)">删除</el-button>
          </div>
        </div>
      </div>

      <div v-if="!transferPaths.length" style="text-align: center; color: #909399; padding: 20px; font-size: 12px;">
        暂无输送路径，点击右上角「添加路径」创建
      </div>
    </div>

    <!-- 输送任务记录（后端 /auto-transfer 列表） -->
    <div class="card-box">
      <div class="card-title">
        输送任务记录
        <el-button size="mini" type="primary" plain style="margin-left: auto;" @click="fetchTransferHistory"><svg-icon name="refresh" :size="14"/>刷新</el-button>
      </div>
      <div v-if="transferHistory.length" class="table-scroll">
        <table class="custom-table">
          <thead>
            <tr>
              <th>开始时间</th>
              <th>路径</th>
              <th>水泵</th>
              <th>目标(L)</th>
              <th>已输送(L)</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in transferHistory" :key="t.id">
              <td>{{ t.started_at || '-' }}</td>
              <td>{{ tankName(t.source) }} → {{ tankName(t.target) }}</td>
              <td>{{ deviceLabel(t.device) }}</td>
              <td>{{ formatLiters(t.target_liters) }}</td>
              <td>{{ formatLiters(t.accumulated_liters) }}</td>
              <td>
                <span class="status-tag" :class="transferStatusClass(t.status)">{{ transferStatusText(t.status) }}</span>
                <span v-if="t.status === 'failed' && t.fail_reason" class="fail-reason">{{ failReasonText(t.fail_reason) }}</span>
              </td>
              <td>
                <el-button size="mini" type="text" style="color: #f56c6c;" :disabled="t.status === 'running'" @click="removeTransferTask(t)">删除</el-button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else style="text-align: center; color: #909399; padding: 20px; font-size: 12px;">
        暂无输送任务记录
      </div>
    </div>

    <!-- 定流量输送路径编辑弹窗 -->
    <el-dialog title="输送路径" :visible.sync="transferEditVisible" width="94%" :modal-append-to-body="true">
      <div class="transfer-form">
        <div class="transfer-row">
          <div class="transfer-field">
            <span class="transfer-label">进水端</span>
            <el-select v-model="editTransferPath.source" size="mini" placeholder="进水水槽">
              <el-option v-for="t in tankList" :key="t.id" :label="t.name" :value="t.id"></el-option>
            </el-select>
          </div>
          <div class="transfer-arrow">→</div>
          <div class="transfer-field">
            <span class="transfer-label">出水端</span>
            <el-select v-model="editTransferPath.target" size="mini" placeholder="出水水槽">
              <el-option v-for="t in tankList" :key="t.id" :label="t.name" :value="t.id"></el-option>
            </el-select>
          </div>
        </div>
        <div class="transfer-row" style="margin-top: 12px;">
          <div class="transfer-field">
            <span class="transfer-label">水泵编号</span>
            <el-select v-model="editTransferPath.device" size="mini" filterable placeholder="选择水泵">
              <el-option v-for="d in pumpDevices" :key="d.key" :label="d.label" :value="d.key"></el-option>
            </el-select>
          </div>
          <div class="transfer-field">
            <span class="transfer-label">目标升数(L)</span>
            <el-input-number v-model="editTransferPath.target_liters" size="mini" :min="0.1" :step="0.5" :precision="1" :controls="false"></el-input-number>
          </div>
        </div>
      </div>
      <span slot="footer">
        <el-button size="mini" @click="transferEditVisible = false">取消</el-button>
        <el-button size="mini" type="primary" @click="saveTransferPath">确定</el-button>
      </span>
    </el-dialog>

    <!-- 定时任务编辑弹窗 -->
    <el-dialog title="定时任务" :visible.sync="scheduleEditVisible" width="94%" :modal-append-to-body="true">
      <div class="form-item form-item--full">
        <span class="label">设备:</span>
        <el-select v-model="editSchedule.deviceId" size="mini" filterable placeholder="选择设备" style="flex: 1;">
          <el-option v-for="d in devices" :key="d.key" :label="d.label" :value="d.key"></el-option>
        </el-select>
      </div>
      <div class="form-item form-item--full" style="margin-top: 10px;">
        <span class="label">重复:</span>
        <el-select v-model="editSchedule.repeat" size="mini" style="width: 140px;">
          <el-option label="每天" value="daily"></el-option>
          <el-option label="工作日" value="weekdays"></el-option>
          <el-option label="周末" value="weekend"></el-option>
          <el-option label="仅一次" value="once"></el-option>
        </el-select>
      </div>
      <div class="rule-section-title" style="margin-top: 12px;">开关时间列表</div>
      <div v-for="(act, idx) in editSchedule.actions" :key="idx" class="schedule-action-row">
        <el-time-picker v-model="act.time" size="mini" format="HH:mm:ss" value-format="HH:mm:ss" placeholder="时间" style="flex: 1; min-width: 120px;"></el-time-picker>
        <el-radio-group v-model="act.action" size="mini">
          <el-radio-button :label="1">开启</el-radio-button>
          <el-radio-button :label="0">关闭</el-radio-button>
        </el-radio-group>
        <el-button size="mini" type="danger" plain @click="editSchedule.actions.splice(idx, 1)"><svg-icon name="delete" :size="14"/></el-button>
      </div>
      <el-button size="mini" type="primary" plain @click="editSchedule.actions.push({ time: '', action: 1 })"><svg-icon name="plus" :size="14"/>添加时间点</el-button>
      <span slot="footer">
        <el-button size="mini" @click="scheduleEditVisible = false">取消</el-button>
        <el-button size="mini" type="primary" @click="saveSchedule">确定</el-button>
      </span>
    </el-dialog>

  </div>
</template>

<script>
import { fetchSensorFields, fieldsToDeviceItems, reconcileByBackend } from '../utils/sensors'
import { unwrapData } from '../utils/request'

export default {
  name: 'ControlPage',
  data() {
    return {
      // 设备状态（动态：key 为设备字段名，value 0/1）
      deviceStatus: {},
      // 设备控制项（本地持久化，支持增删改；key 对应后端执行器字段）
      devices: [
        { key: 'pump', label: '水泵' },
        { key: 'heater', label: '加热器' }
      ],
      deviceEditVisible: false,
      editDevices: [],
      deletedDeviceKeys: [],
      // 实时传感数据（仅用于 device/status 不可用时的执行器字段兜底）
      sensorData: {},
      timer: null,
      polling: false, // 轮询防重入锁：上一次请求未返回时不重复发起
      // 自动/手动控制模式：auto=系统自动控制设备；manual=用户手动控制
      controlMode: 'auto',
      // 设备在线状态（基于最近数据时间戳与心跳超时阈值判断）
      online: true,
      heartbeatTimeout: 30, // 心跳超时阈值（秒），后端默认 30

      // ===== 定时任务 =====
      schedules: [], // 本地持久化的定时任务列表
      scheduleEditVisible: false,
      editSchedule: { deviceId: 'pump', actions: [{ time: '08:00:00', action: 1 }], repeat: 'daily' },
      scheduleNextId: 1, // 用于生成唯一ID

      // ===== 定流量输送 =====
      transferPaths: [], // 输送路径列表（本地持久化，支持增删改）
      transferEditVisible: false,
      editTransferPath: { id: null, source: '', target: '', device: 'pump', target_liters: 5.0 },
      transferNextId: 1,
      activeTransfer: null, // 进行中的定流量输送任务（后端 /auto-transfer 返回）
      transferTimer: null,
      transferHistory: [], // 定流量输送任务记录（后端 /auto-transfer 列表）

      // 水槽列表（只读副本，用于定流量输送的水槽名称展示，增删在「实时监测」页）
      tankList: [
        { id: '1', name: '水槽 01', status: '正常' },
        { id: '2', name: '水槽 02', status: '正常' }
      ]
    }
  },
  created() {
    this.loadTankList()
    this.loadDevices()
    this.loadDeletedDeviceKeys()
    this.loadControlMode()
    this.loadSchedules()
    this.loadTransferPaths()
  },
  mounted() {
    this.initDevices()
    this.fetchSystemConfig()
    this.pollData()

    this.timer = setInterval(() => this.pollData(), 3000)
    // 每秒检查一次定时任务（时间已精确到秒）
    this.scheduleTimer = setInterval(() => this.checkSchedules(), 1000)
    // 定流量输送：每 2 秒轮询一次运行中任务的进度
    this.transferTimer = setInterval(() => this.pollActiveTransfer(), 2000)
    // 加载定流量输送任务记录，并恢复页面刷新前遗留的「运行中」任务进度
    this.fetchTransferHistory()
  },
  beforeDestroy() {
    if (this.timer) {
      clearInterval(this.timer)
    }
    if (this.scheduleTimer) {
      clearInterval(this.scheduleTimer)
    }
    if (this.transferTimer) {
      clearInterval(this.transferTimer)
    }
  },
  computed: {
    // 执行器/设备图标映射
    deviceIcon() {
      return (key) => {
        if (/pump/i.test(key)) return 'pump'
        if (/heat/i.test(key)) return 'heater'
        return 'setup'
      }
    },
    // 定流量输送可选的水泵（仅泵类执行器，避免把加热器等混入）
    pumpDevices() {
      const pumps = this.devices.filter(d => /pump/i.test(d.key))
      return pumps.length ? pumps : this.devices
    },
    // 进行中输送任务的进度百分比（0~100）
    transferPercent() {
      if (!this.activeTransfer) return 0
      const target = Number(this.activeTransfer.target_liters)
      const acc = Number(this.activeTransfer.accumulated_liters)
      if (!target) return 0
      return Math.min(100, Math.round(acc / target * 100))
    }
  },
  methods: {
    // ===== 设备控制（动态）增删改 =====
    loadDevices() {
      try {
        const raw = localStorage.getItem('iot_water_devices')
        if (raw) {
          const arr = JSON.parse(raw)
          if (Array.isArray(arr) && arr.length) this.devices = arr
        }
      } catch (e) { /* 本地数据解析失败时使用默认值 */ }
    },
    loadDeletedDeviceKeys() {
      try {
        const raw = localStorage.getItem('iot_water_device_deleted')
        if (raw) {
          const arr = JSON.parse(raw)
          if (Array.isArray(arr)) this.deletedDeviceKeys = arr
        }
      } catch (e) { /* 忽略 */ }
    },
    saveDevicesToStorage() {
      localStorage.setItem('iot_water_devices', JSON.stringify(this.devices))
    },
    // ===== 自动/手动控制模式 =====
    loadControlMode() {
      try {
        const m = localStorage.getItem('iot_water_control_mode')
        if (m === 'manual' || m === 'auto') this.controlMode = m
      } catch (e) { /* 忽略 */ }
    },
    onModeChange(mode) {
      localStorage.setItem('iot_water_control_mode', mode)
      // 同步到后端配置，后端据此决定是否自动控制；失败不影响本地状态
      this.$http.post('/config/save', { control_mode: mode }).catch(() => {})
      this.$message.success(mode === 'auto' ? '已切换为自动模式' : '已切换为手动模式')
      // 切回自动模式时，重新拉取设备状态，让自动控制立即生效
      if (mode === 'auto') {
        this.fetchDeviceStatus()
      }
    },
    // 读取系统配置：控制模式、心跳超时阈值
    async fetchSystemConfig() {
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
        const mode = map.control_mode
        if (mode === 'manual' || mode === 'auto') this.controlMode = mode
        const hb = map.heartbeat_timeout
        if (hb !== undefined && hb !== null) {
          const v = parseFloat(hb)
          if (!isNaN(v) && v > 0) this.heartbeatTimeout = v
        }
      } catch (e) { /* 后端未返回配置时使用默认值 */ }
    },
    // 根据最近数据时间戳判断设备是否在线（超过心跳超时阈值判为离线）
    updateOnline(timestamp) {
      if (!timestamp) { this.online = false; return }
      const t = new Date(String(timestamp).replace(/-/g, '/')).getTime()
      if (isNaN(t)) { this.online = true; return } // 时间解析失败时默认在线，避免误判
      this.online = (Date.now() - t) / 1000 <= this.heartbeatTimeout
    },
    // 从后端执行器元数据初始化设备列表（首次直接用后端定义，后续保留用户编辑）
    async initDevices() {
      const fields = await fetchSensorFields(this.$http)
      if (!fields) return
      const apiItems = fieldsToDeviceItems(fields) || []
      if (!apiItems.length) return
      // 以后端元数据为唯一权威来源：仅保留后端当前登记为 actuator 的字段，
      // 自动补入后端新增的执行器（如 pump2），剔除后端已移除的本地遗留字段，避免下发控制 400。
      this.devices = reconcileByBackend(this.devices, apiItems, this.deletedDeviceKeys)
      this.saveDevicesToStorage()
    },
    openDeviceEdit() {
      this.editDevices = this.devices.map(d => ({ ...d }))
      this.deviceEditVisible = true
    },
    addDevice() {
      this.editDevices.push({ key: '', label: '' })
    },
    removeDevice(index) {
      this.editDevices.splice(index, 1)
    },
    saveDevices() {
      const newDevices = this.editDevices
        .filter(d => d.key && d.key.trim() && d.label && d.label.trim())
        .map(d => ({ key: d.key.trim(), label: d.label.trim() }))
      // 同步删除黑名单
      const oldKeys = new Set(this.devices.map(d => d.key))
      const newKeys = new Set(newDevices.map(d => d.key))
      const del = new Set(this.deletedDeviceKeys)
      oldKeys.forEach(k => { if (!newKeys.has(k)) del.add(k) })
      newKeys.forEach(k => del.delete(k))
      this.deletedDeviceKeys = Array.from(del)
      localStorage.setItem('iot_water_device_deleted', JSON.stringify(this.deletedDeviceKeys))
      this.devices = newDevices
      this.saveDevicesToStorage()
      this.deviceEditVisible = false
      this.$message.success('设备配置已保存')
      // 同步到后端元数据（新增/更新），后台静默执行，失败不影响本地保存
      this.syncDeviceMetaToBackend()
    },
    // 同步设备（执行器）元数据到后端（新增/更新；删除的字段禁用）
    async syncDeviceMetaToBackend() {
      for (const d of this.devices) {
        try {
          await this.$http.post('/sensor/meta', {
            field_name: d.key,
            display_name: d.label,
            unit: '',
            data_type: 'boolean',
            category: 'actuator'
          })
        } catch (e) { /* 后端不可用，忽略 */ }
      }
      for (const key of this.deletedDeviceKeys) {
        try {
          await this.$http.delete(`/sensor/meta/${key}`)
        } catch (e) { /* 忽略 */ }
      }
    },

    // 统一轮询入口：并发请求实时数据与设备状态，带防重入锁
    async pollData() {
      if (this.polling) return
      this.polling = true
      try {
        await Promise.all([
          this.fetchRealTimeData(),
          this.fetchDeviceStatus()
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
          this.updateOnline(res.timestamp)
        }
      } catch (error) {
        this.online = false // 后端不可达视为离线
        console.error('获取传感数据失败', error)
      }
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

    async toggleDevice(device, value) {
      if (!this.online) {
        this.$message.warning('设备离线，无法下发控制指令')
        return
      }
      // 手动模式才能手动控制设备；自动模式下由系统自动控制
      if (this.controlMode === 'auto') {
        this.$message.warning('自动模式下设备由系统自动控制，请先切换到「手动」模式')
        return
      }
      // 每个执行器指令独立下发：只发送被操作设备的状态，不携带其它执行器
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
        const status = error && error.response && error.response.status
        const data = error && error.response && error.response.data
        // 定流量任务占用保护：HTTP 409（code=2）
        if (status === 409) {
          this.$message.error((data && data.msg) || '该设备正被定流量任务占用，请先停止输送任务')
          return
        }
        const msg = status
          ? `控制失败（后端返回 ${status}）`
          : '控制请求失败，请检查后端是否启动及网络是否连通'
        this.$message.error(msg)
        console.error('设备控制失败：', error.response || error)
      }
    },

    // 定时任务专用控制：绕过自动模式检查，直接下发控制指令
    async executeScheduledAction(device, value) {
      if (!this.online) {
        this.$message.warning('设备离线，无法下发控制指令')
        return
      }
      const payload = { [device]: value ? 1 : 0 }
      try {
        const res = await this.$http.post('/monitor/device/control', payload)
        if (res.code === 0) {
          this.$message.success(`定时任务：已${value ? '开启' : '关闭'}${this.deviceLabel(device)}`)
          this.$set(this.deviceStatus, device, value ? 1 : 0)
        } else {
          this.$message.error(res.msg || '控制失败')
        }
      } catch (error) {
        const status = error && error.response && error.response.status
        const data = error && error.response && error.response.data
        // 定时任务碰到定流量任务占用（HTTP 409）时给出明确提示
        if (status === 409) {
          this.$message.error((data && data.msg) || '该设备正被定流量任务占用，定时任务未执行')
          return
        }
        this.$message.error('定时任务执行失败')
      }
    },

    // 加载定时任务列表（从后端 API）
    async loadSchedules() {
      try {
        let res = await this.$http.get('/schedules')
        res = unwrapData(res)
        if (res && Array.isArray(res)) {
          // 兼容旧数据：把 'HH:mm' 补成 'HH:mm:ss'，保证按秒匹配
          this.schedules = res.map(s => ({
            ...s,
            actions: Array.isArray(s.actions)
              ? s.actions.map(a => ({ ...a, time: this.normalizeScheduleTime(a.time) }))
              : s.actions
          }))
          const maxId = res.reduce((max, s) => Math.max(max, s.id || 0), 0)
          this.scheduleNextId = maxId + 1
        }
      } catch (e) {
        console.error('加载定时任务失败', e)
      }
    },

    // 把定时任务时间统一为 'HH:mm:ss'（旧数据若缺秒则补 0）
    normalizeScheduleTime(t) {
      if (!t) return t
      const parts = String(t).split(':')
      if (parts.length === 2) return t + ':00'
      return t
    },

    // 保存定时任务列表（到后端 API）
    async saveSchedules() {
      try {
        await this.$http.post('/schedules', {
          schedules: this.schedules
        })
      } catch (e) {
        console.error('保存定时任务失败', e)
      }
    },

    // 打开添加任务弹窗
    openScheduleAdd() {
      this.editSchedule = { deviceId: 'pump', actions: [{ time: '08:00:00', action: 1 }], repeat: 'daily' }
      this.scheduleEditVisible = true
    },

    // 打开编辑任务弹窗
    openScheduleEdit(index) {
      this.editSchedule = JSON.parse(JSON.stringify(this.schedules[index]))
      this.scheduleEditVisible = true
    },

    // 保存任务（新增或编辑）
    saveSchedule() {
      if (!this.editSchedule.deviceId) {
        this.$message.warning('请选择设备')
        return
      }
      if (!this.editSchedule.actions || !this.editSchedule.actions.length) {
        this.$message.warning('请至少添加一个开关时间')
        return
      }
      // 清理空时间点
      this.editSchedule.actions = this.editSchedule.actions.filter(a => a.time)

      const s = this.editSchedule
      // 确保新任务默认启用（后端若缺 enabled 字段，前端兜底为 true）
      if (s.enabled === undefined) s.enabled = true
      if (s.id) {
        const idx = this.schedules.findIndex(item => item.id === s.id)
        if (idx >= 0) {
          this.$set(this.schedules, idx, { ...s })
        }
      } else {
        s.id = this.scheduleNextId++
        this.schedules.push({ ...s })
      }

      this.saveSchedules()
      this.scheduleEditVisible = false
      this.$message.success('定时任务已保存')
    },

    // 删除任务
    removeSchedule(index) {
      this.$confirm('确定删除该定时任务？', '提示', { type: 'warning' })
        .then(() => {
          this.schedules.splice(index, 1)
          this.saveSchedules()
          this.$message.success('已删除')
        }).catch(() => {})
    },

    // 获取设备显示名
    deviceLabel(deviceId) {
      const d = this.devices.find(x => x.key === deviceId)
      return d ? d.label : deviceId
    },

    // 获取重复模式显示文本
    repeatText(repeat) {
      const map = { daily: '每天', weekdays: '工作日', weekend: '周末', once: '仅一次' }
      return map[repeat] || repeat
    },

    // 检查并执行到期的定时任务
    checkSchedules() {
      if (!this.schedules || !this.schedules.length) return
      const now = new Date()
      const currentHours = String(now.getHours()).padStart(2, '0')
      const currentMinutes = String(now.getMinutes()).padStart(2, '0')
      const currentSeconds = String(now.getSeconds()).padStart(2, '0')
      const currentTime = `${currentHours}:${currentMinutes}:${currentSeconds}`
      const currentDay = now.getDay() // 0=周日, 6=周六

      this.schedules.forEach(schedule => {
        // enabled 缺失/空值视为启用（后端旧数据可能没有该字段，避免任务全部失效）
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
          // 仅执行一次：检查今天是否已执行过（任一动作执行过即标记）
          if (schedule.lastFired) {
            const lastDate = new Date(schedule.lastFired)
            const today = new Date()
            if (lastDate.toDateString() === today.toDateString()) {
              return // 今天已经执行过
            }
          }
          shouldFire = true
        }

        if (!shouldFire) return

        // 执行所有匹配当前时间的动作（支持同一设备多个时间点）
        const actions = schedule.actions || []
        let fired = false
        actions.forEach(act => {
          if (act.time === currentTime) {
            this.executeScheduledAction(schedule.deviceId, act.action === 1)
            fired = true
          }
        })

        // 标记已执行（仅一次的任务）
        if (schedule.repeat === 'once' && fired) {
          schedule.lastFired = now.toISOString()
          this.saveSchedules()
        }
      })
    },

    // ===== 水槽列表（只读副本） =====
    loadTankList() {
      try {
        const raw = localStorage.getItem('iot_water_tanks')
        if (raw) {
          const arr = JSON.parse(raw)
          if (Array.isArray(arr) && arr.length) this.tankList = arr
        }
      } catch (e) { /* 本地数据解析失败时使用默认值 */ }
    },

    // ===== 定流量输送 =====
    // 水槽 id → 显示名
    tankName(id) {
      const t = this.tankList.find(x => String(x.id) === String(id))
      return t ? t.name : id
    },
    // 升数格式化（保留两位小数，非数字回退 0.0）
    formatLiters(v) {
      const n = Number(v)
      return isNaN(n) ? '0.0' : n.toFixed(2)
    },
    // 从本地存储加载输送路径列表
    loadTransferPaths() {
      try {
        const raw = localStorage.getItem('iot_water_transfer_paths')
        if (raw) {
          const arr = JSON.parse(raw)
          if (Array.isArray(arr) && arr.length) this.transferPaths = arr
        }
      } catch (e) { /* 忽略 */ }
      const maxId = this.transferPaths.reduce((max, p) => Math.max(max, p.id || 0), 0)
      this.transferNextId = maxId + 1
    },
    saveTransferPathsToStorage() {
      localStorage.setItem('iot_water_transfer_paths', JSON.stringify(this.transferPaths))
    },
    // 新增输送路径
    openTransferAdd() {
      this.editTransferPath = { id: null, source: '', target: '', device: 'pump', target_liters: 5.0 }
      this.transferEditVisible = true
    },
    // 编辑输送路径
    openTransferEdit(index) {
      this.editTransferPath = JSON.parse(JSON.stringify(this.transferPaths[index]))
      this.transferEditVisible = true
    },
    // 保存输送路径（新增或更新）
    saveTransferPath() {
      const p = this.editTransferPath
      if (!p.source || !p.target) { this.$message.warning('请选择进水端和出水端'); return }
      if (String(p.source) === String(p.target)) { this.$message.warning('进水端和出水端不能相同'); return }
      if (!p.device) { this.$message.warning('请选择水泵'); return }
      if (!(Number(p.target_liters) > 0)) { this.$message.warning('请输入有效的目标升数'); return }
      if (p.id) {
        const idx = this.transferPaths.findIndex(item => item.id === p.id)
        if (idx >= 0) this.$set(this.transferPaths, idx, { ...p })
      } else {
        p.id = this.transferNextId++
        this.transferPaths.push({ ...p })
      }
      this.saveTransferPathsToStorage()
      this.transferEditVisible = false
      this.$message.success('输送路径已保存')
    },
    // 删除输送路径
    removeTransferPath(index) {
      this.$confirm('确定删除该输送路径？', '提示', { type: 'warning' })
        .then(() => {
          this.transferPaths.splice(index, 1)
          this.saveTransferPathsToStorage()
          this.$message.success('已删除')
        }).catch(() => {})
    },
    // 启动定流量输送任务：POST /auto-transfer，拿到任务后进入进度轮询
    async startTransfer(path) {
      if (!path || !path.source || !path.target) { this.$message.warning('请选择进水端和出水端'); return }
      if (String(path.source) === String(path.target)) { this.$message.warning('进水端和出水端不能相同'); return }
      if (!path.device) { this.$message.warning('请选择水泵'); return }
      if (!(Number(path.target_liters) > 0)) { this.$message.warning('请输入有效的目标升数'); return }
      if (!this.online) { this.$message.warning('设备离线，无法下发控制指令'); return }
      if (this.activeTransfer) { this.$message.warning('已有进行中的输送任务'); return }
      try {
        const res = await this.$http.post('/auto-transfer', {
          source: String(path.source),
          target: String(path.target),
          device: path.device,
          target_liters: Number(path.target_liters)
        })
        const task = unwrapData(res)
        if (task && task.id !== undefined) {
          this.activeTransfer = { ...task }
          this.$message.success('输送任务已启动')
        } else {
          this.$message.error('启动失败，请确认后端已实现 /auto-transfer 接口')
        }
      } catch (error) {
        const status = error && error.response && error.response.status
        const data = error && error.response && error.response.data
        // 已有进行中的任务：HTTP 409（code=2）
        if (status === 409) {
          this.$message.error((data && data.msg) || '已有进行中的输送任务，请先停止后再创建')
          return
        }
        // 开泵指令下发失败：HTTP 500（code=3）
        if (status === 500 && data && data.msg) {
          this.$message.error(data.msg)
          return
        }
        this.$message.error((data && data.msg) || '启动输送失败，请检查后端是否已实现定流量输送接口')
        console.error('startTransfer 失败：', error)
      }
    },
    // 轮询运行中任务的进度；达标(done)时弹窗提示并停止轮询
    async pollActiveTransfer() {
      if (!this.activeTransfer || this.activeTransfer.id === undefined) return
      try {
        const res = await this.$http.get('/auto-transfer/' + this.activeTransfer.id)
        const task = unwrapData(res)
        if (!task) return
        this.activeTransfer = { ...this.activeTransfer, ...task }
        if (task.status === 'done') {
          this.activeTransfer = null
          this.$alert('定流量任务已完成', '提示', { type: 'success', confirmButtonText: '确定' }).catch(() => {})
          this.fetchTransferHistory()
        } else if (task.status === 'failed') {
          this.activeTransfer = null
          const reason = this.failReasonText(task.fail_reason)
          this.$message.error(reason ? ('定流量输送任务异常终止：' + reason) : '定流量输送任务异常终止')
          this.fetchTransferHistory()
        } else if (task.status === 'stopped') {
          this.activeTransfer = null
          this.fetchTransferHistory()
        }
      } catch (e) {
        // 轮询失败静默忽略，避免频繁弹错误提示
      }
    },
    // 手动停止运行中的输送任务
    async stopActiveTransfer() {
      if (!this.activeTransfer || this.activeTransfer.id === undefined) return
      const id = this.activeTransfer.id
      this.activeTransfer = null
      try {
        await this.$http.post('/auto-transfer/' + id + '/stop')
        this.$message.success('已停止输送')
        this.fetchTransferHistory()
      } catch (e) {
        const data = e && e.response && e.response.data
        this.$message.error((data && data.msg) || '停止失败，请确认后端已实现停止接口')
      }
    },

    // 获取定流量输送任务记录（列表接口无 msg，返回 {code,total,page,page_size,data}）
    async fetchTransferHistory() {
      try {
        let res = await this.$http.get('/auto-transfer', { params: { page: 1, page_size: 20 } })
        res = unwrapData(res)
        const list = (res && Array.isArray(res.data)) ? res.data : []
        this.transferHistory = list
        // 页面刷新/切页后，若后端仍有「运行中」任务，恢复进度展示
        const running = list.find(t => t.status === 'running')
        if (running && (!this.activeTransfer || this.activeTransfer.id !== running.id)) {
          this.activeTransfer = { ...running }
        }
      } catch (e) {
        console.error('获取输送任务记录失败', e)
      }
    },

    // 删除定流量输送任务记录（运行中的任务后端会拒绝删除，需先停止）
    async removeTransferTask(task) {
      if (!task || task.id === undefined) return
      this.$confirm('确定删除该任务记录？', '提示', { type: 'warning' })
        .then(async () => {
          try {
            await this.$http.delete('/auto-transfer/' + task.id)
            this.$message.success('已删除')
            this.fetchTransferHistory()
          } catch (e) {
            const status = e && e.response && e.response.status
            const data = e && e.response && e.response.data
            if (status === 400 && data && data.msg) {
              this.$message.error(data.msg)
              return
            }
            this.$message.error(status === 404 ? '任务不存在' : '删除失败')
          }
        }).catch(() => {})
    },

    // 定流量任务状态 → 中文
    transferStatusText(status) {
      const map = { running: '运行中', done: '已完成', stopped: '已停止', failed: '失败' }
      return map[status] || status || '-'
    },
    transferStatusClass(status) {
      const map = { running: 'status-normal', done: 'status-normal', stopped: 'status-warn', failed: 'status-danger' }
      return map[status] || 'status-warn'
    },
    // 定流量任务失败原因 → 中文
    failReasonText(reason) {
      const map = {
        zero_flow: '零流量/断流',
        timeout: '超时未达标',
        send_fail: '开泵指令下发失败',
        server_restart: '服务重启中断'
      }
      return map[reason] || reason || ''
    },

    // 撤销上一次手动控制指令
    async undoLastControl() {
      if (!this.online) {
        this.$message.warning('设备离线，无法下发控制指令')
        return
      }
      try {
        const res = await this.$http.post('/monitor/device/undo')
        if (res && res.code === 0) {
          this.$message.success(res.msg || '已撤销上次手动控制')
          this.fetchDeviceStatus()
        } else {
          this.$message.error((res && res.msg) || '撤销失败')
        }
      } catch (error) {
        this.$message.error('撤销请求失败，请检查后端是否启动')
      }
    }
  }
}
</script>


<style scoped>
/* 设备控制布局 */
.control-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.control-item {
  position: relative;
  background: #f5f7fa;
  padding: 14px 12px;
  border-radius: 12px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.control-label {
  color: #909399;
  font-size: 12px;
}

.control-item-icon {
  color: var(--primary);
}

.control-card-icon {
  color: var(--primary);
  margin-right: 2px;
}

.control-status {
  font-size: 15px;
  font-weight: 600;
}

/* 撤销控制按钮行 */
.undo-row {
  margin-top: 12px;
  text-align: center;
}

/* 模式切换 */
.mode-group {
  margin-left: 14px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.mode-tip {
  font-size: 12px;
  color: #909399;
  font-weight: normal;
}
.mode-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #909399;
  margin-top: 10px;
  padding: 6px 10px;
  background: #f5f7fa;
  border-radius: 8px;
}
.mode-hint-offline {
  color: #f56c6c;
  background: rgba(245, 108, 108, 0.06);
}

/* 设备卡片在线/离线状态标签（右上角） */
.conn-tag {
  position: absolute;
  top: 8px;
  right: 8px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  line-height: 1;
  padding: 4px 8px;
  border-radius: 10px;
  font-weight: 600;
}
.conn-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}
.conn-online { color: #67c23a; background: rgba(103, 194, 58, 0.12); }
.conn-offline { color: #909399; background: rgba(144, 147, 153, 0.15); }

/* 状态圆点配色（提示行 / 连接标签共用） */
.dot-online { background: #67c23a; }
.dot-offline { background: #c0c4cc; }

/* 提示行里的状态圆点 */
.hint-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}

/* 状态标签 */
.status-tag {
  padding: 3px 12px;
  border-radius: 12px;
  font-weight: 600;
}

.status-tag.status-normal {
  background: rgba(103, 194, 58, 0.12);
  color: #67c23a;
}

.status-tag.status-warn {
  background: rgba(230, 162, 60, 0.12);
  color: #e6a23c;
}

.status-tag.status-danger {
  background: rgba(245, 108, 108, 0.12);
  color: #f56c6c;
}

/* 卡片标题右侧时间样式 */
.time {
  margin-left: auto;
  font-size: 12px;
  color: #909399;
  font-weight: normal;
}

/* 编辑设备弹窗（复用传感编辑样式） */
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

/* ===== 定流量输送 ===== */
.transfer-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.transfer-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: flex-end;
}

.transfer-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 150px;
}

.transfer-label {
  font-size: 12px;
  color: var(--text-2);
}

.transfer-field .el-select,
.transfer-field .el-input-number {
  width: 100%;
}

.transfer-arrow {
  align-self: flex-end;
  color: var(--text-3);
  font-size: 16px;
  padding-bottom: 6px;
}

.transfer-actions {
  display: flex;
  gap: 8px;
}

.transfer-progress {
  margin-top: 12px;
  padding: 14px;
  background: #f5f7fa;
  border: 1px solid var(--border);
  border-radius: 10px;
}

.transfer-progress-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.transfer-progress-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-1);
}

.transfer-progress-meta {
  font-size: 13px;
  color: var(--text-2);
  margin: 6px 0;
}

.transfer-progress .el-button {
  margin-top: 10px;
}

/* 输送任务失败原因 */
.fail-reason {
  margin-left: 6px;
  font-size: 12px;
  color: #f56c6c;
}

/* ===== 响应式：手机端显示卡片，隐藏网格/表格 ===== */
.mobile-only { display: none; }
.desktop-only { display: block; }

@media (max-width: 640px) {
  .desktop-only { display: none !important; }
  .mobile-only { display: block !important; }

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

  /* 定时任务动作行：手机端竖排 */
  .schedule-action-row {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  .schedule-action-row .el-radio-group {
    align-self: flex-start;
  }

  .card-title .time {
    width: 100%;
    margin-left: 0;
    margin-top: 4px;
  }

  /* 控制卡片 */
  .control-card {
    background: #f5f7fa;
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 14px;
    margin-bottom: 10px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    text-align: center;
  }
  .control-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }
  .control-card-name {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-2);
  }
  .control-card-status {
    font-size: 16px;
    font-weight: 600;
  }
  .control-card .el-button {
    width: 100%;
  }

  /* 定时任务卡片 / 输送路径卡片 */
  .schedule-card {
    background: #f5f7fa;
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 14px;
    margin-bottom: 10px;
  }
  .schedule-card-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 5px 0;
    font-size: 13px;
  }
  .schedule-card-label {
    color: var(--text-2);
    flex-shrink: 0;
    margin-right: 12px;
  }
  .schedule-card-value {
    color: var(--text-1);
    font-weight: 500;
    text-align: right;
  }
  .schedule-card-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px dashed var(--border);
  }

  /* 定流量输送：手机端表单单列 */
  .transfer-row {
    flex-direction: column;
    align-items: stretch;
  }
  .transfer-field {
    min-width: 0;
  }
  .transfer-arrow {
    align-self: center;
    transform: rotate(90deg);
    padding: 0;
  }
}
</style>
