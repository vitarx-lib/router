# 文件路由转换规则

## 基本规则

1. **同名文件+目录组合（布局路由）**
   - 当 `xxx.jsx` 和 `xxx/` 目录同时存在时
   - `xxx.jsx` 作为布局组件（父路由的 component）
   - `xxx/` 目录内的页面文件作为子路由
   - `xxx/index.jsx` 的 path 为 `index`
   - 父路由自动添加 `redirect` 重定向到 `index`

2. **纯目录**
   - 当只有 `xxx/` 目录存在时
   - 目录内的 `index.jsx` 作为该路由的 component
   - 目录内的其他页面文件作为子路由

3. **无效目录**
   - 目录既没有同名文件，也没有任何页面文件
   - 该目录被忽略

4. **纯文件**
   - 当只有 `xxx.jsx` 文件存在时
   - 直接作为一个 Route

5. **同级文件名冲突**
   - 当 `users.jsx` 和 `users/` 目录同时存在时，`users.jsx` 作为布局组件
   - 当 `users.jsx` 和 `users.tsx` 同时存在时，抛出警告日志，忽略后者

6. **组件导入路径**
   - 导入路径是基于系统的绝对路径
   - 根据插件配置生成 `lazy(()=>import('路径'))` | `'路径'`
---

## 示例1：目录 + index + 子页面

```PlainText
src/pages/
├── users/
    ├── profile.jsx
    └── index.jsx
```

生成：

```TypeScript
[{
  path: '/users',
  redirect: '/users/index',
  children: [
    { path: 'index', component: lazy(() => import('src/pages/users/index.jsx')) },
    { path: 'profile', component: lazy(() => import('src/pages/users/profile.jsx')) }
  ]
}]
```

## 示例2：目录 + 子页面 （无index）

```PlainText
src/pages/
├── users/
    ├── profile1.jsx
    └── profile2.jsx
```

生成：
```TypeScript
[{
  path: '/users',
  children: [
    { path: 'profile1', component: lazy(() => import('src/pages/users/profile1.jsx')) },
    { path: 'profile2', component: lazy(() => import('src/pages/users/profile2.jsx')) }
  ]
}]

```

## 示例3：目录 + index

```PlainText
src/pages/
├── users/
│   └── index.jsx
```

生成：

```TypeScript
[{
  path: '/users',
  component: lazy(() => import('src/pages/users/index.jsx'))
}]
```

## 示例4：嵌套目录

```PlainText
src/pages/
└── users/
    ├── index.jsx
    ├── profile.jsx
    └── settings/
        ├── index.jsx
        └── security.jsx
```

生成：

```TypeScript
[{
  path: '/users',
  redirect: '/users/index',
  children: [
    {
      path: 'profile',
      component: lazy(() => import('src/pages/users/profile.jsx'))
    },
    {
      path: 'settings',
      component: lazy(() => import('src/pages/users/settings/index.jsx')),
      children: [
        {
          path: 'security',
          component: lazy(() => import('src/pages/users/settings/security.jsx'))
        }
      ]
    }
  ]
}]
```

## 示例5：纯文件

```PlainText
src/pages/
└── users.jsx
```

生成：

```TypeScript
[{
  path: '/users',
  component: lazy(() => import('src/pages/users.jsx'))
}]
```

## 示例6：无效目录

```PlainText
src/pages/
├── users/
│   └── (空或无有效页面文件)
```

生成：
```TypeScript
[]
```

## 示例7：同名文件 + 目录（布局路由）

```PlainText
src/pages/
├── users.jsx        ← 布局组件
└── users/
    ├── index.jsx    ← 默认子路由
    └── profile.jsx  ← 其他子路由
```

生成：

```TypeScript
[{
  path: '/users',
  component: lazy(() => import('src/pages/users.jsx')),
  redirect: '/users/index',
  children: [
    { path: 'index', component: lazy(() => import('src/pages/users/index.jsx')) },
    { path: 'profile', component: lazy(() => import('src/pages/users/profile.jsx')) }
  ]
}]
```

## 示例8：同名文件 + 目录（无 index）

```PlainText
src/pages/
├── users.jsx        ← 布局组件
└── users/
    └── profile.jsx  ← 子路由
```

生成：

```TypeScript
[{
  path: '/users',
  component: lazy(() => import('src/pages/users.jsx')),
  children: [
    { path: 'profile', component: lazy(() => import('src/pages/users/profile.jsx')) }
  ]
}]
```

## 示例9：同级文件名冲突（抛出警告）

```PlainText
src/pages/
├── users.jsx
└── users.tsx
```

处理：抛出警告日志，忽略后者（users.tsx）

生成：

```TypeScript
[{
  path: '/users',
  component: lazy(() => import('src/pages/users.jsx'))
}]
```
