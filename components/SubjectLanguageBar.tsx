'use client'

import { SUBJECT_GROUPS, SUBJECTS, GRADES, OUTPUT_LANGUAGES } from '@/lib/options'
import type { Subject, Grade, OutputLanguage } from '@/lib/options'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'

export type { Subject, Grade, OutputLanguage }

type Props = {
  subject: Subject | ''
  grade: Grade | ''
  outputLanguage: OutputLanguage
  onSubjectChange: (v: Subject) => void
  onGradeChange: (v: Grade) => void
  onLanguageChange: (v: OutputLanguage) => void
  showGrade?: boolean
}

export default function SubjectLanguageBar({
  subject,
  grade,
  outputLanguage,
  onSubjectChange,
  onGradeChange,
  onLanguageChange,
  showGrade = true,
}: Props) {
  return (
    <div className="flex flex-wrap gap-3">
      {/* Subject */}
      <div className="flex min-w-[140px] flex-1 flex-col gap-1">
        <Label className="text-xs text-muted-foreground">Subject</Label>
        <Select value={subject} onValueChange={v => onSubjectChange(v as Subject)}>
          <SelectTrigger className="h-10">
            <SelectValue placeholder="Select subject" />
          </SelectTrigger>
          <SelectContent>
            {SUBJECT_GROUPS.map(group => (
              <SelectGroup key={group.group}>
                <SelectLabel>{group.group}</SelectLabel>
                {group.items.map(item => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Grade */}
      {showGrade && (
        <div className="flex min-w-[130px] flex-1 flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Grade</Label>
          <Select value={grade} onValueChange={v => onGradeChange(v as Grade)}>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Select grade" />
            </SelectTrigger>
            <SelectContent>
              {GRADES.map(g => (
                <SelectItem key={g} value={g}>
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Output language */}
      <div className="flex min-w-[130px] flex-1 flex-col gap-1">
        <Label className="text-xs text-muted-foreground">Output language</Label>
        <Select value={outputLanguage} onValueChange={v => onLanguageChange(v as OutputLanguage)}>
          <SelectTrigger className="h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OUTPUT_LANGUAGES.map(lang => (
              <SelectItem key={lang} value={lang}>
                {lang}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
