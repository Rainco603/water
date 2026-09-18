import Vue from 'vue'
import VueRouter from 'vue-router'
import Home from '../views/Home.vue'
import Records from '../views/Records.vue'
import Alarms from '../views/Alarms.vue'
import Config from '../views/Config.vue'
import Statistics from '../views/Statistics.vue'
import TankDetail from '../views/TankDetail.vue'

Vue.use(VueRouter)

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
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
    path: '/config',
    name: 'Config',
    component: Config
  },
  {
    path: '/statistics',
    name: 'Statistics',
    component: Statistics
  },
  {
    path: '/tank/:id',
    name: 'TankDetail',
    component: TankDetail
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