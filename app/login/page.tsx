'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Mode = 'login' | 'signup' | 'signup-code' | 'otp-email' | 'otp-code'

export default function Login() {
  const [supabase] = useState(() => createClient())
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  function go(m: Mode) { setMode(m); setError(''); setCode('') }
  function done() { router.replace('/home'); router.refresh() }

  async function logIn(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) {
      return setError(
        error.message.toLowerCase().includes('confirm')
          ? 'Pehle apna email verify karo. Create account se code mangwao.'
          : 'Email ya password galat hai.'
      )
    }
    done()
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) return setError('Password kam se kam 8 characters ka ho.')
    setBusy(true); setError('')
    const { data, error } = await supabase.auth.signUp({
      email, password, options: { data: { full_name: name.trim() } },
    })
    setBusy(false)
    if (error) return setError(error.message)
    if (data.session) return done()
    go('signup-code')
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError('')
    const { error } = await supabase.auth.verifyOtp({
      email, token: code, type: mode === 'signup-code' ? 'signup' : 'email',
    })
    setBusy(false)
    if (error) return setError('Code galat hai ya expire ho gaya.')
    done()
  }

  async function sendLoginCode(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email, options: { shouldCreateUser: false },
    })
    setBusy(false)
    if (error) return setError('Is email se account nahi mila, ya code bhejne mein dikkat aayi.')
    go('otp-code')
  }

  const input = 'w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-teal-700 focus:ring-1 focus:ring-teal-700'
  const primary = 'w-full rounded-lg bg-teal-800 py-3 text-lg font-bold text-white hover:bg-teal-900 disabled:opacity-60 transition-all'
  const link = 'text-sm font-semibold text-teal-800 hover:underline'

  return (
    <main className="grid min-h-screen place-items-center bg-teal-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-5 text-center">
          <h1 className="text-4xl font-extrabold text-teal-900">MilapHub</h1>
          <p className="mt-1 text-gray-600">Apne shehar ke logon se milo, judo aur bazaar karo.</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-md">
          {mode === 'login' && (
            <form onSubmit={logIn} className="space-y-4">
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="Email address" autoComplete="email" className={input} />
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Password" autoComplete="current-password" className={input} />
              <button disabled={busy} className={primary}>{busy ? 'Ruko...' : 'Log in'}</button>
              <div className="text-center">
                <button type="button" onClick={() => go('otp-email')} className={link}>
                  Password bhool gaye? Email code se login karo
                </button>
              </div>
              <hr className="border-gray-200" />
              <button type="button" onClick={() => go('signup')}
                className="mx-auto block rounded-lg bg-amber-500 hover:bg-amber-600 px-6 py-3 font-bold text-white transition-all">
                Create new account
              </button>
            </form>
          )}

          {mode === 'signup' && (
            <form onSubmit={signUp} className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900">Naya account banao</h2>
              <p className="text-sm text-gray-600">Ye free hai aur 1 minute lagta hai.</p>
              <input required value={name} onChange={e => setName(e.target.value)}
                placeholder="Poora naam" autoComplete="name" className={input} />
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="Email address (Gmail, Yahoo, Outlook, koi bhi)" autoComplete="email" className={input} />
              <input type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Naya password (8+ characters)" autoComplete="new-password" className={input} />
              <p className="text-xs text-gray-500">
                Sign up karke aap hamare <a className="underline" href="/terms">Terms</a> aur{' '}
                <a className="underline" href="/privacy">Privacy Policy</a> se sahmat hain.
              </p>
              <button disabled={busy} className={primary}>{busy ? 'Ruko...' : 'Sign up'}</button>
              <div className="text-center">
                <button type="button" onClick={() => go('login')} className={link}>Pehle se account hai? Log in</button>
              </div>
            </form>
          )}

          {mode === 'otp-email' && (
            <form onSubmit={sendLoginCode} className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900">Email code se login</h2>
              <p className="text-sm text-gray-600">Hum aapke email par 6-digit code bhejenge.</p>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="Email address" autoComplete="email" className={input} />
              <button disabled={busy} className={primary}>{busy ? 'Bhej rahe hain...' : 'Send code'}</button>
              <div className="text-center">
                <button type="button" onClick={() => go('login')} className={link}>Wapas jao</button>
              </div>
            </form>
          )}

          {(mode === 'signup-code' || mode === 'otp-code') && (
            <form onSubmit={verify} className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900">Code daalo</h2>
              <p className="text-sm text-gray-600">{email} par bheja gaya code yahan likho. Spam folder bhi dekh lena.</p>
              <input required inputMode="numeric" maxLength={8} value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456" autoComplete="one-time-code"
                className={input + ' text-center text-2xl tracking-[0.4em]'} />
              <button disabled={busy} className={primary}>{busy ? 'Check ho raha hai...' : 'Verify'}</button>
              <div className="text-center">
                <button type="button" onClick={() => go('login')} className={link}>Wapas jao</button>
              </div>
            </form>
          )}

          {error && <p role="alert" className="mt-3 text-sm text-red-600 font-medium">{error}</p>}
        </div>
      </div>
    </main>
  )
}
