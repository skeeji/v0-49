export type WordCategory = "OPT" | "DALI" | "LUX" | "TRV" | "NUM" | "DIP" | "TRB"

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

export interface Scenario {
  title: string
  icon: string
  context: string
  who: string
  openingLines: string[]
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
}

export interface RoleplayCoachResponse {
  coherent: boolean
  suggestion_fr: string | null
  next_question_en: string
}

export interface PhoneCallCoachResponse {
  understood: boolean
  needs_repeat: boolean
  correction_fr: string | null
  next_question_en: string
}

export type CoachResponse = FlashcardCoachResponse

export interface ProgressRow {
  word_id: string
  mastery: number
  wrong_count: number
  last_seen: string
}
