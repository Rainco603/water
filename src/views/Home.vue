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
            {{ runningDeviceCount }} 个执行器运行中
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

    <!-- 1.5 预计时间/温度（目标温度 ↔ 预计时长 双向推算） -->
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

    <!-- 2. 实时传感器数据 -->
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

    <!-- 4. 设备控制（含自动/手动模式切换 + 设备在线状态） -->
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

    <!-- 5. 智能判定结果 -->
    <div class="card-box">
      <div class="card-title">智能判定结果 <span class="time">{{ judgeResult.time }}</span></div>
      <div class="judge-result">
        <div class="judge-row">
          <span class="data-label">系统运行状态：</span>
          <span class="status-tag" :class="getStatusClass(judgeResult.status)">
            {{ judgeResult.message || '等待数据...' }}
          </span>
        </div>
        <div class="judge-row">
          <span class="data-label">建议动作：</span>
          <span class="judge-action">{{ judgeActionText(judgeResult.action) }}</span>
        </div>
        <div class="judge-row">
          <span class="data-label">判定结论：</span>
          <span class="judge-conclusion">{{ judgeConclusionText(judgeResult.status) }}</span>
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
import { SENSOR_DEFS, fetchSensorFields, fieldsToSensorItems, fieldsToDeviceItems, reconcileByBackend } from '../utils/sensors'
import { unwrapData } from '../utils/request'

