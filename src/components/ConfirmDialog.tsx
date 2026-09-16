import { Modal } from './Modal';

interface Props {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ title, message, confirmLabel = 'Eliminar', onConfirm, onCancel }: Props) {
  return (
    <Modal title={title} onClose={onCancel}>
      <div className="form">
        <p className="form-context">{message}</p>
        <div className="form-actions">
          <div className="form-actions-right">
            <button type="button" className="ghost" onClick={onCancel}>Cancelar</button>
            <button type="button" className="primary danger" onClick={onConfirm} autoFocus>{confirmLabel}</button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
