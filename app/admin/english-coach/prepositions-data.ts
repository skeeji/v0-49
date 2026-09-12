// Phrasebook "Prepositions of place" (prépositions de lieu) — indispensables
// pour situer un objet ou une pièce sur un chantier/en boutique (le driver
// EST où par rapport au boîtier, au mur, à la vitrine...) et systématiquement
// confondues (in/on/at, above/over, next to/beside...) par un francophone.
// Toujours en contexte (jamais la préposition isolée). Même mécanique que
// numbers-data.ts (fr/en/tip + progression partagée via /api/progress,
// préfixe d'id dédié "prep-").

export type PrepositionCategory = "BASIC" | "RELATIVE" | "VERTICAL" | "AREA"

export interface PrepositionPhrase {
  id: string
  fr: string
  en: string
  tip: string
  cat: PrepositionCategory
}

export const PREPOSITION_CAT_LABELS: Record<PrepositionCategory, string> = {
  BASIC: "In / on / at",
  RELATIVE: "Position relative",
  VERTICAL: "Au-dessus / en dessous",
  AREA: "Zone & mouvement",
}

export const PREPOSITION_CAT_CONTEXT: Record<PrepositionCategory, string> = {
  BASIC: "Locating something with in/on/at on a lighting commissioning site in Dubai",
  RELATIVE: "Locating something relative to another object or person on a lighting commissioning site in Dubai",
  VERTICAL: "Describing vertical position (above/below) on a lighting commissioning site in Dubai",
  AREA: "Describing an area or movement through a space on a lighting commissioning site in Dubai",
}

export const PREPOSITION_PHRASES: PrepositionPhrase[] = [
  // --- In / on / at ---
  { id: "prep-1", fr: "Le driver est dans le boîtier", en: "The driver is in the box", tip: '"ze DRY-ver iz in ze boks"', cat: "BASIC" },
  { id: "prep-2", fr: "Il y a un spot sur le plafond", en: "There's a downlight on the ceiling", tip: '"thairz uh DAOWN-lyt on ze SEE-ling"', cat: "BASIC" },
  { id: "prep-3", fr: "Le manager est au comptoir", en: "The manager is at the counter", tip: '"ze MAN-uh-jer iz at ze KAOWN-ter"', cat: "BASIC" },
  { id: "prep-4", fr: "Le câble est dans le mur", en: "The cable is in the wall", tip: '"ze KAY-bul iz in ze wawl"', cat: "BASIC" },
  { id: "prep-5", fr: "L'interrupteur est sur cette cloison", en: "The switch is on this partition", tip: '"ze swich iz on this par-TISH-un"', cat: "BASIC" },
  { id: "prep-6", fr: "Rendez-vous à la réception à 9h", en: "Meet at the reception at 9am", tip: '"meet at ze ri-SEP-shun at nyn ay-em"', cat: "BASIC" },

  // --- Position relative ---
  { id: "prep-7", fr: "Le spot est à côté de la vitrine", en: "The downlight is next to the showcase", tip: '"ze DAOWN-lyt iz nekst too ze SHOH-kayss"', cat: "RELATIVE" },
  { id: "prep-8", fr: "Le driver est entre les deux poutres", en: "The driver is between the two beams", tip: '"ze DRY-ver iz bi-TWEEN ze too beemz"', cat: "RELATIVE" },
  { id: "prep-9", fr: "Le boîtier est derrière le mannequin", en: "The junction box is behind the mannequin", tip: '"ze JUNK-shun boks iz bi-HYND ze MAN-i-kin"', cat: "RELATIVE" },
  { id: "prep-10", fr: "Le comptoir est devant la vitrine", en: "The counter is in front of the showcase", tip: '"ze KAOWN-ter iz in frunt uv ze SHOH-kayss"', cat: "RELATIVE" },
  { id: "prep-11", fr: "La sortie de secours est en face des vestiaires", en: "The emergency exit is opposite the fitting rooms", tip: '"zi ee-MER-jen-see EG-zit iz OP-uh-zit ze FIT-ing roomz"', cat: "RELATIVE" },
  { id: "prep-12", fr: "Le tableau électrique est près de l'entrée", en: "The electrical panel is near the entrance", tip: '"zi ee-LEK-tri-kul PAN-ul iz neer zi EN-truns"', cat: "RELATIVE" },
  { id: "prep-13", fr: "Le driver est à côté du transformateur", en: "The driver is beside the transformer", tip: '"ze DRY-ver iz bi-SYD ze tranz-FOR-mer"', cat: "RELATIVE" },

  // --- Au-dessus / en dessous ---
  { id: "prep-14", fr: "Le spot est au-dessus du comptoir", en: "The downlight is above the counter", tip: '"ze DAOWN-lyt iz uh-BUV ze KAOWN-ter"', cat: "VERTICAL" },
  { id: "prep-15", fr: "Le câblage est en dessous du faux plafond", en: "The wiring is below the false ceiling", tip: '"ze WY-ring iz bi-LOH ze fawls SEE-ling"', cat: "VERTICAL" },
  { id: "prep-16", fr: "Le driver est sous l'étagère", en: "The driver is under the shelf", tip: '"ze DRY-ver iz UN-der ze shelf"', cat: "VERTICAL" },
  { id: "prep-17", fr: "Il y a un tuyau au-dessus du rail", en: "There's a pipe over the track", tip: '"thairz uh pyp OH-ver ze trak"', cat: "VERTICAL" },
  { id: "prep-18", fr: "Le boîtier est sur le dessus de l'armoire", en: "The box is on top of the cabinet", tip: '"ze boks iz on top uv ze KAB-i-net"', cat: "VERTICAL" },

  // --- Zone & mouvement ---
  { id: "prep-19", fr: "Le câble passe à l'intérieur du mur", en: "The cable runs inside the wall", tip: '"ze KAY-bul runz in-SYD ze wawl"', cat: "AREA" },
  { id: "prep-20", fr: "Le générateur est à l'extérieur du bâtiment", en: "The generator is outside the building", tip: '"ze JEN-uh-ray-ter iz aowt-SYD ze BIL-ding"', cat: "AREA" },
  { id: "prep-21", fr: "Il y a des spots tout autour de la vitrine", en: "There are downlights all around the showcase", tip: '"thair ar DAOWN-lyts awl uh-RAOWND ze SHOH-kayss"', cat: "AREA" },
  { id: "prep-22", fr: "Le câble passe à travers le mur", en: "The cable goes through the wall", tip: '"ze KAY-bul gohz throo ze wawl"', cat: "AREA" },
  { id: "prep-23", fr: "Le rail court le long du plafond", en: "The track runs along the ceiling", tip: '"ze trak runz uh-LONG ze SEE-ling"', cat: "AREA" },
  { id: "prep-24", fr: "Le magasin est juste en face de la mosquée", en: "The shop is right across from the mosque", tip: '"ze shop iz ryt uh-KROSS from ze mosk"', cat: "AREA" },
]
