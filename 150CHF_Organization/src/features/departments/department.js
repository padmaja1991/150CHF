
/* =========================================================
   150CHF — DEPARTMENT MODULE
   SECTION: DEPARTMENT LIST CONFIGURATION

   Purpose:
   - Department-specific table columns
   - Department-specific search labels
   - Reuses the common MasterListScreen
   - Does not affect Organization or Company
   ========================================================= */

export const departmentListConfig = {

  // SECTION 1: Module name
  entityPlural: 'departments',

  // SECTION 2: Search field labels
  labels: {
    code: 'Department Code',
    name: 'Name',
    status: 'Status'
  },

  // SECTION 3: Department list columns
  columns: [
    { key: 'code', label: 'Department Code' },
    { key: 'name', label: 'Name' },
    { key: 'organizationName', label: 'Organization' },
    { key: 'companyName', label: 'Company' },
    { key: 'status', label: 'Status' }
  ]

};
