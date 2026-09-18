import Vue from 'vue'
import VueRouter from 'vue-router'
import Monitor from '../views/Monitor.vue'
import Records from '../views/Records.vue'
import Alarms from '../views/Alarms.vue'
import Statistics from '../views/Statistics.vue'
import Control from '../views/Control.vue'
import Rules from '../views/Rules.vue'
import Ops from '../views/Ops.vue'
import TankDetail from '../views/TankDetail.vue'

Vue.use(VueRouter)

const routes = [
  {
    path: '/',
    name: 'Monitor',
    component: Monitor
  },
  {
    path: '/control',
    name: 'Control',
    component: Control
  },
  {
    path: '/records',
    name: 'Records',
    component: Records
  },
  {
    path: '/alarms',
    name: 'Alarms',
    component: Alarms
  },
  {
    path: '/rules',
    name: 'Rules',
    component: Rules
  },
  {
    path: '/statistics',
    name: 'Statistics',
    component: Statistics
  },
  {
    path: '/ops',
    name: 'Ops',
    component: Ops
  },
  {
    path: '/tank/:id',
    name: 'TankDetail',
    component: TankDetail,
    meta: { hideTab: true }
  }
]

const router = new VueRouter({
  // mode: 'history', // 需要去掉url#号就打开
  routes
})

// 解决重复push报错
const originalPush = VueRouter.prototype.push
VueRouter.prototype.push = function push(location) {
  return originalPush.call(this, location).catch(err => err)
}

export default router
