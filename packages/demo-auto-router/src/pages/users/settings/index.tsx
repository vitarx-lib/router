import type { View } from 'vitarx'
import { RouterLink } from 'vitarx-router'

export default function UserSettings(): View {
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
          📁 嵌套路由示例（多级嵌套）
        </div>

        <h1
          style={{
            fontSize: '32px',
            fontWeight: '700',
            color: '#333',
            marginBottom: '15px'
          }}
        >
          用户设置
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
            pages/users/settings/index.tsx → /users/settings
          </code>
        </div>

        <p style={{ fontSize: '15px', color: '#666', lineHeight: '1.8', marginBottom: '20px' }}>
          这是多级嵌套路由示例。目录可以无限层级嵌套，每一级都会自动生成对应的路由路径。
        </p>

        <div
          style={{
            padding: '20px',
            backgroundColor: '#fce4ec',
            borderRadius: '12px',
            marginBottom: '20px'
          }}
        >
          <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#c2185b', marginBottom: '15px' }}>
            设置选项
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#666' }}>
              <input type="checkbox" defaultChecked /> 接收邮件通知
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#666' }}>
              <input type="checkbox" /> 接收短信通知
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#666' }}>
              <input type="checkbox" defaultChecked /> 公开个人资料
            </label>
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
            💡 嵌套路由规则
          </h4>
          <ul style={{ margin: 0, paddingLeft: '20px', color: '#666', fontSize: '14px', lineHeight: '1.8' }}>
            <li>目录结构直接映射为路由层级</li>
            <li>每个目录的 index.tsx 作为该层级的默认路由</li>
            <li>支持任意深度的嵌套</li>
          </ul>
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
