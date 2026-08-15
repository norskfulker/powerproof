import { useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { useTypewriterDisplayedText } from '@/components/TypewriterText'
import {
  AskAiChatMarkdown,
  askAiChatMarkdownComponents,
} from '@/components/ask-ai/AskAiChatMarkdown'
import { cn } from '@/lib/utils'

type Props = {
  text: string
  animate?: boolean
  className?: string
  onComplete?: () => void
  onProgress?: () => void
}

function AskAiAnimatedAssistantMessage({
  text,
  className,
  onComplete,
  onProgress,
}: Omit<Props, 'animate'>) {
  const displayed = useTypewriterDisplayedText(text, 'fast', onComplete, 'word')

  useEffect(() => {
    onProgress?.()
  }, [displayed, onProgress])

  if (!text.trim()) return null

  return (
    <div className={cn('font-sans text-sm text-foreground', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={askAiChatMarkdownComponents}>
        {displayed}
      </ReactMarkdown>
    </div>
  )
}

/** Assistant bubble — typewriter reveal for fresh replies, instant for history. */
export function AskAiAssistantMessage({
  text,
  animate = false,
  className,
  onComplete,
  onProgress,
}: Props) {
  if (!animate) {
    return <AskAiChatMarkdown text={text} className={className} />
  }

  return (
    <AskAiAnimatedAssistantMessage
      text={text}
      className={className}
      onComplete={onComplete}
      onProgress={onProgress}
    />
  )
}
