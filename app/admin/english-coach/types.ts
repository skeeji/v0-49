export type WordCategory = "OPT" | "DALI" | "LUX" | "TRV" | "NUM" | "DIP" | "TRB" | "EXT"

export interface Word {
  id: string
  fr: string
  en: string
  tip: string
  cat: WordCategory
  mastery: number
  wrong: number
}

export interface ScenarioPart {
  scenarioKey: string
  transition?: string
}

export interface ScenarioLine {
  en: string
  fr: string
}

export interface Scenario {
  title: string
  icon: string
  context: string
  who: string
  // Nom court d'une voix Azure Neural TTS (ex: "en-IN-PrabhatNeural") — donne à
  // chaque personnage un accent cohérent avec son rôle plutôt que la voix par
  // défaut du navigateur.
  voice: string
  openingLines: ScenarioLine[]
  parts?: ScenarioPart[]
}

export type CoachMode = "flashcard" | "roleplay" | "phone_call"

export interface CoachRequest {
  mode: CoachMode
  targetPhrase: string
  userAnswer: string
  context: string
  history: string[]
}

export interface FlashcardCoachResponse {
  correct: boolean
  score: number
  feedback_fr: string
  better_phrasing_en: string
  follow_up_en: string
  // true uniquement quand l'IA n'a pas pu être appelée/parsée et qu'on affiche
  // la réponse de secours — permet à l'UI de ne pas la présenter comme un vrai verdict.
  isFallback?: boolean
}

export interface RoleplayCoachResponse {
  coherent: boolean
  suggestion_fr: string
  next_question_en: string
  next_question_fr: string
}

export interface PhoneCallCoachResponse {
  understood: boolean
  needs_repeat: boolean
  correction_fr: string | null
  next_question_en: string
  next_question_fr: string
}

export type CoachResponse = FlashcardCoachResponse

export interface ProgressRow {
  word_id: string
  mastery: number
  wrong_count: number
  last_seen: string
}

export interface PronunciationPhonemeScore {
  phoneme: string
  accuracy: number
}

export interface PronunciationWordScore {
  word: string
  accuracy: number
  // "None" si bien prononcé — sinon "Mispronunciation" / "Omission" / "Insertion" / etc.
  errorType: string
  // Détail phonème par phonème, fourni par Azure pour aider à cibler précisément
  // le son fautif — présent uniquement pour les mots mal notés.
  phonemes: PronunciationPhonemeScore[]
}

export interface PronunciationResult {
  overall: number
  fluency: number
  words: PronunciationWordScore[]
}
