'use client'

import React from 'react'
import { Button, Badge } from './UI'

interface FileTableToolbarProps {
  selectedCount: number
  totalCount: number
  enableMultiSelect: boolean
  onToggleMultiSelect: (enabled: boolean) => void
  onSelectAll: (checked: boolean) => void
  onClearSelection: () => void
  selectedItems: any[]
  onCompressFiles?: (fileIds: string[], zipName: string) => void
  onExtractFile?: (fileId: string) => void
}

export default function FileTableToolbar({
  selectedCount,
  totalCount,
  enableMultiSelect,
  onToggleMultiSelect,
  onSelectAll,
  onClearSelection,
  selectedItems,
  onCompressFiles,
  onExtractFile
}: FileTableToolbarProps) {
  const [showCompressModal, setShowCompressModal] = React.useState(false)
  const [zipName, setZipName] = React.useState('')

  const selectedFiles = selectedItems.filter(item => item.type === 'file')
  const hasZipFiles = selectedFiles.some(file => file.mimeType === 'application/zip')

  const handleCompress = () => {
    if (selectedFiles.length === 0) return
    setShowCompressModal(true)
    setZipName(`archive_${Date.now()}.zip`)
  }

  const handleConfirmCompress = () => {
    if (onCompressFiles && selectedFiles.length > 0) {
      onCompressFiles(selectedFiles.map(f => f.id), zipName)
      setShowCompressModal(false)
      setZipName('')
    }
  }

  const handleExtract = () => {
    const zipFile = selectedFiles.find(file => file.mimeType === 'application/zip')
    if (zipFile && onExtractFile) {
      onExtractFile(zipFile.id)
    }
  }

  return (
    <div className="flex items-center justify-between py-3 px-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
      {/* Left side - Multi-select controls */}
      <div className="flex items-center space-x-4">
        <Button
          variant={enableMultiSelect ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => onToggleMultiSelect(!enableMultiSelect)}
          className="flex items-center space-x-2"
        >
          <span className="text-sm">
            {enableMultiSelect ? '☑️' : '☐'}
          </span>
          <span>Multi-Select</span>
        </Button>

        {enableMultiSelect && (
          <div className="flex items-center space-x-3">
            <button
              onClick={() => onSelectAll(selectedCount !== totalCount)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
            >
              {selectedCount === totalCount ? 'Deselect All' : 'Select All'}
            </button>

            {selectedCount > 0 && (
              <button
                onClick={onClearSelection}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                Clear Selection
              </button>
            )}
          </div>
        )}
      </div>

      {/* Right side - Actions and info */}
      <div className="flex items-center space-x-4">
        {selectedCount > 0 && enableMultiSelect && (
          <div className="flex items-center space-x-2">
            {/* Compress Files Button */}
            {selectedFiles.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCompress}
                className="flex items-center space-x-2"
                title="Nén các file đã chọn thành ZIP"
              >
                <span>🗜️</span>
                <span>Nén ZIP</span>
              </Button>
            )}

            {/* Extract ZIP Button */}
            {hasZipFiles && selectedFiles.length === 1 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleExtract}
                className="flex items-center space-x-2"
                title="Giải nén file ZIP"
              >
                <span>📦</span>
                <span>Giải nén</span>
              </Button>
            )}
          </div>
        )}

        {selectedCount > 0 && (
          <Badge variant="info" size="md">
            {selectedCount} selected
          </Badge>
        )}
        
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {totalCount} items
        </span>

        {/* Compress Modal */}
        {showCompressModal && (
          <div className="fixed inset-0 bg-gray-500/30 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 max-w-90vw">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
                Nén thành file ZIP
              </h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tên file ZIP:
                </label>
                <input
                  type="text"
                  value={zipName}
                  onChange={(e) => setZipName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  placeholder="archive.zip"
                />
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Sẽ nén {selectedFiles.length} file(s) đã chọn
              </div>
              <div className="flex justify-end space-x-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowCompressModal(false)}
                >
                  Hủy
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleConfirmCompress}
                  disabled={!zipName.trim()}
                >
                  Nén
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
