import type { ReactNode } from "react"
import type {
  AgentType,
  ConnectionStatus,
  PromptCapabilitiesInfo,
  PromptDraft,
  SessionConfigOptionInfo,
  SessionModeInfo,
  AvailableCommandInfo,
} from "@/lib/types"
import type {
  PendingPermission,
  PendingQuestion,
} from "@/contexts/acp-connections-context"
import type { QueuedMessage } from "@/hooks/use-message-queue"
import { ChatInput } from "@/components/chat/chat-input"
import { PermissionDialog } from "@/components/chat/permission-dialog"
import { QuestionDialog } from "@/components/chat/question-dialog"

interface ConversationShellProps {
  status: ConnectionStatus | null
  promptCapabilities: PromptCapabilitiesInfo
  defaultPath?: string
  agentName?: string
  error: string | null
  pendingPermission: PendingPermission | null
  pendingQuestion: PendingQuestion | null
  onFocus: () => void
  onSend: (draft: PromptDraft, modeId?: string | null) => void
  onCancel: () => void
  onRespondPermission: (requestId: string, optionId: string) => void
  onAnswerQuestion: (answer: string) => void
  children: ReactNode
  modes?: SessionModeInfo[]
  configOptions?: SessionConfigOptionInfo[]
  modeLoading?: boolean
  configOptionsLoading?: boolean
  selectorsLoading?: boolean
  selectedModeId?: string | null
  onModeChange?: (modeId: string) => void
  onConfigOptionChange?: (configId: string, valueId: string) => void
  agentType?: AgentType | null
  availableCommands?: AvailableCommandInfo[] | null
  attachmentTabId?: string | null
  draftStorageKey?: string | null
  hideInput?: boolean
  isActive?: boolean
  queue?: QueuedMessage[]
  onEnqueue?: (draft: PromptDraft, modeId: string | null) => void
  onQueueReorder?: (items: QueuedMessage[]) => void
  onQueueEdit?: (id: string) => void
  onQueueDelete?: (id: string) => void
  editingItemId?: string | null
  editingDraftText?: string | null
  isEditingQueueItem?: boolean
  onSaveQueueEdit?: (draft: PromptDraft) => void
  onCancelQueueEdit?: () => void
  onForkSend?: (draft: PromptDraft, modeId?: string | null) => void
}

export function ConversationShell({
  status,
  promptCapabilities,
  defaultPath,
  agentName,
  error,
  pendingPermission,
  pendingQuestion,
  onFocus,
  onSend,
  onCancel,
  onRespondPermission,
  onAnswerQuestion,
  children,
  modes,
  configOptions,
  modeLoading = false,
  configOptionsLoading = false,
  selectorsLoading = false,
  selectedModeId,
  onModeChange,
  onConfigOptionChange,
  agentType,
  availableCommands,
  attachmentTabId,
  draftStorageKey,
  hideInput = false,
  isActive,
  queue,
  onEnqueue,
  onQueueReorder,
  onQueueEdit,
  onQueueDelete,
  editingItemId,
  editingDraftText,
  isEditingQueueItem,
  onSaveQueueEdit,
  onCancelQueueEdit,
  onForkSend,
}: ConversationShellProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-1 min-h-0">{children}</div>

      <PermissionDialog
        permission={pendingPermission}
        onRespond={onRespondPermission}
      />

      <QuestionDialog question={pendingQuestion} onAnswer={onAnswerQuestion} />

      {!hideInput && (
        <ChatInput
          status={status}
          promptCapabilities={promptCapabilities}
          defaultPath={defaultPath}
          agentName={agentName}
          onFocus={onFocus}
          onSend={onSend}
          onCancel={onCancel}
          modes={modes}
          configOptions={configOptions}
          modeLoading={modeLoading}
          configOptionsLoading={configOptionsLoading}
          selectorsLoading={selectorsLoading}
          selectedModeId={selectedModeId}
          onModeChange={onModeChange}
          onConfigOptionChange={onConfigOptionChange}
          agentType={agentType}
          availableCommands={availableCommands}
          attachmentTabId={attachmentTabId}
          draftStorageKey={draftStorageKey}
          isActive={isActive}
          queue={queue}
          onEnqueue={onEnqueue}
          onQueueReorder={onQueueReorder}
          onQueueEdit={onQueueEdit}
          onQueueDelete={onQueueDelete}
          editingItemId={editingItemId}
          editingDraftText={editingDraftText}
          isEditingQueueItem={isEditingQueueItem}
          onSaveQueueEdit={onSaveQueueEdit}
          onCancelQueueEdit={onCancelQueueEdit}
          onForkSend={onForkSend}
        />
      )}

      {error && (
        <div className="px-4 py-2 text-xs text-destructive bg-destructive/5 border-t border-destructive/20">
          {error}
        </div>
      )}
    </div>
  )
}
