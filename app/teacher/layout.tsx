import PageBackground from '@/components/PageBackground'

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageBackground />
      {children}
    </>
  )
}
