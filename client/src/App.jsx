import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import SearchPage from './pages/SearchPage'
import './App.css'

export default function App() {
  return (
    <div className="app">
      <div className="app__bar app__bar--top" />
      <div className="app__bar app__bar--bottom" />

      <Sidebar />

      <main className="app__main">
        <Routes>
          <Route path="/" element={<SearchPage />} />
          <Route path="/compare" element={<Placeholder page="compare" />} />
          <Route path="/stats" element={<Placeholder page="stats" />} />
        </Routes>
      </main>
    </div>
  )
}

function Placeholder({ page }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      fontFamily: 'var(--font-body)',
      fontStyle: 'italic',
      fontSize: 28,
      color: 'var(--placeholder)',
    }}>
      {page} page coming soon...
    </div>
  )
}
