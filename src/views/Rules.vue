<template>
  <div class="config-page">

    <!-- 智能判定结果（实时展示） -->
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

    <!-- 智能判定设置 -->
    <div class="card-box">
      <div class="card-title">智能判定设置</div>
      <div class="judge-config">
        <div class="config-row">
          <span class="c-label">判定服务地址(URL):</span>
          <el-input v-model="systemConfig.judge_url" size="mini" placeholder="例如: http://127.0.0.1:5000/judge" style="flex: 1; min-width: 160px;"></el-input>
          <el-button type="primary" size="mini" @click="saveSystemConfig">保存</el-button>
        </div>
        <div class="config-row">
          <span class="c-label">手动调用判定服务:</span>
          <el-button type="warning" size="mini" @click="manualJudge">立即调用</el-button>
          <el-button type="danger" size="mini" plain @click="resetAiStatus">重置AI检测状态</el-button>
        </div>
        <div class="config-row">
          <span class="c-label">判定字段映射(judge_payload_map):</span>
          <el-input v-model="systemConfig.judge_payload_map" type="textarea" :rows="2" placeholder='如 {"temperature":"temp1","flow_rate":"flow"}' style="flex:1;"></el-input>
        </div>
      </div>
    </div>

    <!-- 规则引擎配置 -->
    <div class="card-box">
      <div class="card-title">
        安全联锁配置（温度闭环）
        <el-button size="mini" type="primary" plain style="margin-left: auto;" @click="openRuleEdit(-1)"><svg-icon name="plus" :size="14"/>添加规则</el-button>
        <el-button size="mini" type="primary" style="margin-left: 10px;" @click="saveRules">保存规则</el-button>
      </div>
      <!-- 桌面端：表格 -->
      <div class="desktop-only" v-if="rules.length">
        <div class="table-scroll">
          <table class="custom-table">
            <thead>
              <tr>
                <th>规则ID</th>
                <th>报警提示</th>
                <th>级别</th>
                <th>优先级</th>
                <th>触发条件</th>
                <th>执行动作</th>
                <th>死区</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(rule, index) in rules" :key="index">
                <td>{{ rule.id || '-' }}</td>
                <td>{{ rule.alarm || '-' }}</td>
                <td><span class="status-tag" :class="rule.level === 'danger' ? 'status-danger' : 'status-warn'">{{ levelText(rule.level) }}</span></td>
                <td>{{ priorityText(rule) }}</td>
                <td>{{ checksText(rule) }}</td>
                <td>{{ actionText(rule) }}</td>
                <td>{{ rule.deadband !== undefined && rule.deadband !== null ? rule.deadband : '-' }}</td>
                <td>
                  <el-button size="mini" type="text" @click="openRuleEdit(index)">编辑</el-button>
                  <el-button size="mini" type="text" style="color: #f56c6c;" @click="removeRule(index)">删除</el-button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <!-- 移动端：卡片 -->
      <div class="mobile-only" v-if="rules.length">
        <div class="rule-card" v-for="(rule, index) in rules" :key="index">
          <div class="rule-card-row">
            <span class="rule-card-label">规则ID</span>
            <span class="rule-card-value">{{ rule.id || '-' }}</span>
          </div>
          <div class="rule-card-row">
            <span class="rule-card-label">报警提示</span>
            <span class="rule-card-value">{{ rule.alarm || '-' }}</span>
          </div>
          <div class="rule-card-row">
            <span class="rule-card-label">级别</span>
            <span class="status-tag" :class="rule.level === 'danger' ? 'status-danger' : 'status-warn'">{{ levelText(rule.level) }}</span>
          </div>
          <div class="rule-card-row">
            <span class="rule-card-label">优先级</span>
            <span class="rule-card-value">{{ priorityText(rule) }}</span>
          </div>
          <div class="rule-card-row">
            <span class="rule-card-label">触发条件</span>
            <span class="rule-card-value">{{ checksText(rule) }}</span>
          </div>
          <div class="rule-card-row">
            <span class="rule-card-label">执行动作</span>
            <span class="rule-card-value">{{ actionText(rule) }}</span>
          </div>
          <div class="rule-card-row">
            <span class="rule-card-label">死区</span>
            <span class="rule-card-value">{{ rule.deadband !== undefined && rule.deadband !== null ? rule.deadband : '-' }}</span>
          </div>
          <div class="rule-card-actions">
            <el-button size="mini" type="text" @click="openRuleEdit(index)">编辑</el-button>
            <el-button size="mini" type="text" style="color: #f56c6c;" @click="removeRule(index)">删除</el-button>
          </div>
        </div>
      </div>
      <div v-if="!rules.length" style="text-align: center; color: #909399; padding: 20px; font-size: 12px;">
        暂无规则，点击【添加规则】新建
      </div>
    </div>

    <!-- 判定记录查询 -->
    <div class="card-box">
      <div class="card-title">判定记录查询<span class="count" v-if="judgeQueried">（共 {{ total }} 条）</span></div>
      <div class="filter-form">
        <div class="form-item">
          <span class="label">监测单元:</span>
          <el-select v-model="judgeFilterData.tankId" size="mini" placeholder="全部" style="width: 130px" clearable>
            <el-option v-for="t in tankOptions" :key="t.value" :label="t.label" :value="t.value"></el-option>
          </el-select>
        </div>
        <div class="form-item">
          <span class="label">快捷时间:</span>
          <el-select v-model="judgeFilterData.quickRange" size="mini" style="width: 130px">
            <el-option label="自定义" value="custom"></el-option>
            <el-option label="最近15分钟" value="15m"></el-option>
            <el-option label="最近30分钟" value="30m"></el-option>
            <el-option label="最近1小时" value="1h"></el-option>
          </el-select>
        </div>
        <div class="form-item time-range-item" v-show="judgeFilterData.quickRange === 'custom'">
          <span class="label">时间范围:</span>
          <roll-time-range-picker v-model="judgeFilterData.timeRange"></roll-time-range-picker>
        </div>
        <el-button type="primary" size="mini" @click="handleJudgeQuery">查 询</el-button>
      </div>

      <!-- 展开行表格，展示上传数据和返回结果的完整 JSON -->
      <div class="table-scroll">
        <table class="custom-table" style="margin-top: 15px;">
          <thead>
            <tr>
              <th width="160">调用时间</th>
              <th width="120">判定状态</th>
              <th width="140">建议动作</th>
              <th>上传数据摘要 (点击行查看详情)</th>
            </tr>
          </thead>
          <tbody v-for="(item, index) in judgeHistoryList" :key="index">
            <tr @click="toggleExpand(index)" class="clickable-row">
              <td>{{ item.time }}</td>
              <td>
                <span class="status-tag" :class="getJudgeStatusClass(item.status)">
                  {{ getJudgeStatusText(item.status) }}
                </span>
              </td>
              <td>{{ item.action || '无' }}</td>
              <td>
                T1:{{ item.payload && item.payload.temp1 }}℃, T2:{{ item.payload && item.payload.temp2 }}℃, P:{{ item.payload && item.payload.pressure }}, F:{{ item.payload && item.payload.flow }}
                <svg-icon :name="expandedRows.includes(index) ? 'arrow-up' : 'arrow-down'" :size="14" style="margin-left: 10px;"></svg-icon>
              </td>
            </tr>
            <tr v-if="expandedRows.includes(index)">
              <td colspan="4" class="expand-cell">
                <div class="json-wrap">
                  <div class="json-col">
                    <div class="json-title">上传的 Payload:</div>
                    <pre class="json-block">{{ JSON.stringify(item.payload, null, 2) }}</pre>
                  </div>
                  <div class="json-col">
                    <div class="json-title">返回的 Result:</div>
                    <pre class="json-block">{{ JSON.stringify(item.result, null, 2) }}</pre>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
          <tbody v-if="judgeHistoryList.length === 0">
            <tr>
              <td colspan="4" style="text-align: center; padding: 20px;">
                {{ judgeQueried ? '暂无判定记录' : '点击【查 询】获取判定记录' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 规则编辑弹窗 -->
    <el-dialog title="编辑规则" :visible.sync="ruleEditVisible" width="94%" :modal-append-to-body="true">
      <div class="rule-edit-body">
        <div class="rule-field-row">
          <span class="c-label">规则ID:</span>
          <el-input v-model="editRule.id" size="mini" placeholder="如 rule_low_temp2" style="width: 220px;"></el-input>
        </div>
        <div class="rule-field-row">
          <span class="c-label">报警提示:</span>
          <el-input v-model="editRule.alarm" size="mini" placeholder="如 水槽2低温" style="width: 220px;"></el-input>
        </div>
        <div class="rule-field-row">
          <span class="c-label">告警级别:</span>
          <el-select v-model="editRule.level" size="mini" style="width: 120px;">
            <el-option label="提醒" value="warning"></el-option>
            <el-option label="严重" value="danger"></el-option>
            <el-option label="提示" value="info"></el-option>
          </el-select>
          <span class="c-label" style="margin-left: 16px;">死区(deadband):</span>
          <el-input-number v-model="editRule.deadband" size="mini" :min="0" :precision="1" :controls="false" placeholder="可选"></el-input-number>
        </div>
        <div class="rule-field-row">
          <span class="c-label">优先级:</span>
          <el-input-number v-model="editRule.priority" size="mini" :min="0" :step="1" :controls="false" placeholder="100"></el-input-number>
          <span class="c-hint">数值越小越先执行、冲突时越优先（默认 100）</span>
        </div>

        <div class="rule-section-title">触发条件</div>
        <rule-condition-group :group="editRule.condition" :field-options="fieldOptions" :op-options="opOptions" />

        <div class="rule-section-title">执行动作 (action)</div>
        <div class="rule-field-row" v-for="device in actuatorOptions" :key="device.key">
          <span class="c-label" style="width: 60px;">{{ device.label }}:</span>
          <el-select v-model="editRule.action[device.key]"
                     size="mini" clearable placeholder="不控制" style="width: 120px; margin-right: 8px;">
            <el-option label="关闭" :value="0"></el-option>
            <el-option label="开启" :value="1"></el-option>
          </el-select>
        </div>
        <div class="rule-field-row" style="margin-top: 10px;">
          <span class="c-label">动作说明:</span>
          <el-input v-model="editRule.action.message" size="mini" placeholder="如 启动加热" style="width: 260px;"></el-input>
        </div>
      </div>
      <span slot="footer">
        <el-button size="mini" @click="ruleEditVisible = false">取消</el-button>
        <el-button size="mini" type="primary" @click="saveRuleItem">确定</el-button>
      </span>
    </el-dialog>

  </div>
</template>

<script>
import { SENSOR_DEFS, fetchSensorFields, fieldsToSensorItems, fieldsToDeviceItems, reconcileByBackend, loadLocalSensors, loadDeletedSensorKeys } from '../utils/sensors';
import { unwrapData } from '../utils/request';
import { resolveQuickRange } from '../utils/quickRange';
import RollTimeRangePicker from '../components/RollTimeRangePicker.vue';
import RuleConditionGroup from '../components/RuleConditionGroup.vue';

export default {
  name: 'RulesPage',
  components: { RollTimeRangePicker, RuleConditionGroup },
  data() {
    return {
      // 当前传感器列表（规则引擎可选字段的显示来源）
      sensorItems: SENSOR_DEFS.map(s => ({ key: s.key, label: s.label, unit: s.unit })),

      // 智能判定设置
      systemConfig: {
        judge_url: 'http://127.0.0.1:5000/judge',
        judge_payload_map: ''
      },

      // 判定记录查询
      judgeFilterData: {
        timeRange: [],
        quickRange: 'custom',
        tankId: '',
        page: 1,
        page_size: 15
      },
      judgeHistoryList: [],
      expandedRows: [],
      judgeQueried: false,
      total: 0,

      // 规则引擎配置
      rules: [],
      ruleEditVisible: false,
      editingRuleIndex: -1,
      editRule: {
        id: '',
        alarm: '',
        level: 'warning',
        priority: null,
        deadband: null,
        condition: { logic: 'and', checks: [] },
        action: { message: '' }
      },
      fieldOptions: [],
      actuatorOptions: [],
      opOptions: ['>', '<', '>=', '<=', '==', '!='],

      // 智能判定结果（实时展示卡）
      judgeResult: {
        time: '--',
        status: 'normal',
        message: '等待数据...',
        action: 'none'
      },
      judgeTimer: null
    }
  },
  computed: {
    // 监测单元（水槽）选项：从本地持久化水槽列表读取
    tankOptions() {
      const list = []
      try {
        const raw = localStorage.getItem('iot_water_tanks')
        if (raw) {
          const arr = JSON.parse(raw)
          if (Array.isArray(arr) && arr.length) {
            arr.forEach(t => list.push({ value: String(t.id), label: t.name }))
          }
        }
      } catch (e) { /* 解析失败用默认 */ }
      if (!list.length) {
        list.push({ value: '01', label: '水槽 01' })
        list.push({ value: '02', label: '水槽 02' })
      }
      return list
    }
  },
  mounted() {
    // 初始化默认时间范围
    const end = new Date();
    const start = new Date(end.getTime() - 24 * 3600 * 1000);
    this.judgeFilterData.timeRange = [this.formatDate(start), this.formatDate(end)];

    this.fetchSystemConfig();
    this.fetchRules();
    this.loadSensorItems();
    // 智能判定结果：首次拉取 + 每 5 秒轮询刷新
    this.fetchJudgeResult();
    this.judgeTimer = setInterval(() => this.fetchJudgeResult(), 5000);
    // 判定记录不再自动查询，等待用户点击【查 询】
  },
  beforeDestroy() {
    if (this.judgeTimer) {
      clearInterval(this.judgeTimer)
    }
  },
  methods: {
    // 加载当前传感器列表：本地用户配置 > 后端元数据 > 实时数据自动发现
    // 以「实时监测」页维护的 iot_water_sensors 为权威来源，保证增删改同步到阈值/规则
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
      // 规则引擎字段同步更新：传感器字段 + 执行器字段（以后端元数据为权威）
      this.fieldOptions = items.map(s => s.key)
      const devFields = fieldsToDeviceItems(fields) || []
      this.actuatorOptions = devFields.map(d => ({ key: d.key, label: d.label }))
    },

    // 获取系统配置（仅判定服务相关键）
    async fetchSystemConfig() {
      try {
        let res = await this.$http.get('/config/all');
        res = unwrapData(res);
        let map = null;
        if (Array.isArray(res)) {
          map = {};
          res.forEach(item => {
            if (item && item.key !== undefined && item.key !== null) map[item.key] = item.value;
          });
        } else if (res && typeof res === 'object') {
          map = res;
        }
        if (!map) return;
        const judgeUrl = map.judge_url;
        if (judgeUrl) this.systemConfig.judge_url = judgeUrl;
        const jpm = map.judge_payload_map;
        if (jpm && typeof jpm === 'object') {
          this.systemConfig.judge_payload_map = JSON.stringify(jpm);
        }
      } catch (error) {
        console.error('获取系统配置失败', error);
      }
    },

    // 保存系统配置
    async saveSystemConfig() {
      try {
        const payload = { judge_url: this.systemConfig.judge_url }
        if (this.systemConfig.judge_payload_map) {
          try {
            payload.judge_payload_map = JSON.parse(this.systemConfig.judge_payload_map)
          } catch (e) {
            this.$message.warning('judge_payload_map 不是合法 JSON，已忽略')
          }
        }
        const res = await this.$http.post('/config/save', payload);
        if (res.code === 0) {
          this.$message.success(res.msg || '判定服务地址已保存');
        } else {
          this.$message.error(res.msg || '保存失败');
        }
      } catch (error) {
        this.$message.error('保存请求失败');
      }
    },

    // 手动调用智能判定
    async manualJudge() {
      try {
        const payload = {
          temp1: 62,
          temp2: 40,
          pressure: 105,
          flow: 1.8
        };
        const res = await this.$http.post('/monitor/judge', payload);
        if (res && res.code === 0) {
          const d = (res && res.data) || {};
          this.$message.success(`判定完成：${this.getJudgeStatusText(d.status)}，动作：${d.action || '无'}`);
          // 刷新判定记录
          this.judgeQueried = true;
          this.fetchJudgeHistory();
        } else {
          this.$message.error((res && res.msg) || '调用判定服务失败');
        }
      } catch (error) {
        this.$message.error('调用判定服务请求失败');
      }
    },

    // 重置 AI 检测状态
    async resetAiStatus() {
      try {
        const res = await this.$http.post('/system/ai-reset');
        if (res.code === 0) {
          this.$message.success(res.msg || 'AI检测状态已重置');
        } else {
          this.$message.error(res.msg || '重置失败');
        }
      } catch (error) {
        this.$message.error('重置请求失败');
      }
    },

    // ===== 智能判定结果（从实时监测首页迁入） =====
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
      const s = String(action).trim()
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
    // 执行器字段 → 中文名（优先用后端执行器元数据，兜底常见映射）
    actuatorName(key) {
      const d = (this.actuatorOptions || []).find(x => x.key === key)
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

    // ===== 规则引擎配置 =====
    // 获取规则引擎配置 (对应接口 GET /config/rules)
    async fetchRules() {
      try {
        let res = await this.$http.get('/config/rules');
        res = unwrapData(res);
        this.rules = Array.isArray(res) ? res.map(r => this.normalizeRule(r)) : [];
        this.sortRules();
      } catch (error) {
        console.error('获取规则失败', error);
      }
    },

    // 规则列表按 priority 升序展示（数值小者先执行，缺省按 100）
    sortRules() {
      this.rules.sort((a, b) => {
        const pa = (a.priority === undefined || a.priority === null || a.priority === '') ? 100 : Number(a.priority);
        const pb = (b.priority === undefined || b.priority === null || b.priority === '') ? 100 : Number(b.priority);
        return pa - pb;
      });
    },

    priorityText(rule) {
      const p = rule.priority;
      if (p === undefined || p === null || p === '') return '100';
      return p;
    },

    // 兼容 v6.1 格式（checks 为数组的数组）与动态格式（checks 为对象数组），支持嵌套分组
    normalizeRule(rule) {
      const r = JSON.parse(JSON.stringify(rule));
      if (!r.condition) r.condition = { checks: [] };
      r.condition = this.normalizeCondition(r.condition);
      if (!r.action) r.action = {};
      if (r.priority === undefined || r.priority === null || r.priority === '') r.priority = 100;
      return r;
    },

    // 递归归一化条件结构：叶子 {field,op,value}，分组 {logic,checks}，兼容旧数组 [field,op,value]
    normalizeCondition(cond) {
      const c = cond && typeof cond === 'object' ? cond : { checks: [] };
      if (!Array.isArray(c.checks)) c.checks = [];
      c.logic = c.logic === 'or' ? 'or' : 'and';
      c.checks = c.checks.map(node => {
        if (node && Array.isArray(node.checks)) {
          const sub = this.normalizeCondition(node);
          if (!sub._uid) sub._uid = this.genConditionUid();
          return sub;
        }
        if (Array.isArray(node)) {
          node = { field: node[0], op: node[1], value: node[2] };
        }
        const leaf = { field: node.field, op: node.op, value: node.value };
        if (!leaf._uid) leaf._uid = this.genConditionUid();
        return leaf;
      });
      return c;
    },

    genConditionUid() {
      return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
    },

    // 递归清理提交前条件里的前端内部 _uid，并数值化 value（后端比较时要求数字）
    deepCleanRule(rule) {
      const r = JSON.parse(JSON.stringify(rule))
      if (r.condition && typeof r.condition === 'object') {
        delete r.condition._uid
        const strip = (cond) => {
          delete cond._uid
          const checks = cond.checks || []
          cond.checks = checks.filter(Boolean).map(node => {
            if (node && Array.isArray(node.checks)) return strip(node)
            if (node) {
              delete node._uid
              const num = Number(node.value)
              if (node.value !== undefined && node.value !== null && node.value !== '' && !isNaN(num)) {
                node.value = num
              }
            }
            return node
          })
          return cond
        }
        r.condition = strip(r.condition)
      }
      return r
    },

    // 保存规则引擎配置 (对应接口 POST /config/rules)
    async saveRules() {
      try {
        // 提交前深拷贝并剔除所有 _uid 字段，避免后端解析到多余字段
        const payload = (this.rules || []).map(r => this.deepCleanRule(r));
        const res = await this.$http.post('/config/rules', payload);
        if (res.code === 0) {
          this.$message.success(res.msg || '规则已保存');
        } else {
          this.$message.error(res.msg || '保存失败');
        }
      } catch (error) {
        this.$message.error('保存规则失败');
      }
    },

    openRuleEdit(index) {
      if (index < 0) {
        this.editRule = {
          id: '',
          alarm: '',
          level: 'warning',
          priority: null,
          deadband: null,
          condition: { logic: 'and', checks: [{ field: '', op: '>', value: '' }] },
          action: { message: '' }
        };
        this.editRule.condition = this.normalizeCondition(this.editRule.condition);
        this.editingRuleIndex = -1;
      } else {
        this.editRule = JSON.parse(JSON.stringify(this.rules[index]));
        this.editRule.condition = this.normalizeCondition(this.editRule.condition || { checks: [] });
        if (!this.editRule.condition.checks.length) {
          this.editRule.condition.checks.push({ field: '', op: '>', value: '', _uid: this.genConditionUid() });
        }
        if (this.editRule.priority === undefined || this.editRule.priority === null) this.editRule.priority = null;
        if (!this.editRule.action) this.editRule.action = { message: '' };
        this.editingRuleIndex = index;
      }
      this.ruleEditVisible = true;
    },

    saveRuleItem() {
      const rule = this.editRule;
      if (!rule.id || !rule.id.trim()) {
        this.$message.warning('请填写规则ID');
        return;
      }
      rule.id = rule.id.trim();
      // 规则 id 必填且唯一（编辑时排除自身）
      const dup = this.rules.some((r, i) => i !== this.editingRuleIndex && r.id === rule.id);
      if (dup) {
        this.$message.warning('规则ID已存在，请更换唯一ID');
        return;
      }
      // 递归清理条件（过滤空叶子/空分组，数值化 value，剔除内部 _uid）
      const cleaned = this.cleanCondition(rule.condition);
      if (!cleaned.checks.length) {
        this.$message.warning('请至少添加一个触发条件');
        return;
      }
      rule.condition = cleaned;
      // 构建 action（动态遍历所有执行器字段，保留 message）
      const action = {};
      (this.actuatorOptions || []).forEach(d => {
        const v = rule.action[d.key]
        if (v === 0 || v === 1) action[d.key] = v
      })
      if (rule.action.message && rule.action.message.trim()) action.message = rule.action.message.trim();
      rule.action = action;
      // 清理空 deadband
      if (rule.deadband === null || rule.deadband === undefined || rule.deadband === '') {
        delete rule.deadband;
      }
      // priority 归一化：空值删除（后端默认 100），否则转为数字
      if (rule.priority === null || rule.priority === undefined || rule.priority === '') {
        delete rule.priority;
      } else {
        rule.priority = Number(rule.priority);
      }

      if (this.editingRuleIndex < 0) {
        this.rules.push(rule);
      } else {
        this.rules.splice(this.editingRuleIndex, 1, rule);
      }
      // 按优先级重排，保证列表展示顺序 = 后端执行顺序
      this.sortRules();
      this.ruleEditVisible = false;
      this.$message.success('规则已更新，点击【保存规则】后写入后端');
    },

    removeRule(index) {
      const rule = this.rules[index]
      const ruleId = rule && rule.id
      if (!ruleId) {
        this.$message.error('无法删除：规则ID缺失')
        return
      }
      this.$confirm('确定删除该规则吗？', '提示', { type: 'warning' })
        .then(async () => {
          try {
            const res = await this.$http.delete(`/config/rules/${encodeURIComponent(ruleId)}`)
            if (res && res.code === 0) {
              this.rules.splice(index, 1)
              this.$message.success(res.msg || '删除成功')
              this.fetchRules()
            } else {
              this.$message.error(res?.msg || '删除失败')
            }
          } catch (error) {
            this.$message.error('删除请求失败')
          }
        }).catch(() => {})
    },

    levelText(level) {
      const map = { warning: '提醒', danger: '严重', info: '提示' };
      return map[level] || level || '-';
    },

    checksText(rule) {
      const render = (cond) => {
        const logic = cond.logic === 'or' ? ' 或 ' : ' 且 ';
        return (cond.checks || []).map(node => {
          if (node && Array.isArray(node.checks)) {
            return '(' + render(node) + ')';
          }
          return `${node.field} ${node.op} ${node.value}`;
        }).join(logic);
      };
      const c = (rule.condition && typeof rule.condition === 'object') ? rule.condition : { checks: [] };
      return render(c) || '-';
    },

    // 递归清理条件：过滤空叶子/空分组、数值化 value、剔除前端内部 _uid
    cleanCondition(cond) {
      const c = { logic: cond.logic === 'or' ? 'or' : 'and', checks: [] };
      (cond.checks || []).forEach(node => {
        if (node && Array.isArray(node.checks)) {
          const sub = this.cleanCondition(node);
          if (sub.checks.length) c.checks.push(sub);
          return;
        }
        const field = node && node.field ? String(node.field).trim() : '';
        const op = node && node.op;
        const value = node && node.value;
        if (!field || !op || value === '' || value === undefined || value === null) return;
        const num = Number(value);
        c.checks.push({ field, op, value: isNaN(num) ? value : num });
      });
      return c;
    },

    actionText(rule) {
      const parts = [];
      const act = rule.action || {};
      (this.actuatorOptions || []).forEach(d => {
        if (act[d.key] === 0 || act[d.key] === 1) {
          parts.push((act[d.key] === 1 ? '开启' : '关闭') + d.label)
        }
      })
      if (act.message) parts.push(act.message);
      return parts.join('、') || '-';
    },

    // 查询判定记录（点击按钮触发）
    handleJudgeQuery() {
      this.judgeQueried = true;
      this.fetchJudgeHistory();
    },

    // 获取判定记录历史
    async fetchJudgeHistory() {
      try {
        const range = resolveQuickRange(this.judgeFilterData.quickRange, this.judgeFilterData.timeRange, this.formatDate);
        const hasRange = range && range.length === 2;
        const params = {
          start_time: hasRange ? range[0] : undefined,
          end_time: hasRange ? range[1] : undefined,
          tank_id: this.judgeFilterData.tankId || undefined,
          page: this.judgeFilterData.page,
          page_size: this.judgeFilterData.page_size
        };
        let res = await this.$http.get('/records/judge/data', { params });
        res = unwrapData(res);
        this.judgeHistoryList = res.data || [];
        this.total = res.total || (res.data ? res.data.length : 0);
      } catch (error) {
        console.error('获取判定记录失败', error);
        this.$message.error('获取判定记录失败');
        this.judgeHistoryList = [];
      }
    },

    // 切换行展开/收起
    toggleExpand(index) {
      const idx = this.expandedRows.indexOf(index);
      if (idx > -1) {
        this.expandedRows.splice(idx, 1);
      } else {
        this.expandedRows.push(index);
      }
    },

    // 判定状态样式
    getJudgeStatusClass(status) {
      if (status === 'normal' || status === undefined) return 'status-normal';
      if (status.includes('low')) return 'status-warn';
      return 'status-danger';
    },

    // 判定状态文字
    getJudgeStatusText(status) {
      const map = {
        'normal': '正常',
        'temp_high': '水温过高',
        'temp_low': '水温过低',
        'pressure_abnormal': '压力异常',
        'flow_abnormal': '流量异常'
      };
      return map[status] || status;
    },

    // 格式化时间
    formatDate(date) {
      const pad = (n) => n < 10 ? '0' + n : n;
      return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    }
  }
}
</script>

<style scoped>
/* 智能判定结果卡片 */
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

/* 卡片标题右侧时间样式 */
.time {
  margin-left: auto;
  font-size: 12px;
  color: #909399;
  font-weight: normal;
}

/* 智能判定设置布局 */
.judge-config {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.config-row {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #f5f7fa;
  padding: 10px 12px;
  border-radius: 10px;
  flex-wrap: wrap;
}

.c-label {
  font-size: 12px;
  color: #606266;
  min-width: 130px;
}

/* 判定记录展开行 */
.clickable-row {
  cursor: pointer;
}

.expand-cell {
  background: #fafbfc;
  padding: 10px;
}

.json-wrap {
  display: flex;
  gap: 20px;
}

.json-col {
  flex: 1;
  min-width: 0;
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

/* 状态标签样式 */
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

/* JSON 展示框样式 */
.json-title {
  font-size: 12px;
  color: #14b8a6;
  margin-bottom: 5px;
}

.json-block {
  background: #f5f7fa;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  padding: 8px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: #303133;
  white-space: pre-wrap;
  word-wrap: break-word;
  margin: 0;
}

/* 规则编辑弹窗 */
.rule-edit-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.rule-field-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.rule-section-title {
  font-size: 13px;
  font-weight: 600;
  color: #14b8a6;
  margin-top: 6px;
  padding-bottom: 4px;
  border-bottom: 1px dashed #e4e7ed;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 6px;
}

.c-hint {
  font-size: 12px;
  color: #909399;
}

/* 响应式：手机端显示卡片，隐藏表格 */
.mobile-only { display: none; }
.desktop-only { display: block; }

@media (max-width: 640px) {
  .desktop-only { display: none !important; }
  .mobile-only { display: block !important; }

  .json-wrap {
    flex-direction: column;
  }

  /* 配置表单行竖排：标签与控件各占一行，输入框占满整行 */
  .config-row {
    flex-direction: column;
    align-items: stretch;
  }
  .config-row .c-label {
    margin-bottom: 4px;
    margin-left: 0 !important;
  }
  .config-row .el-input,
  .config-row .el-select,
  .config-row .el-input-number {
    width: 100% !important;
  }

  /* 规则编辑弹窗里设备选择行竖排 */
  .rule-field-row {
    flex-direction: column;
    align-items: stretch;
  }
  .rule-field-row .c-label {
    margin-bottom: 4px;
    margin-left: 0 !important;
  }
  .rule-field-row .el-select,
  .rule-field-row .el-input,
  .rule-field-row .el-input-number {
    width: 100% !important;
  }

  .filter-form {
    flex-direction: column;
    align-items: stretch;
  }
  .form-item {
    width: 100%;
  }

  /* 规则卡片 */
  .rule-card {
    background: #fafbfc;
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 14px;
    margin-bottom: 10px;
  }
  .rule-card-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 5px 0;
    font-size: 13px;
  }
  .rule-card-label {
    color: var(--text-2);
    flex-shrink: 0;
    margin-right: 12px;
  }
  .rule-card-value {
    color: var(--text-1);
    font-weight: 500;
    text-align: right;
    max-width: 60%;
    word-break: break-all;
  }
  .rule-card-actions {
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
