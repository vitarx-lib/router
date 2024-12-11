import { createApp } from 'vitarx'
import App from './App.js'
import HistoryRouter from '../lib/router/history-router.js'
import Page1 from './Page/Page1.js'
import Page2 from './Page/Page2.js'

const router = new HistoryRouter({
  base: '/',
  routes: [
    {
      name: 'home',
      path: '/test',
      widget: Page1,
      children: [
        {
          name: 'page2',
          path: '/page2',
          widget: Page2
        }
      ]
    },
    {
      name: 'page1',
      path: '/page1-{name?}',
      widget: Page2
    }
  ]
})
console.log(router.routes)
createApp('#root').render(App)
