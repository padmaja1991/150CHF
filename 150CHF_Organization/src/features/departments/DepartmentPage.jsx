
/* =========================================================
   150CHF — DEPARTMENT MODULE
   FILE: DepartmentPage.jsx

   Reuses Organization master list and CRUD components.
   Data source: PostgreSQL Department API.
   ========================================================= */

import { useState } from 'react';

import {
  keepPreviousData,
  useQuery,
  useMutation,
  useQueryClient
} from '@tanstack/react-query';

import {
  Copy,
  Download,
  Eye,
  FilePlus2,
  Pencil,
  Power,
  Search,
  Trash2
} from 'lucide-react';

import { MasterDeleteDialog } from '../../components/master/MasterDeleteDialog';

import { MasterListScreen } from '../../components/master/MasterListScreen';

import {
  MasterCRUDScreen,
  useMasterCRUD
} from '../../components/master/MasterCRUDScreen';

import { AppHeader } from '../../components/layout/AppHeader';
import { TopNavigation } from '../../components/layout/TopNavigation';

import { DepartmentForm } from './DepartmentForm';
import { departmentListConfig } from './department';

import {
  emptyDepartmentSearch,
  getDepartments,
  deleteDepartment,
  saveDepartment
} from './departmentService';

export function DepartmentPage() {

  // =====================================================
  // SECTION 1: SEARCH AND PAGINATION STATE
  // =====================================================

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState('Select');

  const [applied, setApplied] = useState(emptyDepartmentSearch);
  const [selected, setSelected] = useState([]);

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const [sort, setSort] = useState({
    key: 'code',
    direction: 'asc'
  });

  // =====================================================
  // SECTION 2: COMMON MASTER CRUD CONTROLLER
  // =====================================================

  const crud = useMasterCRUD();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const inactiveMutation = useMutation({
    mutationFn: (department) => saveDepartment(department.id, { ...department, status: 'Inactive' }),
    onSuccess: async () => {
      setDeleteDialogOpen(false);
      setSelected([]);
      await queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
    onError: (error) => window.alert(error.message)
  });
  const deleteMutation = useMutation({
    mutationFn: deleteDepartment,
    onSuccess: async () => {
      setDeleteDialogOpen(false);
      setSelected([]);
      await queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
    onError: (error) => window.alert(error.message)
  });

  // =====================================================
  // SECTION 3: POSTGRESQL DEPARTMENT LIST API
  // =====================================================

  const departmentsQuery = useQuery({
    queryKey: ['departments', applied, page, perPage],
    queryFn: getDepartments,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    retry: 3,
    retryDelay: (attempt) =>
      Math.min(1000 * 2 ** attempt, 4000)
  });

  const result = departmentsQuery.data || {
    rows: [],
    total: 0,
    totalPages: 1
  };

  // =====================================================
  // SECTION 4: TABLE SORTING
  // =====================================================

  const sortedDepartments = [...result.rows].sort(
    (first, second) => {
      const comparison = String(first[sort.key] ?? '')
        .localeCompare(
          String(second[sort.key] ?? ''),
          undefined,
          { sensitivity: 'base' }
        );

      return sort.direction === 'asc'
        ? comparison
        : -comparison;
    }
  );

  // =====================================================
  // SECTION 5: SEARCH FILTERS
  // =====================================================

  const updateFilter = (key, value) => {
    setApplied((current) => ({
      ...current,
      [key]: key === 'status' ? value : value.trim()
    }));

    if (key === 'code') setCode(value);
    if (key === 'name') setName(value);
    if (key === 'status') setStatus(value);

    setPage(1);
  };

  // =====================================================
  // SECTION 6: RESET
  // =====================================================

  const reset = () => {
    setCode('');
    setName('');
    setStatus('Select');
    setApplied(emptyDepartmentSearch);
    setPage(1);
    setSelected([]);
  };

  // =====================================================
  // SECTION 7: ROW SELECTION
  // =====================================================

  const selectRow = (department) => {
    setSelected((current) =>
      current.some((item) => item.id === department.id)
        ? []
        : [department]
    );
  };

  // =====================================================
  // SECTION 8: DEPARTMENT EXPORT
  // =====================================================

  const downloadDepartments = async () => {
    try {
      const response = await fetch(
        '/api/departments?page=1&linesPerPage=10000'
      );

      if (!response.ok) {
        throw new Error('Unable to export departments');
      }

      const exportResult = await response.json();

      const rows = selected.length
        ? selected
        : exportResult.rows;

      const escape = (value) =>
        String(value ?? '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');

      const table = `
        <tr>
          <th>Department Code</th>
          <th>Name</th>
          <th>Organization</th>
          <th>Company</th>
          <th>Status</th>
        </tr>
        ${rows.map((row) => `
          <tr>
            <td>${escape(row.code)}</td>
            <td>${escape(row.name)}</td>
            <td>${escape(row.organizationName)}</td>
            <td>${escape(row.companyName)}</td>
            <td>${escape(row.status)}</td>
          </tr>
        `).join('')}
      `;

      const blob = new Blob(
        [`<html><head><meta charset="UTF-8"></head>
          <body><table>${table}</table></body></html>`],
        { type: 'application/vnd.ms-excel' }
      );

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');

      anchor.href = url;
      anchor.download = 'departments.xls';

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      URL.revokeObjectURL(url);
    } catch (error) {
      window.alert(error.message);
    }
  };

  // =====================================================
  // SECTION 9: COMMON MASTER CRUD SCREEN
  // =====================================================

  return (
    <MasterCRUDScreen
      controller={crud}

      // SECTION 9.1: DEPARTMENT FORM
      renderForm={({ mode, record, recordId, onClose }) => (
        <DepartmentForm
          mode={mode}
          record={record}
          recordId={recordId}
          onCancel={onClose}
        />
      )}

      // SECTION 9.2: DEPARTMENT LIST
      renderList={() => (
        <div className="legacy-screen department-screen">

          <TopNavigation />

          <AppHeader title="Departments" />

          {/* SECTION 10: ACTION TOOLBAR */}
          <div className="action-bar">

            <button
              aria-label="Search"
              title="Search departments"
              onClick={() =>
                document.querySelector('.search-fields input')?.focus()
              }
            >
              <Search size={14} />
            </button>

            <button
              aria-label="Back"
              onClick={reset}
            >
              ↶
            </button>

            <button
              aria-label="Export departments"
              onClick={downloadDepartments}
            >
              <Download size={13} />
            </button>

            {/* ADD DEPARTMENT */}
            {!selected.length && (
              <button
                aria-label="New department"
                title="Add department"
                type="button"
                onClick={() => crud.openForm('create')}
              >
                <FilePlus2 size={13} />
              </button>
            )}

            {/* SELECTED DEPARTMENT ACTIONS */}
            {selected.length > 0 && (
              <>
                <button
                  aria-label="View department"
                  title="View department"
                  type="button"
                  onClick={() =>
                    crud.openForm('view', selected[0])
                  }
                >
                  <Eye size={13} />
                </button>

                <button
                  aria-label="Edit department"
                  title="Edit department"
                  type="button"
                  onClick={() =>
                    crud.openForm('edit', selected[0])
                  }
                >
                  <Pencil size={13} />
                </button>

                <button
                  aria-label="Copy department"
                  title="Copy department"
                  type="button"
                  onClick={() =>
                    crud.openForm('copy', selected[0])
                  }
                >
                  <Copy size={13} />
                </button>

                <button
                  aria-label="Delete department"
                  title="Delete department"
                  type="button"
                  onClick={() => setDeleteDialogOpen(true)}
                ><Trash2 size={13} /></button>
              </>
            )}

            <button
              className="toolbar-power"
              aria-label="Power"
              type="button"
            >
              <Power size={13} />
            </button>

          </div>

          {deleteDialogOpen && selected[0] && <MasterDeleteDialog
            onClose={() => setDeleteDialogOpen(false)}
            pending={deleteMutation.isPending || inactiveMutation.isPending}
            onInactive={() => inactiveMutation.mutate(selected[0])}
            onDelete={() => deleteMutation.mutate(selected[0].id)}
          />}

          {/* SECTION 11: COMMON MASTER LIST */}
          <MasterListScreen
            {...departmentListConfig}
            rows={sortedDepartments}
            selected={selected}
            code={code}
            name={name}
            status={status}
            updateFilter={updateFilter}
            sort={sort}
            setSort={setSort}
            selectRow={selectRow}
            isLoading={departmentsQuery.isLoading}
            isError={departmentsQuery.isError}
            error={departmentsQuery.error}
            result={result}
            page={page}
            setPage={setPage}
            perPage={perPage}
            setPerPage={setPerPage}
          />

        </div>
      )}
    />
  );
}
