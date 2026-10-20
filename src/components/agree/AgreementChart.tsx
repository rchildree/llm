import { useDisplay } from '../../app/DisplayContext'
import { allSlots, slotKey, type Form, type Paradigm } from '../../lib/agree/paradigm'
import { shortSlot } from '../../lib/agree/describe'

export interface ChartWord {
  /** dictionary citation, for the column head */
  dict: string
  /** e.g. "3rd decl. m." */
  type: string
  paradigm: Paradigm
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
}

/**
 * Both paradigms in one grid, row-aligned, so a case/number lines up across
 * the two words. The shared row is what makes concord visible, which is why
 * this is one table rather than two charts side by side.
 */
export default function AgreementChart({
  modifier,
  noun,
  highlight = null,
  showTypes = true,
  showNoun = true,
  showModifier = true,
}: Props) {
  const { lat } = useDisplay()

  const cell = (form: Form | undefined, lit: boolean) => {
    if (!form?.whole) return <span className="agree-gap">—</span>
    if (!form.splittable) return <span className={'latin' + (lit ? ' lit' : '')}>{lat(form.whole)}</span>
    return (
      <span className={'latin' + (lit ? ' lit' : '')}>
        <span className="agree-stem">{lat(form.stem)}</span>
        <span className="agree-ending">{lat(form.ending)}</span>
      </span>
    )
  }

  return (
    <table className="agree-chart">
      <thead>
        <tr>
          <th />
          <th>
            <span className="latin agree-head-word">{lat(modifier.dict)}</span>
            <span className={'agree-type' + (showTypes ? ' lit' : '')}>{modifier.type}</span>
          </th>
          <th>
            <span className="latin agree-head-word">{lat(noun.dict)}</span>
            <span className={'agree-type' + (showTypes ? ' lit' : '')}>{noun.type}</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {allSlots().map((slot) => {
          const key = slotKey(slot.c, slot.n)
          const isRow = highlight === key
          return (
            <tr key={key} className={isRow ? 'agree-row lit' : 'agree-row'}>
              <th scope="row" className={isRow && showNoun ? 'lit' : undefined}>
                {shortSlot(slot)}
              </th>
              <td>{cell(modifier.paradigm.get(key), isRow && showModifier)}</td>
              <td>{cell(noun.paradigm.get(key), isRow && showNoun)}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
