# VitarxRouter

Vitarx前端框架的配套路由器
________________________________________________________________________

## 安装

```shell
npm install vitarx-router
```

## 简单示例

```ts
// main.ts
import { createRouter } from 'vitarx-router'
import Page1 from './Page/Page1.js'
import App from './App.js'

createRouter({
  mode: 'path', // 路由模式，可选值：hash、path、memory
  suffix: '*', // 允许任何后缀，例如 /x.html
  routes: [
    {
      name: 'home', // 命名路由
      path: '/',
      widget: lazy(() => import('./Pages/home.js')),// 代码分块懒加载
      children: [ // 嵌套路由
        {
          path: '/workbench',
          widget: lazy(() => import('./Pages/home/workbench.js')) // 直接使用小部件
        }
      ]
    },
    { // 动态路由
      path: '/page1/{name?}',// {name?}为可选参数，没有?为必填参数
      widget: Page1
    },
    { // 命名视图
      path: '/page3',
      widget: { // 命名视图
        'default': lazy(() => import('./Page/xxx.js')),
        'right': lazy(() => import('./Page/xxx.js'))
      }
    }
  ]
})
createApp('#root').render(App)
```
