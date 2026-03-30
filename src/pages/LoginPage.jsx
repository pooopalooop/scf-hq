import { useState } from 'react'
import { useAuth } from '../lib/auth'

export default function LoginPage() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleEmailSubmit(e) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setSubmitting(true)

    const { error: authError } = isSignUp
      ? await signUpWithEmail(email, password)
      : await signInWithEmail(email, password)

    setSubmitting(false)

    if (authError) {
      setError(authError.message)
    } else if (isSignUp) {
      setMessage('Check your email for a confirmation link.')
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="bg-surface border border-border rounded p-10 text-center max-w-sm w-full">
        <div className="font-mono font-semibold text-xl tracking-wider text-accent uppercase mb-1">
          SCF<span className="text-txt3 mx-1.5">/</span>HQ
        </div>
        <div className="font-mono text-[11px] text-txt3 mb-8">
          Salary Cap Fantasy League HQ
        </div>

        {/* Google OAuth */}
        <button
          onClick={signInWithGoogle}
          className="w-full bg-accent hover:bg-accent2 text-black font-mono text-[12px] font-semibold tracking-wider uppercase py-3 px-6 rounded-sm cursor-pointer transition-colors"
        >
          Sign in with Google
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-border" />
          <span className="font-mono text-[10px] text-txt3 uppercase tracking-wider">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleEmailSubmit} className="text-left">
          <div className="mb-3">
            <label className="font-mono text-[10px] tracking-wider text-txt2 uppercase block mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full bg-surface2 border border-border2 text-txt px-3 py-2.5 rounded-sm font-body text-[13px] outline-none focus:border-accent transition-colors"
            />
          </div>
          <div className="mb-4">
            <label className="font-mono text-[10px] tracking-wider text-txt2 uppercase block mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="w-full bg-surface2 border border-border2 text-txt px-3 py-2.5 rounded-sm font-body text-[13px] outline-none focus:border-accent transition-colors"
            />
          </div>

          {error && (
            <div className="text-red text-[11px] font-mono mb-3 text-center">{error}</div>
          )}
          {message && (
            <div className="text-green text-[11px] font-mono mb-3 text-center">{message}</div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-surface3 hover:bg-border text-txt font-mono text-[12px] font-semibold tracking-wider uppercase py-3 px-6 rounded-sm cursor-pointer transition-colors border border-border2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? '...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <button
          onClick={() => { setIsSignUp(!isSignUp); setError(null); setMessage(null) }}
          className="text-txt3 hover:text-txt2 text-[11px] mt-4 cursor-pointer bg-transparent border-none font-body"
        >
          {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
        </button>

        <p className="text-txt3 text-[11px] mt-3">
          Use the account linked to your team.
        </p>
      </div>
    </div>
  )
}
