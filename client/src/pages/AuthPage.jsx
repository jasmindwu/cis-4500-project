import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './AuthPage.css'

function mapAuthError(code) {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'That email is already registered.'
    case 'auth/invalid-email':
      return 'Invalid email address.'
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.'
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a bit and try again.'
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Sign-in was cancelled.'
    case 'auth/popup-blocked':
      return 'Pop-up was blocked. Allow pop-ups for this site and try again.'
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with this email using a different sign-in method.'
    case 'auth/operation-not-allowed':
      return 'This sign-in method isn’t enabled in Firebase (Authentication → Sign-in method).'
    default:
      return 'Something went wrong. Try again.'
  }
}

export default function AuthPage() {
  const {
    configured,
    loading: authLoading,
    user,
    signUp,
    signIn,
    signInWithGoogle,
    signInWithGithub,
  } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState('signin')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  if (authLoading) {
    return (
      <div className="auth-page">
        <p className="auth-page__muted">loading…</p>
      </div>
    )
  }

  if (!configured) {
    return (
      <div className="auth-page">
        <h1 className="auth-page__title">account</h1>
        <div className="auth-page__panel">
          <p className="auth-page__lead">
            Firebase isn&apos;t configured yet. Add your web app keys to <code className="auth-page__code">client/.env</code>{' '}
            (see <code className="auth-page__code">client/.env.example</code>). In the Firebase Console, open Authentication →
            Sign-in method and enable <strong>Email/Password</strong>, <strong>Google</strong>, and <strong>GitHub</strong> (or two other
            OAuth providers) to match the course requirement.
          </p>
          <p className="auth-page__muted">
            You don&apos;t need Postgres or any extra database for accounts — Firebase Auth stores users for you.
          </p>
          <Link to="/" className="auth-page__back">
            ← back to search
          </Link>
        </div>
      </div>
    )
  }

  if (user) {
    return (
      <div className="auth-page">
        <h1 className="auth-page__title">account</h1>
        <div className="auth-page__panel">
          <p className="auth-page__lead">
            Signed in as <strong>{user.displayName || user.email}</strong>
          </p>
          <p className="auth-page__muted">{user.email}</p>
          <button type="button" className="auth-page__btn" onClick={() => navigate('/')}>
            continue to app
          </button>
        </div>
      </div>
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (mode === 'signup') {
      if (password !== confirm) {
        setError('Passwords do not match.')
        return
      }
      if (!username.trim()) {
        setError('Choose a display name.')
        return
      }
    }
    setPending(true)
    try {
      if (mode === 'signup') {
        await signUp(email, password, username)
      } else {
        await signIn(email, password)
      }
      navigate('/')
    } catch (err) {
      setError(mapAuthError(err?.code) || err?.message || 'Error')
    } finally {
      setPending(false)
    }
  }

  async function handleOAuth(provider) {
    setError('')
    setPending(true)
    try {
      if (provider === 'google') await signInWithGoogle()
      else await signInWithGithub()
      navigate('/')
    } catch (err) {
      setError(mapAuthError(err?.code) || err?.message || 'Error')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="auth-page">
      <h1 className="auth-page__title">account</h1>
      <div className="auth-page__tabs">
        <button
          type="button"
          className={`auth-page__tab ${mode === 'signin' ? 'auth-page__tab--active' : ''}`}
          onClick={() => setMode('signin')}
        >
          sign in
        </button>
        <button
          type="button"
          className={`auth-page__tab ${mode === 'signup' ? 'auth-page__tab--active' : ''}`}
          onClick={() => setMode('signup')}
        >
          create account
        </button>
      </div>

      <form className="auth-page__panel" onSubmit={handleSubmit}>
        {mode === 'signup' && (
          <label className="auth-page__field">
            <span className="auth-page__label">display name</span>
            <input
              className="auth-page__input"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="how you want to appear"
            />
          </label>
        )}
        <label className="auth-page__field">
          <span className="auth-page__label">email</span>
          <input
            className="auth-page__input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="auth-page__field">
          <span className="auth-page__label">password</span>
          <input
            className="auth-page__input"
            type="password"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </label>
        {mode === 'signup' && (
          <label className="auth-page__field">
            <span className="auth-page__label">confirm password</span>
            <input
              className="auth-page__input"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={6}
            />
          </label>
        )}
        {error && <p className="auth-page__error">{error}</p>}
        <button type="submit" className="auth-page__btn" disabled={pending}>
          {pending ? '…' : mode === 'signup' ? 'create account' : 'sign in'}
        </button>
      </form>

      <div className="auth-page__oauth-wrap">
        <p className="auth-page__oauth-label">or continue with</p>
        <div className="auth-page__oauth-row auth-page__oauth-row--two">
          <button
            type="button"
            className="auth-page__oauth-btn auth-page__oauth-btn--google"
            disabled={pending}
            onClick={() => handleOAuth('google')}
          >
            Google
          </button>
          <button
            type="button"
            className="auth-page__oauth-btn auth-page__oauth-btn--github"
            disabled={pending}
            onClick={() => handleOAuth('github')}
          >
            GitHub
          </button>
        </div>
        <p className="auth-page__oauth-hint">
          Turn on Google and GitHub under Firebase → Authentication → Sign-in method. For GitHub, create an OAuth App and paste the
          client ID and secret into Firebase (the secret stays in Firebase, not in this repo).
        </p>
      </div>

      <Link to="/" className="auth-page__back">
        ← back to search
      </Link>
    </div>
  )
}
