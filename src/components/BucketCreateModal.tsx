'use client'

import React, { useState } from 'react'
import { useToast } from './ToastProvider'

interface BucketCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onBucketCreated?: (bucket: any) => void
}

export default function BucketCreateModal({ isOpen, onClose, onBucketCreated }: BucketCreateModalProps) {
  const [bucketName, setBucketName] = useState('')
  const [creating, setCreating] = useState(false)
  const [suggestions] = useState([
    'my-files', 'personal-storage', 'work-documents', 
    'family-photos', 'project-assets', 'backup-files'
  ])
  const { success, error } = useToast()

  // Reserved bucket names (system routes)
  const reservedNames = [
    'api', 'login', 'register', 'settings', 'demo', 'admin',
    'files', 'public', 'static', 'assets', 'images', 'docs',
    'help', 'support', 'about', 'contact', 'privacy', 'terms',
    'dashboard', 'profile', 'account', 'billing', 'pricing',
    'www', 'mail', 'ftp', 'blog', 'forum', 'wiki', 'cdn',
    'status', 'health', 'ping', 'test', 'staging', 'dev'
  ]

  const handleInputChange = (value: string) => {
    const cleanValue = value.toLowerCase().replace(/[^a-z0-9-]/g, '')
    
    // Check for reserved names
    if (reservedNames.includes(cleanValue)) {
      setBucketName('')
      error(`"${cleanValue}" is a reserved name. Please choose a different name.`)
      return
    }
    
    setBucketName(cleanValue)
  }

  const createBucket = async () => {
    if (!bucketName.trim()) {
      error('Please enter a bucket name')
      return
    }

    if (bucketName.length < 3) {
      error('Bucket name must be at least 3 characters long')
      return
    }

    setCreating(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/buckets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: bucketName.trim() })
      })
      
      if (response.ok) {
        const data = await response.json()
        success(`Bucket "${bucketName}" created successfully!`)
        
        // Call callback if provided
        if (onBucketCreated) {
          onBucketCreated(data.bucket)
        }
        
        // Reset and close
        setBucketName('')
        onClose()
      } else {
        const errorData = await response.json()
        error(errorData.error || 'Failed to create bucket')
      }
    } catch (err) {
      error('Failed to create bucket. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setBucketName(suggestion)
  }

  const getExampleURL = () => {
    if (!bucketName.trim()) return 'http://localhost:3000/your-bucket-name/filename.jpg'
    return `http://localhost:3000/${bucketName}/filename.jpg`
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-500/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Create New Bucket</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6">
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-4">
              Create a custom bucket to get clean, shareable URLs for your files.
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bucket Name
            </label>
            <input
              type="text"
              placeholder="my-awesome-files"
              value={bucketName}
              onChange={(e) => handleInputChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={50}
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-1">
              Only lowercase letters, numbers, and hyphens allowed (3-50 characters)
            </p>
          </div>

          {/* Suggestions */}
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Suggestions:</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {/* URL Preview */}
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-700 mb-2">Your files will be accessible at:</p>
            <div className="bg-gray-50 px-3 py-2 rounded-md border">
              <code className="text-sm text-blue-600 break-all">{getExampleURL()}</code>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={createBucket}
              disabled={!bucketName.trim() || creating}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? 'Creating...' : 'Create Bucket'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
