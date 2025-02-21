import { createApp } from 'vitarx'
import { createRouter, lazy } from '../lib/index.js'
import App from './App.js'
import Page1 from './Page/Page1.js'
import Page2 from './Page/Page2.js'

const router = createRouter({
  base: '/',
  mode: 'path',
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
  ],
  missing: lazy(() => import('./Page/404.js'))
})
router.initialize()
console.log(router.currentRouteLocation.index)
createApp('#root').render(App)
