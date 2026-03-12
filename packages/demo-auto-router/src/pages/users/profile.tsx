import type { View } from 'vitarx'
import { RouterLink } from 'vitarx-router'

export default function UserProfile(): View {
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
          用户资料
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
            pages/users/profile.tsx → /users/profile
          </code>
        </div>

        <p style={{ fontSize: '15px', color: '#666', lineHeight: '1.8', marginBottom: '20px' }}>
          这是 <code style={{ backgroundColor: '#f0f0f5', padding: '2px 6px', borderRadius: '4px' }}>users</code> 目录下的子路由页面。
          目录内的文件会自动成为该目录路由的子路由。
        </p>

        <div
          style={{
            padding: '20px',
            backgroundColor: '#e8f5e9',
            borderRadius: '12px',
            marginBottom: '20px'
          }}
        >
          <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#2e7d32', marginBottom: '10px' }}>
            用户信息
          </h4>
          <div style={{ fontSize: '14px', color: '#666', lineHeight: '1.8' }}>
            <p style={{ margin: '0 0 8px 0' }}><strong>姓名:</strong> 张三</p>
            <p style={{ margin: '0 0 8px 0' }}><strong>邮箱:</strong> zhangsan@example.com</p>
            <p style={{ margin: '0 0 8px 0' }}><strong>电话:</strong> 138-0000-0000</p>
            <p style={{ margin: 0 }}><strong>地址:</strong> 北京市朝阳区xxx街道</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <RouterLink
            to="/users"
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
            ← 返回列表
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
