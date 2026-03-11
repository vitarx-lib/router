import App from '@/App.js'
import { router } from '@/router/index.js'
import { createApp } from 'vitarx'

createApp(App).use(router).mount('#root')