export default {
  name: 'WaterHome',
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
      // 设备控制项（本地持久化，支持增删改；key 对应后端执行器字段）
      devices: [
        { key: 'pump', label: '水泵' },
        { key: 'heater', label: '加热器' }
      ],
      deviceEditVisible: false,
      editDevices: [],
      deletedDeviceKeys: [],
      // 智能判定结果
      judgeResult: {
        time: '--',
        status: 'normal',
        message: '等待数据...',
        action: 'none'
      },
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

      // ===== 预计时间/温度 =====
      predictField: 'temp1', // 当前推算的温度字段
      predictRateInput: null, // 手动填写的温度变化速率(℃/分)，null 表示用自动推算
      predictRateAuto: null, // 近 15 分钟历史数据加权回归出的速率(℃/分)
      predictTarget: null, // 目标温度输入
      predictMinutes: null, // 分钟数输入
      predictHistoryLoading: false,
      predictTimer: null
    }
  },
  created() {
    this.loadTankList()
    this.loadSensorItems()
    this.loadDeletedSensorKeys()
    this.loadDevices()
    this.loadDeletedDeviceKeys()
    this.loadControlMode()
    this.loadSchedules()
    // 确保默认温度字段有效（用户可能已删除 temp1）
    if (!this.temperatureFields.some(s => s.key === this.predictField)) {
      this.predictField = this.temperatureFields.length ? this.temperatureFields[0].key : 'temp1'
    }
  },
  mounted() {
    this.initSensorFields()
    this.initDevices()
    this.fetchSystemConfig()
    this.pollData()

    this.timer = setInterval(() => this.pollData(), 3000)
    // 每秒检查一次定时任务（时间已精确到秒）
    this.scheduleTimer = setInterval(() => this.checkSchedules(), 1000)
    // 预计时间/温度：初始推算一次速率，之后每 60 秒刷新
    this.fetchPredictRate()
    this.predictTimer = setInterval(() => this.fetchPredictRate(), 60000)
    // 初始化添加水槽表单默认名
    const nextId = Math.max(0, ...this.tankList.map(t => Number(t.id))) + 1
    this.addTankForm.defaultName = '水槽 ' + String(nextId).padStart(2, '0')
  },
  beforeDestroy() {
    if (this.timer) {
      clearInterval(this.timer)
    }
    if (this.scheduleTimer) {
      clearInterval(this.scheduleTimer)
    }
    if (this.predictTimer) {
      clearInterval(this.predictTimer)
    }
  },
  computed: {
    // 运行中的执行器数量（deviceStatus 值为 1 视为运行中）
    runningDeviceCount() {
      return this.devices.filter(d => {
        const v = this.deviceStatus[d.key]
        return v === 1 || v === '1' || v === true
      }).length
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
    // 执行器/设备图标映射
    deviceIcon() {
      return (key) => {
        if (/pump/i.test(key)) return 'pump'
        if (/heat/i.test(key)) return 'heater'
        return 'setup'
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
    }
  },
  methods: {
    goToDetail(id) {
      this.$router.push({ name: 'TankDetail', params: { id: id } })
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
      // 切回自动模式时，重新拉取系统判定和设备状态，让自动控制立即生效
      if (mode === 'auto') {
        this.fetchJudgeResult()
        this.fetchDeviceStatus()
      }
    },
    // 读取系统配置：控制模式、心跳超时阈值
    async fetchSystemConfig() {
      try {
        let res = await this.$http.get('/config/all')
        // 解包 {code, data} 包裹
        res = unwrapData(res)
        // 归一化为 { key: value }，兼容数组 [{key,value}] 与扁平对象两种返回
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
      // 剔除本地遗留的 pump2/heater2 等后端控制接口不支持的字段，避免下发控制 400。
      // 以后端元数据为权威：后端已删除的设备剔除，新增的补入，用户改过的名称保留
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
          this.updateOnline(res.timestamp)
          // 字段列表以后端元数据为权威，不再从实时数据自动发现（避免后端已软删的字段被加回）
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
    },

    getStatusClass(status) {
      if (status === 'normal' || status === undefined) return 'status-normal'
      if (status.includes('low')) return 'status-warn'
      return 'status-danger'
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

    judgeActionText(action) {
      if (action === undefined || action === null || action === '' || action === 'none') return '无'
      // 字典格式：{ pump: 1, heater: 0 } → 「开水泵、关加热器」
      if (typeof action === 'object' && !Array.isArray(action)) {
        const parts = Object.keys(action).map(k => {
          const v = action[k]
          const name = this.actuatorName(k)
          if (v === 1 || v === '1' || v === true) return '开' + name
          if (v === 0 || v === '0' || v === false) return '关' + name
          return name + '=' + v
        })
        return parts.length ? parts.join('、') : JSON.stringify(action)
      }
      // 字符串动作（含别名映射，如 heating → heater、emergency_stop 等）
      const s = String(action).trim()
      // 新版 action 统一为「执行器:状态」格式，多条用 '; ' 分隔（如 heater:0; pump:0）
      if (s.includes(':')) {
        const parts = s.split(';').map(seg => {
          const idx = seg.indexOf(':')
          if (idx < 0) return null
          const f = seg.slice(0, idx).trim()
          const v = seg.slice(idx + 1).trim()
          if (!f) return null
          const name = this.actuatorName(f)
          if (v === '1') return '开' + name
          if (v === '0') return '关' + name
          return name + '=' + v
        }).filter(Boolean)
        if (parts.length) return parts.join('、')
      }
      const map = {
        stop_heating: '停止加热',
        start_heating: '开启加热',
        stop_pump: '停止水泵',
        start_pump: '开启水泵',
        emergency_stop: '紧急停机',
        keep: '保持当前状态',
        none: '无'
      }
      return map[s] || s
    },

    // 执行器字段 → 中文名（优先用本地设备列表，兜底常见映射）
    actuatorName(key) {
      const d = this.devices.find(x => x.key === key)
      if (d && d.label) return d.label
      const map = { pump: '水泵', pump2: '水泵2', pump3: '水泵3', heater: '加热器', heater2: '加热器2' }
      return map[key] || key
    },

    judgeConclusionText(status) {
      const map = {
        normal: '系统运行正常，各项指标均在安全范围内，无需干预。',
        temp_high: '水温超过安全上限，建议停止加热并检查温控设备。',
        temp_low: '水温低于安全下限，建议开启加热以维持温度。',
        pressure_abnormal: '管道压力异常，建议检查管路并调整水泵运行。',
        flow_abnormal: '管道流量异常，建议检查水路是否堵塞或泄漏。',
        alarm: '检测到异常状况，请及时查看报警并处理。'
      }
      return map[status] || '暂无判定结论。'
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
    },

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

/* 智能判定样式 */
.judge-result {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.judge-row {
  display: flex;
  align-items: center;
  background: #f5f7fa;
  padding: 12px;
  border-radius: 10px;
}

.judge-row .data-label {
  flex-shrink: 0;
  display: inline-block;
  margin-bottom: 0;
  margin-right: 8px;
  color: #606266;
}

.judge-action {
  color: #303133;
  font-weight: 600;
}

.judge-conclusion {
  color: #606266;
  font-size: 13px;
  line-height: 1.6;
}

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

/* ===== 响应式：手机端显示卡片，隐藏网格/表格 ===== */
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

  /* 预计时间/温度：手机端两列改单列 */
  .predict-grid {
    grid-template-columns: 1fr;
  }
  .predict-rate {
    margin-left: 0;
    width: 100%;
  }

  /* 定时任务卡片 */
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

  /* 弹窗全宽 */
  .el-dialog {
    width: 94% !important;
  }
}
</style>
