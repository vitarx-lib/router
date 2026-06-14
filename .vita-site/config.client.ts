import { defineConfig } from 'vita-site'
import { isString } from 'vitarx'

export default defineConfig({
  enhanceApp: (_app, { router }) => {
    router.afterEach(to => {
      const title = to.meta['title']
      if (isString(title)) {
        document.title = `${title} - Vitarx Router`
      } else {
        document.title = 'Vitarx Router - Vitarx 的官方路由解决方案'
      }
    })
  }
})
