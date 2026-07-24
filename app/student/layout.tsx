import PageBackground from '@/components/PageBackground'

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-transparent">
      <PageBackground />
      {children}
    </div>
  )
}
