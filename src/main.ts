import { createPinia } from 'pinia'
import { createApp } from 'vue'
import 'tdesign-vue-next/es/style/index.css'
import './style.css'
import App from './App.vue'
import { initializeTiantianDeviceId } from './domains/funds/services/tiantian/tiantianDeviceId.ts'

initializeTiantianDeviceId()
const app = createApp(App)

app.use(createPinia())
app.mount('#app')
