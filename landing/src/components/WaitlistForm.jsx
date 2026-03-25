import { useState } from 'react'

const MAILTO = 'hemant3vardani@gmail.com'

export function WaitlistForm({ id = 'waitlist' }) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) return

    const subject = encodeURIComponent('Vizzy Waitlist Signup')
    const body = encodeURIComponent(
      `Hi,\n\nI'd like to join the Vizzy waitlist.\n\nMy email: ${trimmed}\n\nThanks!`
    )
    window.open(`mailto:${MAILTO}?subject=${subject}&body=${body}`, '_self')

    setStatus('success')
    setMessage("Thanks! Your email app should open — just hit Send.")
    setEmail('')
  }

  return (
    <div className="w-full max-w-lg">
      <form id={id} onSubmit={handleSubmit} className="flex w-full flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
          <label htmlFor={`${id}-email`} className="sr-only">
            Email
          </label>
          <input
            id={`${id}-email`}
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="glass glow-border flex-1 rounded-xl px-4 py-3.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none ring-violet-500/30 focus:ring-2 disabled:opacity-60"
          />
          <button
            type="submit"
            className="shrink-0 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition hover:brightness-110 disabled:opacity-60"
          >
            Join waitlist
          </button>
        </div>
        {message && (
          <p
            className={`text-left text-sm ${status === 'error' ? 'text-red-400' : 'text-emerald-400'}`}
            role="status"
          >
            {message}
          </p>
        )}
      </form>
    </div>
  )
}
