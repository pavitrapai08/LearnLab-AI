// Single source of truth for all dropdown option lists (CLAUDE.md §11).
// Import from here — never re-type per page.

export const SUBJECT_GROUPS = [
  { group: 'Sciences', items: ['Mathematics', 'Physics', 'Chemistry', 'Biology'] },
  { group: 'Humanities', items: ['History', 'Geography', 'Political Science'] },
  { group: 'Commerce', items: ['Accountancy', 'Economics', 'Business Studies'] },
  { group: 'Languages', items: ['Hindi', 'English', 'Tamil', 'Marathi', 'French', 'Spanish'] },
  { group: 'Other', items: ['Other'] },
] as const

// Flat list for simple iteration
export const SUBJECTS = SUBJECT_GROUPS.flatMap((g) => g.items)

export const GRADES = [
  'Grade 1',
  'Grade 2',
  'Grade 3',
  'Grade 4',
  'Grade 5',
  'Grade 6',
  'Grade 7',
  'Grade 8',
  'Grade 9',
  'Grade 10',
  'Grade 11',
  'Grade 12',
  'Undergraduate',
  'Other',
] as const

export const OUTPUT_LANGUAGES = [
  'English',
  'Hindi',
  'Tamil',
  'Marathi',
  'Telugu',
  'Bengali',
  'French',
  'Spanish',
] as const

export type Subject = (typeof SUBJECTS)[number]
export type Grade = (typeof GRADES)[number]
export type OutputLanguage = (typeof OUTPUT_LANGUAGES)[number]

