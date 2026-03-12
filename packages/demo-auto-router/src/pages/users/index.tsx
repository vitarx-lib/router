import type { View } from 'vitarx'
import { RouterLink } from 'vitarx-router'

const users = [
  { id: 1, name: '张三', email: 'zhangsan@example.com' },
  { id: 2, name: '李四', email: 'lisi@example.com' },
  { id: 3, name: '王五', email: 'wangwu@example.com' }
]

export default function UsersList(): View {
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
            backgroundColor: '#e8f5e9',
            color: '#2e7d32',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '600',
            marginBottom: '20px'
          }}
        >
          📁 嵌套路由示例
        </div>

        <h1
          style={{
            fontSize: '32px',
            fontWeight: '700',
            color: '#333',
            marginBottom: '15px'
          }}
        >
          用户列表
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
            pages/users/index.tsx → /users
          </code>
        </div>

        <p style={{ fontSize: '15px', color: '#666', lineHeight: '1.8', marginBottom: '20px' }}>
          这是 <code style={{ backgroundColor: '#f0f0f5', padding: '2px 6px', borderRadius: '4px' }}>users</code> 目录下的索引页面。
          目录结构会自动映射为嵌套路由。
        </p>

        <div
          style={{
            padding: '20px',
            backgroundColor: '#e3f2fd',
            borderRadius: '12px',
            marginBottom: '20px'
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1565c0', marginBottom: '15px' }}>
            用户列表
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {users.map(user => (
              <div
                key={user.id}
                style={{
                  padding: '15px',
                  backgroundColor: '#fff',
                  borderRadius: '8px',
                  border: '1px solid #e0e0e0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontWeight: '600', color: '#333' }}>{user.name}</div>
                  <div style={{ fontSize: '13px', color: '#666' }}>{user.email}</div>
                </div>
                <RouterLink
                  to={`/user/${user.id}`}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#667eea',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '6px',
                    fontSize: '13px'
                  }}
                >
                  查看详情
                </RouterLink>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            padding: '20px',
            backgroundColor: '#fff3e0',
            borderRadius: '12px',
            marginBottom: '20px'
          }}
        >
          <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#e65100', marginBottom: '10px' }}>
            📁 目录结构
          </h4>
          <pre
            style={{
              margin: 0,
              padding: '12px',
              backgroundColor: '#2d3748',
              color: '#e2e8f0',
              borderRadius: '8px',
              fontSize: '13px',
              fontFamily: 'monospace',
              overflow: 'auto'
            }}
          >{`pages/users/
├── index.tsx        → /users (当前页面)
├── profile.tsx      → /users/profile
└── settings/
    └── index.tsx    → /users/settings`}</pre>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <RouterLink
            to="/users/profile"
            style={{
              padding: '10px 20px',
              backgroundColor: '#f8f9ff',
              color: '#667eea',
              textDecoration: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              border: '1px solid #667eea'
            }}
          >
            用户资料 →
          </RouterLink>
          <RouterLink
            to="/users/settings"
            style={{
              padding: '10px 20px',
              backgroundColor: '#f8f9ff',
              color: '#667eea',
              textDecoration: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              border: '1px solid #667eea'
            }}
          >
            用户设置 →
          </RouterLink>
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
