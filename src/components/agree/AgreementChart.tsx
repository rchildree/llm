import { useDisplay } from '../../app/DisplayContext'
import { allSlots, slotKey, type Form, type Paradigm, type Slot } from '../../lib/agree/paradigm'
import { shortSlot } from '../../lib/agree/describe'

export interface ChartWord {
  /** dictionary citation, for the column head */
  dict: string
  /** e.g. "3rd decl. m." */
  type: string
  paradigm: Paradigm
}

export type Side = 'modifier' | 'noun'

export interface CellArgs {
  slot: Slot
  /** `${case}.${number}` */
  slotId: string
  side: Side
  word: ChartWord
  form: Form | undefined
  /** this row is under discussion and this side of it is lit */
  lit: boolean
}

interface Props {
  modifier: ChartWord
  noun: ChartWord
  /** the slot under discussion, e.g. "acc.pl" */
  highlight?: string | null
  /** light the type chips */
  showTypes?: boolean
  /** light the noun's cell and the row label */
  showNoun?: boolean
  /** light the modifier's cell too */
  showModifier?: boolean
  /** extra class on the table, for a chart that is typed rather than read */
  className?: string
  /** replaces the printed form, e.g. with a box to type the ending into */
  renderCell?: (args: CellArgs) => React.ReactNode
}

/**
 * Both paradigms in one grid, row-aligned, so a case/number lines up across
 * the two words. The shared row is what makes concord visible, which is why
 * this is one table rather than two charts side by side.
 *
 * The grid is defined once here and reused by the typed exercise through
 * `renderCell`, so the two charts can never drift out of alignment.
 */
export default function AgreementChart({
  modifier,
  noun,
  highlight = null,
  showTypes = true,
  showNoun = true,
  showModifier = true,
  className,
  renderCell,
}: Props) {
  const { lat } = useDisplay()

  const printed = (form: Form | undefined, lit: boolean) => {
    if (!form?.whole) return <span className="agree-gap">—</span>
    if (!form.splittable) return <span className={'latin' + (lit ? ' lit' : '')}>{lat(form.whole)}</span>
    return (
      <span className={'latin' + (lit ? ' lit' : '')}>
        <span className="agree-stem">{lat(form.stem)}</span>
        <span className="agree-ending">{lat(form.ending)}</span>
      </span>
    )
  }

  const head = (word: ChartWord) => (
    <th>
      <span className="latin agree-head-word">{lat(word.dict)}</span>
      <span className={'agree-type' + (showTypes ? ' lit' : '')}>{word.type}</span>
    </th>
  )

  return (
    <table className={'agree-chart' + (className ? ' ' + className : '')}>
      <thead>
        <tr>
          <th />
          {head(modifier)}
          {head(noun)}
        </tr>
      </thead>
      <tbody>
        {allSlots().map((slot) => {
          const slotId = slotKey(slot.c, slot.n)
          const isRow = highlight === slotId
          return (
            <tr key={slotId} className={isRow ? 'agree-row lit' : 'agree-row'}>
              <th scope="row" className={isRow && showNoun ? 'lit' : undefined}>
                {shortSlot(slot)}
              </th>
              {(['modifier', 'noun'] as Side[]).map((side) => {
                const word = side === 'modifier' ? modifier : noun
                const lit = isRow && (side === 'modifier' ? showModifier : showNoun)
                const form = word.paradigm.get(slotId)
                return (
                  <td key={side}>
                    {renderCell
                      ? renderCell({ slot, slotId, side, word, form, lit })
                      : printed(form, lit)}
                  </td>
                )
              })}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
