import PageBackground from '@/components/PageBackground'

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageBackground />
      {children}
    </>
  )
}
