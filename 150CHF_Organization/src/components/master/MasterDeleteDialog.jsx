import { AlertTriangle, Trash2, X } from 'lucide-react';
/** Reusable inactive/delete confirmation. Caller owns the persistence mutations. */
export function MasterDeleteDialog({ onClose, onInactive, onDelete, pending }) {
  return (
<div className="modal-backdrop delete-dialog-backdrop"><section className="delete-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-title"><div className="delete-dialog-icon"><AlertTriangle size={25} /></div><h2 id="delete-title">Delete</h2><p>Do you really want to In-active/Delete this record?</p><div className="delete-dialog-actions"><button type="button" onClick={() => onClose()}><X size={13} /> No</button><button className="inactive-action" type="button" disabled={pending} onClick={onInactive}>In-Active</button><button className="delete-confirm" type="button" disabled={pending} onClick={onDelete}><Trash2 size={13} /> Delete</button></div></section></div>
  );
}
