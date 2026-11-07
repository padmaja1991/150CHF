
import React from 'react';

// ===== [DEPT-LIST-01 | Department List Screen] =====
export default function DepartmentList() {
  return (
    <section className="org-panel">
      <div className="org-section-heading">
        <h2>Departments</h2>
      </div>

      {/* ===== [DEPT-LIST-02 | Department Table] ===== */}
      <div className="org-table-wrapper">
        <table className="org-table">
          <thead>
            <tr>
              <th>Department Code</th>
              <th>Department Name</th>
              <th>Organization</th>
              <th>Company</th>
              <th>Branch</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={6} className="empty-table">
                No departments found.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
