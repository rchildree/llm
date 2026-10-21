import AgreementChart, { type ChartWord, type GenderColumn } from './AgreementChart'
import { GENDER_WORD, describeSlot } from '../../lib/agree/describe'
import type { Gender, Slot } from '../../lib/agree/paradigm'
import { slotKey } from '../../lib/agree/paradigm'

interface Props {
  open: boolean
  modifier: ChartWord
  noun: ChartWord
  /** the modifier in every gender, so the concord is a column as well as a row */
  modifierGenders: GenderColumn[]
  gender: Gender
  slot: Slot
}

/**
 * The pushdown above the exercise: why these two forms go together, said in
 * one go. The explanation used to arrive a clause at a time on a timer, which
 * meant each clause was gone before it could be read — it is all written at
 * once now, with the chart already marked.
 *
 * The wrapper stays mounted so its height can animate; the content inside is
 * rendered only while it is open.
 */
export default function FeedbackPanel({
  open,
  modifier,
  noun,
  modifierGenders,
  gender,
  slot,
}: Props) {
  return (
    <div className={'agree-feedback' + (open ? ' open' : '')} aria-hidden={!open}>
      <div className="agree-feedback-inner">
        {open && (
          <>
            <div className="agree-feedback-head">
              <p className="agree-caption">
                {/* a noun's type already ends in its gender's full stop */}
                {`${modifier.type} with ${noun.type}`.replace(/\.?$/, '.')} The noun is{' '}
                {describeSlot(slot)}, and {GENDER_WORD[gender]} — so the modifier is{' '}
                {describeSlot(slot)} too, in the {GENDER_WORD[gender]}.
              </p>
            </div>
            <AgreementChart
              modifier={modifier}
              noun={noun}
              modifierGenders={modifierGenders}
              litGender={gender}
              highlight={slotKey(slot.c, slot.n)}
            />
          </>
        )}
      </div>
    </div>
  )
}
