import { NavLink } from 'react-router-dom'
import './Sidebar.css'

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar__logo">our app :)</div>

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
      </nav>

      <div className="sidebar__spacer" />

      <div className="sidebar__profile">
        <div className="sidebar__avatar" />
        <div className="sidebar__profile-info">
          <span className="sidebar__name">first last</span>
          <span className="sidebar__email">email@email.com</span>
        </div>
      </div>
    </aside>
  )
}
