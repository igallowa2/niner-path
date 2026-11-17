import { useState } from 'react'
import { getProfile, profileInitials, profileSummary } from '../lib/profile'
import { BellIcon, ChevronDownIcon } from './icons'

/** "Welcome back, Ivory" bar with notifications and the account menu. Reusable on any page. */
export function AppHeader() {
  const profile = getProfile()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="app-header">
      <p className="app-header-welcome">Welcome back, {profile.firstName}</p>
      <div className="app-header-actions">
        <button type="button" className="icon-btn" aria-label="Notifications">
          <BellIcon />
        </button>
        <div className="account">
          <span className="avatar" aria-hidden="true">{profileInitials(profile)}</span>
          <button
            type="button"
            className="icon-btn"
            aria-label="Account menu"
            aria-expanded={menuOpen}
            aria-controls="account-menu"
            onClick={() => setMenuOpen((o) => !o)}
            onKeyDown={(e) => { if (e.key === 'Escape') setMenuOpen(false) }}
          >
            <ChevronDownIcon />
          </button>
          {menuOpen && (
            <div className="account-menu" id="account-menu">
              <p className="account-name">{profile.firstName} {profile.lastName}</p>
              <p className="muted small">{profileSummary(profile)}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
