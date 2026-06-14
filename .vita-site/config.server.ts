import { defaultTheme } from '@vita-site/theme-default/server'
import { defineConfig } from 'vita-site/server'
import { defineConfig as defineViteConfig } from 'vite'

export default defineConfig({
  title: 'Vitarx Router - Vitarx 的官方路由解决方案',
  keywords:
    'Vitarx Router, Vitarx路由, 前端路由, 文件系统路由, SPA路由, 路由守卫, 动态路由, 嵌套路由, 声明式路由, 编程式导航, Vite路由插件, definePage宏, 命名视图, 路由懒加载, Hash模式, History模式',
  description:
    'Vitarx Router 是 Vitarx 框架的官方路由解决方案，提供声明式路由配置、文件系统路由、导航守卫、动态路由、嵌套路由、命名视图等企业级路由能力。支持 Hash / History / Memory 三种模式，内置 Vite 文件路由插件与 definePage 编译时宏，助力构建高性能单页应用。',
  injectHead: [`<link rel="icon" href="/favicon.ico" />`],
  docDirs: [
    { dir: 'docs/guide', prefix: '/guide' },
    { dir: 'docs/api', prefix: '/api' }
  ],
  markdownIt: {
    shikiConfig: {
      langs: ['json', 'nginx', 'apache']
    }
  },
  plugins: [
    defaultTheme({
      title: 'Vitarx Router',
      color: '#6c5ce7',
      navLinks: [
        { text: '指南', link: '/guide' },
        { text: 'API', link: '/api' }
      ],
      libLink: 'https://github.com/vitarx-lib/router',
      edit: 'https://github.com/vitarx-lib/router/edit/main/',
      hero: {
        text: 'Vitarx 的官方路由解决方案',
        actions: [
          { text: '快速开始', link: '/guide', theme: 'primary' },
          {
            text: '代码仓库',
            link: 'https://github.com/vitarx-lib/router',
            theme: 'secondary',
            target: '_blank'
          }
        ]
      },
      features: [
        {
          icon: '🗂️',
          title: '文件系统路由',
          details:
            '基于 Vite 插件自动扫描页面目录生成路由配置，支持 definePage 编译时宏、布局路由、命名视图与分组排序，零配置即可开箱即用。'
        },
        {
          icon: '🛡️',
          title: '完善的导航守卫',
          details:
            '提供全局前置/后置守卫、路由级 beforeEnter 守卫、组件内 onBeforeRouteLeave 与 onBeforeRouteUpdate 守卫，覆盖所有导航拦截场景。'
        },
        {
          icon: '🧩',
          title: '灵活的路由配置',
          details:
            '支持动态参数、可选参数、正则约束、嵌套路由、命名路由、路由别名、重定向与命名视图，满足从简单到复杂的各类路由需求。'
        },
        {
          icon: '🔀',
          title: '多种路由模式',
          details:
            '内置 Hash、History、Memory 三种路由模式，适配浏览器 SPA、服务端渲染（SSR）与测试环境，可按需切换。'
        },
        {
          icon: '⚡️',
          title: '编程式导航',
          details:
            '提供 push、replace、go、back、forward 等导航 API，导航结果支持 6 种状态码判断，精准掌控导航流程。'
        },
        {
          icon: '🔧',
          title: '高度可扩展',
          details:
            '文件路由支持自定义 pageParser、groupParser、transform 与 extendRoute 钩子，路由元数据与类型均可扩展，适配各种业务场景。'
        }
      ],
      footer:
        '<a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">黔ICP备2024032832号</a>'
    })
  ],
  vite: defineViteConfig({
    server: {
      host: '0.0.0.0',
      port: 4000
    },
    preview: {
      host: '0.0.0.0',
      port: 4173
    },
    build: {
      cssCodeSplit: false
    }
  })
})
