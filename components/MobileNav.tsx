'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, Layers, FileText, MessageCircle, Calendar, GraduationCap } from 'lucide-react'
import { cn } from '@/lib/utils'

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> }

const STUDENT_NAV: NavItem[] = [
  { href: '/student/quiz', label: 'Quiz', icon: BookOpen },
  { href: '/student/flashcards', label: 'Flashcards', icon: Layers },
  { href: '/student/summariser', label: 'Summary', icon: FileText },
  { href: '/student/tutor', label: 'Tutor', icon: MessageCircle },
  { href: '/student/tracker', label: 'Planner', icon: Calendar },
]

const TEACHER_NAV: NavItem[] = [
  { href: '/teacher/quiz', label: 'Quiz', icon: BookOpen },
  { href: '/teacher/lesson', label: 'Lesson', icon: GraduationCap },
]

type Props = { persona: 'student' | 'teacher' }

export default function MobileNav({ persona }: Props) {
  const pathname = usePathname()
  const items = persona === 'student' ? STUDENT_NAV : TEACHER_NAV

  return (
    <>
      {/* Bottom nav — mobile only */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background lg:hidden">
        <ul className="flex justify-around">
          {items.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <li key={href} className="flex-1">
                <Link
                  href={href}
                  className={cn(
                    'flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors',
                    active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
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
      <nav className="hidden w-52 shrink-0 lg:block">
        <ul className="flex flex-col gap-1 pt-2">
          {items.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </>
  )
}
