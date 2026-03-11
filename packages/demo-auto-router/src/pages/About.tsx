import type { View } from 'vitarx'
import { useRouter } from 'vitarx-router'

const apis = [
  {
    name: 'createRouter',
    desc: '创建路由器实例',
    example: `createRouter({ routes, mode: 'hash' })`
  },
  {
    name: 'defineRoutes',
    desc: '定义路由表',
    example: `defineRoutes({ path: '/user', component: User })`
  },
  {
    name: 'useRouter',
    desc: '获取路由器实例',
    example: `const router = useRouter()`
  },
  {
    name: 'useRoute',
    desc: '获取当前路由信息',
    example: `const route = useRoute()`
  }
]

const components = [
  {
    name: 'RouterView',
    desc: '渲染匹配的路由组件',
    example: '<RouterView />'
  },
  {
    name: 'RouterLink',
    desc: '声明式导航链接',
    example: '<RouterLink to="/about">关于</RouterLink>'
  }
]

export default function About(): View {
  const router = useRouter()
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '45px 40px',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '20px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
        maxWidth: '700px',
        width: '90%'
      }}
    >
      <h1
        style={{
          fontSize: '36px',
          fontWeight: '700',
          background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          marginBottom: '12px'
        }}
      >
        关于 Vitarx Router
      </h1>
      <p
        style={{
          color: '#666',
          fontSize: '15px',
          marginBottom: '30px',
          lineHeight: '1.6'
        }}
      >
        Vitarx Router 是 Vitarx 前端框架的官方路由解决方案。
        <br />
        提供声明式路由配置、导航守卫、动态路由匹配、文件系统路由等企业级功能。
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '15px',
          marginBottom: '25px',
          textAlign: 'left'
        }}
      >
        {apis.map((api, index) => (
          <div
            key={index}
            style={{
              padding: '15px 18px',
              backgroundColor: '#fafbff',
              borderRadius: '10px',
              border: '1px solid #e8ecf4'
            }}
          >
            <div
              style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#764ba2',
                marginBottom: '5px'
              }}
            >
              {api.name}
            </div>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>{api.desc}</div>
            <code
              style={{
                display: 'block',
                fontSize: '11px',
                color: '#e83e8c',
                backgroundColor: '#f0f0f5',
                padding: '6px 10px',
                borderRadius: '6px',
                fontFamily: 'monospace'
              }}
            >
              {api.example}
            </code>
          </div>
        ))}
      </div>

      <div
        style={{
          marginBottom: '30px',
          textAlign: 'left'
        }}
      >
        <h3
          style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#333',
            marginBottom: '15px',
            textAlign: 'center'
          }}
        >
          核心组件
        </h3>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          {components.map((comp, index) => (
            <div
              key={index}
              style={{
                flex: '1',
                minWidth: '200px',
                padding: '15px 18px',
                backgroundColor: '#f8f9ff',
                borderRadius: '10px',
                border: '1px solid #e8ecf4'
              }}
            >
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#667eea',
                  marginBottom: '5px'
                }}
              >
                {comp.name}
              </div>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                {comp.desc}
              </div>
              <code
                style={{
                  display: 'block',
                  fontSize: '11px',
                  color: '#e83e8c',
                  backgroundColor: '#f0f0f5',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  fontFamily: 'monospace'
                }}
              >
                {comp.example}
              </code>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          padding: '18px',
          backgroundColor: '#f0f4ff',
          borderRadius: '12px',
          marginBottom: '30px'
        }}
      >
        <div style={{ fontSize: '14px', color: '#555', marginBottom: '8px' }}>📜 MIT 许可证</div>
        <div style={{ fontSize: '13px', color: '#777' }}>
          仓库：
          <a
            href="https://github.com/vitarx-lib/router"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#667eea', textDecoration: 'none' }}
          >
            github.com/vitarx-lib/router
          </a>
        </div>
      </div>

      <a
        href="/"
        style={{
          display: 'inline-block',
          padding: '14px 32px',
          background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '30px',
          fontSize: '15px',
          fontWeight: '600',
          boxShadow: '0 4px 15px rgba(118, 75, 162, 0.4)',
          cursor: 'pointer'
        }}
        onClick={(e) => {
          e.preventDefault()
          router.back()
        }}
      >
        ← 返回上一页
      </a>
    </div>
  )
}
