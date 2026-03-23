import type { View } from 'vitarx'
import { RouterLink } from 'vitarx-router'

const routeCategories = [
  {
    title: '📄 静态路由',
    desc: '最基本的文件路由约定，一个文件对应一个路由',
    routes: [
      { path: '/about', name: '关于页面', file: 'about.tsx → /about' },
      { path: '/contact', name: '联系页面', file: 'contact.tsx → /contact' }
    ]
  },
  {
    title: '🔀 动态路由',
    desc: '使用 [param] 语法定义动态参数',
    routes: [
      { path: '/user/123', name: '用户详情 (ID=123)', file: 'user/[id].tsx → /user/{id}' },
      { path: '/post/hello-world', name: '文章详情', file: 'post/[slug].tsx → /post/{slug}' }
    ]
  },
  {
    title: '📁 嵌套路由',
    desc: '目录结构自动映射为嵌套路由',
    routes: [
      { path: '/users', name: '用户列表', file: 'users/index.tsx → /users' },
      { path: '/users/profile', name: '用户资料', file: 'users/profile.tsx → /users/profile' },
      {
        path: '/users/settings',
        name: '用户设置',
        file: 'users/settings/index.tsx → /users/settings'
      }
    ]
  },
  {
    title: '🎨 布局路由',
    desc: '同名文件+目录组合，文件作为布局组件',
    routes: [
      { path: '/admin', name: '仪表盘', file: 'admin/index.tsx' },
      { path: '/admin/users', name: '用户管理', file: 'admin/users.tsx' },
      { path: '/admin/posts', name: '文章管理', file: 'admin/posts.tsx' }
    ]
  },
  {
    title: '👁️ 命名视图',
    desc: '使用 @view 语法定义多个命名视图',
    routes: [
      { path: '/multi-view', name: '多视图页面', file: 'multi-view.tsx + multi-view@sidebar.tsx' }
    ]
  },
  {
    title: '⚙️ definePage 宏',
    desc: '在组件内自定义路由配置',
    routes: [
      { path: '/custom-route', name: '自定义路由配置', file: 'custom-route.tsx (使用 definePage)' }
    ]
  }
]

export default function Home(): View {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '40px 20px'
      }}
    >
      <div
        style={{
          maxWidth: '900px',
          margin: '0 auto'
        }}
      >
        <div
          style={{
            textAlign: 'center',
            marginBottom: '40px'
          }}
        >
          <h1
            style={{
              fontSize: '42px',
              fontWeight: '700',
              color: 'white',
              marginBottom: '15px',
              textShadow: '0 2px 10px rgba(0,0,0,0.2)'
            }}
          >
            Vitarx Router 文件路由示例
          </h1>
          <p
            style={{
              fontSize: '18px',
              color: 'rgba(255,255,255,0.9)',
              maxWidth: '600px',
              margin: '0 auto',
              lineHeight: '1.6'
            }}
          >
            本示例展示了文件路由系统支持的所有约定，点击下方链接查看不同类型的路由实现
          </p>
        </div>

        {routeCategories.map((category, idx) => (
          <div
            key={idx}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '20px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)'
            }}
          >
            <h2
              style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#333',
                marginBottom: '8px'
              }}
            >
              {category.title}
            </h2>
            <p
              style={{
                fontSize: '14px',
                color: '#666',
                marginBottom: '16px'
              }}
            >
              {category.desc}
            </p>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '10px'
              }}
            >
              {category.routes.map((route, ridx) => (
                <RouterLink
                  key={ridx}
                  to={route.path}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '10px 16px',
                    backgroundColor: '#f8f9ff',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    color: '#667eea',
                    fontSize: '14px',
                    fontWeight: '500',
                    border: '1px solid #e8ecf4',
                    transition: 'all 0.2s'
                  }}
                >
                  {route.name}
                </RouterLink>
              ))}
            </div>
            <div
              style={{
                marginTop: '12px',
                padding: '12px',
                backgroundColor: '#f5f7ff',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#888',
                fontFamily: 'monospace'
              }}
            >
              {category.routes.map(r => r.file).join(' | ')}
            </div>
          </div>
        ))}

        <div
          style={{
            textAlign: 'center',
            padding: '20px',
            color: 'rgba(255,255,255,0.8)',
            fontSize: '14px'
          }}
        >
          <p>💡 提示：查看 pages 目录结构了解文件路由的实现方式</p>
        </div>
      </div>
    </div>
  )
}
