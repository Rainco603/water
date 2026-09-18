<template>
  <div class="range-picker">
    <div class="rp-field" @click="openPicker('start')">
      <span class="rp-field-label">开始</span>
      <span class="rp-field-value" :class="{ placeholder: !startDate }">{{ startText || startPlaceholder }}</span>
    </div>
    <span class="rp-sep">至</span>
    <div class="rp-field" @click="openPicker('end')">
      <span class="rp-field-label">结束</span>
      <span class="rp-field-value" :class="{ placeholder: !endDate }">{{ endText || endPlaceholder }}</span>
    </div>

    <!-- 自定义开始时间选择器 -->
    <van-popup v-model="startShow" position="bottom" :round="true">
      <div class="custom-picker">
        <div class="cp-header">
          <span class="cp-btn" @click="startShow = false">取消</span>
          <span class="cp-title">{{ title || '选择开始时间' }}</span>
          <span class="cp-btn cp-btn--primary" @click="confirmStart">确定</span>
        </div>
        <div class="cp-body">
          <div class="cp-col" v-for="col in startColumns" :key="col.type">
            <div class="cp-col-label">{{ col.label }}</div>
            <div class="cp-col-scroll">
              <div class="cp-item"
                   v-for="val in col.values"
                   :key="val"
                   :class="{ active: startPick[col.type] === val }"
                   @click="startPick[col.type] = val">
                {{ formatVal(val, col.type) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </van-popup>

    <!-- 自定义结束时间选择器 -->
    <van-popup v-model="endShow" position="bottom" :round="true">
      <div class="custom-picker">
        <div class="cp-header">
          <span class="cp-btn" @click="endShow = false">取消</span>
          <span class="cp-title">{{ title || '选择结束时间' }}</span>
          <span class="cp-btn cp-btn--primary" @click="confirmEnd">确定</span>
        </div>
        <div class="cp-body">
          <div class="cp-col" v-for="col in endColumns" :key="col.type">
            <div class="cp-col-label">{{ col.label }}</div>
            <div class="cp-col-scroll">
              <div class="cp-item"
                   v-for="val in col.values"
                   :key="val"
                   :class="{ active: endPick[col.type] === val }"
                   @click="endPick[col.type] = val">
                {{ formatVal(val, col.type) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script>
import { Popup } from 'vant'
import 'vant/lib/popup/style'

const pad = (n) => (n < 10 ? '0' + n : n)

function toStr (d, isEnd, precision) {
  if (!d) return ''
  const sec = precision === 'minute'
    ? (isEnd ? '59' : '00')
    : (isEnd ? '59' : pad(d.getSeconds()))
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${sec}`
}

function parseStr (s) {
  if (!s) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/.exec(s)
  if (!m) return null
  return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], 0, 0)
}

export default {
  name: 'RollTimeRangePicker',
  components: { VanPopup: Popup },
  props: {
    value: { type: Array, default: () => [] },
    startPlaceholder: { type: String, default: '开始时间' },
    endPlaceholder: { type: String, default: '结束时间' },
    title: { type: String, default: '' },
    // 精度：'second' = 秒级筛选（默认显示秒列）
    // 'minute' = 整分钟筛选（不显示秒列，开始秒归 00、结束秒归 59）
    precision: { type: String, default: 'second', validator: v => ['minute', 'second'].includes(v) }
  },
  data () {
    return {
      startShow: false,
      endShow: false,
      startDate: null,
      endDate: null,
      startPick: { month: 1, day: 1, hour: 0, minute: 0, second: 0 },
      endPick: { month: 1, day: 1, hour: 0, minute: 0, second: 0 }
    }
  },
  computed: {
    minDate () {
      return new Date(2000, 0, 1)
    },
    maxDate () {
      return new Date(2030, 11, 31, 23, 59)
    },
    startText () {
      return this.value && this.value[0] ? this.value[0] : ''
    },
    endText () {
      return this.value && this.value[1] ? this.value[1] : ''
    },
    startColumns () {
      const year = this.startDate ? this.startDate.getFullYear() : new Date().getFullYear()
      return this.buildColumns(this.startPick.month, year)
    },
    endColumns () {
      const year = this.endDate ? this.endDate.getFullYear() : new Date().getFullYear()
      return this.buildColumns(this.endPick.month, year)
    }
  },
  watch: {
    value (val) {
      if (Array.isArray(val)) {
        this.startDate = parseStr(val[0])
        this.endDate = parseStr(val[1])
      }
    },
    'startPick.month' (newMonth) {
      const year = this.startDate ? this.startDate.getFullYear() : new Date().getFullYear()
      const maxDay = new Date(year, newMonth, 0).getDate()
      if (this.startPick.day > maxDay) this.startPick.day = maxDay
    },
    'endPick.month' (newMonth) {
      const year = this.endDate ? this.endDate.getFullYear() : new Date().getFullYear()
      const maxDay = new Date(year, newMonth, 0).getDate()
      if (this.endPick.day > maxDay) this.endPick.day = maxDay
    }
  },
  mounted () {
    if (Array.isArray(this.value)) {
      this.startDate = parseStr(this.value[0])
      this.endDate = parseStr(this.value[1])
    }
  },
  methods: {
    openPicker (which) {
      const d = which === 'start' ? (this.startDate || new Date()) : (this.endDate || new Date())
      const year = d.getFullYear()
      const maxDay = new Date(year, d.getMonth() + 1, 0).getDate()
      const pick = {
        month: d.getMonth() + 1,
        day: Math.min(d.getDate(), maxDay),
        hour: d.getHours(),
        minute: d.getMinutes(),
        second: d.getSeconds()
      }
      if (which === 'start') {
        this.startPick = { ...pick }
        this.startShow = true
      } else {
        this.endPick = { ...pick }
        this.endShow = true
      }
    },
    confirmStart () {
      this.startShow = false
      const p = this.startPick
      const year = this.startDate ? this.startDate.getFullYear() : new Date().getFullYear()
      const maxDay = new Date(year, p.month, 0).getDate()
      p.day = Math.max(1, Math.min(p.day, maxDay))
      this.startDate = new Date(year, p.month - 1, p.day, p.hour, p.minute, p.second)
      this.emitRange()
    },
    confirmEnd () {
      this.endShow = false
      const p = this.endPick
      const year = this.endDate ? this.endDate.getFullYear() : new Date().getFullYear()
      const maxDay = new Date(year, p.month, 0).getDate()
      p.day = Math.max(1, Math.min(p.day, maxDay))
      this.endDate = new Date(year, p.month - 1, p.day, p.hour, p.minute, p.second)
      this.emitRange()
    },
    emitRange () {
      let start = this.startDate
      let end = this.endDate
      if (start && end && start.getTime() > end.getTime()) {
        start = new Date(end.getTime())
      }
      this.$emit('input', [toStr(start, false, this.precision), toStr(end, true, this.precision)])
    },
    buildColumns (month, year) {
      const maxDay = new Date(year, month, 0).getDate()
      const cols = [
        { type: 'month', label: '月', values: Array.from({ length: 12 }, (_, i) => i + 1) },
        { type: 'day', label: '日', values: Array.from({ length: maxDay }, (_, i) => i + 1) },
        { type: 'hour', label: '时', values: Array.from({ length: 24 }, (_, i) => i) },
        { type: 'minute', label: '分', values: Array.from({ length: 60 }, (_, i) => i) }
      ]
      if (this.precision === 'second') {
        cols.push({ type: 'second', label: '秒', values: Array.from({ length: 60 }, (_, i) => i) })
      }
      return cols
    },
    formatVal (val, type) {
      if (type === 'month' || type === 'day' || type === 'hour' || type === 'minute' || type === 'second') {
        return pad(val)
      }
      return val
    }
  }
}
</script>

<style scoped>
.range-picker {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
}

.rp-field {
  flex: 1;
  min-width: 0;
  height: 32px;
  padding: 0 10px;
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--border, #dcdfe6);
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
  font-size: 13px;
}

.rp-field-label {
  flex-shrink: 0;
  color: var(--text-3, #909399);
  font-size: 12px;
}

.rp-field-value {
  flex: 1;
  min-width: 0;
  color: var(--text-1, #303133);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rp-field-value.placeholder {
  color: var(--text-3, #a0a0a0);
}

.rp-sep {
  flex-shrink: 0;
  color: var(--text-3, #909399);
  font-size: 13px;
}

/* 自定义 picker 样式 */
.custom-picker {
  width: 100%;
  min-width: 300px;
}

.cp-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border, #ebeef5);
}

.cp-btn {
  font-size: 14px;
  color: var(--text-3, #909399);
  cursor: pointer;
  padding: 4px 8px;
}

.cp-btn--primary {
  color: var(--primary, #14b8a6);
  font-weight: 600;
}

.cp-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-1, #303133);
}

.cp-body {
  display: flex;
  height: 240px;
  overflow: hidden;
}

.cp-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border, #f0f2f5);
}

.cp-col:last-child {
  border-right: none;
}

.cp-col-label {
  text-align: center;
  font-size: 12px;
  color: var(--text-3, #909399);
  padding: 8px 0;
  border-bottom: 1px solid var(--border, #f0f2f5);
  background: #fafbfc;
}

.cp-col-scroll {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 4px 0;
}

.cp-item {
  text-align: center;
  padding: 10px 4px;
  font-size: 15px;
  color: var(--text-1, #303133);
  cursor: pointer;
  transition: all 0.15s;
  border-radius: 4px;
  margin: 0 6px;
}

.cp-item:hover {
  background: var(--primary-light, rgba(20, 184, 166, 0.08));
}

.cp-item.active {
  color: var(--primary, #14b8a6);
  font-weight: 600;
  background: var(--primary-light, rgba(20, 184, 166, 0.12));
}

/* 移动端窄屏 */
@media (max-width: 480px) {
  .rp-field {
    padding: 0 8px;
    height: 36px;
  }

  .custom-picker {
    min-width: 260px;
  }

  .cp-body {
    height: 220px;
  }

  .cp-item {
    padding: 12px 4px;
    font-size: 16px;
  }
}
</style>
