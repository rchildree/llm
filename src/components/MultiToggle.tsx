/**
 * A row of on/off chips with an optional "All" shortcut — the control the
 * options panels on Drills and Agreement are built from.
 */
export default function MultiToggle({
  values,
  options,
  onChange,
  all,
}: {
  values: string[]
  options: Array<[string, string]> | string[]
  onChange: (values: string[]) => void
  /** values selected by the "All" shortcut (may deliberately exclude e.g. voc) */
  all?: string[]
}) {
  const opts: Array<[string, string]> = options.map((o) => (Array.isArray(o) ? o : [o, o]))
  const toggle = (v: string) =>
    onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v])
  const allOn = all !== undefined && all.every((v) => values.includes(v)) && values.length === all.length
  return (
    <div className="multi-toggle">
      {all !== undefined && (
        <button
          type="button"
          className={allOn ? 'toggle on' : 'toggle'}
          onClick={() => onChange([...all])}
        >
          All
        </button>
      )}
      {opts.map(([value, label]) => (
        <button
          key={value}
          type="button"
          className={values.includes(value) ? 'toggle on' : 'toggle'}
          onClick={() => toggle(value)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
