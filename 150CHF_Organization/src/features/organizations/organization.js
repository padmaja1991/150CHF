/** Organization-only list config; shared components never hardcode a module's columns. */
export const organizationListConfig = {
  entityPlural: 'organizations',
  labels: { code: 'Organization Code', name: 'Name', status: 'Status' },
  columns: [
    { key: 'code', label: 'Organization Code' },
    { key: 'name', label: 'Name' },
    { key: 'currency', label: 'Rpt Curn' },
    { key: 'status', label: 'Status' }
  ]
};
