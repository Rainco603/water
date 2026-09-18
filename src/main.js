import Vue from 'vue'
import App from './App.vue'
import router from './router' // <-- 新增这一行：引入路由配置
import ElementUI from 'element-ui'
import 'element-ui/lib/theme-chalk/index.css'
import axios from './utils/request' // <-- 确保引入了 axios 封装
import './assets/styles/global.css' // <-- 引入全局样式（浅色青绿主题）

Vue.config.productionTip = false

// 挂载 ElementUI
Vue.use(ElementUI)

// 挂载 axios 到 Vue 原型，这样所有组件都能用 this.$http 访问
Vue.prototype.$http = axios

new Vue({
  router, // <-- 新增这一行：将路由实例挂载到 Vue 实例
  render: h => h(App)
}).$mount('#app')
