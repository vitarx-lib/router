import type { View } from 'vitarx'
import { RouterLink, RouterView, useRoute } from 'vitarx-router'

export default function AdminLayout(): View {
  const route = useRoute()

  const menuItems = [
    { path: '/admin', name: '仪表盘', icon: '📊' },
    { path: '/admin/users', name: '用户管理', icon: '👥' },
    { path: '/admin/posts', name: '文章管理', icon: '📝' }
  ]

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f5f7fa'
      }}
    >
      <div
        style={{
          display: 'flex',
          minHeight: '100vh'
        }}
      >
        <aside
          style={{
            width: '250px',
            background: 'linear-gradient(180deg, #2d3748 0%, #1a202c 100%)',
            padding: '20px 0',
            color: 'white',
            flexShrink: 0
          }}
        >
          <div
            style={{
              padding: '0 20px 20px',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              marginBottom: '20px'
            }}
          >
            <h1 style={{ fontSize: '20px', fontWeight: '600', margin: 0 }}>管理后台</h1>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', margin: '5px 0 0 0' }}>
              布局路由示例
            </p>
          </div>

          <nav>
            {menuItems.map(item => (
              <RouterLink
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 20px',
                  color: route.path === item.path ? '#fff' : 'rgba(255,255,255,0.7)',
                  textDecoration: 'none',
                  backgroundColor: route.path === item.path ? 'rgba(255,255,255,0.1)' : 'transparent',
                  borderLeft: route.path === item.path ? '3px solid #667eea' : '3px solid transparent',
                  transition: 'all 0.2s'
                }}
              >
                <span>{item.icon}</span>
                <span>{item.name}</span>
              </RouterLink>
            ))}
          </nav>

          <div
            style={{
              position: 'absolute',
              bottom: '20px',
              left: '20px',
              right: '20px'
            }}
          >
            <RouterLink
              to="/"
              style={{
                display: 'block',
                padding: '10px',
                textAlign: 'center',
                color: 'rgba(255,255,255,0.6)',
                textDecoration: 'none',
                fontSize: '13px',
                borderTop: '1px solid rgba(255,255,255,0.1)',
                paddingTop: '15px'
              }}
            >
              ← 返回首页
            </RouterLink>
          </div>
        </aside>

        <main
          style={{
            flex: 1,
            padding: '30px',
            overflow: 'auto'
          }}
        >
          <div
            style={{
              padding: '15px 20px',
              backgroundColor: '#e8f5e9',
              borderRadius: '12px',
              marginBottom: '20px',
              borderLeft: '4px solid #2e7d32'
            }}
          >
            <div style={{ fontSize: '13px', color: '#2e7d32', fontWeight: '600' }}>
              🎨 布局路由示例
            </div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
              <code style={{ backgroundColor: '#f0f0f5', padding: '2px 6px', borderRadius: '4px' }}>
                admin.tsx + admin/ 目录
              </code>
              {' '}→ admin.tsx 作为布局组件，admin/ 目录内的文件作为子路由
            </div>
          </div>

          <RouterView />
        </main>
      </div>
    </div>
  )
}
