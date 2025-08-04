'use client'

import React, { useState, useEffect } from 'react'
import { useToast } from './ToastProvider'

interface Bucket {
  id: string
  name: string
  createdAt: string
}

export default function BucketManager() {
  const [buckets, setBuckets] = useState<Bucket[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newBucketName, setNewBucketName] = useState('')
  const { success, error } = useToast()
  
  useEffect(() => {
    fetchBuckets()
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
      }
    } catch (err) {
      error('Failed to load buckets')
    } finally {
      setLoading(false)
    }
  }
  
  const createBucket = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newBucketName.trim()) return
    
    setCreating(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/buckets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: newBucketName.trim().toLowerCase() })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setBuckets([data.bucket, ...buckets])
        setNewBucketName('')
        success('Bucket created successfully', `Created bucket: ${data.bucket.name}`)
      } else {
        error('Failed to create bucket', data.error)
      }
    } catch (err) {
      error('Failed to create bucket')
    } finally {
      setCreating(false)
    }
  }
  
  const generateFileUrl = (bucket: Bucket, filePath: string) => {
    const baseUrl = window.location.origin
    return `${baseUrl}/api/bucket/${bucket.name}/${filePath}`
  }
  
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <h2 className="text-lg font-semibold mb-4 text-gray-800">My Buckets</h2>
      
      {/* Create new bucket form */}
      <form onSubmit={createBucket} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={newBucketName}
            onChange={(e) => setNewBucketName(e.target.value)}
            placeholder="Enter bucket name (lowercase, no spaces)"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            pattern="[a-z0-9-]+"
            title="Only lowercase letters, numbers, and hyphens allowed"
            disabled={creating}
          />
          <button
            type="submit"
            disabled={creating || !newBucketName.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? 'Creating...' : 'Create Bucket'}
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Bucket names must be unique, 3-50 characters, lowercase letters, numbers, and hyphens only
        </p>
      </form>
      
      {/* Buckets list */}
      {buckets.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="mb-4">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <p className="text-lg font-medium text-gray-900 mb-2">No buckets yet</p>
          <p>Create your first bucket to get started with custom URLs!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {buckets.map((bucket) => (
            <div key={bucket.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-medium text-lg text-gray-900">{bucket.name}</h3>
                  <p className="text-sm text-gray-500">
                    Created: {new Date(bucket.createdAt).toLocaleDateString('vi-VN')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Active
                  </span>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-md p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-700">Base URL:</p>
                  <button
                    onClick={() => {
                      const url = `${window.location.origin}/api/bucket/${bucket.name}/`
                      navigator.clipboard.writeText(url)
                      success('URL copied to clipboard')
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Copy
                  </button>
                </div>
                <code className="text-xs bg-white px-2 py-1 rounded border block">
                  {window.location.origin}/api/bucket/{bucket.name}/
                </code>
              </div>
              
              <div className="mt-3 text-sm text-gray-600">
                <p className="font-medium mb-2">Example URLs:</p>
                <div className="space-y-1">
                  <code className="block bg-gray-50 px-2 py-1 rounded text-xs">
                    {generateFileUrl(bucket, 'documents/report.pdf')}
                  </code>
                  <code className="block bg-gray-50 px-2 py-1 rounded text-xs">
                    {generateFileUrl(bucket, 'images/photo.jpg')}
                  </code>
                  <code className="block bg-gray-50 px-2 py-1 rounded text-xs">
                    {generateFileUrl(bucket, 'any-file.txt')}
                  </code>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
