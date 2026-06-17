'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Bot, Send, RefreshCw, RotateCcw, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import MobileNav from '@/components/MobileNav'
import AiDisclaimer from '@/components/AiDisclaimer'
import { GRADES } from '@/lib/options'
import type { Grade } from '@/lib/options'

type Message = { role: 'user' | 'assistant'; content: string }

async function* readSSE(response: Response): AsyncGenerator<{ text?: string; error?: string }> {
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6)
      if (data === '[DONE]') return
      try { yield JSON.parse(data) } catch { /* skip malformed chunk */ }
    }
  }
}

export default function StudentTutorPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [grade, setGrade] = useState<Grade>('Grade 10')
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  const sendMessages = useCallback(async (msgs: Message[]) => {
    setIsStreaming(true)
    setStreamingText('')
    setError('')
    let text = ''
    try {
      const res = await fetch('/api/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: msgs, gradeLevel: grade }),
      })
      if (!res.ok) { setError('Tutor unavailable. Please try again.'); return }
      for await (const chunk of readSSE(res)) {
        if (chunk.error) { setError('Stream error. Please try again.'); return }
        if (chunk.text) { text += chunk.text; setStreamingText(text) }
      }
      if (text) setMessages(prev => [...prev, { role: 'assistant', content: text }])
      setStreamingText('')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsStreaming(false)
    }
  }, [grade])

  const handleSend = useCallback(async () => {
    const q = input.trim()
    if (!q || isStreaming) return
    const updated: Message[] = [...messages, { role: 'user', content: q }]
    setMessages(updated)
    setInput('')
    await sendMessages(updated)
  }, [input, messages, isStreaming, sendMessages])

  const handleExplainDifferently = useCallback(async () => {
    if (isStreaming) return
    const nudge = 'Please explain this differently using a completely different analogy or approach.'
    const updated: Message[] = [...messages, { role: 'user', content: nudge }]
    setMessages(updated)
    await sendMessages(updated)
  }, [messages, isStreaming, sendMessages])

  const lastIsAssistant = messages.length > 0 && messages[messages.length - 1].role === 'assistant'

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <MobileNav persona="student" />

      <main className="flex flex-1 flex-col px-4 pb-24 pt-6 lg:pl-0 lg:pr-8">
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
          {/* Header */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-bold">AI Tutor</h1>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Label className="whitespace-nowrap text-xs text-muted-foreground">Grade level</Label>
              <Select value={grade} onValueChange={v => setGrade(v as Grade)} disabled={isStreaming}>
                <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
              {messages.length > 0 && (
                <Button
                  variant="ghost" size="sm"
                  onClick={() => { setMessages([]); setStreamingText(''); setError('') }}
                  disabled={isStreaming}
                  className="h-8 w-8 p-0"
                  title="Clear chat"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            {messages.length === 0 && !isStreaming && (
              <div className="flex flex-col items-center gap-2 py-16 text-center">
                <Bot className="h-10 w-10 text-muted-foreground/30" />
                <p className="font-medium text-muted-foreground">Ask me anything about your studies</p>
                <p className="text-sm text-muted-foreground/60">I&apos;ll explain at your grade level — and encourage you to think before I give away the answer.</p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'border bg-card shadow-sm'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}

            {isStreaming && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl border bg-card px-4 py-2.5 text-sm leading-relaxed shadow-sm">
                  {streamingText
                    ? <span className="whitespace-pre-wrap">{streamingText}</span>
                    : <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </div>
              </div>
            )}

            {error && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Explain differently button */}
          {lastIsAssistant && !isStreaming && (
            <div className="mt-2 flex justify-start">
              <Button variant="outline" size="sm" onClick={handleExplainDifferently} className="gap-1.5 text-xs">
                <RefreshCw className="h-3 w-3" /> Explain differently
              </Button>
            </div>
          )}

          {/* Input area */}
          <div className="mt-3 flex gap-2">
            <Textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              placeholder="Ask a question… (Enter to send, Shift+Enter for new line)"
              className="max-h-[120px] min-h-[44px] resize-none text-sm"
              disabled={isStreaming}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              size="icon"
              className="h-auto w-11 shrink-0"
            >
              {isStreaming
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <div className="mt-2">
            <AiDisclaimer />
          </div>
        </div>
      </main>
    </div>
  )
}
