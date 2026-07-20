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

export interface ScenarioStep {
  who: string
  line: string
}

export interface Scenario {
  title: string
  icon: string
  context: string
  steps: ScenarioStep[]
}

export type CoachMode = "flashcard" | "roleplay"

export interface CoachRequest {
  mode: CoachMode
  targetPhrase: string
  userAnswer: string
  context: string
  history: string[]
}

export interface CoachResponse {
  correct: boolean
  score: number
  feedback_fr: string
  better_phrasing_en: string
  follow_up_en: string
}

export interface ProgressRow {
  word_id: string
  mastery: number
  wrong_count: number
  last_seen: string
}
