/** Which chapters a study pool draws from — shared by flashcards and drills. */
export interface ChapterScope {
  cap: number
  /** true = only the capped chapter itself, false = everything through it */
  only: boolean
}

export const inChapterScope = (chapter: number, scope: ChapterScope): boolean =>
  scope.only ? chapter === scope.cap : chapter <= scope.cap

/** How a chapter number is shown: 41+ are the book's review lessons. */
export const chapterLabel = (chapter: number): string =>
  chapter > 40 ? `RL${chapter - 40}` : String(chapter)
