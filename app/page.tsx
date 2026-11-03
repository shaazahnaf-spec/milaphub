'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function Login() {
  const supabase = createClient()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function sendCode(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    })
    setBusy(false)
    if (error) return setError(error.message)
    setStep('code')
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError('')
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' })
    setBusy(false)
    if (error) return setError('Code galat hai ya expire ho gaya. Dobara try karo.')
    router.replace('/')
    router.refresh()
  }

  return (
    <main className="min-h-screen grid place-items-center bg-[#eef3f2] p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm border border-[#dbe5e4]">
        <div className="flex items-center gap-2 mb-6">
          <span className="relative h-9 w-9 rounded-full bg-[#0f5c5a]">
            <span className="absolute left-[2px] top-[10px] h-4 w-4 rounded-full border-[3px] border-[#f0a500]" />
            <span className="absolute right-[2px] top-[10px] h-4 w-4 rounded-full border-[3px] border-white" />
          </span>
          <span className="text-2xl font-extrabold text-[#12302f]">MilapHub</span>
        </div>

        <h1 className="text-xl font-bold text-[#12302f]">
          {step === 'email' ? 'Log in ya sign up karo' : 'Code daalo'}
        </h1>
        <p className="mt-1 mb-5 text-sm text-[#5d7776]">
          {step === 'email'
            ? 'Hum aapke email par 6-digit code bhejenge.'
            : `${email} par bheja gaya code yahan likho.`}
        </p>

        {step === 'email' ? (
          <form onSubmit={sendCode} className="space-y-3">
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              placeholder="aap@example.com" autoComplete="email"
              className="w-full rounded-lg border border-[#dbe5e4] px-3 py-3 outline-none focus:border-[#0f5c5a]" />
            <button disabled={busy}
              className="w-full rounded-lg bg-[#0f5c5a] py-3 font-bold text-white disabled:opacity-60">
              {busy ? 'Bhej rahe hain...' : 'Send code'}
            </button>
          </form>
        ) : (
          <form onSubmit={verify} className="space-y-3">
            <input required inputMode="numeric" pattern="[0-9]{6,8}" maxLength={8}
              value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="123456" autoComplete="one-time-code"
              className="w-full rounded-lg border border-[#dbe5e4] px-3 py-3 text-center text-2xl tracking-[0.4em] outline-none focus:border-[#0f5c5a]" />
            <button disabled={busy}
              className="w-full rounded-lg bg-[#0f5c5a] py-3 font-bold text-white disabled:opacity-60">
              {busy ? 'Check kar rahe hain...' : 'Verify and continue'}
            </button>
            <button type="button" onClick={() => { setStep('email'); setCode(''); setError('') }}
              className="w-full text-sm text-[#5d7776] underline">
              Email badlo
            </button>
          </form>
        )}

        {error && <p role="alert" className="mt-3 text-sm text-[#c0392b]">{error}</p>}

        <p className="mt-6 text-xs text-[#5d7776]">
          Continue karke aap hamare <a className="underline" href="/terms">Terms</a> aur{' '}
          <a className="underline" href="/privacy">Privacy Policy</a> se sahmat hain.
        </p>
      </div>
    </main>
  )
}
