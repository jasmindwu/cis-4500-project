import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Sidebar from './components/Sidebar'
import SearchPage from './pages/SearchPage'
import ComparePage from './pages/ComparePage'
import StatsPage from './pages/StatsPage'
import AuthPage from './pages/AuthPage'
import TechStackPage from './pages/TechStackPage'
import './App.css'

export default function App() {
  return (
    <AuthProvider>
      <div className="app">
        <div className="app__bg">
          <div className="app__bg-blob app__bg-blob--1" />
          <div className="app__bg-blob app__bg-blob--2" />
          <div className="app__bg-blob app__bg-blob--3" />

          <img src="/assets/croissant_pixel.jpg" alt="" className="app__bg-deco app__bg-deco--1" />
          <img src="/assets/coffee.jpg" alt="" className="app__bg-deco app__bg-deco--2" />
          <img src="/assets/croissant.jpg" alt="" className="app__bg-deco app__bg-deco--3" />
          <img src="/assets/cinnamonroll.jpg" alt="" className="app__bg-deco app__bg-deco--4" />
          <img src="/assets/donut.jpg" alt="" className="app__bg-deco app__bg-deco--5" />
        </div>

        <div className="app__bar app__bar--top" />
        <div className="app__bar app__bar--bottom" />

        <Sidebar />

        <main className="app__main">
          <Routes>
            <Route path="/" element={<SearchPage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/account" element={<AuthPage />} />
            <Route path="/tech-stack" element={<TechStackPage />} />
          </Routes>
        </main>
      </div>
    </AuthProvider>
  )
}

