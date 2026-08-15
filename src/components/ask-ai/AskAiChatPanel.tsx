import { AnimatePresence, motion } from 'framer-motion'
import { AskAiAssistantMessage } from '@/components/ask-ai/AskAiAssistantMessage'
import { AskAiNextActionChips } from '@/components/ask-ai/AskAiNextActionChips'
import { AskAiHistoryPanel } from '@/components/ask-ai/AskAiHistoryPanel'
import { AskAiChatThinkingIndicator } from '@/components/ask-ai/AskAiChatThinkingIndicator'
import { AskAiSuggestionIdeaChips } from '@/components/ask-ai/AskAiSuggestionIdeaChips'
import {
  useAskAiChatStateOptional,
  ASK_AI_COMPOSER_INPUT_ID,
} from '@/components/ask-ai/useAskAiChatState'
import { askAiEmptyStateTitle, askAiSmokeGradientTitleClassName } from '@/lib/askAiPresentation'
import { BrandLogoImg } from '@/components/composer/BrandLogoImg'
import { POWERPROOF_SHORT_LOGO_URL } from '@/lib/brandLogos'
import {
  HeroComposerFooterChipContent,
  HERO_FOOTER_CHIP_ICON_CLASS,
} from '@/components/composer/HeroComposerFooterChipContent'
import { SharedCommandComposerShell } from '@/components/layout/SharedCommandComposerShell'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { DiscoverHeroComposerInput } from '@/components/discover/ComposerTextarea'
import { discoverHeroButtonPrimaryClassName } from '@/components/discover/discoverHeroTokens'
import { ArrowUp, MessageCircle, Pencil } from '@/lib/icons'
import {
  HERO_FOOTER_CHIP_ICON_TRIGGER_CLASS,
  HERO_FOOTER_SELECT_CONTENT_CLASS,
  HERO_FOOTER_SELECT_ITEM_CLASS,
} from '@/lib/heroComposerSelect'
import { keepNestedWheelScrollLocal } from '@/lib/appScrollRoot'
import { cn } from '@/lib/utils'

const ASK_AI_MESSAGES_SCROLL_CLASS =
  'overflow-y-auto overscroll-contain px-2.5 pb-2 [-webkit-overflow-scrolling:touch] [touch-action:pan-y]'

const ASK_AI_MESSAGE_FONT_CLASS = 'font-sans'

