'use client'

import { useState, useCallback } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Focus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { FlashCardItem } from '@/lib/claude'

export type { FlashCardItem }

type Rating = 'know' | 'almost' | 'no_idea'

type Props = {
  cards: FlashCardItem[]
  onRatingChange: (id: string, rating: Rating) => void
}

const RATINGS: { value: Rating; label: string; cls: string }[] = [
  { value: 'know',    label: 'Know it', cls: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' },
  { value: 'almost',  label: 'Almost',  cls: 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100' },
  { value: 'no_idea', label: 'No idea', cls: 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100' },
]

export default function FlashCard({ cards, onRatingChange }: Props) {
  const reducedMotion = useReducedMotion()
  const [focusMode, setFocusMode] = useState(false)
  const [flipped, setFlipped] = useState(false)
  const [index, setIndex] = useState(0)

  const deck = focusMode ? cards.filter(c => c.rating !== 'know') : cards
  const card = deck[index]

  const navigate = useCallback((dir: 1 | -1) => {
    setFlipped(false)
    // Small delay so the card finishes un-flipping before index changes.
    setTimeout(() => setIndex(i => Math.max(0, Math.min(deck.length - 1, i + dir))), 200)
  }, [deck.length])

  const rate = useCallback((rating: Rating) => {
    if (!card) return
    onRatingChange(card.id, rating)
    if (index < deck.length - 1) navigate(1)
  }, [card, index, deck.length, navigate, onRatingChange])

  const toggleFocusMode = () => {
    setFocusMode(f => !f)
    setIndex(0)
    setFlipped(false)
  }

  if (!card) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <p className="text-lg font-semibold">
          {focusMode ? 'All weak cards reviewed!' : 'No cards in this deck.'}
        </p>
        {focusMode && (
          <>
            <p className="text-sm text-muted-foreground">Great work — you know all the cards.</p>
            <Button variant="outline" onClick={toggleFocusMode}>Review all cards</Button>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Card {index + 1} of {deck.length}
        </p>
        <button
          onClick={toggleFocusMode}
          className={cn(
            'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
            focusMode
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground',
          )}
        >
          <Focus className="h-3 w-3" />
          Focus mode{focusMode ? ' on' : ''}
        </button>
      </div>

      {/* Flip card */}
      <div
        className="relative h-52 cursor-pointer select-none sm:h-60"
        style={{ perspective: '1200px' }}
        onClick={() => setFlipped(f => !f)}
        role="button"
        aria-label={flipped ? 'Tap to see front' : 'Tap to reveal answer'}
      >
        <motion.div
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={reducedMotion ? { duration: 0 } : { duration: 0.35, ease: 'easeInOut' }}
          style={{ transformStyle: 'preserve-3d' }}
          className="absolute inset-0"
        >
          {/* Front face */}
          <div
            className="absolute inset-0 flex items-center justify-center rounded-2xl border bg-white p-6 text-center shadow-sm"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <p className="text-base font-medium leading-relaxed">{card.front}</p>
          </div>
          {/* Back face */}
          <div
            className="absolute inset-0 flex items-center justify-center rounded-2xl border border-primary/20 bg-[#EEF4FF] p-6 text-center shadow-sm"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <p className="text-sm leading-relaxed text-navy">{card.back}</p>
          </div>
        </motion.div>
      </div>

      <p className="text-center text-xs text-muted-foreground">Tap to flip</p>

      {/* Self-rating — shown only after flipping */}
      {flipped && (
        <div className="flex gap-2">
          {RATINGS.map(r => (
            <button
              key={r.value}
              onClick={() => rate(r.value)}
              className={cn(
                'flex-1 rounded-xl border py-2.5 text-sm font-medium transition-colors',
                r.cls,
                card.rating === r.value && 'ring-2 ring-current ring-offset-1',
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline" size="sm"
          onClick={() => navigate(-1)}
          disabled={index === 0}
          className="gap-1"
        >
          <ChevronLeft className="h-4 w-4" /> Prev
        </Button>

        {/* Progress dots (cap at 20 for display) */}
        <div className="flex flex-wrap justify-center gap-1">
          {deck.slice(0, 20).map((c, i) => (
            <span
              key={c.id}
              className={cn(
                'h-1.5 w-1.5 rounded-full transition-colors',
                i === index
                  ? 'bg-primary'
                  : c.rating === 'know'
                    ? 'bg-emerald-400'
                    : c.rating === 'almost'
                      ? 'bg-amber-400'
                      : 'bg-muted-foreground/25',
              )}
            />
          ))}
          {deck.length > 20 && <span className="text-[10px] text-muted-foreground">…</span>}
        </div>

        <Button
          variant="outline" size="sm"
          onClick={() => navigate(1)}
          disabled={index === deck.length - 1}
          className="gap-1"
        >
          Next <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
