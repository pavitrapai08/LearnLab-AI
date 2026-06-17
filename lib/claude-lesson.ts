import Anthropic from '@anthropic-ai/sdk'
import { parseJsonWithRetry } from '@/lib/claude'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MODEL = 'claude-sonnet-4-6'

export type LessonPlanData = {
  objectives: string[]
  intro: string
  structure: string[]
  activities: string[]
  assessment: string[]
  homework: string[]
}

export type GenerateLessonPlanParams = {
  subject: string
  grade: string
  topic: string
  durationMin: number
  outputLanguage: string
}

const LESSON_SYSTEM = `You are LearnLab AI, an educational lesson plan generator for Indian teachers.

Rules:
- Create practical, engaging lesson plans appropriate for Indian classrooms.
- All content must be age-appropriate and safe for minors.
- Respond with valid JSON only. No markdown, no code fences, no prose outside the JSON.

Return exactly this JSON shape:
{
  "objectives": ["string", ...],
  "intro": "string — a 5-minute opening hook or activity",
  "structure": ["string — phase description", ...],
  "activities": ["string", ...],
  "assessment": ["string", ...],
  "homework": ["string", ...]
}`

export async function generateLessonPlan(params: GenerateLessonPlanParams): Promise<LessonPlanData> {
  const { subject, grade, topic, durationMin, outputLanguage } = params

  const instruction = `Create a ${durationMin}-minute lesson plan for a ${grade} ${subject} class on the topic "${topic}" in ${outputLanguage}. Include 3–5 learning objectives, an engaging 5-minute introduction hook, a structured lesson flow (3–4 phases with time allocations), 2–3 classroom activities, assessment methods, and a homework task. Return the JSON object.`

  const callClaude = async (strict = false) => {
    const sys = strict
      ? LESSON_SYSTEM + '\nCRITICAL: output valid JSON only — absolutely no markdown or fences.'
      : LESSON_SYSTEM
    const r = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: sys,
      messages: [{ role: 'user', content: instruction }],
    })
    const block = r.content.find(b => b.type === 'text')
    return block?.type === 'text' ? block.text.trim() : ''
  }

  const raw = await callClaude(false)
  return parseJsonWithRetry<LessonPlanData>(raw, () => callClaude(true))
}
