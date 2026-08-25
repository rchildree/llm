import { useEffect, useMemo, useRef, useState } from 'react'
import { useDisplay } from '../app/DisplayContext'
import { draw, type Card } from '../lib/flash/deck'
import { buildQuestion } from '../lib/flash/question'
import type { Word } from '../lib/flash/types'

const DISTRACTOR_COUNT = 3

export type FlashMode = 'flip' | 'choice'

interface Deck {
  card: Card | null
  /** the undealt tail of the current shuffled pass */
  remaining: Word[]
}

const deal = (pool: Word[], remaining: Word[], previous: Card | null): Deck => {
  const dealt = draw(pool, remaining, previous)
  return dealt ? { card: dealt.card, remaining: dealt.remaining } : { card: null, remaining: [] }
}

/**
 * Deals from one fixed pool. The page remounts this on any pool change (via
 * `key`), so a new chapter selection always starts a fresh shuffled pass.
 */
export default function FlashDeck({ pool, mode }: { pool: Word[]; mode: FlashMode }) {
  const { lat } = useDisplay()
  const [deck, setDeck] = useState<Deck>(() => deal(pool, [], null))
  const [revealed, setRevealed] = useState(false)
  const [answered, setAnswered] = useState<number | null>(null)
  const advanceTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(advanceTimer.current), [])

  const next = () => {
    clearTimeout(advanceTimer.current)
    setDeck(deal(pool, deck.remaining, deck.card))
    setRevealed(false)
    setAnswered(null)
  }

  const question = useMemo(
    () =>
      mode === 'choice' && deck.card
        ? buildQuestion(deck.card.word, deck.card.direction, pool, DISTRACTOR_COUNT)
        : null,
    [mode, deck.card, pool],
  )

  const onAnswer = (optionIndex: number) => {
    if (!question || answered !== null) return
    setAnswered(optionIndex)
    advanceTimer.current = setTimeout(next, question.options[optionIndex].correct ? 600 : 1600)
  }

  const card = deck.card
  if (!card) return null

  // the two sides of this card, in the order it asks for them
  const front = card.direction === 'la_en' ? lat(card.word.entry) : card.word.definition
  const back = card.direction === 'la_en' ? card.word.definition : lat(card.word.entry)
  const frontClass = card.direction === 'la_en' ? 'latin flash-entry' : 'flash-entry'
  const backClass = card.direction === 'la_en' ? 'flash-def' : 'latin flash-def'

  if (mode === 'choice' && question) {
    return (
      <div className="card flashcard">
        <p className={frontClass}>{front}</p>
        <div className="flash-options">
          {question.options.map((opt, i) => {
            let cls = 'flash-option'
            if (answered !== null) {
              if (opt.correct) cls += ' hit'
              else if (i === answered) cls += ' wrong'
              else cls += ' dim'
            }
            return (
              <button
                key={i}
                className={cls + (card.direction === 'en_la' ? ' latin' : '')}
                onClick={() => onAnswer(i)}
              >
                {card.direction === 'en_la' ? lat(opt.text) : opt.text}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="card flashcard">
      <p className={frontClass}>{front}</p>
      {revealed && (
        <>
          <hr className="flash-rule" />
          <p className={backClass}>{back}</p>
        </>
      )}
      <div className="drill-actions">
        {revealed ? (
          <button key="next" className="btn" onClick={next} autoFocus>Next card</button>
        ) : (
          <button key="reveal" className="btn" onClick={() => setRevealed(true)} autoFocus>
            Show answer
          </button>
        )}
      </div>
    </div>
  )
}
