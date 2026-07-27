import './MobileLayout.css'

function MobileLayout({ children }) {
  return (
    <div className="app-shell">
      <div className="mobile-frame">
        {children}
      </div>
    </div>
  )
}

export default MobileLayout