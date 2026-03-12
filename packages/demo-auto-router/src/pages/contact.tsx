import type { View } from 'vitarx'
import { RouterLink } from 'vitarx-router'

export default function Contact(): View {
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
          📄 静态路由示例
        </div>

        <h1
          style={{
            fontSize: '32px',
            fontWeight: '700',
            color: '#333',
            marginBottom: '15px'
          }}
        >
          联系页面
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
            pages/contact.tsx → /contact
          </code>
        </div>

        <p style={{ fontSize: '15px', color: '#666', lineHeight: '1.8', marginBottom: '20px' }}>
          另一个静态路由示例。每个独立的页面文件都会生成对应的路由配置。
        </p>

        <div
          style={{
            padding: '20px',
            backgroundColor: '#e3f2fd',
            borderRadius: '12px',
            marginBottom: '30px'
          }}
        >
          <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#1565c0', marginBottom: '10px' }}>
            📁 目录结构示例
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
          >{`pages/
├── index.tsx      → /
├── about.tsx      → /about
└── contact.tsx    → /contact`}</pre>
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
