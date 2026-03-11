import type { View } from 'vitarx'
import { RouterLink } from 'vitarx-router'

export default function Home(): View {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '60px 40px',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '20px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
        maxWidth: '500px'
      }}
    >
      <h1
        style={{
          fontSize: '48px',
          fontWeight: '700',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          marginBottom: '30px'
        }}
      >
        Home
      </h1>
      <p style={{ color: '#666', fontSize: '18px', marginBottom: '40px' }}>
        欢迎来到首页
      </p>
      <RouterLink
        to="/about"
        style={{
          display: 'inline-block',
          padding: '14px 32px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '30px',
          fontSize: '16px',
          fontWeight: '600',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
        }}
      >
        Go to About
      </RouterLink>
    </div>
  )
}
