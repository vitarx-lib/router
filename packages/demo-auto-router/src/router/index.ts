import { createRouter } from 'vitarx-router'
import { handleHotUpdate, routes } from 'vitarx-router/auto-routes'

export const router = createRouter({
  routes
})

// Hot module replacement
if (import.meta.hot) {
  handleHotUpdate(router)
}
