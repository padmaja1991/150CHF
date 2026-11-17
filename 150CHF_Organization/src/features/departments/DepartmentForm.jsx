/* 150CHF — Department form. Department-only changes; shared screens remain unchanged. */
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Search } from 'lucide-react';
import { MasterLookupModal } from '../../components/master/MasterLookupModal';
import { MasterFormScreen } from '../../components/master/MasterFormScreen';
import {
  emptyDepartment, getDepartment, getDepartmentOrganizations,
  createDepartment, saveDepartment
} from './departmentService';
import { validateDepartment } from './departmentValidation';


async function getLookup(kind, organizationId, companyId) {
  const params = new URLSearchParams({ kind, organizationId: String(organizationId || ''), companyId: String(companyId || '') });
  const response = await fetch(`/api/departments/lookups?${params}`);
  if (!response.ok) throw new Error(`Unable to load ${kind} lookup`);
  return response.json();
}

export function DepartmentForm({ mode = 'create', record = null, recordId = null, onCancel }) {
  const queryClient = useQueryClient();
  const readOnly = mode === 'view';
  const isEdit = mode === 'edit';
  const isCopy = mode === 'copy';
  const [form, setForm] = useState(() => ({ ...emptyDepartment, ...(record || {}), ...(isCopy ? { code: '' } : {}) }));
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [pending, setPending] = useState(false);
  // Shared lookup modal: preserve the Organization search/pagination design.
  const [openLookup, setOpenLookup] = useState(null);

  const detailQuery = useQuery({
    queryKey: ['department', recordId],
    queryFn: () => getDepartment(recordId),
    enabled: Boolean(recordId) && (readOnly || isEdit),
    refetchOnWindowFocus: false
  });
  useEffect(() => {
    if (detailQuery.data) setForm({ ...emptyDepartment, ...detailQuery.data });
  }, [detailQuery.data]);

  const orgQuery = useQuery({ queryKey: ['department-organizations-lookup'], queryFn: getDepartmentOrganizations, staleTime: 60000 });
  const companyQuery = useQuery({
    queryKey: ['department-companies-lookup', form.organizationId],
    queryFn: () => getLookup('companies', form.organizationId, ''),
    enabled: Boolean(form.organizationId)
  });
  const branchQuery = useQuery({
    queryKey: ['department-branches-lookup', form.companyId],
    queryFn: () => getLookup('branches', '', form.companyId),
    enabled: Boolean(form.companyId)
  });

  const orgs = orgQuery.data || [];
  const companies = companyQuery.data?.rows || [];
  const branches = branchQuery.data?.rows || [];
  const change = (key, value) => {
    setForm((prev) => ({
      ...prev, [key]: value,
      ...(key === 'organizationId' ? { companyId: '', companyName: '', branchId: '', branchName: '' } : {}),
      ...(key === 'companyId' ? { branchId: '', branchName: '' } : {})
    }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const textField = (key, label, required = false, type = 'text') => (
    <label key={key}>
      <span className="field-label">{label}{required && <span className="required"> *</span>}</span>
      <input type={type} value={form[key] ?? ''} disabled={readOnly || pending}
        onChange={(e) => change(key, e.target.value)} maxLength={key === 'code' ? 30 : undefined} />
      {errors[key] && <small className="field-error">{errors[key]}</small>}
    </label>
  );

  // SECTION: Reuse the existing shared MasterLookupModal, not a new popup.
  const lookupField = (key, label, items, nameKey, required = false, disabled = false, error = '') => {
    const selected = items.find((item) => String(item.id) === String(form[key]));
    return (
      <label key={key} className="lookup-field">
        <span className="field-label">{label}{required && <span className="required"> *</span>}</span>
        <div>
          <input readOnly value={selected?.name || form[nameKey] || ''} placeholder="Search or select"
            onClick={() => { if (!readOnly && !pending && !disabled) setOpenLookup(key); }} />
          <button type="button" aria-label={`Search ${label}`} disabled={readOnly || disabled || pending}
            onClick={() => setOpenLookup(key)}><Search size={12} /></button>
        </div>
        {(errors[key] || error) && <small className="field-error">{errors[key] || error}</small>}
      </label>
    );
  };

  const lookupSources = {
    organizationId: { title: 'Organization', rows: orgs.map((r) => ({ id: r.id, name: r.name || r.organizationName || '', code: r.code || '', status: r.status || 'Active' })), nameKey: 'organizationName', loading: orgQuery.isLoading, error: orgQuery.error?.message },
    companyId: { title: 'Company', rows: companies.map((r) => ({ ...r, status: r.status || 'Active' })), nameKey: 'companyName', loading: companyQuery.isLoading, error: companyQuery.error?.message },
    branchId: { title: 'Branch', rows: branches.map((r) => ({ ...r, status: r.status || 'Active' })), nameKey: 'branchName', loading: branchQuery.isLoading, error: branchQuery.error?.message }
  };
  const currentLookup = openLookup ? lookupSources[openLookup] : null;
  const selectLookup = (row) => {
    const key = openLookup;
    const nameKey = currentLookup.nameKey;
    change(key, String(row.id));
    setForm((prev) => ({ ...prev, [nameKey]: row.name }));
    setOpenLookup(null);
  };

  const submit = async (event) => {
    event?.preventDefault();
    if (readOnly || pending) return;
    const nextErrors = validateDepartment(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setPending(true);
    setServerError('');
    try {
      const payload = { ...form, code: form.code.trim(), name: form.name.trim() };
      if (isEdit) await saveDepartment(recordId, payload);
      else await createDepartment(payload);
      await queryClient.invalidateQueries({ queryKey: ['departments'] });
      onCancel();
    } catch (error) {
      setServerError(error.message || 'Department save failed.');
    } finally {
      setPending(false);
    }
  };

  return (
    <>
    <MasterFormScreen entity="Department" mode={isCopy ? 'create' : mode} record={form}
      onSubmit={submit} onCancel={onCancel} pending={pending}
      loading={detailQuery.isLoading} errors={[serverError, detailQuery.error?.message]}>
      {/* Use the SAME three-panel CSS and label/input row layout as OrganizationForm.jsx. */}
      <section className="reference-panel">
        <h2><Building2 size={13} /> Department Details</h2>
        {textField('code', 'Code', true)}
        {textField('name', 'Name', true)}
        <label>
          <span className="field-label">Department Type</span>
          <input type="number" min="1" step="1" placeholder="Department Type ID (optional)"
            value={form.departmentTypeId ?? ''} disabled={readOnly || pending}
            onChange={(e) => change('departmentTypeId', e.target.value)} />
        </label>
        <label className="status-field">
          <span>Status <span className="required">*</span></span>
          <select value={form.status} disabled={readOnly || pending}
            onChange={(e) => change('status', e.target.value)}>
            <option value="Active">Active</option><option value="Inactive">Inactive</option>
          </select>
        </label>
      </section>
      <section className="reference-panel">
        <h2><Building2 size={13} /> Organization Details</h2>
        {lookupField('organizationId', 'Organization', orgs.map((r) => ({ id: r.id, name: r.name || r.organizationName || '', code: r.code })), 'organizationName', true, false, orgQuery.error?.message)}
        {lookupField('companyId', 'Company', companies, 'companyName', true, !form.organizationId, companyQuery.error?.message)}
        {form.organizationId && companyQuery.isSuccess && companies.length === 0 && (
          <small role="status" style={{ gridColumn: '1 / -1', color: '#845000', padding: '0 8px' }}>
            No companies are linked to the selected Organization. Create or link a Company before creating a Department.
          </small>
        )}
        {lookupField('branchId', 'Branch', branches, 'branchName', false, !form.companyId, branchQuery.error?.message)}
      </section>
      <section className="reference-panel">
        <h2><Building2 size={13} /> Head &amp; Contact Details</h2>
        {textField('departmentHead', 'Department Head')}
        {textField('headEmail', 'Head Email', false, 'email')}
        {textField('headPhone', 'Head Phone', false, 'tel')}
        {textField('description', 'Description')}
      </section>

    </MasterFormScreen>
    {currentLookup && <MasterLookupModal
      key={openLookup}
      title={currentLookup.title}
      rows={currentLookup.rows}
      loading={currentLookup.loading}
      error={currentLookup.error || ''}
      onClose={() => setOpenLookup(null)}
      onSelect={selectLookup}
    />}
    </>
  );
}
