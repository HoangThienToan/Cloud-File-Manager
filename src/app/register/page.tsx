"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/contexts/LanguageContext'

export default function RegisterPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password, fullName })
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || t('common.registerFailed'))
      } else {
        localStorage.setItem('token', data.token)
        if (data.user && data.user.id) {
          localStorage.setItem('userId', data.user.id)
        }
        router.push('/')
      }
    } catch (err) {
      setError(t('common.connectionError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded shadow-md w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center">{t('common.registerTitle')}</h1>
        {error && <div className="mb-4 text-red-500 text-sm">{error}</div>}
        <div className="mb-4">
          <label className="block mb-1 font-medium">{t('common.email')}</label>
          <input type="email" className="w-full border px-3 py-2 rounded" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div className="mb-4">
          <label className="block mb-1 font-medium">{t('common.username')}</label>
          <input type="text" className="w-full border px-3 py-2 rounded" value={username} onChange={e => setUsername(e.target.value)} required />
        </div>
        <div className="mb-4">
          <label className="block mb-1 font-medium">{t('common.fullName')}</label>
          <input type="text" className="w-full border px-3 py-2 rounded" value={fullName} onChange={e => setFullName(e.target.value)} />
        </div>
        <div className="mb-6">
          <label className="block mb-1 font-medium">{t('common.password')}</label>
          <input type="password" className="w-full border px-3 py-2 rounded" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700" disabled={loading}>
          {loading ? t('common.registering') : t('common.register')}
        </button>
        <div className="mt-4 text-center text-sm">
          {t('common.alreadyHaveAccount')} <a href="/login" className="text-blue-600 hover:underline">{t('common.login')}</a>
        </div>
      </form>
    </div>
  )
}
