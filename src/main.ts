import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import 'element-plus/dist/index.css'
import './styles/global.css'
import App from './App.vue'
import router from './router'

const app = createApp(App)
const pinia = createPinia()

// 注册所有 Element Plus 图标
Object.entries(ElementPlusIconsVue).forEach(([key, component]) => {
  app.component(key, component)
})

app.use(pinia)
app.use(router)
app.use(ElementPlus, {
  // Element Plus 配置
  size: 'default',
  zIndex: 3000
})

app.mount('#app')
