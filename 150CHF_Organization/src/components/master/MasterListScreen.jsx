
/* =========================================================
   COMMON MASTER LIST SCREEN
   Used by Organizations, Departments, Countries, etc.
   ========================================================= */

// CHANGE 1: Font Awesome imports for Status icons
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCircleCheck,
  faCircleXmark
} from '@fortawesome/free-solid-svg-icons';

// Existing Lucide imports — unchanged
import {
  ClipboardList,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

/* =========================================================
   CHANGE 2: COMMON STATUS INDICATOR
   Green Check = Active
   Red Cross   = Inactive
   ========================================================= */
function StatusIndicator({ status }) {
  const value = String(status ?? '').trim().toLowerCase();

  if (value === 'active') {
    return (
      <span className="master-status">
        <FontAwesomeIcon
          icon={faCircleCheck}
          className="master-status-active"
        />
        <span>Active</span>
      </span>
    );
  }

  if (value === 'inactive') {
    return (
      <span className="master-status">
        <FontAwesomeIcon
          icon={faCircleXmark}
          className="master-status-inactive"
        />
        <span>Inactive</span>
      </span>
    );
  }

  return <span>{status ?? '—'}</span>;
}

/* =========================================================
   REUSABLE MASTER LIST SCREEN
   Existing functionality preserved
   ========================================================= */

/** Reusable list view: module-specific labels, columns,
 * records and callbacks are supplied as props.
 */
export function MasterListScreen({
  entityPlural, labels, columns, rows, selected,
  code, name, status, updateFilter,
  sort, setSort, selectRow, isLoading, isError,
  error, result, page, setPage, perPage, setPerPage
}) {
  return (
    <main>

      {/* ========== SECTION 1: SUMMARY ========== */}
      <section className="summary-box">
        <div className="section-title">
          <ClipboardList size={13} /> Summary
        </div>

        <div className="summary-grid">
          <span>Code</span>
          <span>Name</span>
          <span>Status</span>
        </div>

        {selected.map((organization) => (
          <div className="summary-values" key={organization.id}>
            <b>{organization.code}</b>
            <b>{organization.name}</b>
            <b>{organization.status}</b>
          </div>
        ))}
      </section>

      {/* ========== SECTION 2: SEARCH PARAMETERS ========== */}
      <section className="search-box">
        <div className="search-fields">
          <label>
            {labels.code}
            <input
              value={code}
              onChange={(event) =>
                updateFilter('code', event.target.value)
              }
            />
          </label>

          <label>
            {labels.name}
            <input
              value={name}
              onChange={(event) =>
                updateFilter('name', event.target.value)
              }
            />
          </label>

          <label>
            {labels.status}
            <select
              value={status}
              onChange={(event) =>
                updateFilter('status', event.target.value)
              }
            >
              <option>Select</option>
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </label>
        </div>
      </section>

      {/* ========== SECTION 3: MASTER DATA TABLE ========== */}
      <section className="table-box">
        <table>
          <thead>
            <tr>
              {columns.map(({ key, label }) => (
                <th
                  key={key}
                  aria-sort={
                    sort.key === key
                      ? `${sort.direction}ending`
                      : 'none'
                  }
                >
                  <button
                    className="sort-header"
                    type="button"
                    onClick={() =>
                      setSort((current) => ({
                        key,
                        direction:
                          current.key === key &&
                          current.direction === 'asc'
                            ? 'desc'
                            : 'asc'
                      }))
                    }
                  >
                    {label}
                    <i>
                      {sort.key === key &&
                      sort.direction === 'desc'
                        ? '▼'
                        : '▲'}
                    </i>
                  </button>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {isLoading && (
              <tr>
                <td className="empty" colSpan={columns.length}>
                  Loading {entityPlural.toLowerCase()}...
                </td>
              </tr>
            )}

            {isError && (
              <tr>
                <td
                  className="empty error"
                  colSpan={columns.length}
                >
                  {error?.message}
                </td>
              </tr>
            )}

            {!isLoading && !isError &&
              rows.map((organization) => (
                <tr
                  key={organization.id}
                  onClick={() => selectRow(organization)}
                  className={
                    selected.some(
                      (item) => item.id === organization.id
                    )
                      ? 'selected-row'
                      : ''
                  }
                >

                  {/* =========================================
                      CHANGE 3: STATUS COLUMN RENDERING
                      Font Awesome icons for Active/Inactive
                      Other columns remain unchanged
                     ========================================= */}
                  {columns.map(({ key }) => (
                    <td key={key}>
                      {key === 'status' ? (
                        <StatusIndicator
                          status={organization[key]}
                        />
                      ) : (
                        organization[key]
                      )}
                    </td>
                  ))}

                </tr>
              ))}

            {!isLoading &&
              !isError &&
              !result.rows.length && (
                <tr>
                  <td
                    className="empty"
                    colSpan={columns.length}
                  >
                    No matching {entityPlural.toLowerCase()} found
                  </td>
                </tr>
              )}
          </tbody>
        </table>

        {/* ========== SECTION 4: PAGINATION ========== */}
        <footer className="table-footer">
          <em>♧ Click a row to select</em>

          <div className="pager">
            <button
              onClick={() => setPage(1)}
              disabled={page === 1}
            >
              |‹
            </button>

            <button
              onClick={() =>
                setPage((value) => Math.max(1, value - 1))
              }
              disabled={page === 1}
            >
              <ChevronLeft size={12} />
            </button>

            <b>{page}</b>
            <span>/ {result.totalPages}</span>

            <button
              onClick={() =>
                setPage((value) =>
                  Math.min(result.totalPages, value + 1)
                )
              }
              disabled={page === result.totalPages}
            >
              <ChevronRight size={12} />
            </button>

            <span className="divider">|</span>

            <label>
              Lines per Page
              <select
                value={perPage}
                onChange={(event) => {
                  setPerPage(Number(event.target.value));
                  setPage(1);
                }}
              >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="20">20</option>
              </select>
            </label>
          </div>
        </footer>
      </section>
    </main>
  );
}
