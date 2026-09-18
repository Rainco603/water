<template>
  <!-- eslint-disable vue/no-mutating-props -->
  <div class="cond-group">
    <div class="cond-group-bar">
      <span class="cond-bar-label">关系</span>
      <el-radio-group v-model="group.logic" size="mini">
        <el-radio-button label="and">且</el-radio-button>
        <el-radio-button label="or">或</el-radio-button>
      </el-radio-group>
      <el-button size="mini" type="text" icon="el-icon-plus" @click="addLeaf">条件</el-button>
      <el-button size="mini" type="text" icon="el-icon-plus" @click="addGroup">分组</el-button>
      <el-button v-if="removable" size="mini" type="text" style="color: #f56c6c;" icon="el-icon-delete" @click="$emit('remove')">删除分组</el-button>
    </div>

    <div class="cond-node" v-for="(node, i) in group.checks" :key="node._uid || i">
      <!-- 嵌套分组：递归渲染 -->
      <rule-condition-group
        v-if="isGroup(node)"
        :group="node"
        :field-options="fieldOptions"
        :op-options="opOptions"
        :removable="true"
        @remove="removeNode(i)"
      />
      <!-- 叶子条件 -->
      <div v-else class="check-row">
        <el-select v-model="node.field" size="mini" filterable allow-create placeholder="字段" style="width: 130px;">
          <el-option v-for="f in fieldOptions" :key="f" :label="f" :value="f"></el-option>
        </el-select>
        <el-select v-model="node.op" size="mini" style="width: 90px;">
          <el-option v-for="op in opOptions" :key="op" :label="op" :value="op"></el-option>
        </el-select>
        <el-input v-model="node.value" size="mini" placeholder="阈值" style="width: 110px;"></el-input>
        <el-button size="mini" type="danger" plain icon="el-icon-delete" @click="removeNode(i)"></el-button>
      </div>
    </div>

    <div v-if="!group.checks.length" class="cond-empty">暂无条件，点击「条件」或「分组」添加</div>
  </div>
</template>

<script>
// 递归条件编辑器：group 是父组件 editRule.condition 的对象引用，组件直接修改其内部
// 属性（logic / checks）而非重新赋值 prop 本身，属于表单模型的常见双向编辑模式。
/* eslint-disable vue/no-mutating-props */
export default {
  name: 'RuleConditionGroup',
  props: {
    // 条件分组对象 { logic: 'and'|'or', checks: [叶子或分组] }，直接修改父组件 editRule.condition 的引用
    group: { type: Object, required: true },
    fieldOptions: { type: Array, default: () => [] },
    opOptions: { type: Array, default: () => ['>', '<', '>=', '<=', '==', '!='] },
    // 是否为可删除的嵌套分组（顶层 condition 不可删除）
    removable: { type: Boolean, default: false }
  },
  methods: {
    // 判断节点是嵌套分组（含 checks 数组）还是叶子条件（含 field/op/value）
    isGroup(node) {
      return node && Array.isArray(node.checks)
    },
    // 生成前端内部唯一 key，仅用于列表渲染，提交时会被清理掉
    genUid() {
      return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7)
    },
    addLeaf() {
      this.group.checks.push({ field: '', op: '>', value: '', _uid: this.genUid() })
    },
    addGroup() {
      this.group.checks.push({
        logic: 'and',
        checks: [{ field: '', op: '>', value: '', _uid: this.genUid() }],
        _uid: this.genUid()
      })
    },
    removeNode(i) {
      this.group.checks.splice(i, 1)
    }
  }
}
</script>

<style scoped>
.cond-group {
  border: 1px dashed #dcdfe6;
  border-radius: 8px;
  padding: 10px;
  background: #fafbfc;
}

.cond-group-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.cond-bar-label {
  font-size: 12px;
  color: #909399;
}

.cond-node {
  margin: 6px 0;
}

.cond-node .cond-group {
  margin-left: 4px;
}

.check-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.cond-empty {
  font-size: 12px;
  color: #c0c4cc;
  padding: 6px 0;
}

@media (max-width: 640px) {
  .check-row {
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
  }
  .check-row .el-select,
  .check-row .el-input {
    width: 100% !important;
  }
}
</style>
