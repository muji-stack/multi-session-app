import { memo, ReactNode } from 'react'
import { LucideIcon, Inbox, Search, FileX, Users, Calendar, Zap } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

const EmptyState = memo(function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className = ''
}: EmptyStateProps): JSX.Element {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
        <Icon size={32} className="text-gray-500" />
      </div>
      <h3 className="text-lg font-medium text-white mb-1">{title}</h3>
      {description && (
        <p className="text-gray-400 text-sm max-w-sm mb-4">{description}</p>
      )}
      {action}
    </div>
  )
})

// Preset empty states
export const NoDataState = memo(function NoDataState({
  action
}: {
  action?: ReactNode
}): JSX.Element {
  return (
    <EmptyState
      icon={Inbox}
      title="データがありません"
      description="まだデータが登録されていません"
      action={action}
    />
  )
})

export const NoSearchResults = memo(function NoSearchResults({
  query
}: {
  query?: string
}): JSX.Element {
  return (
    <EmptyState
      icon={Search}
      title="検索結果がありません"
      description={query ? `「${query}」に一致する結果が見つかりませんでした` : '検索条件を変更してお試しください'}
    />
  )
})

export const NoAccountsState = memo(function NoAccountsState({
  action
}: {
  action?: ReactNode
}): JSX.Element {
  return (
    <EmptyState
      icon={Users}
      title="アカウントがありません"
      description="アカウントを追加して管理を始めましょう"
      action={action}
    />
  )
})

export const NoScheduledPosts = memo(function NoScheduledPosts({
  action
}: {
  action?: ReactNode
}): JSX.Element {
  return (
    <EmptyState
      icon={Calendar}
      title="予約投稿がありません"
      description="投稿を予約して自動的に投稿しましょう"
      action={action}
    />
  )
})

export const NoAutomationTasks = memo(function NoAutomationTasks({
  action
}: {
  action?: ReactNode
}): JSX.Element {
  return (
    <EmptyState
      icon={Zap}
      title="自動化タスクがありません"
      description="自動化タスクを作成してエンゲージメントを自動化しましょう"
      action={action}
    />
  )
})

export const ErrorState = memo(function ErrorState({
  title = 'エラーが発生しました',
  description = '問題が発生しました。再度お試しください。',
  action
}: {
  title?: string
  description?: string
  action?: ReactNode
}): JSX.Element {
  return (
    <EmptyState
      icon={FileX}
      title={title}
      description={description}
      action={action}
    />
  )
})

export default EmptyState
