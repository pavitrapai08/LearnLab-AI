'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, Layers, FileText, MessageCircle, Calendar, GraduationCap, UserCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> }

const STUDENT_NAV: NavItem[] = [
  { href: '/student/quiz',        label: 'Quiz',       icon: BookOpen },
  { href: '/student/flashcards',  label: 'Flashcards', icon: Layers },
  { href: '/student/summariser',  label: 'Summary',    icon: FileText },
  { href: '/student/tutor',       label: 'Tutor',      icon: MessageCircle },
  { href: '/student/tracker',     label: 'Planner',    icon: Calendar },
  { href: '/account',             label: 'Account',    icon: UserCircle },
]

const TEACHER_NAV: NavItem[] = [
  { href: '/teacher/quiz',            label: 'Quiz',    icon: BookOpen },
  { href: '/teacher/lesson',          label: 'Lesson',  icon: GraduationCap },
  { href: '/account?persona=teacher', label: 'Account', icon: UserCircle },
]

type Props = { persona: 'student' | 'teacher' }

export default function MobileNav({ persona }: Props) {
  const pathname = usePathname()
  const items = persona === 'student' ? STUDENT_NAV : TEACHER_NAV

  return (
    <>
      {/* Top header — mobile only, links back to home */}
      <header className="flex items-center border-b border-border bg-white px-4 py-3 lg:hidden">
        <Link href="/" className="flex items-center gap-2 hover:opacity-75 transition-opacity">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-navy">
            <BookOpen className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm font-bold text-navy">LearnLab</span>
        </Link>
      </header>

      {/* Bottom nav — mobile only */}
      <nav className="fixed bottom-0 left-0 right-0 z-[100] border-t border-white/10 bg-navy lg:hidden">
        <ul className="flex justify-around">
          {items.map(({ href, label, icon: Icon }) => {
            const active = pathname === href.split('?')[0]
            return (
              <li key={href} className="flex-1">
                <Link
                  href={href}
                  className={cn(
                    'flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors',
                    active ? 'text-white' : 'text-white/50 hover:text-white/75',
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Sidebar — desktop only (lg+) */}
      <nav className="hidden w-52 shrink-0 bg-navy lg:flex lg:flex-col">
        {/* Brand — links back to home */}
        <Link href="/" className="flex items-center gap-2.5 px-4 py-5 hover:opacity-80 transition-opacity">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
            <BookOpen className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-bold text-white">LearnLab</span>
        </Link>

        {/* Nav links */}
        <ul className="flex flex-col gap-0.5 px-3 pb-4">
          {items.map(({ href, label, icon: Icon }) => {
            const active = pathname === href.split('?')[0]
            return (
              <li key={href} className="relative">
                <Link
                  href={href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-white/10 text-white'
                      : 'text-white/50 hover:bg-white/5 hover:text-white/75',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
                {/* Active indicator — blue right-edge bar */}
                {active && (
                  <span className="absolute right-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-l-full bg-primary" />
                )}
              </li>
            )
          })}
        </ul>
      </nav>
    </>
  )
}
