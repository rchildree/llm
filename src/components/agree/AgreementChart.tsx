import { useDisplay } from '../../app/DisplayContext'
import {
  allSlots,
  slotKey,
  type Form,
  type Gender,
  type Paradigm,
  type Slot,
} from '../../lib/agree/paradigm'
import { GENDER_LABEL, shortSlot } from '../../lib/agree/describe'

export interface ChartWord {
  /** dictionary citation, for the column head */
  dict: string
  /** e.g. "3rd decl. m." */
  type: string
  paradigm: Paradigm
}

export type Side = 'modifier' | 'noun'

/** One gender's column of a modifier shown in all of them. */
export interface GenderColumn {
  gender: Gender
  paradigm: Paradigm
}

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
  /**
   * Show the modifier in every gender rather than only the one in play. The
   * column the noun calls for is marked, so the student can see the whole
   * paradigm and still tell which third of it the pair needs.
   */
  modifierGenders?: GenderColumn[]
  /** the gender the noun calls for, marked among the columns above */
  litGender?: Gender | null
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
 * `renderCell` and by easy mode through `modifierGenders`, so the charts can
 * never drift out of alignment.
 */
export default function AgreementChart({
  modifier,
  noun,
  highlight = null,
  showTypes = true,
  showNoun = true,
  showModifier = true,
  modifierGenders,
  litGender = null,
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

  const headOf = (word: ChartWord) => (
    <>
      <span className="latin agree-head-word">{lat(word.dict)}</span>
      <span className={'agree-type' + (showTypes ? ' lit' : '')}>{word.type}</span>
    </>
  )

  // one modifier column, or one per gender when easy mode asks for them
  const byGender = modifierGenders?.length ? modifierGenders : null
  const modifierColumns = byGender
    ? byGender.map((c) => ({
        key: c.gender,
        paradigm: c.paradigm,
        lit: c.gender === litGender,
      }))
    : [{ key: 'modifier', paradigm: modifier.paradigm, lit: false }]

  return (
    <table className={'agree-chart' + (className ? ' ' + className : '')}>
      <thead>
        <tr>
          <th />
          <th colSpan={modifierColumns.length}>{headOf(modifier)}</th>
          <th rowSpan={byGender ? 2 : 1}>{headOf(noun)}</th>
        </tr>
        {byGender && (
          <tr>
            <th />
            {byGender.map((c) => (
              <th
                key={c.gender}
                className={'agree-col-head' + (c.gender === litGender ? ' lit' : '')}
              >
                {GENDER_LABEL[c.gender]}
              </th>
            ))}
          </tr>
        )}
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
              {modifierColumns.map((column) => {
                const form = column.paradigm.get(slotId)
                return (
                  <td key={column.key} className={column.lit ? 'agree-col lit' : undefined}>
                    {renderCell
                      ? renderCell({
                          slot,
                          slotId,
                          side: 'modifier',
                          word: modifier,
                          form,
                          lit: isRow && showModifier,
                        })
                      : printed(form, isRow && showModifier)}
                  </td>
                )
              })}
              <td>
                {renderCell
                  ? renderCell({
                      slot,
                      slotId,
                      side: 'noun',
                      word: noun,
                      form: noun.paradigm.get(slotId),
                      lit: isRow && showNoun,
                    })
                  : printed(noun.paradigm.get(slotId), isRow && showNoun)}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
