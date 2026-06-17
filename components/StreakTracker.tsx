import { Flame } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  streak: number
}

export default function StreakTracker({ streak }: Props) {
  const active = streak > 0

  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-primary">Study Streak</p>
      <div className="flex items-center gap-4">
        <div
          className={cn(
            'flex h-14 w-14 shrink-0 items-center justify-center rounded-full',
            active ? 'bg-orange-100' : 'bg-muted',
          )}
          aria-hidden="true"
        >
          <Flame
            className={cn('h-7 w-7', active ? 'text-orange-500' : 'text-muted-foreground')}
          />
        </div>
        <div>
          <p className="text-3xl font-bold leading-none" aria-label={`${streak} day streak`}>
            {streak}
            <span className="ml-1.5 text-base font-normal text-muted-foreground">
              {streak === 1 ? 'day' : 'days'}
            </span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {active
              ? streak >= 7
                ? `${streak} days in a row — amazing!`
                : 'Keep going — you\'re on a streak!'
              : 'No streak yet — start studying today!'}
          </p>
        </div>
      </div>
    </div>
  )
}
