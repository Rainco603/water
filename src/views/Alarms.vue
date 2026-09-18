<template>
  <div class="alarms-page">

    <!-- 1. 实时报警提示 (1-5b) -->
    <div class="realtime-alarm-banner" :class="getBannerClass()">
      <div class="banner-icon">⚠️</div>
      <div class="banner-content">
        <div class="banner-title">{{ activeAlarms.length > 0 ? '检测到异常状况！' : '系统运行正常' }}</div>
        <div class="banner-desc" v-if="activeAlarms.length > 0">
          <span v-for="(alarm, index) in activeAlarms" :key="index">
            {{ alarm.alarm }} ({{ alarm.timestamp }}){{ index < activeAlarms.length - 1 ? '；' : '' }}
          </span>
        </div>
        <div class="banner-desc" v-else>当前所有传感器数值均在正常范围内</div>
      </div>
    </div>

    <!-- 1.5 报警上下限设定（原配置页移入，支持增删改） -->
    <div class="card-box">
      <div class="card-title">
        报警上下限设定
        <el-button size="mini" type="primary" plain style="margin-left: auto;" @click="openThresholdAdd"><svg-icon name="plus" :size="14"/>添加阈值</el-button>
      </div>
      <div class="threshold-list">
        <div class="threshold-row" v-for="f in thresholdFields" :key="f.field">
          <span class="t-label">{{ f.label }}({{ f.unit }})</span>
          <div class="t-inputs">
            <span class="t-bound">上限</span>
            <el-input-number v-model="thresholds[f.field + '_max']" :precision="f.precision" :step="f.step" size="mini" :min="-100"></el-input-number>
            <span class="t-bound">下限</span>
            <el-input-number v-model="thresholds[f.field + '_min']" :precision="f.precision" :step="f.step" size="mini" :min="-100"></el-input-number>
          </div>
          <el-button size="mini" type="text" style="color: #f56c6c;" @click="removeThreshold(f.field)">删除</el-button>
        </div>
        <div v-if="thresholdFields.length === 0" style="text-align: center; color: #909399; padding: 20px; font-size: 12px;">
          暂无阈值，点击【添加阈值】新建
        </div>
      </div>
      <div style="text-align: center; margin-top: 15px;">
        <el-button type="primary" size="mini" @click="saveThresholds">保存阈值</el-button>
      </div>
    </div>

    <!-- 添加阈值弹窗 -->
    <el-dialog title="添加阈值" :visible.sync="thresholdAddVisible" width="94%" :modal-append-to-body="true">
      <div class="threshold-add-body">
        <div class="ta-row">
          <span class="ta-label">字段名:</span>
          <el-input v-model="thresholdForm.field" size="mini" placeholder="如 temp3 / level" style="flex: 1;"></el-input>
        </div>
        <div class="ta-row">
          <span class="ta-label">显示名:</span>
          <el-input v-model="thresholdForm.label" size="mini" placeholder="如 水温 03" style="flex: 1;"></el-input>
        </div>
        <div class="ta-row">
          <span class="ta-label">单位:</span>
          <el-input v-model="thresholdForm.unit" size="mini" placeholder="如 ℃" style="flex: 1;"></el-input>
        </div>
        <div class="ta-row">
          <span class="ta-label">上限:</span>
          <el-input-number v-model="thresholdForm.max" size="mini" :min="-100" style="flex: 1;"></el-input-number>
        </div>
        <div class="ta-row">
          <span class="ta-label">下限:</span>
          <el-input-number v-model="thresholdForm.min" size="mini" :min="-100" style="flex: 1;"></el-input-number>
        </div>
      </div>
      <span slot="footer">
        <el-button size="mini" @click="thresholdAddVisible = false">取消</el-button>
        <el-button size="mini" type="primary" @click="addThreshold">确定</el-button>
      </span>
    </el-dialog>

    <!-- 1.6 报警类型统计（重复报警去重，归为一条） -->
    <div class="card-box">
      <div class="card-title">
        报警类型统计
        <span class="count">重复报警已去重</span>
      </div>
      <div class="alarm-stat-grid" v-if="alarmStats.length">
        <div
          v-for="t in alarmStats"
          :key="t.key"
          class="alarm-stat-card"
          :class="'alarm-stat-card--' + t.key"
        >
          <div class="alarm-stat-label">{{ t.label }}</div>
          <div class="alarm-stat-value">{{ t.count }}<i class="unit">条</i></div>
        </div>
      </div>
      <div v-else class="alarm-stat-empty">
        {{ alarmStatQueried ? '当前时间范围内暂无报警记录' : '统计加载中...' }}
      </div>
    </div>

    <!-- 2. 历史报警查询 (1-5c) -->
    <div class="card-box">
      <div class="card-title">历史报警记录查询</div>
      <div class="filter-form">
        <div class="form-item keyword-item">
          <span class="label">关键词:</span>
          <el-input v-model="filterData.keyword" size="mini" clearable placeholder="搜索报警内容" style="width: 220px;"></el-input>
        </div>
        <div class="form-item">
          <span class="label">处理状态:</span>
          <el-select v-model="filterData.handledStatus" size="mini" style="width: 110px;">
            <el-option label="全部" value="all"></el-option>
            <el-option label="已处理" value="handled"></el-option>
            <el-option label="未处理" value="unhandled"></el-option>
          </el-select>
        </div>
        <div class="form-item">
          <span class="label">快捷时间:</span>
          <el-select v-model="filterData.quickRange" size="mini" style="width: 130px">
            <el-option label="自定义" value="custom"></el-option>
            <el-option label="最近15分钟" value="15m"></el-option>
            <el-option label="最近30分钟" value="30m"></el-option>
            <el-option label="最近1小时" value="1h"></el-option>
          </el-select>
        </div>
        <div class="form-item time-range-item" v-show="filterData.quickRange === 'custom'">
          <span class="label">时间范围:</span>
          <roll-time-range-picker v-model="filterData.timeRange"></roll-time-range-picker>
        </div>
        <el-button type="primary" size="mini" @click="handleQuery">查 询</el-button>
      </div>
    </div>

    <!-- 3. 历史报警列表 -->
    <div class="card-box">
      <div class="card-title">报警历史记录<span class="count" v-if="hasQueried">（{{ filterData.handledStatus === 'all' ? '共 ' + total + ' 条' : '本页筛选出 ' + filteredAlarmHistoryList.length + ' 条' }}）</span></div>
      <!-- 桌面端：表格 -->
      <div class="desktop-only">
        <div class="table-scroll">
          <table class="custom-table">
            <thead>
              <tr>
                <th width="150">时间</th>
                <th>报警内容</th>
                <th width="70">触发数值</th>
                <th width="70">级别</th>
                <th width="110">执行动作</th>
                <th width="70">来源</th>
                <th width="90">处理</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in filteredAlarmHistoryList" :key="index">
                <td>{{ item.timestamp }}</td>
                <td class="alarm-content">{{ item.alarm }}</td>
                <td>{{ alarmValue(item) }}</td>
                <td>
                  <span class="level-tag" :class="getLevelClass(item.level)">
                    {{ getLevelText(item.level) }}
                  </span>
                </td>
                <td>{{ item.action || '无' }}</td>
                <td><span class="src-tag" :class="getSrcClass(item.src)">{{ getSrcText(item.src) }}</span></td>
                <td>
                  <span v-if="isHandled(item)" class="handled-tag">已处理</span>
                  <el-button v-else size="mini" type="text" @click="markHandled(item)">标记已处理</el-button>
                </td>
              </tr>
              <tr v-if="filteredAlarmHistoryList.length === 0">
                <td colspan="7" style="text-align: center; padding: 20px;">
                  {{ alarmEmptyText }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <!-- 移动端：卡片 -->
      <div class="mobile-only">
        <div class="alarm-card" v-for="(item, index) in filteredAlarmHistoryList" :key="index">
          <div class="alarm-card-row">
            <span class="alarm-card-label">时间</span>
            <span class="alarm-card-value">{{ item.timestamp }}</span>
          </div>
          <div class="alarm-card-row">
            <span class="alarm-card-label">报警内容</span>
            <span class="alarm-card-value alarm-card-content">{{ item.alarm }}</span>
          </div>
          <div class="alarm-card-row">
            <span class="alarm-card-label">触发数值</span>
            <span class="alarm-card-value">{{ alarmValue(item) }}</span>
          </div>
          <div class="alarm-card-row">
            <span class="alarm-card-label">级别</span>
            <span class="level-tag" :class="getLevelClass(item.level)">{{ getLevelText(item.level) }}</span>
          </div>
          <div class="alarm-card-row">
            <span class="alarm-card-label">执行动作</span>
            <span class="alarm-card-value">{{ item.action || '无' }}</span>
          </div>
          <div class="alarm-card-row">
            <span class="alarm-card-label">来源</span>
            <span class="alarm-card-value"><span class="src-tag" :class="getSrcClass(item.src)">{{ getSrcText(item.src) }}</span></span>
          </div>
          <div class="alarm-card-row alarm-card-handle">
            <span v-if="isHandled(item)" class="handled-tag">已处理</span>
            <el-button v-else size="mini" type="text" @click="markHandled(item)">标记已处理</el-button>
          </div>
        </div>
        <div class="alarm-card alarm-card--empty" v-if="filteredAlarmHistoryList.length === 0">
          {{ alarmEmptyText }}
        </div>
      </div>
      <!-- 分页 -->
      <div class="pagination" v-if="alarmHistoryList.length > 0">
        <el-button size="mini" :disabled="filterData.page === 1" @click="changePage(-1)">上一页</el-button>
        <span>第 {{ filterData.page }} 页</span>
        <el-button size="mini" :disabled="alarmHistoryList.length < filterData.page_size" @click="changePage(1)">下一页</el-button>
      </div>
    </div>

  </div>
</template>

<script>
import RollTimeRangePicker from '../components/RollTimeRangePicker.vue';
import { SENSOR_DEFS, fetchSensorFields, fieldsToSensorItems, reconcileByBackend, loadLocalSensors, loadDeletedSensorKeys } from '../utils/sensors';
import { unwrapData } from '../utils/request';
import { resolveQuickRange } from '../utils/quickRange';

export default {
  name: 'AlarmList',
  components: { RollTimeRangePicker },
  data() {
    return {
      // 当前活跃报警 (实时)
      activeAlarms: [],
      // 历史报警列表
      alarmHistoryList: [],
      // 筛选条件
      filterData: {
        timeRange: [],
        // 快捷时间：'custom'=自定义时间范围；'15m'/'30m'/'1h'=最近15/30分钟/1小时（与时间范围互斥）
        quickRange: 'custom',
        keyword: '',
        handledStatus: 'all', // 处理状态筛选：all / handled / unhandled
        page: 1,
        page_size: 15
      },
      hasQueried: false,
      total: 0,
      // 报警类型统计（按类型去重计数，重复报警归为一条）
      alarmStats: [], // [{ key, label, count }]
      alarmStatQueried: false,
      alarmStatLoading: false,
      timer: null,
      // 用户标记为「已处理」的报警键（本地持久化，后端暂未提供确认接口）
      handledAlarms: [],
      // 报警上下限设定数据（键名与后端一致：<field>_max / <field>_min）
      thresholds: {
        temp1_max: 60,
        temp1_min: 5,
        temp2_max: 60,
        temp2_min: 5,
        pressure_max: 150,
        pressure_min: 20,
        flow_max: 5.0,
        flow_min: 0.2
      },
      // 当前传感器列表（阈值字段列表的初始来源）
      sensorItems: SENSOR_DEFS.map(s => ({ key: s.key, label: s.label, unit: s.unit })),
      // 可增删改的阈值字段列表：每项 { field, label, unit, step, precision }
      thresholdFields: [],
      thresholdAddVisible: false,
      thresholdForm: { field: '', label: '', unit: '℃', max: 60, min: 5 }
    }
  },
  created() {
    // 从本地存储恢复上次保存的阈值，避免刷新后回到写死的默认值
    try {
      const raw = localStorage.getItem('iot_water_thresholds');
      if (raw) {
        const saved = JSON.parse(raw);
        const migrated = {};
        Object.keys(saved).forEach(k => {
          let newKey = k;
          const m = /^tank(\d+)_temp_(.*)/.exec(k);
          if (m) newKey = `temp${m[1]}_${m[2]}`;
          migrated[newKey] = saved[k];
        });
        this.thresholds = { ...this.thresholds, ...migrated };
      }
    } catch (e) {
      // 解析失败则使用默认值
    }
  },
  mounted() {
    // 初始化默认时间范围（最近24小时）
    const end = new Date();
    const start = new Date(end.getTime() - 24 * 3600 * 1000);
    this.filterData.timeRange = [this.formatDate(start), this.formatDate(end)];

    // 获取数据
    this.loadHandledAlarms();
    this.fetchActiveAlarms();
    this.loadSensorItems();
    this.fetchThresholds();
    // 报警类型统计随默认时间范围（最近24小时）自动加载
    this.fetchAlarmStats();
    // 历史报警不再自动查询，等待用户点击【查 询】

    // 轮询获取实时报警 (5秒一次)
    this.timer = setInterval(() => {
      this.fetchActiveAlarms();
    }, 5000);
  },
  beforeDestroy() {
    if (this.timer) clearInterval(this.timer);
  },
  computed: {
    // 按「处理状态」筛选后的报警列表（已处理状态为前端本地标记，需在客户端过滤）
    filteredAlarmHistoryList() {
      if (this.filterData.handledStatus === 'handled') {
        return this.alarmHistoryList.filter(item => this.isHandled(item))
      }
      if (this.filterData.handledStatus === 'unhandled') {
        return this.alarmHistoryList.filter(item => !this.isHandled(item))
      }
      return this.alarmHistoryList
    },
    // 列表空态文案
    alarmEmptyText() {
      if (!this.hasQueried) return '点击【查 询】获取报警记录'
      if (this.alarmHistoryList.length === 0) return '暂无报警记录'
      return '当前页无匹配「已处理/未处理」的报警记录'
    }
  },
  methods: {
    async fetchActiveAlarms() {
      try {
        let res = await this.$http.get('/monitor/alarm/active');
        res = unwrapData(res);
        this.activeAlarms = Array.isArray(res) ? res : [];
      } catch (error) {
        console.error('获取实时报警失败', error);
        this.activeAlarms = [];
      }
    },

    // ===== 报警「已处理」标记（前端本地持久化） =====
    loadHandledAlarms() {
      try {
        const raw = localStorage.getItem('iot_water_handled_alarms');
        if (raw) {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr)) this.handledAlarms = arr;
        }
      } catch (e) { /* 忽略 */ }
    },
    alarmKey(item) {
      return `${item.timestamp}__${item.alarm}`;
    },
    isHandled(item) {
      return this.handledAlarms.includes(this.alarmKey(item));
    },
    markHandled(item) {
      const key = this.alarmKey(item);
      if (this.handledAlarms.includes(key)) return;
      this.handledAlarms.push(key);
      localStorage.setItem('iot_water_handled_alarms', JSON.stringify(this.handledAlarms));
      this.$message.success('已标记为已处理');
    },
    // 报警触发时的原始数值（后端字段可能是 value/trigger_value/metric，按序兜底）
    alarmValue(item) {
      const keys = ['value', 'trigger_value', 'triggerValue', 'metric'];
      for (const k of keys) {
        const v = item[k];
        if (v !== undefined && v !== null && v !== '') {
          if (typeof v === 'object') return JSON.stringify(v);
          return v;
        }
      }
      return '--';
    },

    async fetchAlarmHistory() {
      try {
        const range = resolveQuickRange(this.filterData.quickRange, this.filterData.timeRange, this.formatDate);
        const hasRange = range && range.length === 2;
        const params = {
          start_time: hasRange ? range[0] : undefined,
          end_time: hasRange ? range[1] : undefined,
          keyword: this.filterData.keyword ? this.filterData.keyword.trim() : undefined,
          page: this.filterData.page,
          page_size: this.filterData.page_size
        };
        let res = await this.$http.get('/records/alarm/data', { params });
        res = unwrapData(res);
        this.alarmHistoryList = res.data || [];
        this.total = res.total || (res.data ? res.data.length : 0);
      } catch (error) {
        console.error('获取历史报警失败', error);
        this.$message.error('获取历史报警数据失败');
        this.alarmHistoryList = [];
      }
    },

    // ===== 报警类型统计（重复报警归为一条，去重计数） =====
    // 拉取当前时间范围内报警记录（大页容），按类型去重统计
    async fetchAlarmStats() {
      if (this.alarmStatLoading) return;
      this.alarmStatLoading = true;
      try {
        const range = resolveQuickRange(this.filterData.quickRange, this.filterData.timeRange, this.formatDate);
        const hasRange = range && range.length === 2;
        const params = {
          start_time: hasRange ? range[0] : undefined,
          end_time: hasRange ? range[1] : undefined,
          page: 1,
          page_size: 1000
        };
        let res = await this.$http.get('/records/alarm/data', { params });
        res = unwrapData(res);
        const records = (res && res.data) || (Array.isArray(res) ? res : []);
        this.alarmStats = this.computeAlarmStats(records);
        this.alarmStatQueried = true;
      } catch (error) {
        console.error('获取报警统计失败', error);
        this.alarmStats = [];
        this.alarmStatQueried = true;
      } finally {
        this.alarmStatLoading = false;
      }
    },

    // 按报警文本关键词归类报警类型（高温/低温/压力/流量/水位/其他）
    classifyAlarmType(text) {
      const t = String(text || '');
      const rules = [
        { key: 'temp_high', label: '高温', re: /高温|超温|过热|温度过高|水温过高|温度偏高|温度上升/ },
        { key: 'temp_low', label: '低温', re: /低温|过冷|温度过低|水温过低|温度偏低|温度下降/ },
        { key: 'pressure', label: '压力异常', re: /压力|压强/ },
        { key: 'flow', label: '流量异常', re: /流量|流速/ },
        { key: 'level', label: '水位异常', re: /水位|液位|液面/ }
      ];
      for (const r of rules) {
        if (r.re.test(t)) return r;
      }
      return { key: 'other', label: '其他' };
    },

    // 计算各类型去重后的报警条数：报警内容 + 触发数值 + 来源 + 级别 完全相同的归为一条
    computeAlarmStats(records) {
      const list = Array.isArray(records) ? records : [];
      const seen = new Set();
      const counts = {};
      list.forEach(item => {
        const type = this.classifyAlarmType(item.alarm || item.src);
        const key = [item.alarm, this.alarmValue(item), item.src, item.level].join('__');
        if (seen.has(key)) return;
        seen.add(key);
        counts[type.key] = (counts[type.key] || 0) + 1;
      });
      const order = [
        { key: 'temp_high', label: '高温' },
        { key: 'temp_low', label: '低温' },
        { key: 'pressure', label: '压力异常' },
        { key: 'flow', label: '流量异常' },
        { key: 'level', label: '水位异常' }
      ];
      const cards = order.map(o => ({ key: o.key, label: o.label, count: counts[o.key] || 0 }));
      if (counts.other) cards.push({ key: 'other', label: '其他', count: counts.other });
      return cards;
    },

    // ===== 报警上下限阈值（原配置页移入） =====
    // 加载当前传感器列表：本地用户配置 > 后端元数据 > 实时数据自动发现
    async loadSensorItems() {
      let items = loadLocalSensors()
      const deletedKeys = loadDeletedSensorKeys()

      const fields = await fetchSensorFields(this.$http)
      if (fields) {
        const apiItems = fieldsToSensorItems(fields)
        if (apiItems && apiItems.length) {
          // 以后端元数据为权威：后端已删除的字段剔除，新增的补入，用户改过的名称/单位保留
          items = reconcileByBackend(items, apiItems, deletedKeys)
        }
      }

      if (!items || !items.length) {
        items = SENSOR_DEFS.map(s => ({ key: s.key, label: s.label, unit: s.unit }))
      }
      this.sensorItems = items
      localStorage.setItem('iot_water_sensors', JSON.stringify(items))
      this.loadThresholdFields()
    },

    defaultThreshold(field) {
      if (/^temp/.test(field)) return { max: 60, min: 5 }
      if (field === 'pressure') return { max: 150, min: 20 }
      if (field === 'flow') return { max: 5, min: 0.2 }
      return { max: 100, min: 0 }
    },

    // 单位 → 输入步长与精度
    thresholdMeta(unit) {
      if (unit === '℃') return { step: 0.5, precision: 1 }
      if (unit === 'kPa') return { step: 1, precision: 0 }
      if (unit === 'L/min') return { step: 0.1, precision: 1 }
      return { step: 1, precision: 1 }
    },

    // 从传感器列表生成阈值字段（首次无持久化数据时使用）
    seedThresholdFields() {
      return this.sensorItems.map(s => {
        const p = this.thresholdMeta(s.unit)
        return { field: s.key, label: s.label, unit: s.unit, step: p.step, precision: p.precision }
      })
    },

    // 加载可编辑的阈值字段列表：优先读本地持久化，首次则从传感器列表初始化，
    // 并自动并入实时数据/元数据中新出现的传感器字段（除非被用户显式删除过）
    loadThresholdFields() {
      let list = null
      try {
        const raw = localStorage.getItem('iot_water_threshold_fields')
        if (raw !== null) list = JSON.parse(raw)
      } catch (e) { /* 解析失败走初始化 */ }
      if (!Array.isArray(list)) {
        list = this.seedThresholdFields()
      }
      // 以当前传感器列表为权威，同步已有阈值字段的名称/单位/步长精度：
      // 用户在主页改过传感器名称或后端元数据更新后，缓存里的旧标签会与实时数据对不上，
      // 这里按 field(key) 对齐，保证报警页显示名 == 主页实时传感器名。
      // 用户在「添加阈值」里单独录入的字段（key 不在传感器列表中）保留其自定义标签。
      const sensorMap = {}
      this.sensorItems.forEach(s => { if (s && s.key) sensorMap[s.key] = s })
      list.forEach(f => {
        const s = sensorMap[f.field]
        if (!s) return
        f.label = s.label
        f.unit = s.unit
        const p = this.thresholdMeta(s.unit)
        f.step = p.step
        f.precision = p.precision
      })
      const existing = new Set(list.map(f => f.field))
      const deleted = new Set(this.loadDeletedThresholdFields())
      this.sensorItems.forEach(s => {
        if (!existing.has(s.key) && !deleted.has(s.key)) {
          const p = this.thresholdMeta(s.unit)
          list.push({ field: s.key, label: s.label, unit: s.unit, step: p.step, precision: p.precision })
        }
      })
      this.thresholdFields = list
      this.persistThresholdFields()
      this.ensureThresholdDefaults()
    },

    loadDeletedThresholdFields() {
      try {
        const raw = localStorage.getItem('iot_water_threshold_fields_deleted')
        if (raw) {
          const arr = JSON.parse(raw)
          if (Array.isArray(arr)) return arr
        }
      } catch (e) { /* 忽略 */ }
      return []
    },

    addDeletedThresholdField(field) {
      const list = this.loadDeletedThresholdFields()
      if (!list.includes(field)) {
        list.push(field)
        localStorage.setItem('iot_water_threshold_fields_deleted', JSON.stringify(list))
      }
    },

    removeDeletedThresholdField(field) {
      const list = this.loadDeletedThresholdFields().filter(f => f !== field)
      localStorage.setItem('iot_water_threshold_fields_deleted', JSON.stringify(list))
    },

    persistThresholdFields() {
      localStorage.setItem('iot_water_threshold_fields', JSON.stringify(this.thresholdFields))
    },

    ensureThresholdDefaults() {
      this.thresholdFields.forEach(f => {
        const maxKey = f.field + '_max'
        const minKey = f.field + '_min'
        const d = this.defaultThreshold(f.field)
        if (this.thresholds[maxKey] === undefined || this.thresholds[maxKey] === null) {
          this.$set(this.thresholds, maxKey, d.max)
        }
        if (this.thresholds[minKey] === undefined || this.thresholds[minKey] === null) {
          this.$set(this.thresholds, minKey, d.min)
        }
      })
    },

    // 打开添加阈值弹窗（重置表单）
    openThresholdAdd() {
      this.thresholdForm = { field: '', label: '', unit: '℃', max: 60, min: 5 }
      this.thresholdAddVisible = true
    },

    // 新增一条阈值
    addThreshold() {
      const f = this.thresholdForm
      const field = (f.field || '').trim()
      if (!field) {
        this.$message.warning('请填写字段名');
        return;
      }
      if (this.thresholdFields.some(t => t.field === field)) {
        this.$message.warning('该字段已存在阈值');
        return;
      }
      const p = this.thresholdMeta(f.unit || '')
      this.thresholdFields.push({
        field,
        label: (f.label || '').trim() || field,
        unit: f.unit || '',
        step: p.step,
        precision: p.precision
      })
      this.$set(this.thresholds, field + '_max', f.max)
      this.$set(this.thresholds, field + '_min', f.min)
      // 若该字段此前被删除过，重新添加时从黑名单移除，避免下次加载又被过滤掉
      this.removeDeletedThresholdField(field)
      this.persistThresholdFields()
      this.thresholdAddVisible = false
      this.$message.success('阈值已添加，点击【保存阈值】写入后端');
    },

    // 删除一条阈值
    removeThreshold(field) {
      this.$confirm(`确定删除「${field}」的报警上下限吗？`, '提示', { type: 'warning' })
        .then(() => {
          this.thresholdFields = this.thresholdFields.filter(t => t.field !== field)
          this.$delete(this.thresholds, field + '_max')
          this.$delete(this.thresholds, field + '_min')
          // 记录到删除黑名单，避免刷新后又被实时数据自动加回
          this.addDeletedThresholdField(field)
          this.persistThresholdFields()
          this.$message.success('已删除，点击【保存阈值】写入后端');
        }).catch(() => {});
    },

    async fetchThresholds() {
      try {
        let res = await this.$http.get('/config/thresholds');
        res = unwrapData(res);
        if (res && typeof res === 'object' && !Array.isArray(res)) {
          const parsed = {};
          Object.keys(res).forEach(k => {
            const v = parseFloat(res[k]);
            parsed[k] = isNaN(v) ? res[k] : v;
          });
          this.thresholds = { ...this.thresholds, ...parsed };
          localStorage.setItem('iot_water_thresholds', JSON.stringify(this.thresholds));
        }
      } catch (error) {
        console.error('获取阈值配置失败', error);
      }
    },

    async saveThresholds() {
      try {
        // 只提交当前阈值字段列表对应的上下限，避免残留已删除字段的旧值
        const payload = {}
        this.thresholdFields.forEach(f => {
          payload[f.field + '_max'] = this.thresholds[f.field + '_max']
          payload[f.field + '_min'] = this.thresholds[f.field + '_min']
        })
        const res = await this.$http.post('/config/thresholds', payload);
        if (res.code === 0) {
          localStorage.setItem('iot_water_thresholds', JSON.stringify(payload));
          this.$message.success(res.msg || '报警上下限阈值已保存');
        } else {
          this.$message.error(res.msg || '保存失败');
        }
      } catch (error) {
        this.$message.error('保存阈值请求失败');
      }
    },

    handleQuery() {
      this.filterData.page = 1;
      this.hasQueried = true;
      this.fetchAlarmHistory();
      // 类型统计与查询使用同一时间范围，查询时同步刷新
      this.fetchAlarmStats();
    },

    changePage(val) {
      this.filterData.page += val;
      this.fetchAlarmHistory();
    },

    getBannerClass() {
      if (this.activeAlarms.length === 0) return 'banner-normal';
      const hasDanger = this.activeAlarms.some(a => a.level === 'danger');
      return hasDanger ? 'banner-danger' : 'banner-warning';
    },

    getLevelClass(level) {
      if (level === 'danger') return 'level-danger';
      if (level === 'warning') return 'level-warning';
      return 'level-info';
    },

    getLevelText(level) {
      if (level === 'danger') return '严重';
      if (level === 'warning') return '警告';
      return '提示';
    },

    // 告警来源文案（后端 src 取值：safety/rule/ai/judge/watchdog/manual/recovery）
    getSrcText(src) {
      const map = {
        safety: '安全保护',
        rule: '规则引擎',
        ai: 'AI判定',
        judge: '判定服务',
        watchdog: '看门狗',
        manual: '手动控制',
        recovery: '恢复'
      };
      return map[src] || '阈值判定';
    },

    // 告警来源样式：safety 安全保护红色高亮，视觉优先级最高
    getSrcClass(src) {
      if (src === 'safety') return 'src-safety';
      if (src === 'rule' || src === 'judge' || src === 'watchdog') return 'src-rule';
      if (src === 'manual') return 'src-manual';
      if (src === 'recovery') return 'src-recovery';
      return 'src-threshold';
    },

    formatDate(date) {
      const pad = (n) => n < 10 ? '0' + n : n;
      return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    }
  }
}
</script>

