'use client'

import React from 'react'
import BucketManager from '../../components/BucketManager'

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-2">Manage your account settings and buckets</p>
        </div>
        
        <div className="space-y-8">
          {/* Bucket Management Section */}
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Bucket Management</h2>
            <p className="text-gray-600 mb-6">
              Create custom buckets to organize your files and get beautiful URLs for sharing.
            </p>
            <BucketManager />
          </div>
          
          {/* Account Settings Section */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Account Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="your-email@example.com"
                  disabled
                />
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed at this time</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Change Password
                </label>
                <button className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700">
                  Change Password
                </button>
              </div>
            </div>
          </div>
          
          {/* Storage Statistics */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Storage Statistics</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">--</div>
                <div className="text-sm text-gray-600">Total Files</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">--</div>
                <div className="text-sm text-gray-600">Storage Used</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">--</div>
                <div className="text-sm text-gray-600">Active Buckets</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
