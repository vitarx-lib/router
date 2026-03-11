import { createRouter, defineRoutes } from 'vitarx-router'
import About from '../pages/About.jsx'
import Home from '../pages/Home.jsx'

const routes = defineRoutes(
  { path: '/', component: Home, meta: { title: 'Home' } },
  { path: '/about', component: About, meta: { title: 'About' } }
)

export const router = createRouter({
  routes,
  afterEach(to) {
    document.title = 'Vitarx Router Demo - ' + to.meta.title
  }
})
