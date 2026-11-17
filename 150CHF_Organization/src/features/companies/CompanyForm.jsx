
import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Building2, MapPin, Search } from 'lucide-react';

import { MasterFormScreen } from '../../components/master/MasterFormScreen';
import { MasterLookupModal } from '../../components/master/MasterLookupModal';
import { OrganizationDialog } from '../../components/OrganizationShared';

import {
  emptyCompany,
  createCompany,
  saveCompany,
  getCompany,
  useCompanyValidation,
  getOrganizationsLookup,
  getCurrenciesLookup,
  getStatesLookup,
  getCitiesLookup
} from './companyService';

// =====================================================
// SECTION 1 — COMPANY FORM COMPONENT
// =====================================================

export function CompanyForm({
  onCancel,
  onCreated,
  layout = 'four-4',
  companyId,
  initialCompany,
  formMode = 'create',
  readOnly = false
}) {
  const isCopy = formMode === 'copy';

  const initialValues = {
    ...emptyCompany,
    ...initialCompany,
    code: isCopy ? '' : (initialCompany?.code ?? '')
  };

  const [form, setForm] = useState(initialValues);
  const [originalForm, setOriginalForm] = useState(initialValues);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState(null);

  // Lookup state
  const [lookup, setLookup] = useState(null);
  const [lookupRows, setLookupRows] = useState([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');

  const validation = useCompanyValidation(form);

  // =====================================================
  // SECTION 2 — LOAD COMPANY FOR EDIT / VIEW / COPY
  // =====================================================

  const companyQuery = useQuery({
    queryKey: ['company', companyId],
    queryFn: () => getCompany(companyId),
    enabled: Boolean(companyId),
    refetchOnWindowFocus: false
  });

  useEffect(() => {
    if (companyQuery.data) {
      const loaded = {
        ...emptyCompany,
        ...companyQuery.data,
        code: isCopy ? '' : companyQuery.data.code
      };

      setForm(loaded);
      setOriginalForm(loaded);
    }
  }, [companyQuery.data, isCopy]);

  useEffect(() => {
    if (companyQuery.error) {
      const message = companyQuery.error.message;
      setError(message);
      setDialog({ type: 'error', message });
    }
  }, [companyQuery.error]);

  // =====================================================
  // SECTION 3 — CREATE / UPDATE MUTATION
  // =====================================================

  const companyMutation = useMutation({
    mutationFn: ({ id, company }) =>
      id
        ? saveCompany(id, company)
        : createCompany(company),

    onSuccess: () => {
      onCreated?.();
    },

    onError: (requestError) => {
      setError(requestError.message);

      setDialog({
        type: 'error',
        message: requestError.message
      });
    }
  });

  // =====================================================
  // SECTION 4 — UPDATE FIELDS
  // =====================================================

  const update = (key) => (event) => {
    setForm((current) => ({
      ...current,
      [key]: event.target.value
    }));
  };

  // =====================================================
  // SECTION 5 — OPEN LOOKUP POPUPS
  // =====================================================

  const openLookup = async (type) => {
    if (readOnly) return;

    if (type === 'city' && !form.stateId) {
      setError('Please select State before City.');
      return;
    }

    setError('');
    setLookup(type);
    setLookupRows([]);
    setLookupError('');
    setLookupLoading(true);

    try {
      let rows = [];

      if (type === 'organization') {
        rows = await getOrganizationsLookup();
      } else if (type === 'currency') {
        rows = await getCurrenciesLookup();
      } else if (type === 'state') {
        rows = await getStatesLookup();
      } else if (type === 'city') {
        rows = await getCitiesLookup(form.stateId);
      }

      setLookupRows(rows);
    } catch (requestError) {
      setLookupError(requestError.message);
    } finally {
      setLookupLoading(false);
    }
  };

  // =====================================================
  // SECTION 6 — SELECT LOOKUP RECORD
  // =====================================================

  const selectLookup = (item) => {
    if (lookup === 'organization') {
      setForm((current) => ({
        ...current,
        organizationId: String(item.id),
        organizationName: item.name
      }));
    }

    if (lookup === 'currency') {
      setForm((current) => ({
        ...current,
        reportingCurrencyId: String(item.id),
        reportingCurrency: item.code
      }));
    }

    if (lookup === 'state') {
      setForm((current) => ({
        ...current,
        stateId: String(item.id),
        stateName: item.name,
        cityId: '',
        cityName: ''
      }));
    }

    if (lookup === 'city') {
      setForm((current) => ({
        ...current,
        cityId: String(item.id),
        cityName: item.name
      }));
    }

    setLookup(null);
  };

  // =====================================================
  // SECTION 7 — REUSABLE TEXT FIELD
  // =====================================================

  const field = (label, key, required = false) => (
    <label>
      <span className="field-label">
        {label}
        {required && (
          <span className="required"> *</span>
        )}
      </span>

      <input
        type="text"
        value={form[key] ?? ''}
        onChange={update(key)}
        readOnly={readOnly}
        required={required}
      />

      {validation.errors[key] && (
        <small className="field-error">
          {validation.errors[key]}
        </small>
      )}
    </label>
  );

  // =====================================================
  // SECTION 8 — REUSABLE LOOKUP FIELD
  // =====================================================

  const lookupField = (
    label,
    type,
    displayKey,
    validationKey,
    required = false
  ) => {
    const disabled =
      readOnly || (type === 'city' && !form.stateId);

    return (
      <label className="lookup-field">
        <span>
          {label}
          {required && (
            <span className="required"> *</span>
          )}
        </span>

        <div>
          <input
            readOnly
            value={form[displayKey] || ''}
            placeholder="Search or select"
          />

          <button
            type="button"
            disabled={disabled}
            aria-label={`Search ${label}`}
            onClick={() => openLookup(type)}
          >
            <Search size={12} />
          </button>
        </div>

        {validation.errors[validationKey] && (
          <small className="field-error">
            {validation.errors[validationKey]}
          </small>
        )}
      </label>
    );
  };

  // =====================================================
  // SECTION 9 — SUBMIT / SAVE CONFIRMATION
  // =====================================================

  const submit = (event) => {
    event?.preventDefault();
    setError('');

    if (readOnly) return;

    if (!validation.validate()) {
      return;
    }

    setDialog({ type: 'confirm' });
  };

  const confirmSave = () => {
    setDialog(null);

    // Copy must create a new Company, not update the old one.
    const id = isCopy ? null : companyId;

    companyMutation.mutate({
      id,
      company: form
    });
  };

  // =====================================================
  // SECTION 10 — CANCEL / DISCARD
  // =====================================================

  const requestCancel = () => {
    if (
      readOnly ||
      JSON.stringify(form) === JSON.stringify(originalForm)
    ) {
      onCancel?.();
      return;
    }

    setDialog({ type: 'discard' });
  };

  const discardChanges = () => {
    setForm(originalForm);
    setDialog(null);
    onCancel?.();
  };

  // =====================================================
  // SECTION 11 — LOOKUP TITLES
  // =====================================================

  const lookupTitles = {
    organization: 'Organization',
    currency: 'Currency',
    state: 'State/Province',
    city: 'City'
  };

  // =====================================================
  // SECTION 12 — COMPANY FORM UI
  // =====================================================

  return (
    <>
      <MasterFormScreen
        entity="Company"
        mode={
          isCopy
            ? 'create'
            : readOnly
              ? 'view'
              : companyId
                ? 'edit'
                : 'create'
        }
        layout={layout}
        loading={companyQuery.isLoading}
        record={form}
        onSubmit={submit}
        onCancel={requestCancel}
        pending={companyMutation.isPending}
        errors={[error]}
      >
        {/* COMPANY DETAILS */}

        <section className="reference-panel">
          <h2>
            <Building2 size={13} />
            Company Details
          </h2>

          {field('Company Code', 'code', true)}

          {field('Company Name', 'name', true)}

          {lookupField(
            'Organization',
            'organization',
            'organizationName',
            'organizationId',
            true
          )}

          {field(
            'Registration Number',
            'registrationNumber'
          )}

          {lookupField(
            'Reporting Currency',
            'currency',
            'reportingCurrency',
            'reportingCurrencyId'
          )}

          <label className="status-field">
            <span>
              Status <span className="required">*</span>
            </span>

            <select
              value={form.status}
              disabled={readOnly}
              onChange={update('status')}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>

            {validation.errors.status && (
              <small className="field-error">
                {validation.errors.status}
              </small>
            )}
          </label>
        </section>

        {/* ADDRESS DETAILS */}

        <section className="reference-panel">
          <h2>
            <MapPin size={13} />
            Address Details
          </h2>

          {field('Address', 'address')}

          {lookupField(
            'State/Province',
            'state',
            'stateName',
            'stateId'
          )}

          {lookupField(
            'City',
            'city',
            'cityName',
            'cityId'
          )}

          {field('Postal Code', 'postalCode')}
        </section>
      </MasterFormScreen>

      {/* MASTER LOOKUP POPUP */}

      {lookup && (
        <MasterLookupModal
          key={lookup}
          title={lookupTitles[lookup]}
          nameHeading={
            lookup === 'currency'
              ? 'Currency Name'
              : `${lookupTitles[lookup]} Name`
          }
          rows={lookupRows}
          loading={lookupLoading}
          error={lookupError}
          onRetry={() => openLookup(lookup)}
          onClose={() => setLookup(null)}
          onSelect={selectLookup}
        />
      )}

      {/* EXISTING CONFIRMATION DIALOG */}

      {dialog && (
        <OrganizationDialog
          type={dialog.type}
          message={dialog.message}
          onCancel={() => setDialog(null)}
          onConfirm={confirmSave}
          onDiscard={discardChanges}
        />
      )}
    </>
  );
}
