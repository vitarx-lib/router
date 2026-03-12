import type { View } from 'vitarx'

export default function AdminDashboard(): View {
  const stats = [
    { label: '总用户数', value: '1,234', change: '+12%', color: '#667eea' },
    { label: '文章数量', value: '567', change: '+8%', color: '#48bb78' },
    { label: '今日访问', value: '8,901', change: '+23%', color: '#ed8936' },
    { label: '转化率', value: '3.2%', change: '+5%', color: '#9f7aea' }
  ]

  return (
    <div>
      <h2
        style={{
          fontSize: '24px',
          fontWeight: '600',
          color: '#333',
          marginBottom: '20px'
        }}
      >
        仪表盘
      </h2>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          marginBottom: '30px'
        }}
      >
        {stats.map((stat, idx) => (
          <div
            key={idx}
            style={{
              padding: '20px',
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
            }}
          >
            <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>{stat.label}</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#333' }}>{stat.value}</div>
            <div style={{ fontSize: '12px', color: stat.color, marginTop: '5px' }}>{stat.change}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          padding: '20px',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }}
      >
        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#333', marginBottom: '15px' }}>
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
        >{`pages/admin/index.tsx → /admin (默认子路由)

布局路由规则：
- admin.tsx 作为布局组件（父路由）
- admin/ 目录内的文件作为子路由
- admin/index.tsx 作为默认子路由`}</code>
      </div>
    </div>
  )
}
