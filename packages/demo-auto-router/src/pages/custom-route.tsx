import type { View } from 'vitarx'
import { RouterLink } from 'vitarx-router'
import { definePage } from 'vitarx-router/auto-routes'

definePage({
  name: 'custom-route-demo',
  meta: {
    title: '自定义路由配置示例',
    requiresAuth: true,
    order: 1
  }
})

export default function CustomRoute(): View {
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
            backgroundColor: '#f3e5f5',
            color: '#7b1fa2',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '600',
            marginBottom: '20px'
          }}
        >
          ⚙️ definePage 宏示例
        </div>

        <h1
          style={{
            fontSize: '32px',
            fontWeight: '700',
            color: '#333',
            marginBottom: '15px'
          }}
        >
          自定义路由配置
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
            definePage 宏配置
          </h3>
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
          >{`import { definePage } from 'vitarx-router/auto-routes'

definePage({
  name: 'custom-route-demo',
  meta: {
    title: '自定义路由配置示例',
    requiresAuth: true,
    order: 1
  }
})`}</pre>
        </div>

        <p style={{ fontSize: '15px', color: '#666', lineHeight: '1.8', marginBottom: '20px' }}>
          使用{' '}
          <code style={{ backgroundColor: '#f0f0f5', padding: '2px 6px', borderRadius: '4px' }}>
            definePage
          </code>{' '}
          宏可以在组件内部自定义路由配置， 包括路由名称、元数据、重定向和参数匹配模式等。
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
            style={{ fontSize: '14px', fontWeight: '600', color: '#2e7d32', marginBottom: '15px' }}
          >
            支持的配置项
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <div
                style={{ fontSize: '13px', fontWeight: '600', color: '#333', marginBottom: '4px' }}
              >
                name
              </div>
              <div style={{ fontSize: '13px', color: '#666' }}>自定义路由名称，用于编程式导航</div>
            </div>
            <div>
              <div
                style={{ fontSize: '13px', fontWeight: '600', color: '#333', marginBottom: '4px' }}
              >
                meta
              </div>
              <div style={{ fontSize: '13px', color: '#666' }}>
                路由元数据，必须是可序列化的对象
              </div>
            </div>
            <div>
              <div
                style={{ fontSize: '13px', fontWeight: '600', color: '#333', marginBottom: '4px' }}
              >
                redirect
              </div>
              <div style={{ fontSize: '13px', color: '#666' }}>路由重定向目标</div>
            </div>
            <div>
              <div
                style={{ fontSize: '13px', fontWeight: '600', color: '#333', marginBottom: '4px' }}
              >
                pattern
              </div>
              <div style={{ fontSize: '13px', color: '#666' }}>动态参数匹配模式（正则表达式）</div>
            </div>
          </div>
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
            💡 使用注意事项
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
              必须从{' '}
              <code style={{ backgroundColor: '#f0f0f5', padding: '2px 6px', borderRadius: '4px' }}>
                vitarx-router/auto-routes
              </code>{' '}
              导入
            </li>
            <li>必须是可序列化的对象，不支持函数</li>
            <li>构建时会自动移除 definePage 调用</li>
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
