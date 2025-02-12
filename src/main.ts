import { createApp } from 'vitarx'
import { createRouter } from '../lib/index.js'
import App from './App.js'
import Page1 from './Page/Page1.js'
import Page2 from './Page/Page2.js'

const router = createRouter({
  base: '/',
  mode: undefined,
  routes: [
    {
      name: 'home',
      path: '/test',
      widget: Page1
    },
    {
      name: 'page1',
      path: '/index',
      widget: Page2
    }
  ]
})
router.initialize()
console.log(router)
createApp('#root').render(App)
