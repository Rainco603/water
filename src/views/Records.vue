<template>
  <div class="records-page">

    <!-- 1. 筛选条件区域 -->
    <div class="card-box">
      <div class="card-title">历史数据查询</div>
      <div class="filter-form">
        <div class="form-item form-item--filter">
          <span class="label">传感器:</span>
          <el-select v-model="filterData.sensorType" size="mini" placeholder="请选择">
            <el-option label="不显示传感器" value="none"></el-option>
            <el-option v-for="s in sensorTypeOptions" :key="s.value" :label="s.label" :value="s.value"></el-option>
            <el-option label="全部" value="all"></el-option>
          </el-select>
        </div>
        <div class="form-item form-item--filter">
          <span class="label">执行器:</span>
          <el-select v-model="filterData.actuatorType" size="mini" placeholder="请选择">
            <el-option label="不显示执行器" value="none"></el-option>
            <el-option label="全部" value="all"></el-option>
            <el-option v-for="a in actuatorColumns" :key="a.key" :label="a.label" :value="a.key"></el-option>
          </el-select>
        </div>
        <div class="form-item form-item--filter">
          <span class="label">快捷时间:</span>
          <el-select v-model="filterData.quickRange" size="mini" placeholder="请选择">
            <el-option label="自定义" value="custom"></el-option>
            <el-option label="最近15分钟" value="15m"></el-option>
            <el-option label="最近30分钟" value="30m"></el-option>
            <el-option label="最近1小时" value="1h"></el-option>
          </el-select>
        </div>
        <div class="form-item form-item--filter" v-show="filterData.quickRange === 'custom'">
          <span class="label">时间范围:</span>
          <roll-time-range-picker v-model="filterData.timeRange"></roll-time-range-picker>
        </div>
        <div class="form-actions">
          <el-button type="primary" size="small" @click="handleQuery" round>查 询</el-button>
          <el-button size="small" @click="exportCsv" round><svg-icon name="download" :size="14"/>导出 CSV</el-button>
        </div>
      </div>
    </div>

    <!-- 2. 传感器历史曲线图 -->
    <div class="card-box" v-if="showSensorChart">
      <div class="card-title">
        传感器数据曲线
        <el-button size="mini" type="text" style="margin-left: auto;" @click="toggleChartFullscreen($refs.chartWrap, chart)"><svg-icon :name="fsActive ? 'close' : 'fullscreen'" :size="14"/>横屏</el-button>
      </div>
      <div class="chart-wrap" ref="chartWrap">
        <div ref="chart" style="width: 100%; height: 300px;"></div>
        <div v-if="!hasQueried" class="chart-placeholder">请设置筛选条件后点击【查 询】查看曲线</div>
        <el-button class="fs-exit" v-show="fsActive" size="mini" type="danger" round @click.stop="toggleChartFullscreen($refs.chartWrap, chart)"><svg-icon name="close" :size="14"/>退出横屏</el-button>
      </div>
    </div>

    <!-- 2.5 执行器状态曲线图（独立区域，阶梯线 0/1，与传感器共用上方统一筛选） -->
    <div class="card-box" v-if="showActuatorChart">
      <div class="card-title">
        执行器状态曲线
        <el-button size="mini" type="text" style="margin-left: auto;" @click="toggleChartFullscreen($refs.actuatorChartWrap, actuatorChart)"><svg-icon :name="fsActive ? 'close' : 'fullscreen'" :size="14"/>横屏</el-button>
      </div>
      <div class="chart-wrap" ref="actuatorChartWrap">
        <div ref="actuatorChart" style="width: 100%; height: 240px;"></div>
        <div v-if="!actuatorChartQueried" class="chart-placeholder">请选择筛选条件后点击【查 询】查看开关状态</div>
        <el-button class="fs-exit" v-show="fsActive" size="mini" type="danger" round @click.stop="toggleChartFullscreen($refs.actuatorChartWrap, actuatorChart)"><svg-icon name="close" :size="14"/>退出横屏</el-button>
      </div>
    </div>

    <!-- 3. 数据列表 -->
    <div class="card-box">
      <div class="card-title">历史数据列表<span class="count" v-if="hasQueried">（共 {{ total }} 条）</span></div>

      <!-- 统一表格：桌面端与移动端一致，移动端可横向滑动查看全部列（与操作日志一致） -->
      <div class="table-scroll">
        <table class="custom-table">
          <thead>
            <tr>
              <th>时间</th>
              <th v-for="col in displayColumns" :key="col.key">{{ col.label }}({{ col.unit }})</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in historyList" :key="index">
              <td>{{ item.timestamp }}</td>
              <td v-for="col in displayColumns" :key="col.key">
                <span :class="cellClass(item, col)">{{ cellValue(item, col) }}</span>
              </td>
            </tr>
            <tr v-if="historyList.length === 0">
              <td :colspan="displayColumns.length + 1" style="text-align: center; padding: 20px;">
                {{ hasQueried ? '暂无数据' : '请设置筛选条件后点击【查 询】' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 分页 -->
      <div class="pagination" v-if="hasQueried && historyList.length > 0">
        <el-button size="mini" :disabled="filterData.page === 1" @click="changePage(-1)">上一页</el-button>
        <span>第 {{ filterData.page }} 页</span>
        <el-button size="mini" :disabled="historyList.length < filterData.page_size" @click="changePage(1)">下一页</el-button>
      </div>
    </div>

  </div>
</template>

<script>
// 引入 ECharts 核心模块
import * as echarts from 'echarts';
import { SENSOR_DEFS, ACTUATOR_DEFS, sensorLabel, sensorColor, fetchSensorFields, fieldsToSensorItems, fieldsToDeviceItems, isActuatorField, loadLocalSensors, loadDeletedSensorKeys, actuatorColor, actuatorLabel, loadLocalActuators } from '../utils/sensors';
import RollTimeRangePicker from '../components/RollTimeRangePicker.vue';
import { getApiBase } from '../utils/config';
import { unwrapData } from '../utils/request';
import { resolveQuickRange } from '../utils/quickRange';
import chartFullscreen from '../mixins/chartFullscreen';

export default {
  name: 'RecordHistory',
  components: { RollTimeRangePicker },
  mixins: [chartFullscreen],
  data() {
    return {
      chart: null,
      filterData: {
        sensorType: 'temp1',
        actuatorType: 'none',
        timeRange: [],
        // 快捷时间：'custom'=自定义时间范围；'15m'/'30m'/'1h'=最近15/30分钟/1小时（与时间范围筛选互斥）
        quickRange: 'custom',
        page: 1,
        page_size: 15
      },
      historyList: [],
      hasQueried: false,
      total: 0,
      // 后端返回的传感器元数据字段列表（动态）
      sensorFields: [],
      // 组件销毁标记：异步图表请求返回后不再渲染，避免操作已 dispose 的 echarts 实例
      disposed: false,

      // ===== 执行器状态曲线 =====
      actuatorChart: null,
      actuatorChartQueried: false
    }
  },
  mounted() {
    this.initChart();
    this.initActuatorChart();
    this.loadSensorFields();
    // 模拟默认查询最近一小时的数据
    const end = new Date();
    const start = new Date(end.getTime() - 3600 * 1000);
    this.filterData.timeRange = [this.formatDate(start), this.formatDate(end)];
    // 不再自动查询，等待用户点击【查 询】后才加载列表与曲线

    // 窗口大小变化时重置图表
    window.addEventListener('resize', this.resizeChart);
  },
  beforeDestroy() {
    this.disposed = true;
    window.removeEventListener('resize', this.resizeChart);
    if (this.chart) {
      this.chart.dispose();
      this.chart = null;
    }
    if (this.actuatorChart) {
      this.actuatorChart.dispose();
      this.actuatorChart = null;
    }
  },
  computed: {
    // 传感器类型字段（仅 category === 'sensor'），用于表格列和图表曲线
    sensorColumns() {
      const items = fieldsToSensorItems(this.sensorFields)
      if (items && items.length) return items
      return SENSOR_DEFS.map(s => ({ key: s.key, label: s.label, unit: s.unit }))
    },
    // 执行器类型字段（水泵/加热器等，状态 0/1），以后端元数据 + 本地设备名合并，保证与主页一致
    actuatorColumns() {
      const apiItems = fieldsToDeviceItems(this.sensorFields) || []
      const local = loadLocalActuators() || []
      const apiKeys = new Set(apiItems.map(a => a.key))
      const localMap = {}
      local.forEach(d => { if (d && d.key) localMap[d.key] = d })
      // 后端返回的 + 本地新增但后端没有的（如 pump2）
      const merged = [...apiItems]
      local.forEach(d => {
        if (d && d.key && !apiKeys.has(d.key)) {
          merged.push({ key: d.key, label: d.label })
        }
      })
      // 后端元数据与本地设备都为空时，回退到默认执行器定义（与 sensorColumns 兜底 SENSOR_DEFS 保持一致）
      if (!merged.length) {
        ACTUATOR_DEFS.forEach(a => merged.push({ key: a.key, label: a.label }))
      }
      return merged.map(a => ({
        key: a.key,
        label: (localMap[a.key] && localMap[a.key].label) || a.label,
        unit: '',
        isActuator: true
      }))
    },
    // 是否显示传感器数据曲线卡片（选「不显示传感器」时隐藏）
    showSensorChart() {
      return this.filterData.sensorType !== 'none'
    },
    // 是否显示执行器状态曲线卡片（选「不显示执行器」或后端无执行器时隐藏）
    showActuatorChart() {
      return this.filterData.actuatorType !== 'none' && this.actuatorColumns.length > 0
    },
    // 表格显示列：按顶部 sensorType + actuatorType 合并筛选
    displayColumns() {
      const cols = []
      // 传感器列：选「不显示传感器」时不加入任何传感器列
      if (this.filterData.sensorType === 'none') {
        // 不显示传感器
      } else if (this.filterData.sensorType && this.filterData.sensorType !== 'all') {
        cols.push(...this.sensorColumns.filter(c => c.key === this.filterData.sensorType))
      } else {
        cols.push(...this.sensorColumns)
      }
      // 执行器状态列：选「不显示执行器」时不加入任何执行器列
      if (this.filterData.actuatorType === 'none') {
        // 不显示执行器
      } else if (this.filterData.actuatorType && this.filterData.actuatorType !== 'all') {
        cols.push(...this.actuatorColumns.filter(c => c.key === this.filterData.actuatorType))
      } else {
        cols.push(...this.actuatorColumns)
      }
      return cols
    },
    // 类型下拉选项（仅传感器，执行器单独成区）
    sensorTypeOptions() {
      return this.sensorColumns.map(s => ({ value: s.key, label: s.label }))
    }
  },
  watch: {
    'filterData.sensorType'(val) {
      // 切换为「不显示传感器」时释放图表实例，避免 v-if 重建 DOM 后残留旧实例
      if (val === 'none' && this.chart) {
        try { this.chart.dispose(); } catch (e) { /* 忽略 */ }
        this.chart = null;
      }
    },
    'filterData.actuatorType'(val) {
      // 切换为「不显示执行器」时释放图表实例，避免 v-if 重建 DOM 后残留旧实例
      if (val === 'none' && this.actuatorChart) {
        try { this.actuatorChart.dispose(); } catch (e) { /* 忽略 */ }
        this.actuatorChart = null;
      }
    }
  },
  methods: {
    initChart() {
      this.chart = echarts.init(this.$refs.chart);
      const option = {
        backgroundColor: 'transparent',
        tooltip: { trigger: 'axis' },
        // 图例可滚动：查询「全部」时传感器多，避免图例挤成一团
        legend: { type: 'scroll', data: [], top: 0, textStyle: { color: '#909399' } },
        // 底部预留 dataZoom 滑块高度
        grid: { left: 8, right: 12, bottom: 46, top: 34, containLabel: true },
        xAxis: { type: 'category', data: [], boundaryGap: false, axisLabel: { color: '#909399', hideOverlap: true }, axisLine: { lineStyle: { color: '#dcdfe6' } } },
        yAxis: { type: 'value', scale: true, axisLabel: { color: '#909399' }, axisLine: { lineStyle: { color: '#dcdfe6' } }, splitLine: { lineStyle: { color: '#ebeef5' } } },
        // 数据缩放：inside 支持双指/拖动缩放，slider 提供可视范围，解决数据点密集时拥挤
        dataZoom: [
          { type: 'inside', start: 0, end: 100 },
          { type: 'slider', start: 0, end: 100, height: 16, bottom: 8, borderColor: '#dcdfe6' }
        ],
        series: []
      };
      this.chart.setOption(option);
    },

    // 初始化执行器状态曲线（阶梯线，Y 轴固定 0/1）
    initActuatorChart() {
      if (!this.$refs.actuatorChart) return;
      this.actuatorChart = echarts.init(this.$refs.actuatorChart);
      const option = {
        backgroundColor: 'transparent',
        tooltip: { trigger: 'axis' },
        legend: { type: 'scroll', data: [], top: 0, textStyle: { color: '#909399' } },
        grid: { left: 8, right: 12, bottom: 46, top: 34, containLabel: true },
        xAxis: { type: 'category', data: [], boundaryGap: false, axisLabel: { color: '#909399', hideOverlap: true }, axisLine: { lineStyle: { color: '#dcdfe6' } } },
        yAxis: {
          type: 'value',
          min: -0.15,
          max: 1.15,
          interval: 1,
          axisLabel: {
            color: '#909399',
            fontSize: 10,
            formatter: function (val) {
              if (val === 0) return '关闭'
              if (val === 1) return '开启'
              return ''
            }
          },
          axisLine: { lineStyle: { color: '#dcdfe6' } },
          splitLine: { lineStyle: { color: '#ebeef5' } }
        },
        dataZoom: [
          { type: 'inside', start: 0, end: 100 },
          { type: 'slider', start: 0, end: 100, height: 16, bottom: 8, borderColor: '#dcdfe6' }
        ],
        series: []
      };
      this.actuatorChart.setOption(option);
    },

    async loadSensorFields() {
      const fields = await fetchSensorFields(this.$http)
      if (fields) {
        this.sensorFields = fields
      }
      // 合并 Home 页本地维护的传感器列表（增删改），保证记录页选项与实时数据区同步
      this.mergeLocalSensors()
    },

    // 把 localStorage 里的传感器列表合并进字段元数据：
    // 1. 本地删掉的字段剔除
    // 2. 本地改过的名称/单位同步到 sensorFields（保证与主页一致）
    // 3. 本地新增的字段补入
    mergeLocalSensors() {
      const local = loadLocalSensors()
      if (!local) return
      const deleted = new Set(loadDeletedSensorKeys())
      const localMap = {}
      local.forEach(s => { if (s && s.key) localMap[s.key] = s })
      // 过滤已删除
      this.sensorFields = this.sensorFields.filter(f => !deleted.has(f.field_name))
      // 用本地 label/unit 覆盖后端已有字段，并补入本地新增字段
      this.sensorFields = this.sensorFields.map(f => {
        const l = localMap[f.field_name]
        if (!l) return f
        return {
          ...f,
          display_name: (l.label && l.label.trim()) ? l.label.trim() : f.display_name,
          unit: (l.unit !== undefined && l.unit !== null && l.unit !== '') ? l.unit : f.unit
        }
      }).concat(
        local.filter(s => s && s.key && !deleted.has(s.key) && !isActuatorField(s.key))
          .filter(s => !this.sensorFields.some(f => f.field_name === s.key))
          .map(s => ({
            field_name: s.key,
            display_name: s.label || s.key,
            unit: s.unit || '',
            category: 'sensor',
            is_active: 1,
            data_type: 'number'
          }))
      )
    },

    // 从历史数据里自动发现新传感器/执行器字段（后端元数据滞后时兜底），同时用本地名称同步
    mergeHistoryFields(data) {
      if (!Array.isArray(data) || !data.length) return;
      const first = data[0] || {};
      const deleted = new Set(loadDeletedSensorKeys());
      const local = loadLocalSensors() || []
      const localMap = {}
      local.forEach(s => { if (s && s.key) localMap[s.key] = s })
      const NON_SENSOR = ['timestamp'];
      const extra = [];
      Object.keys(first).forEach(key => {
        if (NON_SENSOR.includes(key) || deleted.has(key)) return;
        const val = first[key];
        if (typeof val === 'number' || (typeof val === 'string' && val.trim() !== '' && !isNaN(Number(val)))) {
          const isAct = isActuatorField(key)
          const label = (localMap[key] && localMap[key].label) ? localMap[key].label : key
          const unit = (localMap[key] && localMap[key].unit !== undefined) ? localMap[key].unit : ''
          extra.push({
            field_name: key,
            display_name: label,
            unit,
            data_type: 'number',
            is_active: 1,
            category: isAct ? 'actuator' : 'sensor'
          });
        }
      });
      if (extra.length) {
        const existing2 = new Set(this.sensorFields.map(f => f.field_name))
        this.sensorFields = this.sensorFields.concat(extra.filter(e => !existing2.has(e.field_name)))
      }
      // 同步已有字段的本地改名
      this.sensorFields = this.sensorFields.map(f => {
        const l = localMap[f.field_name]
        if (!l) return f
        return {
          ...f,
          display_name: (l.label && l.label.trim()) ? l.label.trim() : f.display_name,
          unit: (l.unit !== undefined && l.unit !== null && l.unit !== '') ? l.unit : f.unit
        }
      })
    },

    async handleQuery() {
      this.filterData.page = 1;
      this.hasQueried = true;
      this.actuatorChartQueried = true;
      await Promise.all([
        this.fetchHistoryList(),
        this.fetchChartData(),
        this.fetchActuatorChartData()
      ]);
    },

    // 导出历史传感数据为 CSV（后端 /records/sensor/export 直接返回文件流）
    exportCsv() {
      // 导出的是传感数据：未选传感器时给出提示
      if (this.filterData.sensorType === 'none') {
        this.$message.warning('请先选择要导出的传感器类型');
        return;
      }
      const range = this.effectiveTimeRange();
      const hasRange = range && range.length === 2;
      const qs = [];
      if (hasRange) {
        qs.push(`start_time=${encodeURIComponent(range[0])}`);
        qs.push(`end_time=${encodeURIComponent(range[1])}`);
      }
      if (this.filterData.sensorType && this.filterData.sensorType !== 'all') {
        qs.push(`sensor_type=${encodeURIComponent(this.filterData.sensorType)}`);
      }
      const link = document.createElement('a');
      link.href = getApiBase() + '/api/records/sensor/export?' + qs.join('&');
      link.download = 'sensor_history.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      this.$message.success('CSV 导出请求已发送');
    },

    async fetchHistoryList() {
      try {
        const range = this.effectiveTimeRange();
        const hasRange = range && range.length === 2;
        const params = {
          start_time: hasRange ? range[0] : undefined,
          end_time: hasRange ? range[1] : undefined,
          page: this.filterData.page,
          page_size: this.filterData.page_size
        };
        let res = await this.$http.get('/records/sensor/data', { params });
        res = unwrapData(res);
        if (res.data) {
          // 兼容后端把动态字段存在 data_json 字符串里：解析并展开为扁平字段
          const list = (Array.isArray(res.data) ? res.data : []).map(r => {
            if (r && typeof r.data_json === 'string') {
              try {
                const parsed = JSON.parse(r.data_json);
                return { ...parsed, timestamp: r.timestamp || parsed.timestamp };
              } catch (e) { return r; }
            }
            return r;
          });
          this.historyList = list;
          this.mergeHistoryFields(list);
        } else {
          this.historyList = [];
        }
        this.total = res.total || (res.data ? res.data.length : 0);
      } catch (error) {
        this.$message.error('获取历史数据失败');
        this.historyList = [];
      }
    },

    async fetchChartData() {
      // 选「不显示传感器」时不请求、不渲染传感器曲线
      if (this.filterData.sensorType === 'none') return;
      // 懒初始化：切换「不显示传感器」会 v-if 隐藏容器，切回后重新初始化
      if (!this.chart && this.$refs.chart) {
        this.initChart();
      }
      const range = this.effectiveTimeRange();
      const hasRange = range && range.length === 2;
      const base = {
        start_time: hasRange ? range[0] : undefined,
        end_time: hasRange ? range[1] : undefined
      };

      try {
        if (this.filterData.sensorType === 'all') {
          // 全部：并行请求所有传感器，叠加多条曲线（执行器曲线在独立区域展示）
          const cols = this.sensorColumns;
          const results = await Promise.all(
            cols.map(col =>
              this.$http.get('/records/sensor/chart', { params: { ...base, sensor_type: col.key } })
            )
          );
          const points = results.map(r => this.normalizeChartPoints(r));
          const series = cols.map((col, i) => this.buildSeries(col.key, points[i]));
          const xData = this.pickXData(points);
          this.renderChart(xData, series);
        } else {
          const res = await this.$http.get('/records/sensor/chart', {
            params: { ...base, sensor_type: this.filterData.sensorType }
          });
          const points = this.normalizeChartPoints(res);
          const series = [this.buildSeries(this.filterData.sensorType, points, { area: true })];
          const xData = points.map(d => d.timestamp);
          this.renderChart(xData, series);
        }
      } catch (error) {
        this.$message.error('获取图表数据失败');
        this.renderChart([], []);
      }
    },

    // 归一化图表接口返回为点数组 [{timestamp, value}]，兼容数组 / {data:[]} / {code,data:[]} 等格式
    normalizeChartPoints(res) {
      let arr = unwrapData(res);
      // 图表接口返回 { code, data: { sensor, data: [...] } }，需取两层
      if (!Array.isArray(arr) && arr && Array.isArray(arr.data)) arr = arr.data;
      return Array.isArray(arr) ? arr : [];
    },

    // 仅处理传感器曲线（执行器曲线已拆到独立区域）
    buildSeries(key, data, opts = {}) {
      const col = this.sensorColumns.find(c => c.key === key)
      const color = sensorColor(key)
      const name = col ? col.label : sensorLabel(key)
      const s = {
        name,
        type: 'line',
        data: (Array.isArray(data) ? data : []).map(d => d.value),
        smooth: true,
        showSymbol: false, // 数据点密集时不显示圆点，避免挤成一团
        itemStyle: { color },
        lineStyle: { color },
        unit: col ? (col.unit || '') : ''
      };
      if (opts.area) s.areaStyle = { color: color + '26' };
      return s;
    },

    pickXData(dataArrays) {
      for (const arr of dataArrays) {
        if (arr && arr.length) return arr.map(d => d.timestamp);
      }
      return [];
    },

    renderChart(xData, series) {
      if (this.disposed || !this.chart) return;
      // 按单位（℃/kPa/L/min）分组，为不同量纲分配独立 Y 轴，避免小数值曲线被压平
      const unitIndex = {};
      const yAxes = [];
      series.forEach(s => {
        const unit = s.unit || ''
        if (!(unit in unitIndex)) {
          const idx = yAxes.length;
          unitIndex[unit] = idx;
          const onLeft = idx % 2 === 0;
          yAxes.push({
            type: 'value',
            name: unit,
            scale: true,
            position: onLeft ? 'left' : 'right',
            offset: Math.floor(idx / 2) * 46,
            nameTextStyle: { color: '#909399', fontSize: 10 },
            axisLine: { show: true, lineStyle: { color: '#dcdfe6' } },
            splitLine: { show: idx === 0, lineStyle: { color: '#ebeef5' } },
            axisLabel: { color: '#909399', fontSize: 10 }
          })
        }
        s.yAxisIndex = unitIndex[unit];
      });

      // 无曲线时也保留一个默认 value 轴，避免 yAxis 为空导致 resize 触发 echarts 内部报错
      const finalYAxes = yAxes.length ? yAxes : [{
        type: 'value',
        scale: true,
        axisLabel: { color: '#909399', fontSize: 10 },
        axisLine: { show: true, lineStyle: { color: '#dcdfe6' } },
        splitLine: { show: true, lineStyle: { color: '#ebeef5' } }
      }];

      this.chart.setOption({
        legend: { data: series.map(s => s.name) },
        xAxis: { data: xData },
        yAxis: finalYAxes,
        series: series
      }, { replaceMerge: ['yAxis', 'series'] });
    },

    changePage(val) {
      this.filterData.page += val;
      this.fetchHistoryList();
    },

    // 列表单元格值：执行器列（isActuator）把 0/1 显示为 关/开
    cellValue(item, col) {
      const v = item[col.key];
      if (v === undefined || v === null || v === '') return '--';
      if (col.isActuator) {
        if (v === 1 || v === '1' || v === true || v === 'true') return '开';
        if (v === 0 || v === '0' || v === false || v === 'false') return '关';
      }
      return v;
    },

    // 列表单元格样式：执行器列按 开/关 上色
    cellClass(item, col) {
      if (!col.isActuator) return '';
      const v = item[col.key];
      if (v === 1 || v === '1' || v === true || v === 'true') return 'cell-act cell-act-on';
      if (v === 0 || v === '0' || v === false || v === 'false') return 'cell-act cell-act-off';
      return '';
    },

    resizeChart() {
      // 空数据/无曲线状态下 resize 可能触发 echarts 内部 getAxesOnZeroOf 报错，静默忽略
      if (this.chart) { try { this.chart.resize(); } catch (e) { /* 忽略 */ } }
      if (this.actuatorChart) { try { this.actuatorChart.resize(); } catch (e) { /* 忽略 */ } }
    },

    // ===== 执行器状态曲线 =====
    async fetchActuatorChartData() {
      // 选「不显示执行器」时不请求、不渲染执行器曲线
      if (this.filterData.actuatorType === 'none') return;
      // 懒初始化：默认「不显示」时图表容器 v-if 隐藏，首次切换到显示后再初始化
      if (!this.actuatorChart && this.$refs.actuatorChart) {
        this.initActuatorChart();
      }
      const range = this.effectiveTimeRange();
      const hasRange = range && range.length === 2;
      const base = {
        start_time: hasRange ? range[0] : undefined,
        end_time: hasRange ? range[1] : undefined
      };
      try {
        if (this.filterData.actuatorType === 'all') {
          const cols = this.actuatorColumns;
          const results = await Promise.all(
            cols.map(col =>
              this.$http.get('/records/sensor/chart', { params: { ...base, sensor_type: col.key } })
            )
          );
          const points = results.map(r => this.normalizeChartPoints(r));
          const series = cols.map((col, i) => this.buildActuatorSeries(col.key, points[i]));
          const xData = this.pickXData(points);
          this.renderActuatorChart(xData, series);
        } else {
          const res = await this.$http.get('/records/sensor/chart', {
            params: { ...base, sensor_type: this.filterData.actuatorType }
          });
          const points = this.normalizeChartPoints(res);
          const series = [this.buildActuatorSeries(this.filterData.actuatorType, points)];
          const xData = points.map(d => d.timestamp);
          this.renderActuatorChart(xData, series);
        }
      } catch (error) {
        this.$message.error('获取执行器曲线失败');
        this.renderActuatorChart([], []);
      }
    },

    // 执行器曲线：数据已是 0/1，用阶梯线展示开/关状态，不显示圆点
    buildActuatorSeries(key, data) {
      const col = this.actuatorColumns.find(c => c.key === key)
      const color = actuatorColor(key)
      const name = col ? col.label : actuatorLabel(key)
      return {
        name,
        type: 'line',
        data: (Array.isArray(data) ? data : []).map(d => d.value),
        step: 'start',           // 阶梯线：变更后保持原值直到下一个点
        symbol: 'none',          // 不显示数据点圆点
        showSymbol: false,
        lineStyle: { color, width: 2 },
        itemStyle: { color }
      };
    },

    renderActuatorChart(xData, series) {
      if (this.disposed || !this.actuatorChart) return;
      this.actuatorChart.setOption({
        legend: { data: series.map(s => s.name) },
        xAxis: { data: xData },
        series: series
      }, { replaceMerge: ['series'] });
    },

    formatDate(date) {
      const pad = (n) => n < 10 ? '0' + n : n;
      return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    },

    // 实际用于查询的时间范围：快捷时间优先（最近15/30分钟/1小时），否则用自定义时间范围。
    // 二者互斥——快捷时间选中时自定义时间范围被隐藏，查询/导出统一走这里。
    effectiveTimeRange() {
      return resolveQuickRange(this.filterData.quickRange, this.filterData.timeRange, this.formatDate);
    }
  }
}
</script>

<style scoped>
.records-page {
  padding-bottom: 16px;
}

/* ===== 筛选区 ===== */
.filter-form {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: flex-end;
}

.form-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.form-item--filter {
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
}

.form-item--filter .label {
  font-size: 12px;
  color: var(--text-2);
}

.form-item--filter ::v-deep .el-select,
.form-item--filter ::v-deep .el-radio-group {
  width: 100%;
}

.form-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  width: 100%;
  margin-top: 4px;
}

.form-actions .el-button {
  flex: 1;
}

/* ===== 历史曲线图 ===== */
.chart-wrap {
  position: relative;
}

.chart-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafbfc;
  color: var(--text-3);
  font-size: 13px;
  border: 1px dashed var(--border);
  border-radius: 8px;
}

/* ===== 数据列表 ===== */
.table-scroll {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.custom-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  min-width: 480px;
}

.custom-table th,
.custom-table td {
  border: 1px solid var(--border);
  padding: 8px 10px;
  text-align: center;
  white-space: nowrap;
}

.custom-table th {
  background-color: #f5f7fa;
  color: var(--text-2);
  font-weight: 600;
}

.custom-table tr:nth-child(even) {
  background-color: #fafbfc;
}

/* 执行器状态单元格：开=绿色，关=灰色 */
.cell-act {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}
.cell-act-on {
  background: #e6f7f2;
  color: #14b8a6;
}
.cell-act-off {
  background: #f1f3f5;
  color: #8a94a6;
}

/* ===== 分页 ===== */
.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  font-size: 13px;
  color: var(--text-3);
}

/* ===== 移动端响应式：筛选表单竖排、表格横向滑动、分页按钮放大 ===== */
@media (max-width: 640px) {
  .filter-form {
    flex-direction: column;
    align-items: stretch;
  }

  .form-actions {
    flex-direction: row;
  }

  .form-item--filter {
    width: 100%;
  }

  .pagination .el-button {
    padding: 8px 14px;
    font-size: 14px;
  }
}
</style>
