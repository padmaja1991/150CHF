
import { useState } from 'react';
import {
  keepPreviousData,
  useMutation,
  useQuery
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

// =====================================================
// SECTION 1 — EXISTING SHARED COMPONENTS
// =====================================================

import { MasterListScreen } from '../../components/master/MasterListScreen';

import {
  MasterCRUDScreen,
  useMasterCRUD
} from '../../components/master/MasterCRUDScreen';

import { MasterDeleteDialog } from '../../components/master/MasterDeleteDialog';
import { AppHeader } from '../../components/layout/AppHeader';
import { TopNavigation } from '../../components/layout/TopNavigation';

// =====================================================
// SECTION 2 — COMPANY-SPECIFIC FILES
// =====================================================

import { companyListConfig } from './company';

import {
  emptySearch,
  getCompanies,
  saveCompany,
  deleteCompany,
  readApiResponse
} from './companyService';

import { CompanyForm } from './CompanyForm';

// =====================================================
// SECTION 3 — COMPANY PAGE
// =====================================================

export function CompanyPage() {

  // Search fields
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState('Select');

  const [applied, setApplied] = useState({
    ...emptySearch
  });

  // Row selection
  const [selected, setSelected] = useState([]);

  // Pagination
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // Sorting
  const [sort, setSort] = useState({
    key: 'code',
    direction: 'asc'
  });

  // CRUD controller
  const crud = useMasterCRUD();

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] =
    useState(false);

  // =====================================================
  // SECTION 4 — GET COMPANIES FROM POSTGRESQL
  // =====================================================

  const companiesQuery = useQuery({
    queryKey: [
      'companies',
      applied,
      page,
      perPage,
      sort
    ],

    queryFn: getCompanies,

    placeholderData: keepPreviousData,

    refetchOnWindowFocus: false,

    retry: 3,

    retryDelay: (attempt) =>
      Math.min(1000 * 2 ** attempt, 4000)
  });

  const result = companiesQuery.data || {
    rows: [],
    total: 0,
    totalPages: 1
  };

  const companies = result.rows;

  // =====================================================
  // SECTION 5 — STATUS UPDATE
  // =====================================================

  const companyStatusMutation = useMutation({

    mutationFn: (company) =>
      saveCompany(company.id, {
        ...company,
        status: 'Inactive'
      }),

    onSuccess: () => {
      setDeleteDialogOpen(false);
      setSelected([]);
      companiesQuery.refetch();
    },

    onError: (requestError) =>
      window.alert(requestError.message)
  });

  // =====================================================
  // SECTION 6 — DELETE COMPANY
  // =====================================================

  const companyDeleteMutation = useMutation({

    mutationFn: (companyId) =>
      deleteCompany(companyId),

    onSuccess: () => {
      setDeleteDialogOpen(false);
      setSelected([]);
      companiesQuery.refetch();
    },

    onError: (requestError) =>
      window.alert(requestError.message)
  });

  // =====================================================
  // SECTION 7 — SEARCH FILTERS
  // =====================================================

  const updateFilter = (key, value) => {

    setApplied((current) => ({
      ...current,
      [key]:
        key === 'status'
          ? value
          : value.trim()
    }));

    if (key === 'code') {
      setCode(value);
    }

    if (key === 'name') {
      setName(value);
    }

    if (key === 'status') {
      setStatus(value);
    }

    setPage(1);
    setSelected([]);
  };

  // =====================================================
  // SECTION 8 — RESET SEARCH
  // =====================================================

  const reset = () => {

    setCode('');
    setName('');
    setStatus('Select');

    setApplied({
      ...emptySearch
    });

    setPage(1);
    setSelected([]);

    setSort({
      key: 'code',
      direction: 'asc'
    });
  };

  // =====================================================
  // SECTION 9 — SELECT COMPANY ROW
  // =====================================================

  const selectRow = (company) => {

    setSelected((current) =>
      current.some(
        (item) => item.id === company.id
      )
        ? []
        : [company]
    );
  };

  // =====================================================
  // SECTION 10 — OPEN COMPANY FORMS
  // =====================================================

  const openNewCompany = () => {
    crud.openForm('create');
  };

  const openForm = crud.openForm;

  // =====================================================
  // SECTION 11 — DELETE ACTIONS
  // =====================================================

  const deleteSelected = () => {
    if (!selected.length) return;

    setDeleteDialogOpen(true);
  };

  const markSelectedInactive = () => {
    if (selected[0]) {
      companyStatusMutation.mutate(
        selected[0]
      );
    }
  };

  const removeSelected = () => {
    if (selected[0]) {
      companyDeleteMutation.mutate(
        selected[0].id
      );
    }
  };

  // =====================================================
  // SECTION 12 — EXPORT COMPANIES
  // =====================================================

  const downloadCompanies = async () => {

    try {

      const params = new URLSearchParams({
        code: applied.code || '',
        name: applied.name || '',
        status: applied.status || 'Select',
        page: '1',
        linesPerPage: '10000',
        sortBy: sort.key,
        sortDirection: sort.direction
      });

      const response = await fetch(
        `/api/companies?${params}`
      );

      const exportResult = await readApiResponse(
        response,
        'Unable to export companies'
      );

      const escape = (value) =>
        String(value ?? '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');

      const rows = selected.length
        ? selected
        : exportResult.rows;

      const table = `
        <tr>
          <th>Company Code</th>
          <th>Name</th>
          <th>Organization</th>
          <th>Reporting Currency</th>
          <th>Status</th>
        </tr>

        ${rows.map((row) => `
          <tr>
            <td>${escape(row.code)}</td>
            <td>${escape(row.name)}</td>
            <td>${escape(row.organizationName)}</td>
            <td>${escape(row.currency)}</td>
            <td>${escape(row.status)}</td>
          </tr>
        `).join('')}
      `;

      const blob = new Blob(
        [`
          <html>
            <head>
              <meta charset="UTF-8">
            </head>
            <body>
              <table>${table}</table>
            </body>
          </html>
        `],
        {
          type: 'application/vnd.ms-excel'
        }
      );

      const url = URL.createObjectURL(blob);

      const anchor = document.createElement('a');

      anchor.href = url;
      anchor.download = 'companies.xls';

      document.body.appendChild(anchor);

      anchor.click();
      anchor.remove();

      URL.revokeObjectURL(url);

    } catch (error) {
      window.alert(error.message);
    }
  };

  // =====================================================
  // SECTION 13 — MAIN COMPANY SCREEN
  // =====================================================

  return (

    <MasterCRUDScreen

      controller={crud}

      // =================================================
      // COMPANY ADD / EDIT / VIEW / COPY FORM
      // =================================================

      renderForm={({
        mode,
        record,
        recordId,
        onClose
      }) => (

        <CompanyForm
          layout="four-4"
          companyId={recordId}
          initialCompany={record}
          formMode={mode}
          readOnly={mode === 'view'}
          onCancel={onClose}
          onCreated={() => {
            onClose();
            companiesQuery.refetch();
            setSelected([]);
          }}
        />

      )}

      // =================================================
      // COMPANY LIST SCREEN
      // =================================================

      renderList={() => (

        <div className="legacy-screen">

          {/* EXISTING TOP NAVIGATION */}

          <TopNavigation />

          {/* EXISTING PURPLE HEADER */}

          <AppHeader title="Companies" />

          {/* ============================================
              SECTION 14 — ACTION TOOLBAR
             ============================================ */}

          <div className="action-bar">

            <button
              aria-label="Search"
              title="Search companies"
              onClick={() =>
                document
                  .querySelector(
                    '.search-fields input'
                  )
                  ?.focus()
              }
            >
              <Search size={14} />
            </button>

            <button
              aria-label="Back"
              title="Reset search"
              onClick={reset}
            >
              ↶
            </button>

            <button
              aria-label="Export companies"
              title="Export companies"
              onClick={downloadCompanies}
            >
              <Download size={13} />
            </button>

            {/* ADD COMPANY */}

            {!selected.length && (

              <button
                aria-label="New company"
                title="Add company"
                onClick={openNewCompany}
              >
                <FilePlus2 size={13} />
              </button>

            )}

            {/* SELECTED COMPANY ACTIONS */}

            {selected.length > 0 && (

              <>

                <button
                  aria-label="View company"
                  title="View company"
                  onClick={() =>
                    openForm(
                      'view',
                      selected[0]
                    )
                  }
                >
                  <Eye size={13} />
                </button>

                <button
                  aria-label="Edit company"
                  title="Edit company"
                  onClick={() =>
                    openForm(
                      'edit',
                      selected[0]
                    )
                  }
                >
                  <Pencil size={13} />
                </button>

                <button
                  aria-label="Copy company"
                  title="Copy company"
                  onClick={() =>
                    openForm(
                      'copy',
                      selected[0]
                    )
                  }
                >
                  <Copy size={13} />
                </button>

                <button
                  aria-label="Delete company"
                  title="Delete company"
                  onClick={deleteSelected}
                >
                  <Trash2 size={13} />
                </button>

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

          {/* ============================================
              SECTION 15 — COMPANY MASTER LIST
             ============================================ */}

          <MasterListScreen
            {...companyListConfig}

            rows={companies}
            selected={selected}

            code={code}
            name={name}
            status={status}

            updateFilter={updateFilter}

            sort={sort}
            setSort={setSort}

            selectRow={selectRow}

            isLoading={companiesQuery.isLoading}
            isError={companiesQuery.isError}

            error={companiesQuery.error}

            result={result}

            page={page}
            setPage={setPage}

            perPage={perPage}
            setPerPage={setPerPage}
          />

          {/* ============================================
              SECTION 16 — DELETE / INACTIVE DIALOG
             ============================================ */}

          {deleteDialogOpen && selected[0] && (

            <MasterDeleteDialog

              onClose={() =>
                setDeleteDialogOpen(false)
              }

              onInactive={markSelectedInactive}

              onDelete={removeSelected}

              pending={
                companyStatusMutation.isPending ||
                companyDeleteMutation.isPending
              }

            />

          )}

        </div>

      )}

    />

  );
}
