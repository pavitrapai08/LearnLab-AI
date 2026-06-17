import { Link2 } from 'lucide-react'
import MobileNav from '@/components/MobileNav'
import DeviceLink from '@/components/DeviceLink'

// Persona is carried via ?persona=teacher from the teacher nav; defaults to student.
// This keeps the correct sidebar visible regardless of which section the user came from.
export default function AccountPage({
  searchParams,
}: {
  searchParams: { persona?: string }
}) {
  const persona = searchParams.persona === 'teacher' ? 'teacher' : 'student'

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <MobileNav persona={persona} />
      <main className="flex-1 px-4 pb-24 pt-6 lg:pl-0 lg:pr-8">
        <div className="mx-auto max-w-md">
          <div className="mb-6 flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold">Sync &amp; Account</h1>
          </div>

          <DeviceLink />

          <div className="mt-8 border-t pt-6">
            <p className="text-xs leading-relaxed text-muted-foreground">
              <strong>Privacy.</strong> No personal information is collected unless you choose to
              link an email for cross-device sync. Your study materials are processed and not
              retained beyond extraction.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
