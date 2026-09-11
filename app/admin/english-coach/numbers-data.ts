// Phrasebook "Chiffres" — les chiffres et mesures sont ce qui casse le plus à
// l'oral sous stress en langue étrangère (lux, pourcentages, dimensions,
// horaires, quantités), alors qu'ils reviennent en permanence sur un chantier
// de commissioning lumière. Toujours en contexte (jamais un nombre isolé) pour
// s'entraîner à les dire vite dans une vraie phrase plutôt qu'à les lire.
// Même mécanique que survival-data.ts (fr/en/tip + progression partagée via
// /api/progress, préfixe d'id dédié "num-").

export type NumberCategory = "LUX" | "PCT" | "DIM" | "TIME" | "QTY"

export interface NumberPhrase {
  id: string
  fr: string
  en: string
  tip: string
  cat: NumberCategory
}

export const NUMBER_CAT_LABELS: Record<NumberCategory, string> = {
  LUX: "Lux & Kelvin",
  PCT: "Pourcentages (gradation)",
  DIM: "Dimensions & câblage",
  TIME: "Heures, jours & durées",
  QTY: "Quantités & numéros",
}

export const NUMBER_CAT_CONTEXT: Record<NumberCategory, string> = {
  LUX: "Discussing lux levels and color temperature on a lighting commissioning site in Dubai",
  PCT: "Discussing dimming percentages and driver settings on a lighting commissioning site in Dubai",
  DIM: "Discussing cable lengths, hole diameters and physical dimensions on a lighting commissioning site in Dubai",
  TIME: "Discussing times, dates, durations and schedules while working and traveling in Dubai",
  QTY: "Discussing quantities, counts and reference numbers on a lighting commissioning site in Dubai",
}

