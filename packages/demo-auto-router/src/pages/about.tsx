import { type View } from 'vitarx'
import { RouterLink } from 'vitarx-router'

export default function About(): View {
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
          关于页面
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
            pages/about.tsx → /about
          </code>
        </div>

        <p style={{ fontSize: '15px', color: '#666', lineHeight: '1.8', marginBottom: '20px' }}>
          这是最基本的文件路由约定。在{' '}
          <code style={{ backgroundColor: '#f0f0f5', padding: '2px 6px', borderRadius: '4px' }}>
            pages
          </code>{' '}
          目录下创建一个文件，文件名会自动映射为路由路径。
        </p>

        <div
          style={{
            padding: '20px',
            backgroundColor: '#fff3e0',
            borderRadius: '12px',
            marginBottom: '30px'
          }}
        >
          <h4
            style={{ fontSize: '14px', fontWeight: '600', color: '#e65100', marginBottom: '10px' }}
          >
            💡 规则说明
          </h4>
          <ul
            style={{
              margin: 0,
              paddingLeft: '20px',
              color: '#666',
              fontSize: '14px',
              lineHeight: '1.8'
            }}
          >
            <li>文件名直接映射为路由路径</li>
            <li>支持 .tsx, .ts, .jsx, .js 扩展名</li>
            <li>路径自动转换为小写（可配置）</li>
          </ul>
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
