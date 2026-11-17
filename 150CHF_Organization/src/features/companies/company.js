
/* =====================================================
   150CHF — COMPANY LIST CONFIGURATION
   ===================================================== */

export const companyListConfig = {
  entityPlural: 'companies',

  labels: {
    code: 'Company Code',
    name: 'Name',
    status: 'Status'
  },

  columns: [
    { key: 'code', label: 'Company Code' },
    { key: 'name', label: 'Name' },
    { key: 'organizationName', label: 'Organization' },
    { key: 'status', label: 'Status' }
  ]
};
