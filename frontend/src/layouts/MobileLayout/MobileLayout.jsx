import './MobileLayout.css'

function MobileLayout({ children }) {
  return (
    <div className="mobile-layout">
      <div className="mobile-frame">
        {children}
      </div>
    </div>
  )
}

export default MobileLayout