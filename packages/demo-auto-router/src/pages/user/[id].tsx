import type { View } from 'vitarx'
import { useRoute, RouterLink } from 'vitarx-router'

export default function UserDetail(): View {
  const route = useRoute()
  const userId = route.params.id

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
          maxWidth: '700px',
          margin: '0 auto',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '20px',
          padding: '40px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)'
        }}
      >
        <div
          style={{
            display: 'inline-block',
            padding: '6px 12px',
            backgroundColor: '#fff3e0',
            color: '#e65100',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '600',
            marginBottom: '20px'
          }}
        >
          🔀 动态路由示例
        </div>

        <h1
          style={{
            fontSize: '32px',
            fontWeight: '700',
            color: '#333',
            marginBottom: '15px'
          }}
        >
          用户详情
        </h1>

        <div
          style={{
            padding: '20px',
            backgroundColor: '#f8f9ff',
            borderRadius: '12px',
            marginBottom: '20px',
            borderLeft: '4px solid #667eea'
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#333', marginBottom: '10px' }}>
            文件路由约定
          </h3>
          <code
            style={{
              display: 'block',
              padding: '12px',
              backgroundColor: '#2d3748',
              color: '#e2e8f0',
              borderRadius: '8px',
              fontSize: '13px',
              fontFamily: 'monospace'
            }}
          >
            pages/user/[id].tsx → /user/{'{'}id{'}'}
          </code>
        </div>

        <div
          style={{
            padding: '20px',
            backgroundColor: '#e3f2fd',
            borderRadius: '12px',
            marginBottom: '20px'
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1565c0', marginBottom: '10px' }}>
            当前路由参数
          </h3>
          <div style={{ fontSize: '14px', color: '#666' }}>
            <p style={{ margin: '0 0 8px 0' }}>
              <strong>用户 ID:</strong> {userId}
            </p>
            <p style={{ margin: 0 }}>
              <strong>完整路径:</strong> {route.path}
            </p>
          </div>
        </div>

        <p style={{ fontSize: '15px', color: '#666', lineHeight: '1.8', marginBottom: '20px' }}>
          使用 <code style={{ backgroundColor: '#f0f0f5', padding: '2px 6px', borderRadius: '4px' }}>[id]</code> 语法定义动态参数。
          方括号内的名称会自动转换为路由参数，可通过 <code style={{ backgroundColor: '#f0f0f5', padding: '2px 6px', borderRadius: '4px' }}>route.params.id</code> 访问。
        </p>

        <div
          style={{
            padding: '20px',
            backgroundColor: '#fce4ec',
            borderRadius: '12px',
            marginBottom: '20px'
          }}
        >
          <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#c2185b', marginBottom: '10px' }}>
            💡 尝试不同的 ID
          </h4>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <RouterLink
              to="/user/123"
              style={{
                padding: '8px 16px',
                backgroundColor: '#fff',
                color: '#667eea',
                textDecoration: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                border: '1px solid #667eea'
              }}
            >
              用户 123
            </RouterLink>
            <RouterLink
              to="/user/456"
              style={{
                padding: '8px 16px',
                backgroundColor: '#fff',
                color: '#667eea',
                textDecoration: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                border: '1px solid #667eea'
              }}
            >
              用户 456
            </RouterLink>
            <RouterLink
              to="/user/abc"
              style={{
                padding: '8px 16px',
                backgroundColor: '#fff',
                color: '#667eea',
                textDecoration: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                border: '1px solid #667eea'
              }}
            >
              用户 abc
            </RouterLink>
          </div>
        </div>

        <RouterLink
          to="/"
          style={{
            display: 'inline-block',
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '30px',
            fontSize: '14px',
            fontWeight: '600',
            boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
          }}
        >
          ← 返回首页
        </RouterLink>
      </div>
    </div>
  )
}
