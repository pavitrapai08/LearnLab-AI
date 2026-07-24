import PageBackground from '@/components/PageBackground'

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EDE9FE] via-[#DBEAFE] to-[#CCFBF1]">
      <PageBackground />
      {children}
    </div>
  )
}
