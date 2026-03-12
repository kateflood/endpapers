interface Props {
  name: string
  detail?: string
  onConfirm: () => void
  onCancel: () => void
}

export default function DeleteConfirmation({ name, detail, onConfirm, onCancel }: Props) {
  return (
    <div className="mx-2 mb-1 px-3 py-2 bg-danger-surface border border-danger-border rounded-sm text-[0.75rem] text-text">
      <p className="mb-2">
        Delete <strong>{name}</strong>{detail ? ` ${detail}` : ''}?
      </p>
      <div className="flex gap-2">
        <button
          className="px-2 py-1 bg-danger text-white rounded-sm text-[0.75rem] cursor-pointer hover:opacity-80"
          onClick={onConfirm}
        >
          Delete
        </button>
        <button
          className="px-2 py-1 border border-border rounded-sm text-[0.75rem] cursor-pointer hover:bg-hover"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
