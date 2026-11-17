import { MasterListScreen } from '../../components/master/MasterListScreen';
import { MasterCRUDScreen, useMasterCRUD } from '../../components/master/MasterCRUDScreen';
import { MasterDeleteDialog } from '../../components/master/MasterDeleteDialog';
import { AppHeader } from '../../components/layout/AppHeader';
import { organizationListConfig } from './organization';
import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { Copy, Download, Eye, FilePlus2, Pencil, Power, Search, Trash2 } from 'lucide-react';
import { emptySearch, getOrganizations, saveOrganization, deleteOrganization, readApiResponse } from '../../components/organizationService';
import { OrganizationForm } from '../../components/OrganizationForm';
import { TopNavigation } from '../../components/layout/TopNavigation';
export function OrganizationPage() {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState('Select');
  const [applied, setApplied] = useState(emptySearch);
  const [selected, setSelected] = useState([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const crud = useMasterCRUD();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sort, setSort] = useState({ key: 'code', direction: 'asc' });

  const organizationsQuery = useQuery({
    queryKey: ['organizations', applied, page, perPage],
    queryFn: getOrganizations,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 4000)
  });
  const result = organizationsQuery.data || { rows: [], total: 0, totalPages: 1 };
  const sortedOrganizations = [...result.rows].sort((first, second) => {
    const comparison = String(first[sort.key] || '').localeCompare(String(second[sort.key] || ''), undefined, { sensitivity: 'base' });
    return sort.direction === 'asc' ? comparison : -comparison;
  });
  const organizationStatusMutation = useMutation({
    mutationFn: (organization) => saveOrganization(organization.id, { ...organization, status: 'Inactive', code: organization.code || '', name: organization.name || '', reportingCurrency: organization.reportingCurrency || organization.currency || '' }),
    onSuccess: () => {
      setDeleteDialogOpen(false);
      setSelected([]);
      organizationsQuery.refetch();
    },
    onError: (requestError) => window.alert(requestError.message)
  });
  const organizationDeleteMutation = useMutation({
    mutationFn: (organizationId) => deleteOrganization(organizationId),
    onSuccess: () => {
      setDeleteDialogOpen(false);
      setSelected([]);
      organizationsQuery.refetch();
    },
    onError: (requestError) => window.alert(requestError.message)
  });

  const updateFilter = (key, value) => {
    setApplied((current) => ({ ...current, [key]: key === 'status' ? value : value.trim() }));
    if (key === 'code') setCode(value);
    if (key === 'name') setName(value);
    if (key === 'status') setStatus(value);
    setPage(1);
  };

  const reset = () => {
    setCode('');
    setName('');
    setStatus('Select');
    setApplied(emptySearch);
    setPage(1);
    setSelected([]);
  };

  const selectRow = (organization) => {
    setSelected((current) => current.some((item) => item.id === organization.id) ? [] : [organization]);
  };
  const openNewOrganization = () => crud.openForm('create');
  const openForm = crud.openForm;
  const deleteSelected = () => {
    if (!selected.length) return;
    setDeleteDialogOpen(true);
  };
  const markSelectedInactive = () => {
    if (selected[0]) organizationStatusMutation.mutate(selected[0]);
  };
  const removeSelected = () => {
    if (selected[0]) organizationDeleteMutation.mutate(selected[0].id);
  };
  const downloadOrganizations = async () => {
    try {
      const response = await fetch('/api/organizations?page=1&linesPerPage=10000');
      const exportResult = await readApiResponse(response, 'Unable to export organizations');
      const escape = (value) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      const rows = selected.length ? selected : exportResult.rows;
      const table = `<tr><th>Organization Code</th><th>Name</th><th>Reporting Currency</th><th>Status</th></tr>${rows.map((row) => `<tr><td>${escape(row.code)}</td><td>${escape(row.name)}</td><td>${escape(row.currency || row.reportingCurrency)}</td><td>${escape(row.status)}</td></tr>`).join('')}`;
      const blob = new Blob([`<html><head><meta charset="UTF-8"></head><body><table>${table}</table></body></html>`], { type: 'application/vnd.ms-excel' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'organizations.xls';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      window.alert(error.message);
    }
  };

  return <MasterCRUDScreen controller={crud} renderForm={({ mode, record, recordId, onClose }) => (
    <OrganizationForm layout="four-4" organizationId={recordId} initialOrganization={record}
      formMode={mode} readOnly={mode === 'view'} onCancel={onClose}
      onCreated={() => { onClose(); organizationsQuery.refetch(); setSelected([]); }} />
  )} renderList={() => (
    <div className="legacy-screen">
      <TopNavigation />

      <AppHeader title="Organizations" />

      <div className="action-bar">
        <button aria-label="Search" title="Search organizations" onClick={() => document.querySelector('.search-fields input')?.focus()}><Search size={14} /></button>
        <button aria-label="Back" onClick={reset}>↶</button>
        <button aria-label="Export organizations" onClick={downloadOrganizations}><Download size={13} /></button>
        {!selected.length && <button aria-label="New organization" title="Add organization" onClick={openNewOrganization}><FilePlus2 size={13} /></button>}
        {selected.length > 0 && (
          <>
            <button aria-label="View organization" title="View organization" onClick={() => openForm('view', selected[0])}><Eye size={13} /></button>
            <button aria-label="Edit organization" title="Edit organization" onClick={() => openForm('edit', selected[0])}><Pencil size={13} /></button>
            <button aria-label="Copy organization" title="Copy organization" type="button" onClick={() => openForm('copy', selected[0])}><Copy size={13} /></button>
            <button aria-label="Delete organization" title="Delete organization" onClick={deleteSelected}><Trash2 size={13} /></button>
          </>
        )}
        <button className="toolbar-power" aria-label="Power" type="button"><Power size={13} /></button>
      </div>
      <MasterListScreen
        {...organizationListConfig}
        rows={sortedOrganizations}
        selected={selected}
        code={code} name={name} status={status} updateFilter={updateFilter}
        sort={sort} setSort={setSort} selectRow={selectRow}
        isLoading={organizationsQuery.isLoading} isError={organizationsQuery.isError}
        error={organizationsQuery.error} result={result}
        page={page} setPage={setPage} perPage={perPage} setPerPage={setPerPage}
      />
      {deleteDialogOpen && selected[0] && <MasterDeleteDialog
        onClose={() => setDeleteDialogOpen(false)}
        onInactive={markSelectedInactive} onDelete={removeSelected}
        pending={organizationStatusMutation.isPending || organizationDeleteMutation.isPending}
      />}
    </div>
  )} />;
}