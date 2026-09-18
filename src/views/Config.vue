<template>
  <div class="config-page">

    <!-- 0. 后端服务地址（比赛现场换网时修改，无需重新打包） -->
    <div class="card-box">
      <div class="card-title">
        后端服务地址
        <el-button size="mini" type="primary" plain icon="el-icon-refresh" style="margin-left: auto;" @click="resetApiBase">恢复默认</el-button>
      </div>
      <div class="config-row">
        <span class="c-label">当前地址：</span>
        <el-input v-model="currentApiBase" size="mini" placeholder="如 http://192.168.1.100:5001" style="flex: 1; min-width: 160px;"></el-input>
        <el-button type="primary" size="mini" @click="saveApiBase">应用地址</el-button>
      </div>
      <el-alert
        title="比赛现场若更换网络，请输入后端电脑的 IPv4 地址后点击「应用地址」，页面将自动刷新重连，APK 无需重新打包。"
        type="info"
        :closable="false"
        show-icon
        style="margin-top: 12px;"
      ></el-alert>
    </div>

    <!-- 1. 智能判定设置 (2-1) -->
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

    <!-- 2.5 数据源配置（串口 / TCP） -->
    <div class="card-box">
      <div class="card-title">数据源配置</div>
      <div class="config-row">
        <span class="c-label">数据源类型:</span>
        <el-select v-model="dataSourceConfig.data_source" size="mini" style="width: 160px;">
          <el-option label="串口" value="serial"></el-option>
          <el-option label="TCP 客户端" value="tcp_client"></el-option>
          <el-option label="TCP 服务端" value="tcp_server"></el-option>
        </el-select>
      </div>
      <div class="config-row" v-if="dataSourceConfig.data_source !== 'serial'">
        <span class="c-label">TCP 主机:</span>
        <el-input v-model="dataSourceConfig.tcp_host" size="mini" style="width: 200px;"></el-input>
        <span class="c-label" style="margin-left: 10px;">端口:</span>
        <el-input v-model="dataSourceConfig.tcp_port" size="mini" style="width: 100px;"></el-input>
      </div>
      <div class="config-row">
        <span class="c-label">心跳超时(秒):</span>
        <el-input-number v-model="dataSourceConfig.heartbeat_timeout" size="mini" :min="1" :max="3600" :step="5"></el-input-number>
      </div>
      <div style="text-align: center; margin-top: 15px;">
        <el-button type="primary" size="mini" @click="saveDataSourceConfig">保存数据源配置</el-button>
      </div>
    </div>

    <!-- 3. 规则引擎配置 -->
    <div class="card-box">
      <div class="card-title">
        安全联锁配置（温度闭环）
        <el-button size="mini" type="primary" plain icon="el-icon-plus" style="margin-left: auto;" @click="openRuleEdit(-1)">添加规则</el-button>
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

    <!-- 4. 判定记录查询 (2-3) -->
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
                <i :class="expandedRows.includes(index) ? 'el-icon-arrow-up' : 'el-icon-arrow-down'" style="margin-left: 10px;"></i>
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

    <!-- 4. 操作日志查询 -->
    <div class="card-box">
      <div class="card-title">操作日志查询<span class="count" v-if="opLogQueried">（共 {{ opLogTotal }} 条）</span></div>
      <div class="filter-form">
        <div class="form-item">
          <span class="label">设备标识:</span>
          <el-input v-model="opLogFilterData.deviceId" size="mini" clearable placeholder="如 pump / heater" style="width: 140px;"></el-input>
        </div>
        <div class="form-item">
          <span class="label">日志类型:</span>
          <el-select v-model="opLogFilterData.logType" size="mini" clearable filterable allow-create placeholder="全部" style="width: 130px;">
            <el-option v-for="t in logTypeOptions" :key="t" :label="t" :value="t"></el-option>
          </el-select>
        </div>
        <div class="form-item">
          <span class="label">操作类型:</span>
          <el-select v-model="opLogFilterData.operationType" size="mini" clearable filterable allow-create placeholder="全部" style="width: 130px;">
            <el-option v-for="t in operationTypeOptions" :key="t" :label="t" :value="t"></el-option>
          </el-select>
        </div>
        <div class="form-item">
          <span class="label">快捷时间:</span>
          <el-select v-model="opLogFilterData.quickRange" size="mini" style="width: 130px">
            <el-option label="自定义" value="custom"></el-option>
            <el-option label="最近15分钟" value="15m"></el-option>
            <el-option label="最近30分钟" value="30m"></el-option>
            <el-option label="最近1小时" value="1h"></el-option>
          </el-select>
        </div>
        <div class="form-item time-range-item" v-show="opLogFilterData.quickRange === 'custom'">
          <span class="label">时间范围:</span>
          <roll-time-range-picker v-model="opLogFilterData.timeRange"></roll-time-range-picker>
        </div>
        <el-button type="primary" size="mini" @click="handleOpLogQuery">查 询</el-button>
      </div>

      <!-- 展开行表格，点击查看变更前后值 JSON -->
      <div class="table-scroll">
        <table class="custom-table" style="margin-top: 15px;">
          <thead>
            <tr>
              <th width="160">时间</th>
              <th width="100">设备标识</th>
              <th width="90">日志类型</th>
              <th width="90">操作类型</th>
              <th>内容摘要 (点击行查看详情)</th>
            </tr>
          </thead>
          <tbody v-for="(item, index) in opLogList" :key="index">
            <tr @click="toggleOpLogExpand(index)" class="clickable-row">
              <td>{{ item.time || item.timestamp }}</td>
              <td>{{ item.device_id || item.deviceId || '-' }}</td>
              <td>{{ item.log_type || item.logType || '-' }}</td>
              <td>{{ item.operation_type || item.operationType || '-' }}</td>
              <td>
                {{ opLogSummary(item) }}
                <i :class="expandedOpLogRows.includes(index) ? 'el-icon-arrow-up' : 'el-icon-arrow-down'" style="margin-left: 10px;"></i>
              </td>
            </tr>
            <tr v-if="expandedOpLogRows.includes(index)">
              <td colspan="5" class="expand-cell">
                <div class="json-wrap">
                  <div class="json-col">
                    <div class="json-title">变更前 (Before):</div>
                    <pre class="json-block">{{ opLogJson(item.before) }}</pre>
                  </div>
                  <div class="json-col">
                    <div class="json-title">变更后 (After):</div>
                    <pre class="json-block">{{ opLogJson(item.after) }}</pre>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
          <tbody v-if="opLogList.length === 0">
            <tr>
              <td colspan="5" style="text-align: center; padding: 20px;">
                {{ opLogQueried ? '暂无操作日志' : '点击【查 询】获取操作日志' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <!-- 简单分页 -->
      <div class="pagination" v-if="opLogList.length > 0">
        <el-button size="mini" :disabled="opLogFilterData.page === 1" @click="changeOpLogPage(-1)">上一页</el-button>
        <span>第 {{ opLogFilterData.page }} 页</span>
        <el-button size="mini" :disabled="opLogList.length < opLogFilterData.page_size" @click="changeOpLogPage(1)">下一页</el-button>
      </div>
    </div>

    <!-- 5. 系统工具 -->
    <div class="card-box">
      <div class="card-title">系统维护工具</div>
      <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
        <el-button type="primary" size="mini" @click="exportDatabase">导出数据库</el-button>
        <el-button type="info" size="mini" plain @click="exportConfig">导出配置</el-button>
        <el-button type="warning" size="mini" plain @click="pickConfigFile">导入配置</el-button>
        <el-button type="danger" size="mini" @click="systemReset">系统复位(清空数据)</el-button>
      </div>
      <div class="config-row" style="margin-top: 12px;">
        <span class="c-label">日志级别:</span>
        <el-select v-model="logLevel" size="mini" style="width: 120px;">
          <el-option v-for="l in logLevelOptions" :key="l" :label="l" :value="l"></el-option>
        </el-select>
        <el-button size="mini" @click="saveLogLevel">设置</el-button>
      </div>
      <input ref="configFile" type="file" accept="application/json,.json" style="display: none;" @change="importConfig">
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
import { getApiBase, setApiBase, resetApiBase } from '../utils/config';
import { unwrapData } from '../utils/request';
import { resolveQuickRange } from '../utils/quickRange';
import RollTimeRangePicker from '../components/RollTimeRangePicker.vue';
import RuleConditionGroup from '../components/RuleConditionGroup.vue';

export default {
  name: 'SysConfig',
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

      // 数据源配置（串口 / TCP，后端 v 新增 config 键）
      dataSourceConfig: {
        data_source: 'serial',
        tcp_host: '127.0.0.1',
        tcp_port: '9000',
        heartbeat_timeout: 30
      },

      // 判定记录查询
      judgeFilterData: {
        timeRange: [],
        // 快捷时间：'custom'=自定义时间范围；'15m'/'30m'/'1h'=最近15/30分钟/1小时（与时间范围互斥）
        quickRange: 'custom',
        tankId: '',
        page: 1,
        page_size: 15
      },
      judgeHistoryList: [],
      expandedRows: [],
      judgeQueried: false,
      total: 0,

      // 操作日志查询
      opLogFilterData: {
        deviceId: '',
        logType: '',
        operationType: '',
        timeRange: [],
        // 快捷时间：'custom'=自定义时间范围；'15m'/'30m'/'1h'=最近15/30分钟/1小时（与时间范围互斥）
        quickRange: 'custom',
        page: 1,
        page_size: 15
      },
      opLogList: [],
      opLogQueried: false,
      opLogTotal: 0,
      expandedOpLogRows: [],
      logTypeOptions: ['control', 'system', 'config', 'data'],
      operationTypeOptions: ['open', 'close', 'reset', 'export', 'update'],

      // 日志级别设置
      logLevel: 'INFO',
      logLevelOptions: ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'],

      // 后端服务地址（比赛现场可修改）
      currentApiBase: getApiBase(),

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
      opOptions: ['>', '<', '>=', '<=', '==', '!=']
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
    this.opLogFilterData.timeRange = [this.formatDate(start), this.formatDate(end)];

    this.fetchSystemConfig();
    this.fetchRules();
    this.loadSensorItems();
    // 判定记录不再自动查询，等待用户点击【查 询】
  },
  methods: {
    // 加载当前传感器列表：本地用户配置 > 后端元数据 > 实时数据自动发现
    // 以 Home 页维护的 iot_water_sensors 为权威来源，保证增删改同步到阈值/规则
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

    // 获取系统配置 (对应接口 12)
    async fetchSystemConfig() {
      try {
        let res = await this.$http.get('/config/all');
        // 解包 {code, data} 包裹
        res = unwrapData(res);
        // 归一化为 { key: value } 扁平对象，兼容后端返回「数组 [{key,value}]」与「扁平对象 {key:value}」两种格式
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
        const pick = (key) => map[key];
        const judgeUrl = pick('judge_url');
        if (judgeUrl) this.systemConfig.judge_url = judgeUrl;
        const ds = pick('data_source');
        if (ds) this.dataSourceConfig.data_source = ds;
        const th = pick('tcp_host');
        if (th !== null && th !== undefined) this.dataSourceConfig.tcp_host = th;
        const tp = pick('tcp_port');
        if (tp !== null && tp !== undefined) this.dataSourceConfig.tcp_port = tp;
        const hb = pick('heartbeat_timeout');
        if (hb !== null && hb !== undefined) {
          const v = parseFloat(hb);
          if (!isNaN(v)) this.dataSourceConfig.heartbeat_timeout = v;
        }
        const jpm = pick('judge_payload_map');
        if (jpm && typeof jpm === 'object') {
          this.systemConfig.judge_payload_map = JSON.stringify(jpm);
        }
      } catch (error) {
        console.error('获取系统配置失败', error);
      }
    },

    // 保存系统配置 (对应接口 13)
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

    // 保存数据源配置（逐个键写入 config 表）
    async saveDataSourceConfig() {
      try {
        const cfg = this.dataSourceConfig;
        const entries = [
          ['data_source', cfg.data_source],
          ['tcp_host', cfg.tcp_host],
          ['tcp_port', String(cfg.tcp_port)],
          ['heartbeat_timeout', String(cfg.heartbeat_timeout)]
        ];
        for (const [k, v] of entries) {
          await this.$http.post('/config/save', { [k]: v });
        }
        this.$message.success('数据源配置已保存');
      } catch (error) {
        this.$message.error('保存数据源配置失败');
      }
    },

    // 手动调用智能判定 (对应接口 7)
    async manualJudge() {
      try {
        // 根据文档示例，传入当前/模拟数据触发判定
        const payload = {
          temp1: 62,
          temp2: 40,
          pressure: 105,
          flow: 1.8
        };
        const res = await this.$http.post('/monitor/judge', payload);
        if (res && res.code === 0) {
          // 判定结果在 res.data 内（action/status），返回说明在 res.msg
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

    // 重置 AI 检测状态 (对应接口 17)
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
      // 规则引擎新版：priority 缺省按 100
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
      // 后端 DELETE 接口用规则 id 作为标识（URL 路径参数），id 必填唯一
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
              // 删除后重新拉取后端规则列表，确认后端真实删除结果：
              // 若后端删除接口实际未移除（如按 alarm 而非 id 匹配失败），规则会被刷回来，避免本地误以为已删
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

    // 获取判定记录历史 (对应接口 10)
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

    // ===== 操作日志查询 =====
    handleOpLogQuery() {
      this.opLogFilterData.page = 1;
      this.opLogQueried = true;
      this.fetchOpLogHistory();
    },

    // 获取操作日志（对应后端操作日志接口，按设备标识/日志类型/操作类型/时间范围筛选）
    async fetchOpLogHistory() {
      try {
        const range = resolveQuickRange(this.opLogFilterData.quickRange, this.opLogFilterData.timeRange, this.formatDate);
        const hasRange = range && range.length === 2;
        const params = {
          device_id: this.opLogFilterData.deviceId ? this.opLogFilterData.deviceId.trim() : undefined,
          log_type: this.opLogFilterData.logType || undefined,
          operation_type: this.opLogFilterData.operationType || undefined,
          start_time: hasRange ? range[0] : undefined,
          end_time: hasRange ? range[1] : undefined,
          page: this.opLogFilterData.page,
          page_size: this.opLogFilterData.page_size
        };
        let res = await this.$http.get('/records/control/data', { params });
        res = unwrapData(res);
        this.opLogList = res.data || [];
        this.opLogTotal = res.total || (res.data ? res.data.length : 0);
      } catch (error) {
        console.error('获取操作日志失败', error);
        this.$message.error('获取操作日志失败');
        this.opLogList = [];
      }
    },

    changeOpLogPage(val) {
      this.opLogFilterData.page += val;
      this.fetchOpLogHistory();
    },

    toggleOpLogExpand(index) {
      const idx = this.expandedOpLogRows.indexOf(index);
      if (idx > -1) {
        this.expandedOpLogRows.splice(idx, 1);
      } else {
        this.expandedOpLogRows.push(index);
      }
    },

    // 内容摘要：优先取 description/detail/message/content 字段
    opLogSummary(item) {
      const txt = item.description || item.detail || item.message || item.content || '';
      if (typeof txt === 'string') return txt;
      try { return JSON.stringify(txt); } catch (e) { return ''; }
    },

    // 变更前后值 JSON：兼容字符串与对象，字符串尝试反序列化后美化输出
    opLogJson(v) {
      if (v === undefined || v === null) return '--';
      if (typeof v === 'string') {
        try { return JSON.stringify(JSON.parse(v), null, 2); } catch (e) { return v; }
      }
      try { return JSON.stringify(v, null, 2); } catch (e) { return String(v); }
    },

    // 导出数据库 (对应接口 19)
    exportDatabase() {
      // 利用 a 标签触发文件下载，APP 内用绝对地址直连后端
      const link = document.createElement('a');
      link.href = getApiBase() + '/api/system/export-db';
      link.download = 'iot_water.db';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      this.$message.success('数据库导出请求已发送');
    },

    // 导出配置 (GET /config/export，返回 JSON，前端保存为文件)
    async exportConfig() {
      try {
        let res = await this.$http.get('/config/export');
        // 解包 {code, data} 包裹，导出扁平配置对象（否则再导入时会带上 code/data/msg 污染配置）
        res = unwrapData(res);
        const text = typeof res === 'string' ? res : JSON.stringify(res, null, 2);
        const blob = new Blob([text], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'iot_water_config.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        this.$message.success('配置已导出');
      } catch (e) {
        this.$message.error('导出配置失败');
      }
    },

    // 触发选择配置文件
    pickConfigFile() {
      this.$refs.configFile.click();
    },

    // 导入配置 (POST /config/import，请求体为完整配置 JSON)
    importConfig(event) {
      const file = event.target.files && event.target.files[0];
      event.target.value = ''; // 允许重复选择同一文件
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        let payload;
        try {
          payload = JSON.parse(reader.result);
        } catch (e) {
          this.$message.error('配置文件不是合法的 JSON');
          return;
        }
        this.$confirm('导入配置将覆盖当前配置，确定继续？', '提示', { type: 'warning' })
          .then(async () => {
            try {
              const res = await this.$http.post('/config/import', payload);
              if (res && res.code === 0) {
                this.$message.success(res.msg || '配置已导入');
                this.fetchSystemConfig();
                this.fetchRules();
              } else {
                this.$message.error((res && res.msg) || '导入失败');
              }
            } catch (e) {
              this.$message.error('导入配置失败');
            }
          }).catch(() => {});
      };
      reader.onerror = () => this.$message.error('读取配置文件失败');
      reader.readAsText(file);
    },

    // 设置日志级别 (POST /system/log-level)
    async saveLogLevel() {
      try {
        const res = await this.$http.post('/system/log-level', { level: this.logLevel });
        if (res && res.code === 0) {
          this.$message.success(res.msg || '日志级别已设置');
        } else {
          this.$message.error((res && res.msg) || '设置失败');
        }
      } catch (e) {
        this.$message.error('设置日志级别失败');
      }
    },

    // 系统复位 (对应接口 18) —— 高危操作，双重确认
    async systemReset() {
      this.$confirm('此操作将清空所有历史数据并恢复默认阈值，是否继续？', '警告', {
        type: 'warning'
      }).then(() => {
        // 高危操作二次确认：需输入「复位」二字才能执行
        this.$prompt('此操作不可恢复，请输入「复位」以确认执行系统复位', '高危操作二次确认', {
          confirmButtonText: '确认复位',
          cancelButtonText: '取消',
          inputPattern: /^复位$/,
          inputErrorMessage: '请输入「复位」'
        }).then(async () => {
          try {
            const res = await this.$http.post('/system/reset');
            if (res.code === 0) {
              this.$message.success(res.msg || '系统已复位');
            } else {
              this.$message.error(res.msg || '复位失败');
            }
          } catch (error) {
            this.$message.error('复位请求失败');
          }
        }).catch(() => {});
      }).catch(() => {});
    },

    // ===== 后端服务地址（比赛现场换网时用） =====
    saveApiBase() {
      const url = (this.currentApiBase || '').trim()
      if (!url) {
        this.$message.warning('请输入后端地址，如 http://192.168.1.100:5001')
        return
      }
      // 简单校验格式
      if (!/^https?:\/\//i.test(url)) {
        this.$message.warning('地址必须以 http:// 或 https:// 开头')
        return
      }
      setApiBase(url)
      this.$message.success('后端地址已保存，页面即将刷新以重新连接...')
      setTimeout(() => window.location.reload(), 1200)
    },
    resetApiBase() {
      this.$confirm('确定恢复默认后端地址吗？', '提示', { type: 'warning' })
        .then(() => {
          resetApiBase()
          this.currentApiBase = getApiBase()
          this.$message.success('已恢复默认地址，页面即将刷新...')
          setTimeout(() => window.location.reload(), 1200)
        }).catch(() => {})
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

/* 分页 */
.pagination {
  margin-top: 15px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  font-size: 12px;
  color: #909399;
}

/* 状态标签样式 */
.status-tag {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
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

/* ===== 移动端适配 ===== */
@media (max-width: 640px) {
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
}

/* 响应式：手机端显示卡片，隐藏表格 */
.mobile-only { display: none; }
.desktop-only { display: block; }

@media (max-width: 640px) {
  .desktop-only { display: none !important; }
  .mobile-only { display: block !important; }

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

  /* 操作日志/判定记录卡片 */
  .log-card {
    background: #fafbfc;
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 14px;
    margin-bottom: 10px;
  }
  .log-card-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 4px 0;
    font-size: 13px;
  }
  .log-card-label {
    color: var(--text-2);
    flex-shrink: 0;
    margin-right: 12px;
  }
  .log-card-value {
    color: var(--text-1);
    text-align: right;
    max-width: 65%;
    word-break: break-all;
  }

  /* 弹窗全宽 */
  .el-dialog {
    width: 94% !important;
  }

  .pagination .el-button {
    padding: 8px 14px;
    font-size: 14px;
  }
}
</style>
