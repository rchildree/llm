const MACRONS = ['ā', 'ē', 'ī', 'ō', 'ū'] as const

/** Long-vowel keys for the typed answers, for keyboards without them. */
export default function MacronRow({
  onInsert,
  disabled,
}: {
  onInsert: (ch: string) => void
  disabled: boolean
}) {
  return (
    <div className="macron-row" aria-label="insert a long vowel">
      {MACRONS.map((ch) => (
        <button
          key={ch}
          type="button"
          className="macron-key latin"
          disabled={disabled}
          // keep the caret in the input the click came from
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onInsert(ch)}
        >
          {ch}
        </button>
      ))}
      <span className="muted macron-hint">or alt + a e i o u</span>
    </div>
  )
}
