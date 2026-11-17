import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Building2, MapPin, Phone, Search } from 'lucide-react';
import { emptyOrganization, readApiResponse, createOrganization, saveOrganization, getOrganization, useOrganizationValidation, getCountries, getStates, getCities, getIndustries, getOrganizationTypes } from './organizationService';
import { OrganizationDialog } from './OrganizationShared';
import { MasterLookupModal } from './master/MasterLookupModal';
import { MasterFormScreen } from './master/MasterFormScreen';
function OrganizationForm({ onCancel, onCreated, layout, organizationId, initialOrganization, formMode, readOnly = false }) {
  const [form, setForm] = useState({ ...emptyOrganization, ...initialOrganization });
  const [originalForm, setOriginalForm] = useState({ ...emptyOrganization, ...initialOrganization });
  const [error, setError] = useState('');
  const [currencyLookup, setCurrencyLookup] = useState(false);
  const [masterLookup, setMasterLookup] = useState(null);
  const [masterRows, setMasterRows] = useState([]);
  const [masterLoading, setMasterLoading] = useState(false);
  const [masterError, setMasterError] = useState('');
  const [currencies, setCurrencies] = useState([]);
  const [currencyLoading, setCurrencyLoading] = useState(false);
  const [currencyError, setCurrencyError] = useState('');
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [locationLookup, setLocationLookup] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [dialog, setDialog] = useState(null);
  const validation = useOrganizationValidation(form);
  const selectedCountry = countries.find((country) => country.name === form.country);
  const selectedState = states.find((state) => state.name === form.state);
  const organizationQuery = useQuery({
    queryKey: ['organization', organizationId],
    queryFn: () => getOrganization(organizationId),
    enabled: Boolean(organizationId),
    refetchOnWindowFocus: false
  });
  const organizationMutation = useMutation({
    mutationFn: ({ id, organization }) => id ? saveOrganization(id, organization) : createOrganization(organization),
    onSuccess: onCreated,
    onError: (requestError) => {
      setError(requestError.message);
      setDialog({ type: 'error', message: requestError.message });
    }
  });
  useEffect(() => {
    if (organizationQuery.data) {
      const loadedOrganization = { ...emptyOrganization, ...organizationQuery.data };
      setForm(loadedOrganization);
      setOriginalForm(loadedOrganization);
    }
    if (organizationQuery.error) {
      setError(organizationQuery.error.message);
      setDialog({ type: 'error', message: organizationQuery.error.message });
    }
  }, [organizationQuery.data, organizationQuery.error]);
  useEffect(() => {
    getCountries().then(setCountries).catch((requestError) => setLocationError(requestError.message));
  }, []);
  useEffect(() => {
    if (!selectedCountry?.id) {
      setStates([]);
      return;
    }
    getStates(selectedCountry.code).then(setStates).catch((requestError) => setLocationError(requestError.message));
  }, [selectedCountry?.id]);
  useEffect(() => {
    if (!selectedCountry?.code || !selectedState?.code) {
      setCities([]);
      return;
    }
    getCities(selectedCountry.code, selectedState.code).then(setCities).catch((requestError) => setLocationError(requestError.message));
  }, [selectedCountry?.code, selectedState?.code]);
  const update = (field) => (event) => setForm((value) => ({
    ...value,
    [field]: event.target.type === 'checkbox' ? event.target.checked : event.target.value
  }));
  const updatePhone = (event) => setForm((value) => ({
    ...value,
    phone: event.target.value.replace(/\D/g, '').slice(0, 10)
  }));
  const updateCountry = (event) => setForm((value) => ({ ...value, country: event.target.value, state: '', city: '' }));
  const updateState = (event) => setForm((value) => ({ ...value, state: event.target.value, city: '' }));
  const openLocationLookup = (type) => setLocationLookup(type);
  const chooseLocation = (item) => {
    if (locationLookup === 'country') updateCountry({ target: { value: item.name } });
    if (locationLookup === 'state') updateState({ target: { value: item.name } });
    if (locationLookup === 'city') setForm((value) => ({ ...value, city: item.name }));
    setLocationLookup(null);
  };
  const locationOptions = (type) => type === 'country' ? countries : type === 'state' ? states : cities;
  const locationTitle = locationLookup ? locationLookup.charAt(0).toUpperCase() + locationLookup.slice(1) : '';
  const openMasterLookup = async (key) => {
    setMasterLookup(key);
    setMasterRows([]);
    setMasterError('');
    setMasterLoading(true);
    try {
      const rows = key === 'industry' ? await getIndustries() : await getOrganizationTypes();
      setMasterRows(rows);
    } catch (requestError) {
      setMasterError(requestError.message);
    } finally {
      setMasterLoading(false);
    }
  };
  const lookupField = (label, key, placeholder) => (
    <label className="lookup-field"><span>{label}</span><div><input readOnly placeholder={placeholder} value={form[key] || ''} onChange={update(key)} /><button disabled={readOnly} type="button" aria-label={`Search ${label}`} onClick={() => openMasterLookup(key)}><Search size={12} /></button></div></label>
  );
  const submit = async (event) => {
    event?.preventDefault();
    setError('');
    if (!validation.validate()) {
      return;
    }
    setDialog({ type: 'confirm' });
  };
  const requestCancel = () => {
    if (readOnly || JSON.stringify(form) === JSON.stringify(originalForm)) {
      onCancel();
      return;
    }
    setDialog({ type: 'discard' });
  };
  const discardChanges = () => {
    setForm(originalForm);
    setDialog(null);
    onCancel();
  };
  const confirmSave = () => {
    setDialog(null);
    organizationMutation.mutate({ id: organizationId, organization: form });
  };
  const uploadImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((value) => ({ ...value, imageDataUrl: String(reader.result) }));
    reader.onerror = () => setError('Unable to read the selected image.');
    reader.readAsDataURL(file);
  };
  const openCurrencyLookup = async (force = false) => {
    setCurrencyLookup(true);
    if (currencies.length && !force) return;
    setCurrencyLoading(true);
    setCurrencyError('');
    try {
      const response = await fetch('/api/currencies');
      const result = await readApiResponse(response, 'Unable to load currencies');
      setCurrencies(result);
    } catch (requestError) {
      setCurrencyError(requestError.message);
    } finally {
      setCurrencyLoading(false);
    }
  };
  const field = (label, key, required = false, type = 'text') => (
    <label><span className="field-label">{label}{required && <span className="required"> *</span>}</span><input readOnly={readOnly} required={required} type={type} value={form[key] || ''} onChange={update(key)} />{validation.errors[key] && <small className="field-error">{validation.errors[key]}</small>}</label>
  );

  return (
    <>
    <MasterFormScreen entity="Organization" mode={formMode === 'copy' ? 'create' : readOnly ? 'view' : organizationId ? 'edit' : 'create'} layout={layout} loading={organizationQuery.isLoading} record={form} onSubmit={submit} onCancel={requestCancel} pending={organizationMutation.isPending} errors={[error, locationError]}>
            <section className="reference-panel">
              <h2><Building2 size={13} /> Organization Details</h2>
              {field('Organization Code', 'code', true)}
              {field('Organization Name', 'name', true)}
              <label className="lookup-field">Reporting Currency<div><input readOnly placeholder="Search or select" value={form.reportingCurrency || ''} onChange={update('reportingCurrency')} /><button disabled={readOnly} type="button" aria-label="Search currencies" onClick={openCurrencyLookup}><Search size={12} /></button></div></label>
              {lookupField('Industry', 'industry', 'Search or select')}
              {lookupField('Organization Type', 'orgType', 'Search or select')}
              <label className="checkbox-field"><span>License Organization</span><div><input disabled={readOnly} type="checkbox" checked={form.licenseOrganization} onChange={update('licenseOrganization')} /><small>Yes</small></div></label>
              <label className="status-field"><span>Status <span className="required">*</span></span><select disabled={readOnly} value={form.status} onChange={update('status')}><option>Active</option><option>Inactive</option></select>{validation.errors.status && <small className="field-error">{validation.errors.status}</small>}</label>
            </section>
            <section className="reference-panel">
              <h2><MapPin size={13} /> Address Details</h2>
              {field('Registered Address', 'registeredAddress', true)}
              <label className="lookup-field"><span>Country <span className="required">*</span></span><div><input readOnly disabled={readOnly} placeholder="Search or select" value={form.country || ''} onChange={updateCountry} /><button disabled={readOnly} type="button" aria-label="Search country" onClick={() => openLocationLookup('country')}><Search size={12} /></button></div>{validation.errors.country && <small className="field-error">{validation.errors.country}</small>}</label>
              <label className="lookup-field">State/Province<div><input readOnly disabled={readOnly || !selectedCountry || !states.length} placeholder="Search or select" value={form.state || ''} onChange={updateState} /><button disabled={readOnly || !states.length} type="button" aria-label="Search state" onClick={() => openLocationLookup('state')}><Search size={12} /></button></div></label>
              <label className="lookup-field">City<div><input readOnly disabled={readOnly || !selectedState || !cities.length} placeholder="Search or select" value={form.city || ''} onChange={update('city')} /><button disabled={readOnly || !cities.length} type="button" aria-label="Search city" onClick={() => openLocationLookup('city')}><Search size={12} /></button></div></label>
              {field('Pincode', 'pincode')}
            </section>
            <section className="reference-panel">
              <h2><Phone size={13} /> Registration &amp; Contact Details</h2>
              {field('Registration Number', 'registrationNumber', true)}
              {field('Date of Incorporation', 'dateOfIncorporation', false, 'date')}
              {field('Tax ID', 'taxId')}
              <label><span className="field-label">Phone number<span className="required"> *</span></span><input readOnly={readOnly} required type="tel" inputMode="numeric" maxLength="10" value={form.phone || ''} onChange={updatePhone} />{validation.errors.phone && <small className="field-error">{validation.errors.phone}</small>}</label>
              {field('Email', 'email', true, 'email')}
              {field('Website', 'website', false, 'url')}
              <label className="upload-field"><span>Image Upload <span className="required">*</span></span><input disabled={readOnly} type="file" accept="image/*" onChange={uploadImage} />{validation.errors.imageDataUrl && <small className="field-error">{validation.errors.imageDataUrl}</small>}</label>
              {form.imageDataUrl && <img className="organization-image-preview" src={form.imageDataUrl} alt="Organization preview" />}
              <em className="upload-note">Image preview only. Server upload requires an API.</em>
            </section>
    </MasterFormScreen>
        {locationLookup && <MasterLookupModal
          key={locationLookup}
          title={locationTitle}
          rows={[...locationOptions(locationLookup)].sort((a, b) => a.name.localeCompare(b.name))}
          onClose={() => setLocationLookup(null)}
          onSelect={chooseLocation}
        />}
        {masterLookup && <MasterLookupModal
          key={masterLookup}
          title={masterLookup === 'industry' ? 'Industry' : 'Organization Type'}
          nameHeading={masterLookup === 'industry' ? 'Industry Name' : 'Organization Type Name'}
          rows={masterRows}
          loading={masterLoading}
          error={masterError}
          onRetry={() => openMasterLookup(masterLookup)}
          onClose={() => setMasterLookup(null)}
          onSelect={(item) => {
            setForm((value) => ({ ...value, [masterLookup]: item.name }));
            setMasterLookup(null);
          }}
        />}
        {currencyLookup && <MasterLookupModal
          title="Currency"
          nameHeading="Currency Name"
          rows={currencies}
          loading={currencyLoading}
          error={currencyError}
          onRetry={() => { setCurrencies([]); openCurrencyLookup(true); }}
          onClose={() => setCurrencyLookup(false)}
          onSelect={(currency) => { setForm((value) => ({ ...value, reportingCurrency: currency.code })); setCurrencyLookup(false); }}
        />}
        {dialog && <OrganizationDialog type={dialog.type} message={dialog.message} onCancel={() => setDialog(null)} onConfirm={confirmSave} onDiscard={discardChanges} />}
    </>
  );
}

export { OrganizationForm };
