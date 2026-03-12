import Button from '../shared/Button'
import Dialog from './Dialog'

interface Props {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onClose: () => void
}

export default function ConfirmDialog({
  title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', onConfirm, onClose,
}: Props) {
  return (
    <Dialog title={title} onClose={onClose}>
      <div className="px-4 py-4 flex flex-col gap-4">
        <p className="text-[0.9375rem] text-text-secondary">{message}</p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>{cancelLabel}</Button>
          <Button type="button" onClick={() => { onConfirm(); onClose() }}>{confirmLabel}</Button>
        </div>
      </div>
    </Dialog>
  )
}
