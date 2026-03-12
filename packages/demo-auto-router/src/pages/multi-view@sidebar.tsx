import type { View } from 'vitarx'
import { RouterLink } from 'vitarx-router'

const quickLinks = [
  { name: '静态路由', path: '/about' },
  { name: '动态路由', path: '/user/123' },
  { name: '嵌套路由', path: '/users' },
  { name: '布局路由', path: '/admin' }
]

export default function MultiViewSidebar(): View {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #f8f9fa 0%, #e9ecef 100%)',
        padding: '20px'
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
        }}
      >
        <div
          style={{
            display: 'inline-block',
            padding: '6px 12px',
            backgroundColor: '#fce4ec',
            color: '#c2185b',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '600',
            marginBottom: '15px'
          }}
        >
          👁️ 命名视图 - sidebar
        </div>

        <h3
          style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#333',
            marginBottom: '15px'
          }}
        >
          快速导航
        </h3>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          {quickLinks.map((link, idx) => (
            <RouterLink
              key={idx}
              to={link.path}
              style={{
                display: 'block',
                padding: '10px 14px',
                backgroundColor: '#f8f9ff',
                color: '#667eea',
                textDecoration: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                border: '1px solid #e8ecf4',
                transition: 'all 0.2s'
              }}
            >
              {link.name}
            </RouterLink>
          ))}
        </div>

        <div
          style={{
            marginTop: '20px',
            padding: '15px',
            backgroundColor: '#e3f2fd',
            borderRadius: '12px',
            fontSize: '13px',
            color: '#1565c0'
          }}
        >
          <strong>💡 提示：</strong>
          <p style={{ margin: '8px 0 0 0', lineHeight: '1.6' }}>
            这是一个命名视图示例。在父组件中可以通过 RouterView 的 name 属性来渲染不同的命名视图。
          </p>
        </div>
      </div>
    </div>
  )
}
