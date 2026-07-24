import PageBackground from '@/components/PageBackground'

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EEF4FF] via-white to-[#ECFDF5]/60">
      <PageBackground />
      {children}
    </div>
  )
}
