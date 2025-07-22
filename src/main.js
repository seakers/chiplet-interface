import { createApp } from 'vue'
import App from './App.vue'
import store from './store'
import axios from 'axios'

// ✅ Set the base URL here:
axios.defaults.baseURL = 'http://localhost:8000/'

const app = createApp(App)
app.use(store)
app.config.globalProperties.$axios = axios  // optional but good if using this.$axios
app.mount('#app')
