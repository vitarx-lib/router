import type { View } from 'vitarx'
import { RouterLink } from 'vitarx-router'

const features = [
  { icon: '🚀', title: '多种路由模式', desc: '支持 Hash、History、Memory 三种模式' },
  { icon: '📁', title: '文件系统路由', desc: '基于 Vite 插件自动生成路由配置' },
  { icon: '🛡️', title: '导航守卫', desc: '完整的路由守卫机制，支持权限控制' },
  { icon: '⚡', title: '动态路由', desc: '支持参数、正则约束、可选参数' },
  { icon: '📦', title: '嵌套路由', desc: '支持复杂的路由嵌套和多视图布局' },
  { icon: '🎯', title: 'TypeScript', desc: '完整的类型定义和类型扩展能力' }
]

export default function Home(): View {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '50px 40px',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '20px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
        maxWidth: '700px',
        width: '90%'
      }}
    >
      <h1
        style={{
          fontSize: '42px',
          fontWeight: '700',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          marginBottom: '15px'
        }}
      >
        Vitarx Router
      </h1>
      <p
        style={{
          color: '#888',
          fontSize: '16px',
          marginBottom: '35px',
          letterSpacing: '1px'
        }}
      >
        Vitarx 框架的官方路由解决方案
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '20px',
          marginBottom: '40px',
          textAlign: 'left'
        }}
      >
        {features.map((feature, index) => (
          <div
            key={index}
            style={{
              padding: '18px 20px',
              backgroundColor: '#f8f9ff',
              borderRadius: '12px',
              border: '1px solid #e8ecf4'
            }}
          >
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>{feature.icon}</div>
            <div
              style={{
                fontSize: '15px',
                fontWeight: '600',
                color: '#333',
                marginBottom: '5px'
              }}
            >
              {feature.title}
            </div>
            <div style={{ fontSize: '13px', color: '#666', lineHeight: '1.5' }}>{feature.desc}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          gap: '15px',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}
      >
        <RouterLink
          to="/about"
          style={{
            display: 'inline-block',
            padding: '14px 32px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '30px',
            fontSize: '15px',
            fontWeight: '600',
            boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
          }}
        >
          了解更多 →
        </RouterLink>
        <a
          href="https://router.vitarx.cn"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block',
            padding: '14px 32px',
            background: 'white',
            color: '#667eea',
            textDecoration: 'none',
            borderRadius: '30px',
            fontSize: '15px',
            fontWeight: '600',
            border: '2px solid #667eea'
          }}
        >
          官方文档
        </a>
      </div>
    </div>
  )
}
