import { useState } from 'react';
import { Languages, Settings, UserRound } from 'lucide-react';
export function TopNavigation() {
  const [menu, setMenu] = useState(null);
  const item = (key, icon, label) => (
    <div className="nav-menu-wrap">
      <button onClick={() => setMenu(menu === key ? null : key)}>{icon} {label} <span>⌄</span></button>
      {menu === key && (
  <div className="nav-menu">
    {key === 'masters' ? (
      <>
        <button type="button" onClick={() => { window.dispatchEvent(new CustomEvent('150chf:navigate', { detail: 'organizations' })); setMenu(null); }}>Organizations</button>
        <button type="button" onClick={() => { window.dispatchEvent(new CustomEvent('150chf:navigate', { detail: 'departments' })); setMenu(null); }}>Departments</button>
        <button type="button">Currencies</button>
      </>
    ) : null}
  </div>
)}
    </div>
  );
  return <nav className="top-nav">{item('masters', <Settings size={12} />, 'Masters')}{item('users', <UserRound size={12} />, 'User Management')}<div className="nav-menu-wrap language"><button onClick={() => setMenu(menu === 'language' ? null : 'language')}><Languages size={12} /> Language <span>⌄</span></button>{menu === 'language' && <div className="nav-menu"><button type="button">English</button><button type="button">Hindi</button></div>}</div></nav>;
}

