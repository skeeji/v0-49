import type { Word, WordCategory, Scenario } from "./types"

export const DEFAULT_WORDS: Word[] = [
  { id: "w1", fr: "Spot encastré", en: "Recessed downlight", tip: '"ri-SESS-d DAOWN-lite"', cat: "OPT", mastery: 0, wrong: 0 },
  { id: "w2", fr: "Ruban LED", en: "LED strip", tip: '"el-ee-DEE strip"', cat: "OPT", mastery: 0, wrong: 0 },
  { id: "w3", fr: "Corniche lumineuse", en: "Cove lighting", tip: '"kohv LY-ting"', cat: "OPT", mastery: 0, wrong: 0 },
  { id: "w4", fr: "Angle de faisceau (étroit/large)", en: "Beam angle (narrow/wide)", tip: '"beem ANG-gul"', cat: "OPT", mastery: 0, wrong: 0 },
  { id: "w5", fr: "Grille anti-éblouissement", en: "Honeycomb louvre / Anti-glare mesh", tip: '"HUN-ee-kohm LOO-ver"', cat: "OPT", mastery: 0, wrong: 0 },
  { id: "w6", fr: "Effet de coquillage (tache lumineuse)", en: "Scallop effect", tip: '"SKAL-up ee-fekt"', cat: "OPT", mastery: 0, wrong: 0 },
  { id: "w7", fr: "Point chaud (surexposition)", en: "Hot spot", tip: '"hot spot"', cat: "OPT", mastery: 0, wrong: 0 },
  { id: "w8", fr: "Wallwasher asymétrique", en: "Asymmetrical wallwasher", tip: '"ay-see-MET-ri-kul WALL-wosh-er"', cat: "OPT", mastery: 0, wrong: 0 },
  { id: "w9", fr: "Orienter / régler le faisceau", en: "To aim / focus the beam", tip: '"aym ze beem"', cat: "OPT", mastery: 0, wrong: 0 },

  { id: "w10", fr: "Bus / ligne de signal DALI", en: "DALI Bus / Signal line", tip: '"DAH-lee bus"', cat: "DALI", mastery: 0, wrong: 0 },
  { id: "w11", fr: "Sans polarité", en: "Polarity-free", tip: '"poh-LAR-i-tee free"', cat: "DALI", mastery: 0, wrong: 0 },
  { id: "w12", fr: "Tension secteur / basse tension", en: "Mains voltage / Low voltage", tip: '"maynz VOHL-tij"', cat: "DALI", mastery: 0, wrong: 0 },
  { id: "w13", fr: "Court-circuit / circuit ouvert", en: "Short circuit / Open circuit", tip: '"short SER-kit"', cat: "DALI", mastery: 0, wrong: 0 },
  { id: "w14", fr: "Mise en service", en: "Commissioning", tip: '"kuh-MISH-uh-ning"', cat: "DALI", mastery: 0, wrong: 0 },
  { id: "w15", fr: "Forcer / outrepasser", en: "To override", tip: '"oh-ver-RYD"', cat: "DALI", mastery: 0, wrong: 0 },
  { id: "w16", fr: "Driver / transformateur", en: "Driver / Transformer", tip: '"DRY-ver"', cat: "DALI", mastery: 0, wrong: 0 },
  { id: "w17", fr: "Scintillement", en: "Flickering", tip: '"FLIK-er-ing"', cat: "DALI", mastery: 0, wrong: 0 },
  { id: "w18", fr: "Adressage", en: "Addressing", tip: '"uh-DRESS-ing"', cat: "DALI", mastery: 0, wrong: 0 },
  { id: "w19", fr: "Commande générale", en: "Broadcast command", tip: '"BRAWD-kast kuh-MAND"', cat: "DALI", mastery: 0, wrong: 0 },

  { id: "w20", fr: "Trop chaud / froid (température de couleur)", en: "Too warm / cold", tip: '"too warm"', cat: "LUX", mastery: 0, wrong: 0 },
  { id: "w21", fr: "Éblouissement", en: "Glare", tip: '"glair"', cat: "LUX", mastery: 0, wrong: 0 },
  { id: "w22", fr: "Ombres", en: "Shadows", tip: '"SHAD-ohz"', cat: "LUX", mastery: 0, wrong: 0 },
  { id: "w23", fr: "Reflets", en: "Reflections", tip: '"ri-FLEK-shunz"', cat: "LUX", mastery: 0, wrong: 0 },
  { id: "w24", fr: "Mettre en valeur le produit", en: "Highlight the product", tip: '"HY-lyt ze PROD-ukt"', cat: "LUX", mastery: 0, wrong: 0 },
  { id: "w25", fr: "Vitrine", en: "Showcase", tip: '"SHOH-kayss"', cat: "LUX", mastery: 0, wrong: 0 },
  { id: "w26", fr: "Verre de vitrine", en: "Showcase glass", tip: '"SHOH-kayss glass"', cat: "LUX", mastery: 0, wrong: 0 },
  { id: "w27", fr: "Mannequin", en: "Mannequin", tip: '"MAN-i-kin"', cat: "LUX", mastery: 0, wrong: 0 },
  { id: "w28", fr: "Ne vous inquiétez pas, je m'en occupe", en: "Don't worry, I will fix it", tip: '"dohnt WUR-ee"', cat: "LUX", mastery: 0, wrong: 0 },
  { id: "w29", fr: "Bien reçu / compris", en: "Copy that / Clear", tip: '"KOP-ee that"', cat: "LUX", mastery: 0, wrong: 0 },
  { id: "w30", fr: "On teste les scènes en ce moment", en: "We are testing scenes right now", tip: '"tes-ting seenz"', cat: "LUX", mastery: 0, wrong: 0 },

  { id: "w31", fr: "Contrôle des passeports", en: "Passport control", tip: '"PASS-port kun-TROHL"', cat: "TRV", mastery: 0, wrong: 0 },
  { id: "w32", fr: "Porte d'embarquement", en: "Gate", tip: '"gayt"', cat: "TRV", mastery: 0, wrong: 0 },
  { id: "w33", fr: "Bagage", en: "Luggage", tip: '"LUG-ij"', cat: "TRV", mastery: 0, wrong: 0 },
  { id: "w34", fr: "Enregistrement", en: "Check-in", tip: '"chek-in"', cat: "TRV", mastery: 0, wrong: 0 },
  { id: "w35", fr: "Carte magnétique (hôtel)", en: "Key card", tip: '"kee kard"', cat: "TRV", mastery: 0, wrong: 0 },
  { id: "w36", fr: "Reçu", en: "Receipt", tip: '"ri-SEET"', cat: "TRV", mastery: 0, wrong: 0 },
  { id: "w37", fr: "Où est... ?", en: "Where is...?", tip: '"wair iz"', cat: "TRV", mastery: 0, wrong: 0 },
  { id: "w38", fr: "Taxi", en: "Taxi", tip: '"TAK-see"', cat: "TRV", mastery: 0, wrong: 0 },
  { id: "w39", fr: "Addition", en: "Bill / Check", tip: '"bill"', cat: "TRV", mastery: 0, wrong: 0 },

  { id: "w40", fr: "Lux", en: "Lux", tip: '"luks"', cat: "NUM", mastery: 0, wrong: 0 },
  { id: "w41", fr: "Kelvin (température de couleur)", en: "Kelvin", tip: '"KEL-vin"', cat: "NUM", mastery: 0, wrong: 0 },
  { id: "w42", fr: "Millimètre", en: "Millimeter", tip: '"MIL-i-mee-ter"', cat: "NUM", mastery: 0, wrong: 0 },
  { id: "w43", fr: "Pourcentage de gradation", en: "Percent dimming", tip: '"per-SENT DIM-ing"', cat: "NUM", mastery: 0, wrong: 0 },
  { id: "w44", fr: "Numéro de circuit", en: "Circuit number", tip: '"SER-kit NUM-ber"', cat: "NUM", mastery: 0, wrong: 0 },
  { id: "w45", fr: "Ampérage", en: "Amperage", tip: '"AM-per-ij"', cat: "NUM", mastery: 0, wrong: 0 },

  { id: "w46", fr: "Il me faut 5 minutes de plus", en: "I need 5 more minutes", tip: '"I need five mor MIN-its"', cat: "DIP", mastery: 0, wrong: 0 },
  { id: "w47", fr: "Ce n'est pas idéal pour moi non plus, mais...", en: "This isn't ideal for me either, but...", tip: '"this IZ-unt eye-DEE-ul"', cat: "DIP", mastery: 0, wrong: 0 },
  { id: "w48", fr: "Trouvons un compromis", en: "Let's find a compromise", tip: '"lets fynd a KOM-pruh-myz"', cat: "DIP", mastery: 0, wrong: 0 },
  { id: "w49", fr: "Je comprends votre préoccupation", en: "I hear your concern", tip: '"eye heer yor kun-SERN"', cat: "DIP", mastery: 0, wrong: 0 },
  { id: "w50", fr: "Laissez-moi un instant pour vérifier", en: "Give me a moment to check", tip: '"giv mee a MOH-ment"', cat: "DIP", mastery: 0, wrong: 0 },

  { id: "w51", fr: "Pouvez-vous vérifier le... ?", en: "Can you check the...?", tip: '"kan yoo chek ze"', cat: "TRB", mastery: 0, wrong: 0 },
  { id: "w52", fr: "On dirait que le problème c'est...", en: "It looks like the problem is...", tip: '"it luks lyk ze PROB-lem"', cat: "TRB", mastery: 0, wrong: 0 },
  { id: "w53", fr: "Essayez ça et dites-moi ce qui se passe", en: "Try this and tell me what happens", tip: '"try this and tel mee"', cat: "TRB", mastery: 0, wrong: 0 },
  { id: "w54", fr: "Ça scintille encore ?", en: "Is it still flickering?", tip: '"iz it stil FLIK-er-ing"', cat: "TRB", mastery: 0, wrong: 0 },
]

