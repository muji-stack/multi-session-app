import { Keyboard, X } from 'lucide-react'
import { shortcuts, formatShortcut } from '../../hooks/useKeyboardShortcuts'

interface ShortcutHelpModalProps {
  isOpen: boolean
  onClose: () => void
}

function ShortcutHelpModal({ isOpen, onClose }: ShortcutHelpModalProps): JSX.Element | null {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-surface-dark rounded-2xl border border-white/10 shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Keyboard size={20} className="text-primary" />
            </div>
            <div>
              <h2 className="text-white font-medium">キーボードショートカット</h2>
              <p className="text-gray-400 text-sm">素早くナビゲーション</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">
            ナビゲーション
          </div>
          {shortcuts.map((shortcut, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/5"
            >
              <span className="text-gray-300 text-sm">{shortcut.description}</span>
              <kbd className="px-2 py-1 rounded bg-white/10 text-xs text-gray-400 font-mono">
                {formatShortcut(shortcut)}
              </kbd>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-white/5">
          <p className="text-gray-500 text-xs text-center">
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-gray-400 font-mono">Ctrl</kbd>
            {' + '}
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-gray-400 font-mono">/</kbd>
            {' でこのヘルプを表示'}
          </p>
        </div>
      </div>
    </div>
  )
}

export default ShortcutHelpModal
