import PageBackground from '@/components/PageBackground'

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-transparent">
      <PageBackground />
      {children}
    </div>
  )
}
