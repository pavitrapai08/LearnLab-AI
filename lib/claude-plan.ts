import Anthropic from '@anthropic-ai/sdk'
import { parseJsonWithRetry } from '@/lib/claude'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MODEL = 'claude-sonnet-4-6'

export type StudyDayPlan = {
  date: string  // YYYY-MM-DD
  tasks: string[]
}

export type StudyPlanData = {
  title: string
  schedule: StudyDayPlan[]
}

export type GenerateStudyPlanParams = {
  examDate: string      // YYYY-MM-DD
  subjects: string[]
  grade: string
  outputLanguage: string
  todayDate: string     // YYYY-MM-DD — passed in so the caller controls the reference date
}

const PLAN_SYSTEM = `You are LearnLab AI, a study planner for Indian students.

Rules:
- Create a realistic, balanced day-by-day study schedule.
- All content must be age-appropriate and safe for minors.
- Respond with valid JSON only. No markdown, no code fences, no prose outside the JSON.

Return: { "title": "Short plan title", "schedule": [ { "date": "YYYY-MM-DD", "tasks": ["Task 1", "Task 2"] } ] }`

export async function generateStudyPlan(params: GenerateStudyPlanParams): Promise<StudyPlanData> {
  const { examDate, subjects, grade, outputLanguage, todayDate } = params

  const startMs = new Date(todayDate + 'T00:00:00Z').getTime()
  const endMs = new Date(examDate + 'T00:00:00Z').getTime()
  const totalDays = Math.ceil((endMs - startMs) / (1000 * 60 * 60 * 24))

  if (totalDays <= 0) throw new Error('INVALID_DATE')

  const daysToSchedule = Math.min(totalDays, 30)
  const coverageNote = totalDays > 30
    ? `covering the first 30 days (exam is ${totalDays} days away)`
    : `${totalDays} day${totalDays === 1 ? '' : 's'} until the exam`

  const subjectList = subjects.join(', ')
  const instruction = `Create a ${daysToSchedule}-day study plan in ${outputLanguage} for a ${grade} student (${coverageNote}).
Subjects: ${subjectList}
First day of plan: ${todayDate}
Exam date: ${examDate}

Guidelines:
- Include 2–3 specific, actionable tasks per day.
- Balance subjects across the days.
- Reduce new content and add full revision in the last 3 days before the exam.
- Keep tasks concise — one clear sentence each.

Return the JSON object with "title" and "schedule" array.`

  const callClaude = async (strict = false) => {
    const sys = strict
      ? PLAN_SYSTEM + '\nCRITICAL: output valid JSON only — absolutely no markdown or fences.'
      : PLAN_SYSTEM
    const r = await client.messages.create({
      model: MODEL,
      max_tokens: 8192,
      system: sys,
      messages: [{ role: 'user', content: instruction }],
    })
    const block = r.content.find(b => b.type === 'text')
    return block?.type === 'text' ? block.text.trim() : ''
  }

  const raw = await callClaude(false)
  return parseJsonWithRetry<StudyPlanData>(raw, () => callClaude(true))
}
