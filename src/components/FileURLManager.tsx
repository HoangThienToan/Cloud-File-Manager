'use client'

import React, { useState, useEffect } from 'react'
import { useToast } from './ToastProvider'

interface Bucket {
  id: string
  name: string
  createdAt: string
}

interface FileURLManagerProps {
  fileId: string
  fileName: string
  onClose: () => void
}

export default function FileURLManager({ fileId, fileName, onClose }: FileURLManagerProps) {
  const [buckets, setBuckets] = useState<Bucket[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBucket, setSelectedBucket] = useState<string>('')
  const [filePath, setFilePath] = useState<string>('')
  const [creatingBucket, setCreatingBucket] = useState(false)
  const [newBucketName, setNewBucketName] = useState('')
  const { success, error } = useToast()
  
  useEffect(() => {
    fetchBuckets()
    fetchFileInfo()
  }, [])
  
  const fetchBuckets = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/buckets', {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setBuckets(data.buckets)
        if (data.buckets.length > 0) {
          setSelectedBucket(data.buckets[0].name)
        }
      }
    } catch (err) {
      error('Failed to load buckets')
    } finally {
      setLoading(false)
    }
  }
  
  const fetchFileInfo = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/files/${fileId}/info`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (response.ok) {
        const fileInfo = await response.json()
        // Build folder path from file info
        if (fileInfo.folder) {
          setFilePath(fileInfo.folder.path || '')
        }
      }
    } catch (err) {
      console.log('Could not fetch file path, using filename only')
      setFilePath('')
    }
  }
  
  const generateFileURL = (bucketName: string) => {
    // Build clean URL: just bucket + folder path + filename
    const fullPath = filePath ? `${filePath}/${fileName}` : fileName
    return `${window.location.origin}/${bucketName}/${fullPath}`
  }
  
  const generateDirectURL = () => {
    return `${window.location.origin}/api/file-public?id=${fileId}`
  }
  
  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      success('URL copied to clipboard')
    }).catch(() => {
      error('Failed to copy URL')
    })
  }
  
  const createBucket = async () => {
    if (!newBucketName.trim()) return
    
    setCreatingBucket(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/buckets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: newBucketName.trim() })
      })
      
      if (response.ok) {
        const data = await response.json()
        setBuckets([data.bucket, ...buckets])
        setSelectedBucket(data.bucket.name)
        setNewBucketName('')
        success('Bucket created successfully')
      } else {
        const errorData = await response.json()
        error(errorData.error || 'Failed to create bucket')
      }
    } catch (err) {
      error('Failed to create bucket')
    } finally {
      setCreatingBucket(false)
    }
  }
  
  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-500/30 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded mb-4"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="fixed inset-0 bg-gray-500/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">File URLs</h3>
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
            <p className="text-sm text-gray-600 mb-2">File: <span className="font-medium">{fileName}</span></p>
          </div>
          
          {buckets.length === 0 ? (
            <div className="space-y-4">
              <div className="text-center py-4">
                <div className="mb-4">
                  <svg className="mx-auto h-10 w-10 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <p className="text-gray-600 mb-2">No custom buckets available</p>
                <p className="text-sm text-gray-400 mb-4">Create a bucket for custom URLs, or use direct URL below</p>
              </div>
              
              {/* Quick bucket creation */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Create Your First Bucket</h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="my-awesome-files"
                    value={newBucketName}
                    onChange={(e) => {
                      const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                      // Check for reserved names
                      const reservedNames = ['api', 'login', 'register', 'settings', 'demo', 'admin', 'files', 'public', 'static', 'assets']
                      if (reservedNames.includes(value)) {
                        setNewBucketName('')
                        return
                      }
                      setNewBucketName(value)
                    }}
                    className="flex-1 px-3 py-2 border border-blue-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={50}
                  />
                  <button
                    onClick={createBucket}
                    disabled={!newBucketName.trim() || creatingBucket}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {creatingBucket ? 'Creating...' : 'Create'}
                  </button>
                </div>
                <p className="text-xs text-blue-600 mt-1">Only lowercase letters, numbers, and hyphens allowed. Reserved names like 'api', 'login' are blocked.</p>
              </div>
              
              {/* Direct URL fallback */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Direct Public URL
                </label>
                <div className="flex">
                  <input
                    type="text"
                    value={generateDirectURL()}
                    readOnly
                    className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-l-md text-sm font-mono"
                  />
                  <button
                    onClick={() => copyToClipboard(generateDirectURL())}
                    className="px-4 py-2 bg-blue-500 text-white rounded-r-md hover:bg-blue-600 flex items-center"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">This URL works immediately without bucket setup</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Bucket
                </label>
                <select
                  value={selectedBucket}
                  onChange={(e) => setSelectedBucket(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {buckets.map((bucket) => (
                    <option key={bucket.id} value={bucket.name}>
                      {bucket.name}
                    </option>
                  ))}
                </select>
              </div>
              
              {selectedBucket && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Public URL
                  </label>
                  <div className="flex">
                    <input
                      type="text"
                      value={generateFileURL(selectedBucket)}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 text-sm"
                    />
                    <button
                      onClick={() => copyToClipboard(generateFileURL(selectedBucket))}
                      className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 flex items-center"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy
                    </button>
                  </div>
                </div>
              )}
              
              {/* Alternative Direct URL */}
              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alternative Direct URL
                </label>
                <div className="flex">
                  <input
                    type="text"
                    value={generateDirectURL()}
                    readOnly
                    className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-l-md text-sm font-mono"
                  />
                  <button
                    onClick={() => copyToClipboard(generateDirectURL())}
                    className="px-4 py-2 bg-gray-500 text-white rounded-r-md hover:bg-gray-600 flex items-center"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Simple direct access URL (works without bucket)</p>
              </div>
              
              <div className="bg-blue-50 rounded-md p-4">
                <div className="flex">
                  <svg className="w-5 h-5 text-blue-400 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Public Access</p>
                    <p>This URL provides public access to your file without requiring authentication. Anyone with the link can view or download the file.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Close
          </button>
          {selectedBucket && (
            <button
              onClick={() => window.open(generateFileURL(selectedBucket), '_blank')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Open File
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
