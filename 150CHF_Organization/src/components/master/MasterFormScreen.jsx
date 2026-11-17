import { ClipboardList, Power, X } from 'lucide-react';
import { AppHeader } from '../layout/AppHeader';
import { TopNavigation } from '../layout/TopNavigation';

/** Shared master form shell. Field panels remain owned by each module. */
export function MasterFormScreen({ entity, mode, layout, loading, record, onSubmit, onCancel, pending, errors, children }) {
  const readOnly = mode === 'view';
  const action = readOnly ? 'View' : mode === 'edit' ? 'Edit' : 'Add';
  return (
    <div className={`legacy-screen ${layout === 'four-4' ? 'detailed-create-screen' : ''} ${loading ? 'form-loading' : ''}`}>
      <TopNavigation /><AppHeader title={`${entity} - ${action}`} />
      <div className="action-bar form-toolbar">
        <button type="button" aria-label="Back" onClick={onCancel}>↶</button>
        {!readOnly && <button type="button" aria-label="Save" onClick={onSubmit} disabled={pending}>✓</button>}
        <button type="button" aria-label="Cancel" onClick={onCancel}><X size={13} /></button>
        <button className="toolbar-power" aria-label="Power" type="button"><Power size={13} /></button>
      </div>
      <main className="organization-form-page">
        <section className="summary-box"><div className="section-title"><ClipboardList size={13} /> Summary</div><div className="summary-grid"><span>Code</span><span>Name</span><span>Status</span></div><div className="summary-values"><b>{record.code || '—'}</b><b>{record.name || '—'}</b><b>{record.status}</b></div><div className="summary-country"><span>Country</span><b>{record.country || '—'}</b></div></section>
        <div className="details-tab">Main Details</div>
        <form className="organization-form reference-organization-form" onSubmit={onSubmit}>
          <div className="reference-panels">{children}</div>
          {errors?.map((error, index) => error && <div className="form-error" key={index}>{error}</div>)}
        </form>
      </main>
    </div>
  );
}

/** Optional shared primitive for ordinary controlled form fields. */
export function MasterTextField({ label, name, value, onChange, required = false, type = 'text', readOnly = false, error }) {
  return <label><span className="field-label">{label}{required && <span className="required"> *</span>}</span><input name={name} readOnly={readOnly} required={required} type={type} value={value ?? ''} onChange={onChange} />{error && <small className="field-error">{error}</small>}</label>;
}
