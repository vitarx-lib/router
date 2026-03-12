import type { View } from 'vitarx'
import { RouterLink } from 'vitarx-router'

export default function MultiView(): View {
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
            backgroundColor: '#e3f2fd',
            color: '#1565c0',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '600',
            marginBottom: '20px'
          }}
        >
          👁️ 命名视图示例 - 默认视图
        </div>

        <h1
          style={{
            fontSize: '32px',
            fontWeight: '700',
            color: '#333',
            marginBottom: '15px'
          }}
        >
          多视图页面
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
            pages/multi-view.tsx → 默认视图{'\n'}
            pages/multi-view@sidebar.tsx → sidebar 命名视图
          </code>
        </div>

        <p style={{ fontSize: '15px', color: '#666', lineHeight: '1.8', marginBottom: '20px' }}>
          这是页面的<strong>默认视图</strong>。使用{' '}
          <code style={{ backgroundColor: '#f0f0f5', padding: '2px 6px', borderRadius: '4px' }}>
            @view
          </code>{' '}
          语法可以定义多个命名视图， 适用于需要同时渲染多个区域的场景（如侧边栏、页脚等）。
        </p>

        <div
          style={{
            padding: '20px',
            backgroundColor: '#e8f5e9',
            borderRadius: '12px',
            marginBottom: '20px'
          }}
        >
          <h4
            style={{ fontSize: '14px', fontWeight: '600', color: '#2e7d32', marginBottom: '10px' }}
          >
            💡 命名视图规则
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
            <li>
              <code style={{ backgroundColor: '#f0f0f5', padding: '2px 6px', borderRadius: '4px' }}>
                multi-view.tsx
              </code>{' '}
              或{' '}
              <code style={{ backgroundColor: '#f0f0f5', padding: '2px 6px', borderRadius: '4px' }}>
                multi-view@default.tsx
              </code>{' '}
              作为默认视图
            </li>
            <li>
              <code style={{ backgroundColor: '#f0f0f5', padding: '2px 6px', borderRadius: '4px' }}>
                multi-view@sidebar.tsx
              </code>{' '}
              作为 sidebar 命名视图
            </li>
            <li>每个命名视图组必须包含默认视图</li>
          </ul>
        </div>

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
            📁 生成的路由配置
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
          >{`{
  path: '/multi-view',
  component: {
    default: lazy(() => import('multi-view.tsx')),
    sidebar: lazy(() => import('multi-view@sidebar.tsx'))
  }
}`}</pre>
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
