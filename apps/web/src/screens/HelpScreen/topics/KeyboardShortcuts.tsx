const SHORTCUTS: Array<{ label: string; keys: string }> = [
  { label: 'Bold', keys: 'Cmd + B' },
  { label: 'Italic', keys: 'Cmd + I' },
  { label: 'Underline', keys: 'Cmd + U' },
  { label: 'Strikethrough', keys: 'Cmd + Shift + X' },
  { label: 'Inline code', keys: 'Cmd + E' },
  { label: 'Heading 1', keys: 'Cmd + Alt + 1' },
  { label: 'Heading 2', keys: 'Cmd + Alt + 2' },
  { label: 'Heading 3', keys: 'Cmd + Alt + 3' },
  { label: 'Bullet list', keys: 'Cmd + Shift + 8' },
  { label: 'Ordered list', keys: 'Cmd + Shift + 7' },
  { label: 'Blockquote', keys: 'Cmd + Shift + B' },
  { label: 'Undo', keys: 'Cmd + Z' },
  { label: 'Redo', keys: 'Cmd + Shift + Z' },
  { label: 'Find', keys: 'Cmd + F' },
  { label: 'Find and replace', keys: 'Cmd + Shift + F' },
  { label: 'Focus mode', keys: 'Cmd + .' },
]

export default function KeyboardShortcuts() {
  return (
    <article className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-text mb-2">Keyboard Shortcuts</h1>
        <p className="text-[0.9375rem] text-text-secondary leading-relaxed">
          Common formatting and editing shortcuts. On Windows and Linux, use <strong>Ctrl</strong> in place of <strong>Cmd</strong>.
        </p>
      </div>

      <div className="border border-border rounded-md overflow-hidden divide-y divide-border">
        {SHORTCUTS.map(({ label, keys }) => (
          <div key={label} className="flex items-center justify-between px-4 py-2.5 bg-surface">
            <span className="text-[0.875rem] text-text">{label}</span>
            <kbd className="text-[0.75rem] text-text-secondary bg-bg border border-border rounded px-2 py-0.5 font-mono">
              {keys}
            </kbd>
          </div>
        ))}
      </div>
    </article>
  )
}
