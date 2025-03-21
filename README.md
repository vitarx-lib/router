# VitarxRouter

`Vitarx` 前端框架的配套路由器[文档地址](https://vitarx.cn/router)
________________________________________________________________________

## 安装

```shell
npm install vitarx-router
```

## 简单示例

```js
import { defineRoutes, useRouter } from 'vitarx-router'
import AppHomePage from '@/pages/Home/index.js'

// 定义路由线路
const routes = defineRoutes(
  {
    path: '/',
    name: 'home',
    widget: AppHomePage
  },
  {
    path: '/about',
    name: 'about',
    widget: () => import('@/pages/About/index.js') // 懒加载
  }
)

// 创建路由器
const router = createRouter({
  routes: Routes,
  mode: 'path', // 使用路径模式，除了此模式还支持 hash , memory 模式，path和hash模式只能在浏览器端使用，依赖 window.history Api
  /** 其他配置查看文档 */
})

// 导航
useRouter().push('/about') // 导航到路径
useRouter().push({ name: 'about' }) // 导航到路由名称
useRouter().psuh('about') // 不以/开头的字符串，也会被认为是路由名称
useRouter().replace('/about') // 替换路由，参数规则同push一致
```

