'use client'

import { useEffect, useCallback } from 'react'

interface KeyboardShortcuts {
  onSelectAll?: () => void
  onDelete?: () => void
  onCopy?: () => void
  onCut?: () => void
  onPaste?: () => void
  onRename?: () => void
  onRefresh?: () => void
  onUpload?: () => void
  onNewFolder?: () => void
  onEscape?: () => void
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcuts, enabled = true) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return

    const { ctrlKey, metaKey, shiftKey, key, target } = event
    const isModifier = ctrlKey || metaKey
    const targetElement = target as HTMLElement
    
    // Don't trigger shortcuts when typing in inputs
    if (targetElement.tagName === 'INPUT' || targetElement.tagName === 'TEXTAREA' || targetElement.isContentEditable) {
      // Allow some shortcuts even in inputs
      if (key === 'Escape' && shortcuts.onEscape) {
        event.preventDefault()
        shortcuts.onEscape()
      }
      return
    }

    switch (key) {
      case 'a':
      case 'A':
        if (isModifier && shortcuts.onSelectAll) {
          event.preventDefault()
          shortcuts.onSelectAll()
        }
        break

      case 'Delete':
      case 'Backspace':
        if (shortcuts.onDelete) {
          event.preventDefault()
          shortcuts.onDelete()
        }
        break

      case 'c':
      case 'C':
        if (isModifier && shortcuts.onCopy) {
          event.preventDefault()
          shortcuts.onCopy()
        }
        break

      case 'x':
      case 'X':
        if (isModifier && shortcuts.onCut) {
          event.preventDefault()
          shortcuts.onCut()
        }
        break

      case 'v':
      case 'V':
        if (isModifier && shortcuts.onPaste) {
          event.preventDefault()
          shortcuts.onPaste()
        }
        break

      case 'F2':
        if (shortcuts.onRename) {
          event.preventDefault()
          shortcuts.onRename()
        }
        break

      case 'F5':
        if (shortcuts.onRefresh) {
          event.preventDefault()
          shortcuts.onRefresh()
        }
        break

      case 'u':
      case 'U':
        if (isModifier && shortcuts.onUpload) {
          event.preventDefault()
          shortcuts.onUpload()
        }
        break

      case 'n':
      case 'N':
        if (isModifier && shiftKey && shortcuts.onNewFolder) {
          event.preventDefault()
          shortcuts.onNewFolder()
        }
        break

      case 'Escape':
        if (shortcuts.onEscape) {
          event.preventDefault()
          shortcuts.onEscape()
        }
        break
    }
  }, [shortcuts, enabled])

  useEffect(() => {
    if (enabled) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown, enabled])
}

// Helper hook for showing keyboard shortcuts help
export function useKeyboardShortcutsHelp() {
  const shortcuts = [
    { key: 'Ctrl+A', description: 'Select all items' },
    { key: 'Delete', description: 'Delete selected items' },
    { key: 'Ctrl+C', description: 'Copy selected items' },
    { key: 'Ctrl+X', description: 'Cut selected items' },
    { key: 'Ctrl+V', description: 'Paste items' },
    { key: 'F2', description: 'Rename selected item' },
    { key: 'F5', description: 'Refresh' },
    { key: 'Ctrl+U', description: 'Upload files' },
    { key: 'Ctrl+Shift+N', description: 'New folder' },
    { key: 'Escape', description: 'Cancel/Close' }
  ]

  return shortcuts
}
