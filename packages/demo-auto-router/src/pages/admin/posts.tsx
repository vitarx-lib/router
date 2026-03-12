import type { View } from 'vitarx'

const posts = [
  { id: 1, title: 'Vitarx Router 入门指南', author: '张三', date: '2024-01-15', status: '已发布' },
  { id: 2, title: '文件路由最佳实践', author: '李四', date: '2024-01-14', status: '草稿' },
  { id: 3, title: '动态路由详解', author: '王五', date: '2024-01-13', status: '已发布' }
]

export default function AdminPosts(): View {
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
        文章管理
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
          pages/admin/posts.tsx → /admin/posts
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
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', color: '#666' }}>标题</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', color: '#666' }}>作者</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', color: '#666' }}>日期</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', color: '#666' }}>状态</th>
            </tr>
          </thead>
          <tbody>
            {posts.map(post => (
              <tr key={post.id} style={{ borderTop: '1px solid #eee' }}>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#333' }}>{post.id}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#333' }}>{post.title}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#666' }}>{post.author}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#666' }}>{post.date}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      backgroundColor: post.status === '已发布' ? '#e8f5e9' : '#fff3e0',
                      color: post.status === '已发布' ? '#2e7d32' : '#e65100'
                    }}
                  >
                    {post.status}
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
