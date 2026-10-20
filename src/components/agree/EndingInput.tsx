import { forwardRef } from 'react'
import { useDisplay } from '../../app/DisplayContext'

const ALT_KEY: Record<string, string> = { a: 'ā', e: 'ē', i: 'ī', o: 'ō', u: 'ū' }

export type FieldStatus = 'open' | 'right' | 'wrong' | 'quantity'

interface Props {
  /** the fixed part shown before the box; empty when the whole word is typed */
  stem: string
  value: string
  onChange: (value: string) => void
  onFocus: () => void
  onSubmit: () => void
  status: FieldStatus
  disabled: boolean
  label: string
  /** shown after grading when the answer was not right */
  correction?: string | null
}

/**
 * One typed answer: the stem printed fixed, then a box for the ending. When
 * the word has no teachable split (every pronoun) the stem is empty and the
 * box takes the whole form.
 */
const EndingInput = forwardRef<HTMLInputElement, Props>(function EndingInput(
  { stem, value, onChange, onFocus, onSubmit, status, disabled, label, correction },
  ref,
) {
  const { lat } = useDisplay()

  return (
    <div className={'agree-field agree-field-' + status}>
      <label className="agree-field-label latin">{lat(label)}</label>
      <div className="agree-field-row">
        {stem && <span className="latin agree-stem-fixed">{lat(stem)}</span>}
        <input
          ref={ref}
          type="text"
          className="latin agree-input"
          value={value}
          disabled={disabled}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-label={lat(label)}
          onFocus={onFocus}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.altKey && ALT_KEY[e.key.toLowerCase()]) {
              e.preventDefault()
              onChange(value + ALT_KEY[e.key.toLowerCase()])
              return
            }
            if (e.key === 'Enter') {
              e.preventDefault()
              onSubmit()
            }
          }}
        />
        {correction && <span className="latin agree-correction">{lat(correction)}</span>}
      </div>
    </div>
  )
})

export default EndingInput
