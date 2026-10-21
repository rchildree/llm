import { NavLink, Outlet } from 'react-router-dom'
import { useDisplay } from './DisplayContext'

const link = ({ isActive }: { isActive: boolean }) =>
  'navlink' + (isActive ? ' active' : '')

/**
 * The u·V switch is hidden. Flip this to true to put it back — see
 * hidden-uv-toggle.txt at the root of the repository. Nothing else about the
 * mode is switched off: the setting still persists and every Latin string is
 * still rendered through it, so anyone who had it on keeps it.
 */
const SHOW_VS_TOGGLE: boolean = false

export default function Layout() {
  const { vsMode, toggleVsMode } = useDisplay()

  return (
    <div className="shell">
      <nav className="topnav">
        <span className="brand">
          LLM<span className="brand-rest">: Latin learning Machine</span>
        </span>
        <NavLink to="/flashcards" className={link}>Flashcards</NavLink>
        <NavLink to="/drills" className={link}>Drills</NavLink>
        <NavLink to="/agreement" className={link}>Agreement</NavLink>
        {SHOW_VS_TOGGLE && (
          <>
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
          </>
        )}
      </nav>
      <Outlet />
    </div>
  )
}