export const NUMBER_PHRASES: NumberPhrase[] = [
  // --- Lux & Kelvin ---
  { id: "num-1", fr: "On est à 350 lux sur cette table", en: "We're at 350 lux on this table", tip: '"wee ar at three FIFT-ee luks"', cat: "LUX" },
  { id: "num-2", fr: "Il faut monter à 750 lux", en: "We need to get up to 750 lux", tip: '"wee need too get up too SEV-un FIFT-ee luks"', cat: "LUX" },
  { id: "num-3", fr: "Nous avons 4000 lux sur le comptoir", en: "We have 4000 lux on the counter", tip: '"wee hav for-TAOW-zund luks"', cat: "LUX" },
  { id: "num-4", fr: "Je pense que 2000 lux sur la caisse c'est bien", en: "I think 2000 lux on the till is good", tip: '"eye think too-TAOW-zund luks on ze til"', cat: "LUX" },
  { id: "num-5", fr: "3000 Kelvin, c'est trop chaud", en: "3000 Kelvin is too warm", tip: '"three-TAOW-zund KEL-vin iz too warm"', cat: "LUX" },
  { id: "num-6", fr: "On passe à 4000 Kelvin", en: "We're switching to 4000 Kelvin", tip: '"weer SWICH-ing too for-TAOW-zund KEL-vin"', cat: "LUX" },
  { id: "num-7", fr: "Le niveau cible est de 500 lux", en: "The target level is 500 lux", tip: '"ze TAR-git LEV-ul iz fyv HUN-dred luks"', cat: "LUX" },

  // --- Pourcentages / gradation ---
  { id: "num-8", fr: "Baisse de 15 %", en: "Lower it by 15 percent", tip: '"LOH-er it by fif-TEEN per-SENT"', cat: "PCT" },
  { id: "num-9", fr: "Monte à 85 %", en: "Bring it up to 85 percent", tip: '"bring it up too AY-tee fyv per-SENT"', cat: "PCT" },
  { id: "num-10", fr: "Ça scintille en dessous de 20 %", en: "It flickers below 20 percent", tip: '"it FLIK-erz bi-LOH twen-tee per-SENT"', cat: "PCT" },
  { id: "num-11", fr: "Je vais baisser l'intensité de 20 %", en: "I'll lower the intensity by 20 percent", tip: '"eyel LOH-er zi in-TEN-si-tee by twen-tee per-SENT"', cat: "PCT" },
  { id: "num-12", fr: "Réglez-le à 100 %", en: "Set it to 100 percent", tip: '"set it too wun HUN-dred per-SENT"', cat: "PCT" },
  { id: "num-13", fr: "On le laisse à 50 %", en: "We'll leave it at 50 percent", tip: '"weel leev it at fif-tee per-SENT"', cat: "PCT" },

  // --- Dimensions & câblage ---
  { id: "num-14", fr: "Le diamètre est de 150 millimètres", en: "The diameter is 150 millimeters", tip: '"ze dy-AM-i-ter iz wun FIFT-ee mi-LI-mee-terz"', cat: "DIM" },
  { id: "num-15", fr: "Il faut un trou de 100 millimètres", en: "We need a 100 millimeter hole", tip: '"wee need a wun HUN-dred mi-LI-mee-ter hohl"', cat: "DIM" },
  { id: "num-16", fr: "On a besoin de 12 mètres de câble", en: "We need 12 meters of cable", tip: '"wee need twelv MEE-terz uv KAY-bul"', cat: "DIM" },
  { id: "num-17", fr: "Il nous faut encore 5 mètres de câble", en: "We need another 5 meters of cable", tip: '"wee need a-NUH-ther fyv MEE-terz uv KAY-bul"', cat: "DIM" },
  { id: "num-18", fr: "Il reste 3 mètres", en: "There are 3 meters left", tip: '"thair ar three MEE-terz left"', cat: "DIM" },
  { id: "num-19", fr: "L'ampérage est de 2 ampères", en: "The amperage is 2 amps", tip: '"zi AM-per-ij iz too amps"', cat: "DIM" },
  { id: "num-20", fr: "Le driver supporte jusqu'à 350 milliampères", en: "The driver supports up to 350 milliamps", tip: '"ze DRY-ver suh-PORTS up too three FIFT-ee MIL-ee-amps"', cat: "DIM" },

  // --- Heures, jours & durées ---
  { id: "num-21", fr: "Ça prendra environ 45 minutes", en: "It will take about 45 minutes", tip: '"it wil tayk uh-BAOWT FOR-tee fyv MIN-its"', cat: "TIME" },
  { id: "num-22", fr: "On se retrouve à 7h30", en: "Let's meet at 7:30", tip: '"lets meet at SEV-un THUR-tee"', cat: "TIME" },
  { id: "num-23", fr: "Le rendez-vous est à 14h", en: "The meeting is at 2pm", tip: '"ze MEE-ting iz at too pee-em"', cat: "TIME" },
  { id: "num-24", fr: "Il me faut encore 10 minutes", en: "I need another 10 minutes", tip: '"eye need a-NUH-ther ten MIN-its"', cat: "TIME" },
  { id: "num-25", fr: "Ça fait 2 semaines qu'on est ici", en: "We've been here for 2 weeks", tip: '"weev bin heer for too weeks"', cat: "TIME" },
  { id: "num-26", fr: "On ouvre dans 5 jours", en: "We open in 5 days", tip: '"wee OH-pen in fyv dayz"', cat: "TIME" },
  { id: "num-27", fr: "Je reste 2 jours à Doha et 3 jours à Abu Dhabi", en: "I'm staying 2 days in Doha and 3 days in Abu Dhabi", tip: '"eyem STAY-ing too dayz in DOH-ha and three dayz in AH-boo DAH-bee"', cat: "TIME" },
  { id: "num-28", fr: "Le vol dure 7 heures", en: "The flight is 7 hours long", tip: '"ze flyt iz sev-un OWR-z long"', cat: "TIME" },
  { id: "num-29", fr: "L'avion atterrit à 23h", en: "The flight lands at 11pm", tip: '"ze flyt landz at i-LEV-un pee-em"', cat: "TIME" },
  { id: "num-30", fr: "On se voit le 3 à 9h", en: "See you on the 3rd at 9am", tip: '"see yoo on ze THURD at nyn ay-em"', cat: "TIME" },

  // --- Quantités & numéros ---
  { id: "num-31", fr: "Il y a 24 spots sur ce mur", en: "There are 24 downlights on this wall", tip: '"thair ar twen-tee for DAOWN-lyts on this wawl"', cat: "QTY" },
  { id: "num-32", fr: "Nous avons 6 circuits DALI", en: "We have 6 DALI circuits", tip: '"wee hav siks DAH-lee SER-kits"', cat: "QTY" },
  { id: "num-33", fr: "L'adresse DALI est le numéro 12", en: "The DALI address is number 12", tip: '"ze DAH-lee uh-DRESS iz NUM-ber twelv"', cat: "QTY" },
  { id: "num-34", fr: "On a 8 mannequins à éclairer", en: "We have 8 mannequins to light", tip: '"wee hav ayt MAN-i-kinz too lyt"', cat: "QTY" },
  { id: "num-35", fr: "Chaque vitrine a 6 spots", en: "Each window has 6 spotlights", tip: '"eech WIN-doh haz siks SPOT-lyts"', cat: "QTY" },
  { id: "num-36", fr: "Chambre numéro 412", en: "Room number 412", tip: '"room NUM-ber for-TWELV"', cat: "QTY" },
  { id: "num-37", fr: "On a besoin de 30 vis de plus", en: "We need 30 more screws", tip: '"wee need THUR-tee mor skrooz"', cat: "QTY" },
  { id: "num-38", fr: "Ça coûte 250 dirhams", en: "It costs 250 dirhams", tip: '"it kosts too FIFT-ee dir-HAMZ"', cat: "QTY" },
]
