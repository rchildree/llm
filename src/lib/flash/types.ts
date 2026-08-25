// Core domain types for the flashcard deck.

/** A flashcard-facing view of a VocabEntry (id = VocabEntry.id). */
export interface Word {
  id: string
  /** Latin headword/dictionary entry, with macrons preserved. */
  entry: string
  /** English definition. */
  definition: string
  /** Chapter number this word is introduced in. */
  chapter: number
}

/** Which way round a card is asked. */
export type Direction = 'la_en' | 'en_la'
