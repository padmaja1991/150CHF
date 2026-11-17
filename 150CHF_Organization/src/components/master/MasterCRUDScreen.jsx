import { useState } from 'react';

/** Entity-agnostic list/add/edit/view/copy flow. Module services and forms remain separate. */
export function useMasterCRUD() {
  const [screen, setScreen] = useState({ mode: 'list', record: null });
  const openForm = (mode, record = null) => setScreen({ mode, record });
  const closeForm = () => setScreen({ mode: 'list', record: null });
  return { screen, openForm, closeForm };
}

export function MasterCRUDScreen({ controller, renderList, renderForm }) {
  if (controller.screen.mode === 'list') return renderList({ openForm: controller.openForm });
  return renderForm({
    mode: controller.screen.mode,
    record: controller.screen.record,
    recordId: ['create', 'copy'].includes(controller.screen.mode) ? null : controller.screen.record?.id ?? null,
    onClose: controller.closeForm
  });
}
