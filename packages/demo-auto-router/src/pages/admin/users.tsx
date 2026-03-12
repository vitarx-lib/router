import type { View } from 'vitarx'

const users = [
  { id: 1, name: '张三', email: 'zhangsan@example.com', role: '管理员', status: '活跃' },
  { id: 2, name: '李四', email: 'lisi@example.com', role: '编辑', status: '活跃' },
  { id: 3, name: '王五', email: 'wangwu@example.com', role: '用户', status: '禁用' }
]

export default function AdminUsers(): View {
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
        用户管理
      </h2>

      <div
        style={{
          padding: '20px',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          marginBottom: '20px'
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
        >
          pages/admin/users.tsx → /admin/users
        </code>
      </div>

      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          overflow: 'hidden'
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8f9fa' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', color: '#666' }}>ID</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', color: '#666' }}>姓名</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', color: '#666' }}>邮箱</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', color: '#666' }}>角色</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', color: '#666' }}>状态</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} style={{ borderTop: '1px solid #eee' }}>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#333' }}>{user.id}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#333' }}>{user.name}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#666' }}>{user.email}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#666' }}>{user.role}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      backgroundColor: user.status === '活跃' ? '#e8f5e9' : '#ffebee',
                      color: user.status === '活跃' ? '#2e7d32' : '#c62828'
                    }}
                  >
                    {user.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
