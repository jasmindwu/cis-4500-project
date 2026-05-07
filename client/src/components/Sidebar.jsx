import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Sidebar.css'

export default function Sidebar() {
  const { user, loading, configured, signOutUser } = useAuth()

  return (
    <aside className="sidebar">
      <div className="sidebar__logo">forkcast :)</div>

      <nav className="sidebar__nav">
        <NavLink to="/" end className="sidebar__link">
          search
        </NavLink>
        <NavLink to="/compare" className="sidebar__link">
          compare
        </NavLink>
        <NavLink to="/stats" className="sidebar__link">
          stats
        </NavLink>
        <NavLink to="/tech-stack" className="sidebar__link">
          tech stack
        </NavLink>
      </nav>

      <div className="sidebar__spacer" />

      <div className="sidebar__profile">
        <div className="sidebar__avatar" />
        <div className="sidebar__profile-info">
          {loading ? (
            <span className="sidebar__name">…</span>
          ) : user ? (
            <>
              <span className="sidebar__name">{user.displayName || 'signed in'}</span>
              <span className="sidebar__email">{user.email}</span>
              <button type="button" className="sidebar__sign-out" onClick={() => signOutUser()}>
                sign out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/account" className="sidebar__account-link">
                sign in / register
              </NavLink>
              {!configured && (
                <span className="sidebar__email">set Firebase keys in .env</span>
              )}
            </>
          )}
        </div>
      </div>
    </aside>
  )
}
