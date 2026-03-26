import type { CSSProperties, View } from 'vitarx'
import { useRouter } from 'vitarx-router'

interface ApiInfo {
  name: string
  desc: string
  example: string
}

interface ComponentInfo {
  name: string
  desc: string
  example: string
}

const apis: ApiInfo[] = [
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

const components: ComponentInfo[] = [
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

const containerStyle: CSSProperties = {
  textAlign: 'center',
  padding: '45px 40px',
  backgroundColor: 'rgba(255, 255, 255, 0.95)',
  borderRadius: '20px',
  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
  maxWidth: '700px',
  width: '90%',
  margin: '0 auto'
}

const titleStyle: CSSProperties = {
  fontSize: '36px',
  fontWeight: '700',
  background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
  marginBottom: '12px'
}

const subtitleStyle: CSSProperties = {
  color: '#666',
  fontSize: '15px',
  marginBottom: '30px',
  lineHeight: '1.6'
}

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: '15px',
  marginBottom: '25px',
  textAlign: 'left'
}

const cardStyle: CSSProperties = {
  padding: '15px 18px',
  backgroundColor: '#fafbff',
  borderRadius: '10px',
  border: '1px solid #e8ecf4',
  transition: 'transform 0.2s, box-shadow 0.2s'
}

const codeStyle: CSSProperties = {
  display: 'block',
  fontSize: '11px',
  color: '#e83e8c',
  backgroundColor: '#f0f0f5',
  padding: '6px 10px',
  borderRadius: '6px',
  fontFamily: 'monospace'
}

const sectionTitleStyle: CSSProperties = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#333',
  marginBottom: '15px',
  textAlign: 'center'
}

const infoBoxStyle: CSSProperties = {
  padding: '18px',
  backgroundColor: '#f0f4ff',
  borderRadius: '12px',
  marginBottom: '30px',
  textAlign: 'left'
}

const linkStyle: CSSProperties = {
  color: '#667eea',
  textDecoration: 'none',
  transition: 'opacity 0.2s'
}

const backButtonStyle: CSSProperties = {
  display: 'inline-block',
  padding: '14px 32px',
  background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
  color: 'white',
  textDecoration: 'none',
  borderRadius: '30px',
  fontSize: '15px',
  fontWeight: '600',
  boxShadow: '0 4px 15px rgba(118, 75, 162, 0.4)',
  cursor: 'pointer',
  transition: 'transform 0.2s, box-shadow 0.2s'
}

export default function About(): View {
  const router = useRouter()

  const handleBack = (e: any) => {
    e.preventDefault()
    router.back()
  }

  return (
    <div style={containerStyle}>
      <h1 style={titleStyle}>关于 Vitarx Router</h1>
      <p style={subtitleStyle}>
        Vitarx Router 是 Vitarx 前端框架的官方路由解决方案。
        <br />
        提供声明式路由配置、导航守卫、动态路由匹配、文件系统路由等企业级功能。
      </p>

      <div style={gridStyle}>
        {apis.map((api) => (
          <div
            key={api.name}
            style={cardStyle}
            onMouseEnter={(e: any) => {
              ;(e.currentTarget as any).style.transform = 'translateY(-4px)'
              ;(e.currentTarget as any).style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.1)'
            }}
            onMouseLeave={(e: any) => {
              ;(e.currentTarget as any).style.transform = 'translateY(0)'
              ;(e.currentTarget as any).style.boxShadow = 'none'
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
            <code style={codeStyle}>{api.example}</code>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: '30px', textAlign: 'left' }}>
        <h3 style={sectionTitleStyle}>核心组件</h3>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          {components.map((comp) => (
            <div
              key={comp.name}
              style={{
                flex: '1',
                minWidth: '200px',
                padding: '15px 18px',
                backgroundColor: '#f8f9ff',
                borderRadius: '10px',
                border: '1px solid #e8ecf4',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onMouseEnter={(e: any) => {
                ;(e.currentTarget as any).style.transform = 'translateY(-4px)'
                ;(e.currentTarget as any).style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.1)'
              }}
              onMouseLeave={(e: any) => {
                ;(e.currentTarget as any).style.transform = 'translateY(0)'
                ;(e.currentTarget as any).style.boxShadow = 'none'
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
              <code style={codeStyle}>{comp.example}</code>
            </div>
          ))}
        </div>
      </div>

      <div style={infoBoxStyle}>
        <div style={{ fontSize: '14px', color: '#555', marginBottom: '8px' }}>📜 MIT 许可证</div>
        <div style={{ fontSize: '13px', color: '#777' }}>
          仓库：
          <a
            href="https://github.com/vitarx-lib/router"
            target="_blank"
            rel="noopener noreferrer"
            style={linkStyle}
          >
            github.com/vitarx-lib/router
          </a>
        </div>
      </div>

      <a href="/" style={backButtonStyle} onClick={handleBack}>
        ← 返回上一页
      </a>
    </div>
  )
}