<style scoped>
/* 实时报警横幅样式 */
.realtime-alarm-banner {
  display: flex;
  align-items: center;
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 14px;
  border: 1px solid;
  transition: all 0.3s;
}

.banner-normal {
  background: rgba(103, 194, 58, 0.08);
  border-color: rgba(103, 194, 58, 0.3);
}

.banner-warning {
  background: rgba(230, 162, 60, 0.08);
  border-color: rgba(230, 162, 60, 0.3);
  animation: pulse 2s infinite;
}

.banner-danger {
  background: rgba(245, 108, 108, 0.08);
  border-color: rgba(245, 108, 108, 0.3);
  animation: pulse 1s infinite;
}

/* 闪烁动画，提醒注意 */
@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(245, 108, 108, 0.25); }
  70% { box-shadow: 0 0 0 10px rgba(245, 108, 108, 0); }
  100% { box-shadow: 0 0 0 0 rgba(245, 108, 108, 0); }
}

.banner-icon {
  font-size: 28px;
  margin-right: 16px;
}

.banner-content {
  flex: 1;
}

.banner-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
}

.banner-normal .banner-title { color: #67c23a; }
.banner-warning .banner-title { color: #e6a23c; }
.banner-danger .banner-title { color: #f56c6c; }

.banner-desc {
  font-size: 13px;
  color: #606266;
}

/* 表格中报警内容样式 */
.alarm-content {
  text-align: left;
  padding-left: 10px;
}

/* 已处理标签 */
.handled-tag {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  background: rgba(103, 194, 58, 0.12);
  color: #67c23a;
  white-space: nowrap;
}

/* 级别标签样式 */
.level-tag {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.level-danger {
  background: rgba(245, 108, 108, 0.12);
  color: #f56c6c;
}

.level-warning {
  background: rgba(230, 162, 60, 0.12);
  color: #e6a23c;
}

.level-info {
  background: rgba(144, 147, 153, 0.12);
  color: #909399;
}

/* 告警来源标签样式 */
.src-tag {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.src-safety {
  background: rgba(245, 108, 108, 0.15);
  color: #f56c6c;
  border: 1px solid rgba(245, 108, 108, 0.4);
}

.src-rule {
  background: rgba(20, 184, 166, 0.12);
  color: #14b8a6;
}

.src-manual {
  background: rgba(59, 130, 246, 0.12);
  color: #3b82f6;
}

.src-recovery {
  background: rgba(103, 194, 58, 0.12);
  color: #67c23a;
}

.src-threshold {
  background: rgba(230, 162, 60, 0.12);
  color: #e6a23c;
}

/* 筛选表单样式 */
.filter-form {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  align-items: center;
}

.form-item {
  display: flex;
  align-items: center;
  gap: 5px;
}

/* 时间范围项独占整行，宽度自适应 */
.time-range-item {
  flex-basis: 100%;
}
.time-range-item .roll-time-range-picker {
  flex: 1;
  min-width: 0;
}

.label {
  font-size: 12px;
  color: #606266;
}

/* 关键词搜索项 */
.keyword-item {
  flex-basis: 100%;
}

/* 阈值字段列表 */
.threshold-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.threshold-row {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #f5f7fa;
  padding: 8px 12px;
  border-radius: 10px;
  flex-wrap: wrap;
}

.t-label {
  font-size: 12px;
  color: #606266;
  min-width: 90px;
}

.t-inputs {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.t-bound {
  font-size: 12px;
  color: #909399;
}

/* 添加阈值弹窗 */
.threshold-add-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ta-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ta-label {
  font-size: 12px;
  color: #606266;
  width: 60px;
  flex-shrink: 0;
}

/* 报警类型统计卡片 */
.alarm-stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
}

.alarm-stat-card {
  background: #f5f7fa;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 14px 12px;
  text-align: center;
}

.alarm-stat-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 6px;
}

.alarm-stat-value {
  font-size: 22px;
  font-weight: bold;
  color: #14b8a6;
}

.alarm-stat-value .unit {
  font-size: 12px;
  color: #909399;
  font-weight: normal;
  font-style: normal;
  margin-left: 2px;
}

/* 各类型计数配色 */
.alarm-stat-card--temp_high .alarm-stat-value { color: #f56c6c; }
.alarm-stat-card--temp_low .alarm-stat-value { color: #3b82f6; }
.alarm-stat-card--pressure .alarm-stat-value { color: #e6a23c; }
.alarm-stat-card--flow .alarm-stat-value { color: #14b8a6; }
.alarm-stat-card--level .alarm-stat-value { color: #7c3aed; }
.alarm-stat-card--other .alarm-stat-value { color: #909399; }

.alarm-stat-empty {
  text-align: center;
  color: #909399;
  padding: 12px;
  font-size: 12px;
}

.pagination {
  margin-top: 15px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  font-size: 12px;
  color: #909399;
}

@media (max-width: 640px) {
  .threshold-row {
    align-items: flex-start;
  }
  .t-inputs {
    flex-basis: 100%;
  }
}

/* ===== 响应式：手机端显示卡片，隐藏表格 ===== */
.mobile-only { display: none; }
.desktop-only { display: block; }

@media (max-width: 640px) {
  .desktop-only { display: none !important; }
  .mobile-only { display: block !important; }

  /* 报警卡片 */
  .alarm-card {
    background: #fafbfc;
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 14px;
    margin-bottom: 10px;
  }
  .alarm-card-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 5px 0;
    font-size: 13px;
  }
  .alarm-card-label {
    color: var(--text-2);
    flex-shrink: 0;
    margin-right: 12px;
  }
  .alarm-card-value {
    color: var(--text-1);
    font-weight: 500;
    text-align: right;
    max-width: 60%;
    word-break: break-all;
  }
  .alarm-card-content {
    font-size: 12px;
  }
  .alarm-card-handle {
    justify-content: flex-end;
    margin-top: 6px;
    padding-top: 8px;
    border-top: 1px dashed var(--border);
  }
  .alarm-card--empty {
    text-align: center;
    color: var(--text-3);
    padding: 30px 14px;
  }

  /* 筛选区竖排 */
  .filter-form {
    flex-direction: column;
    align-items: stretch;
  }
  .form-item {
    width: 100%;
  }
  .form-actions {
    width: 100%;
    margin-top: 4px;
  }
  .form-actions .el-button {
    flex: 1;
  }

  /* 分页按钮放大 */
  .pagination .el-button {
    padding: 8px 14px;
    font-size: 14px;
  }
}
</style>
