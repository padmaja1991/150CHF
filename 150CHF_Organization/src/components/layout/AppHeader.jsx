/** Shared header keeps the working brand-bar markup/CSS untouched. */
export function AppHeader({ title }) {
  return <header className="brand-bar"><strong>150CHF</strong><span>{title}</span><div className="user-meta">User: <b>APPADMIN</b>&nbsp;&nbsp; Party: <b>APPADMIN</b>&nbsp;&nbsp; Role: <b>APPADMIN</b></div></header>;
}
