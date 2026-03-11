import { createRouter, defineRoutes } from 'vitarx-router'
import About from '../pages/About.jsx'
import Home from '../pages/Home.jsx'

const routes = defineRoutes({ path: '/', component: Home }, { path: '/about', component: About })

export const router = createRouter({ routes })
