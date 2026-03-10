export type Mode = 'words' | 'numbers' | 'names';
export type SpellingMode = 'word' | 'letter';

export interface PracticeResult {
  word: string;
  answer: string;
  correct: boolean;
}

export interface PracticeSession {
  words: string[];
  results: PracticeResult[];
  currentIndex: number;
  correctCount: number;
  incorrectCount: number;
}