export function AskAiChatComposer() {
  const state = useAskAiChatStateOptional()

  if (!state?.enabled) return null

  const {
    resourceId,
    adapter,
    sessionId,
    listRef,
    input,
    setInput,
    inputRef,
    handleSend,
    handleNextActionChipClick,
    usedChipForMessage,
    handleHistorySessionSelect,
    handleSuggestionSelect,
    cancelTypewriter,
    isTypingSuggestion,
    isTypingReply,
    animatingReplyKey,
    onReplyTypewriterComplete,
    scrollToBottom,
    showSuggestionChips,
    suggestionsKey,
    suggestions,
    inputDisabled,
    historyOpen,
    setHistoryOpen,
    isBootstrapping,
    isLoading,
    messages,
    error,
    storageNamespace,
    showOpportunityEditToggle,
    editToggleLabel,
    applyOpportunityEdit,
    setApplyOpportunityEdit,
    emptyStateHint,
  } = state

  const lastAssistantIdx = messages.map((m) => m.role).lastIndexOf('assistant')
  const lastAssistant = lastAssistantIdx >= 0 ? messages[lastAssistantIdx] : null
  const showNextActionChips =
    !!lastAssistant &&
    (lastAssistant.next_actions?.length ?? 0) > 0 &&
    lastAssistant.created_at !== animatingReplyKey &&
    !isTypingReply &&
    !isLoading &&
    !isBootstrapping &&
    !historyOpen
  const modeLabel = applyOpportunityEdit ? editToggleLabel : 'Ask'

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-card">
      <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden px-3 pb-3 pt-2">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <AnimatePresence initial={false}>
            <motion.div
              key="ask-ai-messages"
              className={cn(
                'relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border-subtle/60 bg-muted/20',
                ASK_AI_MESSAGE_FONT_CLASS,
              )}
            >
              <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
                <div
                  ref={listRef}
                  className={cn(
                    ASK_AI_MESSAGES_SCROLL_CLASS,
                    'min-h-0 flex-1 basis-0 px-2.5 pb-2 pt-2',
                  )}
                  onWheel={keepNestedWheelScrollLocal}
                >
                  {isBootstrapping ? (
                    <div className="flex min-h-[5rem] flex-col items-center justify-center gap-2.5">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-card shadow-sm ring-1 ring-border-subtle/70">
                        <BrandLogoImg
                          src={POWERPROOF_SHORT_LOGO_URL}
                          alt=""
                          height={16}
                          className="h-4 w-4 max-w-[1rem] object-contain object-center"
                        />
                      </span>
                      <p className="text-sm font-medium text-primary">Starting session…</p>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex min-h-[8rem] flex-col items-center justify-center px-3 text-center">
                      <p className={askAiSmokeGradientTitleClassName}>
                        {askAiEmptyStateTitle(storageNamespace)}
                      </p>
                      {emptyStateHint ? (
                        <p className="mt-2 max-w-sm text-[13px] leading-snug text-muted-foreground">
                          {emptyStateHint}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <div className={cn('flex flex-col gap-2.5 text-left', ASK_AI_MESSAGE_FONT_CLASS)}>
                      {messages.map((msg, index) => {
                        if (msg.role === 'user') {
                          return (
                            <div key={`${msg.created_at}-${index}`} className="flex justify-end">
                              <div
                                className={cn(
                                  'max-w-[88%] rounded-2xl rounded-br-md bg-primary px-3 py-2 text-sm text-primary-foreground',
                                  ASK_AI_MESSAGE_FONT_CLASS,
                                )}
                              >
                                {msg.content}
                              </div>
                            </div>
                          )
                        }
                        return (
                          <div
                            key={`${msg.created_at}-${index}`}
                            className={cn(
                              'max-w-[92%] rounded-2xl rounded-bl-md border border-border-subtle bg-card px-3 py-2 text-left text-sm text-foreground',
                              ASK_AI_MESSAGE_FONT_CLASS,
                            )}
                          >
                            <AskAiAssistantMessage
                              text={msg.content}
                              animate={msg.created_at === animatingReplyKey}
                              onComplete={onReplyTypewriterComplete}
                              onProgress={scrollToBottom}
                              className={ASK_AI_MESSAGE_FONT_CLASS}
                            />
                          </div>
                        )
                      })}
                      {isLoading ? <AskAiChatThinkingIndicator /> : null}
                      {error ? (
                        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                          {error}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>

                <AskAiHistoryPanel
                  open={historyOpen}
                  onOpenChange={setHistoryOpen}
                  resourceId={resourceId}
                  activeSessionId={sessionId}
                  adapter={adapter}
                  onSelectSession={handleHistorySessionSelect}
                />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="shrink-0 space-y-2">
          {showSuggestionChips ? (
            <AskAiSuggestionIdeaChips
              namespace={storageNamespace}
              suggestions={suggestions}
              suggestionsKey={suggestionsKey}
              disabled={isTypingSuggestion || isTypingReply || isLoading || isBootstrapping}
              onSelect={handleSuggestionSelect}
            />
          ) : null}
          {showNextActionChips && lastAssistant ? (
            <AskAiNextActionChips
              actions={lastAssistant.next_actions!}
              messageCreatedAt={lastAssistant.created_at}
              usedChipForMessage={usedChipForMessage}
              onChipClick={handleNextActionChipClick}
            />
          ) : null}

          <SharedCommandComposerShell
            variant="hero"
            className="w-full shrink-0"
            innerClassName="!px-2.5 !py-2 layout-sm:!px-2.5 layout-sm:!py-2"
          >
            <div className="flex w-full min-w-0 flex-col gap-2">
              <DiscoverHeroComposerInput
                id={ASK_AI_COMPOSER_INPUT_ID}
                ref={inputRef}
                value={input}
                compact
                truncatePlaceholder
                autoGrow
                onChange={(e) => {
                  cancelTypewriter()
                  setInput(e.target.value)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    if (!inputDisabled) void handleSend()
                  }
                }}
                disabled={inputDisabled}
                placeholder={adapter.placeholder}
                className="min-h-[2.5rem] max-h-32 !px-0 !py-0"
              />

              <div className="flex w-full min-w-0 items-center gap-2">
                {showOpportunityEditToggle ? (
                  <Select
                    value={applyOpportunityEdit ? 'edit' : 'ask'}
                    onValueChange={(value) => setApplyOpportunityEdit(value === 'edit')}
                  >
                    <SelectTrigger
                      triggerWidth="min"
                      className={cn(HERO_FOOTER_CHIP_ICON_TRIGGER_CLASS, 'overflow-visible')}
                      aria-label={`Message mode: ${modeLabel}`}
                    >
                      <span className="sr-only">
                        <SelectValue />
                      </span>
                      <HeroComposerFooterChipContent
                        label={modeLabel}
                        labelOverflowVisible
                        icon={
                          applyOpportunityEdit ? (
                            <Pencil
                              className={cn(HERO_FOOTER_CHIP_ICON_CLASS, 'text-primary')}
                              strokeWidth={2.25}
                              aria-hidden
                            />
                          ) : (
                            <MessageCircle
                              className={cn(HERO_FOOTER_CHIP_ICON_CLASS, 'text-primary')}
                              strokeWidth={2.25}
                              aria-hidden
                            />
                          )
                        }
                      />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      avoidCollisions
                      collisionPadding={12}
                      align="start"
                      className={cn(HERO_FOOTER_SELECT_CONTENT_CLASS, 'w-[min(100vw-2rem,11.5rem)]')}
                    >
                      <SelectItem
                        value="ask"
                        textValue="Ask"
                        className={HERO_FOOTER_SELECT_ITEM_CLASS}
                      >
                        <span className="flex w-full min-w-0 items-center gap-2">
                          <MessageCircle
                            className={cn(HERO_FOOTER_CHIP_ICON_CLASS, 'text-primary')}
                            strokeWidth={2.25}
                            aria-hidden
                          />
                          <span>Ask</span>
                        </span>
                      </SelectItem>
                      <SelectItem
                        value="edit"
                        textValue={editToggleLabel}
                        className={HERO_FOOTER_SELECT_ITEM_CLASS}
                      >
                        <span className="flex w-full min-w-0 items-center gap-2">
                          <Pencil
                            className={cn(HERO_FOOTER_CHIP_ICON_CLASS, 'text-primary')}
                            strokeWidth={2.25}
                            aria-hidden
                          />
                          <span>{editToggleLabel}</span>
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="min-w-0 flex-1" />
                )}

                <div className="ml-auto flex shrink-0 items-center gap-1.5">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="primary"
                        size="icon"
                        className={cn(
                          discoverHeroButtonPrimaryClassName,
                          'mb-0 h-8 w-8 min-h-8 min-w-8 shrink-0 rounded-lg border border-primary/20 p-0',
                        )}
                        disabled={!input.trim() || inputDisabled}
                        loading={isLoading}
                        onClick={() => void handleSend()}
                        aria-label="Send"
                        icon={
                          <ArrowUp
                            className="h-4 w-4 transition-transform duration-200 ease-out group-hover/composer:rotate-90"
                            aria-hidden
                          />
                        }
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top">Send message</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>
          </SharedCommandComposerShell>

          {showOpportunityEditToggle && applyOpportunityEdit ? (
            <p className="shrink-0 px-1 text-center text-[10px] text-muted-foreground">
              Edit mode may update saved content
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
