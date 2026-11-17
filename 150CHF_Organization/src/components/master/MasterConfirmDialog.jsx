import { AlertTriangle, Check, CircleHelp, X } from 'lucide-react';
/** Save/discard/error dialog shared by master forms; preserves existing CSS classes. */
function MasterConfirmDialog({ type, message, onCancel, onConfirm, onDiscard }) {
  const isConfirmation = type === 'confirm';
  const isDiscard = type === 'discard';
  return (
    <div className="modal-backdrop organization-dialog-backdrop">
      <section className={`organization-dialog ${isConfirmation || isDiscard ? 'confirmation-dialog' : 'error-dialog'}`} role="dialog" aria-modal="true" aria-labelledby="organization-dialog-title">
        <div className="organization-dialog-icon">{isConfirmation || isDiscard ? <CircleHelp size={25} /> : <AlertTriangle size={25} />}</div>
        <h2 id="organization-dialog-title">{isConfirmation ? 'Confirm Save' : isDiscard ? 'Discard Changes?' : 'Error'}</h2>
        <p>{isConfirmation ? 'Are you sure you want to save this record?' : isDiscard ? 'Your unsaved changes will be removed. Do you want to leave this screen?' : message}</p>
        <div className="organization-dialog-actions">
          {isConfirmation
            ? <><button type="button" onClick={onCancel}><X size={13} /> No</button><button type="button" className="dialog-confirm" onClick={onConfirm}><Check size={13} /> Yes, Save</button></>
            : isDiscard
              ? <><button type="button" onClick={onCancel}>Stay</button><button type="button" className="dialog-confirm" onClick={onDiscard}>Discard</button></>
            : <button type="button" className="dialog-confirm" onClick={onCancel}>OK</button>}
        </div>
      </section>
    </div>
  );
}

export { MasterConfirmDialog };
