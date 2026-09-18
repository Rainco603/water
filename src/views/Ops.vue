<template>
  <div class="config-page">

    <!-- 后端服务地址（比赛现场换网时修改，无需重新打包） -->
    <div class="card-box">
      <div class="card-title">
        后端服务地址
        <el-button size="mini" type="primary" plain style="margin-left: auto;" @click="resetApiBase"><svg-icon name="refresh" :size="14"/>恢复默认</el-button>
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

    <!-- 数据源配置（串口 / TCP） -->
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

    <!-- 安全联动配置（闭环看门狗 / 流量低限启动宽限期） -->
    <div class="card-box">
      <div class="card-title">安全联动配置</div>
      <div class="config-row">
        <span class="c-label">闭环看门狗:</span>
        <el-switch v-model="watchdogEnabled" active-value="1" inactive-value="0"></el-switch>
        <span class="c-hint">默认关闭；开启后若自动控制未在回显超时内生效，将触发紧急停机告警</span>
      </div>
      <div class="config-row">
        <span class="c-label">流量低限启动宽限期(秒):</span>
        <el-input-number v-model="flowStartGrace" size="mini" :min="0" :max="3600" :step="1"></el-input-number>
      </div>
      <div style="text-align: center; margin-top: 15px;">
        <el-button type="primary" size="mini" @click="saveSafetyConfig">保存安全联动配置</el-button>
      </div>
    </div>

    <!-- 操作日志查询 -->
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
                <svg-icon :name="expandedOpLogRows.includes(index) ? 'arrow-up' : 'arrow-down'" :size="14" style="margin-left: 10px;"></svg-icon>
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

    <!-- 系统工具 -->
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

  </div>
</template>

<script>
import { getApiBase, setApiBase, resetApiBase } from '../utils/config';
import { unwrapData } from '../utils/request';
import { resolveQuickRange } from '../utils/quickRange';
import RollTimeRangePicker from '../components/RollTimeRangePicker.vue';

export default {
  name: 'OpsPage',
  components: { RollTimeRangePicker },
  data() {
    return {
      // 数据源配置（串口 / TCP）
      dataSourceConfig: {
        data_source: 'serial',
        tcp_host: '127.0.0.1',
        tcp_port: '9000',
        heartbeat_timeout: 30
      },

      // 安全联动配置（闭环看门狗 / 流量低限启动宽限期）
      watchdogEnabled: '0',
      flowStartGrace: 5,

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
      currentApiBase: getApiBase()
    }
  },
  mounted() {
    // 初始化默认时间范围
    const end = new Date();
    const start = new Date(end.getTime() - 24 * 3600 * 1000);
    this.opLogFilterData.timeRange = [this.formatDate(start), this.formatDate(end)];

    this.fetchSystemConfig();
  },
  methods: {
    // 获取系统配置（仅数据源配置相关键）
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
        const pick = (key) => map[key];
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
        const wd = pick('watchdog_enabled');
        if (wd !== null && wd !== undefined) this.watchdogEnabled = String(wd);
        const fg = pick('flow_start_grace');
        if (fg !== null && fg !== undefined) {
          const v = parseFloat(fg);
          if (!isNaN(v)) this.flowStartGrace = v;
        }
      } catch (error) {
        console.error('获取系统配置失败', error);
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

    // 保存安全联动配置（闭环看门狗 / 流量低限启动宽限期）
    async saveSafetyConfig() {
      try {
        await this.$http.post('/config/save', { watchdog_enabled: this.watchdogEnabled });
        await this.$http.post('/config/save', { flow_start_grace: String(this.flowStartGrace) });
        this.$message.success('安全联动配置已保存');
      } catch (error) {
        this.$message.error('保存安全联动配置失败');
      }
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

    // 导出数据库
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

    // 系统复位 —— 高危操作，双重确认
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

    // 格式化时间
    formatDate(date) {
      const pad = (n) => n < 10 ? '0' + n : n;
      return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    }
  }
}
</script>

<style scoped>
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

.c-hint {
  font-size: 12px;
  color: #909399;
}

/* 操作日志展开行 */
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

  .filter-form {
    flex-direction: column;
    align-items: stretch;
  }
  .form-item {
    width: 100%;
  }

  .pagination .el-button {
    padding: 8px 14px;
    font-size: 14px;
  }
}
</style>
