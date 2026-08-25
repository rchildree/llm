import { NavLink, Outlet } from 'react-router-dom'
import { useDisplay } from './DisplayContext'

const link = ({ isActive }: { isActive: boolean }) =>
  'navlink' + (isActive ? ' active' : '')

export default function Layout() {
  const { vsMode, toggleVsMode } = useDisplay()

  return (
    <div className="shell">
      <nav className="topnav">
        <span className="brand">LLM: Latin learning Machine</span>
        <NavLink to="/flashcards" className={link}>Flashcards</NavLink>
        <NavLink to="/drills" className={link}>Drills</NavLink>
        <span className="spacer" />
        <button
          type="button"
          role="switch"
          aria-checked={vsMode}
          className={'switch' + (vsMode ? ' on' : '')}
          onClick={toggleVsMode}
          title="Consummate Vs: write v as u, U as V"
        >
          <span className="switch-track"><span className="switch-thumb" /></span>
          <span className="latin">uV</span>
        </button>
      </nav>
      <Outlet />
    </div>
  )
}
