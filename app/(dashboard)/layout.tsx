import Sidebar from '@/components/Sidebar'

// Never statically prerender — all routes require auth + live DB data
export const dynamic = 'force-dynamic'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ flex: 1, overflow: 'auto', padding: '2rem' }}>
        {children}
      </main>
    </div>
  )
}
