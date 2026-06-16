import { NextRequest, NextResponse } from 'next/server'
import { createClient, getVerifiedUser } from '@/lib/supabase/server'
import { generateQuiz, gradeAnswers } from '@/lib/claude'
import type { GradeItem } from '@/lib/claude'

export const maxDuration = 60

function err(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status })
}

export async function POST(req: NextRequest) {
  const user = await getVerifiedUser()
  if (!user) return err('UNAUTHORIZED', 'Not authenticated', 401)
  const uid = user.id

  let body: {
    type: string
    documentId?: string
    text?: string
    subject: string
    grade: string
    outputLanguage: string
    options?: {
      questionType?: 'MCQ' | 'TF' | 'Short'
      difficulty?: 'easy' | 'medium' | 'hard'
      count?: number
      items?: GradeItem[]
    }
  }
  try {
    body = await req.json()
  } catch {
    return err('BAD_REQUEST', 'Invalid JSON', 400)
  }

  const { type, documentId, text: bodyText, subject, grade, outputLanguage, options } = body
  const supabase = createClient()

  // ── Resolve source text ───────────────────────────────────
  let sourceText = bodyText?.trim() ?? ''
  if (!sourceText && documentId) {
    const { data: doc, error } = await supabase
      .from('documents')
      .select('extracted_text, status')
      .eq('id', documentId)
      .single()
    if (error || !doc) return err('NO_CONTENT', 'Document not found', 404)
    if (doc.status !== 'ready') return err('NO_CONTENT', 'Document is still processing', 400)
    sourceText = (doc.extracted_text as string) ?? ''
  }
  if (!sourceText) return err('NO_CONTENT', 'No content to generate from', 400)

  // ── Quiz generation ───────────────────────────────────────
  if (type === 'quiz') {
    const questionType = options?.questionType ?? 'MCQ'
    const difficulty = options?.difficulty ?? 'medium'
    const count = Math.min(Math.max(options?.count ?? 10, 3), 20)

    let questions
    try {
      questions = await generateQuiz({
        text: sourceText,
        subject,
        grade,
        outputLanguage,
        questionType,
        difficulty,
        count,
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      if (msg === 'PARSE_FAILED') return err('PARSE_FAILED', 'AI returned invalid JSON after retry', 500)
      return err('GENERATION_FAILED', 'Quiz generation failed', 500)
    }

    if (!questions?.length) return err('GENERATION_FAILED', 'No questions generated', 500)

    // Persist quiz (user-scoped write via anon client, RLS applies).
    const { data: quiz, error: dbErr } = await supabase
      .from('quizzes')
      .insert({
        session_id: uid,
        document_id: documentId ?? null,
        subject,
        grade,
        output_language: outputLanguage,
        question_type: questionType,
        difficulty,
        questions,
      })
      .select('id')
      .single()

    if (dbErr || !quiz) return err('GENERATION_FAILED', 'Could not save quiz', 500)
    return NextResponse.json({ quizId: quiz.id, questions, questionType, subject, grade, outputLanguage })
  }

  // ── AI grading ────────────────────────────────────────────
  if (type === 'grade') {
    const items = options?.items
    if (!items?.length) return err('BAD_REQUEST', 'No items to grade', 400)

    let results
    try {
      results = await gradeAnswers(items, grade)
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      if (msg === 'PARSE_FAILED') return err('PARSE_FAILED', 'AI returned invalid JSON after retry', 500)
      return err('GENERATION_FAILED', 'Grading failed', 500)
    }

    return NextResponse.json({ results })
  }

  return err('BAD_REQUEST', `Unknown type: ${type}`, 400)
}
