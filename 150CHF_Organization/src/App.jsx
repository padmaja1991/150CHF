
import { useEffect, useState } from 'react';
import { OrganizationPage } from './features/organizations/OrganizationPage';

// SECTION 1: Department Module Import
import { DepartmentPage } from './features/departments/DepartmentPage';
// SECTION 1.2: Company Module Import
import { CompanyPage } from './features/companies/CompanyPage';
export default function App() {
  const [activeModule, setActiveModule] = useState('organizations');

  // SECTION 1.1: Shared Masters menu navigation
  useEffect(() => {
    const handleNavigation = (event) => {
      if (
  event.detail === 'organizations' ||
  event.detail === 'departments' ||
  event.detail === 'companies'
)  {
        setActiveModule(event.detail);
      }
    };
    window.addEventListener('150chf:navigate', handleNavigation);
    return () => window.removeEventListener('150chf:navigate', handleNavigation);
  }, []);

  // SECTION 2: Module Navigation
  return (
    <>
      <div style={{ display: 'flex', gap: '8px', padding: '8px' }}>
        <button
          type="button"
          onClick={() => setActiveModule('organizations')}
        >
          Organizations
        </button>

        <button
          type="button"
          onClick={() => setActiveModule('departments')}
        >
          Departments
        </button>
        <button
  type="button"
  onClick={() => setActiveModule('companies')}
>
  Companies
</button>
      </div>

      {/* SECTION 3: Render Selected Module */}
      {activeModule === 'organizations' && <OrganizationPage />}
      {activeModule === 'departments' && <DepartmentPage />}
      {activeModule === 'companies' && <CompanyPage />}
    </>
  );
}