export const CAT_LABELS: Record<WordCategory, string> = {
  OPT: "Optique & luminaires",
  DALI: "DALI & électricité",
  LUX: "Luxe & management",
  TRV: "Voyage & survie",
  NUM: "Chiffres & unités",
  DIP: "Diplomatie",
  TRB: "Dépannage",
}

export const SCENARIOS: Record<string, Scenario> = {
  electrician: {
    title: "Électricien sur échelle",
    icon: "🪜",
    context: "Electrician on a ladder, DALI lighting commissioning, luxury retail store in Dubai",
    steps: [
      {
        who: "Electrician",
        line: "The strip is flickering when I dim it below 20 percent, what do you want me to do?",
      },
    ],
  },
  manager: {
    title: "Manager stressé",
    icon: "👔",
    context: "Stressed brand manager, luxury retail store opening in 2 days, Dubai",
    steps: [
      {
        who: "Brand Manager",
        line: "The color temperature on the showcase looks too cold, the opening is in 2 days, can you fix this now?",
      },
    ],
  },
  customs: {
    title: "Douanes / aéroport",
    icon: "🛃",
    context: "Customs officer at Dubai airport, business trip for lighting commissioning work",
    steps: [
      {
        who: "Customs Officer",
        line: "Passport, please. What is the purpose of your visit?",
      },
    ],
  },
}
