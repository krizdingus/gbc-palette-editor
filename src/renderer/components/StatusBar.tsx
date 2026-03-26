import React, { useEffect } from 'react'
import { useEditorStore } from '../store/editorStore'

const AUTO_CLEAR_MS = 5000

export function StatusBar(): React.ReactElement {
  const status = useEditorStore((s) => s.status)
  const statusType = useEditorStore((s) => s.statusType)
  const clearStatus = useEditorStore((s) => s.clearStatus)

  // Auto-clear info messages
  useEffect(() => {
    if (statusType === 'info' && status) {
      const timer = setTimeout(clearStatus, AUTO_CLEAR_MS)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [status, statusType, clearStatus])

  const hasStatus = !!status

  return (
    <div
      className={`status-bar${hasStatus ? ` status-bar--${statusType ?? 'info'}` : ''}`}
      role={hasStatus ? 'status' : undefined}
    >
      {hasStatus && (
        <>
          <span className="status-bar__icon">
            {statusType === 'error' ? '✗' : statusType === 'warning' ? '⚠' : 'ℹ'}
          </span>
          <span className="status-bar__message">{status}</span>
          <button
            className="status-bar__dismiss"
            onClick={clearStatus}
            aria-label="Dismiss"
          >
            ×
          </button>
        </>
      )}
    </div>
  )
}
