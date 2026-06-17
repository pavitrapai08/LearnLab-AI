'use client'

import { useState, useCallback } from 'react'
import { Layers, RotateCcw, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import UploadInput from '@/components/UploadInput'
import SubjectLanguageBar from '@/components/SubjectLanguageBar'
import type { Subject, Grade, OutputLanguage } from '@/components/SubjectLanguageBar'
import FlashCard from '@/components/FlashCard'
import MobileNav from '@/components/MobileNav'
import AiDisclaimer from '@/components/AiDisclaimer'
import type { FlashCardItem } from '@/lib/claude'
import { createClient } from '@/lib/supabase/client'

type Step = 'upload' | 'configure' | 'generating' | 'study'

export default function StudentFlashcardsPage() {
  const [step, setStep] = useState<Step>('upload')
  const [documentId, setDocumentId] = useState<string | null>(null)
  const [subject, setSubject] = useState<Subject | ''>('')
  const [grade, setGrade] = useState<Grade | ''>('')
  const [outputLanguage, setOutputLanguage] = useState<OutputLanguage>('English')
  const [count, setCount] = useState('10')
  const [deckId, setDeckId] = useState<string | null>(null)
  const [cards, setCards] = useState<FlashCardItem[]>([])
  const [error, setError] = useState('')

  const handleUploadSuccess = useCallback((docId: string) => {
    setDocumentId(docId)
    setStep('configure')
  }, [])

  const handleGenerate = async () => {
    if (!subject || !grade) { setError('Please select a subject and grade.'); return }
    setError('')
    setStep('generating')
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'flashcards',
          documentId,
          subject,
          grade,
          outputLanguage,
          options: { count: parseInt(count, 10) },
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error?.message ?? 'Generation failed.'); setStep('configure'); return }
      setDeckId(data.deckId)
      setCards(data.cards)
      setStep('study')
    } catch {
      setError('Something went wrong. Please try again.')
      setStep('configure')
    }
  }

  const handleRatingChange = useCallback(async (id: string, rating: 'know' | 'almost' | 'no_idea') => {
    const updated = cards.map(c => c.id === id ? { ...c, rating } : c)
    setCards(updated)
    // Persist updated ratings client-side (RLS applies, CLAUDE.md §5).
    if (deckId) {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('flashcard_decks').update({ cards: updated }).eq('id', deckId)
        const today = new Date().toISOString().slice(0, 10)
        await supabase.from('daily_activity').upsert(
          { session_id: user.id, activity_date: today },
          { onConflict: 'session_id,activity_date' },
        )
      }
    }
  }, [cards, deckId])

  const reset = () => {
    setStep('upload'); setDocumentId(null); setDeckId(null); setCards([]); setError('')
  }

  const knowCount = cards.filter(c => c.rating === 'know').length

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <MobileNav persona="student" />

      <main className="flex-1 px-4 pb-24 pt-6 lg:pl-0 lg:pr-8">
        <div className="mx-auto max-w-2xl">
          <div className="mb-6 flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold">Flashcard Deck</h1>
          </div>

          {step === 'upload' && (
            <section className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                Upload your study material to generate a flashcard deck from it.
              </p>
              <UploadInput onSuccess={handleUploadSuccess} />
            </section>
          )}

          {step === 'configure' && (
            <section className="flex flex-col gap-5">
              <p className="text-sm font-medium text-green-700 dark:text-green-400">
                Content loaded. Configure your deck:
              </p>
              <SubjectLanguageBar
                subject={subject} grade={grade} outputLanguage={outputLanguage}
                onSubjectChange={setSubject} onGradeChange={setGrade} onLanguageChange={setOutputLanguage}
              />
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Number of cards</Label>
                <Select value={count} onValueChange={setCount}>
                  <SelectTrigger className="h-10 max-w-[160px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[10, 15, 20, 25].map(n => (
                      <SelectItem key={n} value={String(n)}>{n} cards</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {error && (
                <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}
              <Button onClick={handleGenerate} size="lg" className="gap-2">
                <Layers className="h-4 w-4" /> Generate cards
              </Button>
              <Button variant="ghost" size="sm" onClick={reset}>Use different content</Button>
            </section>
          )}

          {step === 'generating' && (
            <div className="flex flex-col items-center gap-3 py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="font-medium">Generating your flashcards…</p>
              <p className="text-sm text-muted-foreground">This usually takes 10–20 seconds.</p>
            </div>
          )}

          {step === 'study' && cards.length > 0 && (
            <section className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {knowCount}/{cards.length} mastered
                </p>
                <Button variant="ghost" size="sm" onClick={reset} className="gap-1">
                  <RotateCcw className="h-3 w-3" /> New deck
                </Button>
              </div>
              <FlashCard cards={cards} onRatingChange={handleRatingChange} />
              <AiDisclaimer />
            </section>
          )}
        </div>
      </main>
    </div>
  )
}
