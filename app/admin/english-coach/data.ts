import type { Word, WordCategory, Scenario } from "./types"
import extraVocabRaw from "./extra-vocab.json"

// Vocabulaire boutique & matériaux (336 termes), fr/en déjà fournis + tip
// phonétique dans le même style que les 54 mots d'origine (respelling simplifié,
// syllabe accentuée en majuscules).
const EXTRA_WORDS: Word[] = extraVocabRaw as Word[]

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

  ...EXTRA_WORDS,
]

export const CAT_LABELS: Record<WordCategory, string> = {
  OPT: "Optique & luminaires",
  DALI: "DALI & électricité",
  LUX: "Luxe & management",
  TRV: "Voyage & survie",
  NUM: "Chiffres & unités",
  DIP: "Diplomatie",
  TRB: "Dépannage",
  EXT: "Vocabulaire boutique & matériaux",
}

// Pool de situations de chantier/boutique — contexte fourni à l'IA pour le mode
// roleplay, PAS des scripts. À chaque session, 1 à 3 sujets sont piochés au hasard
// dans ce pool pour ancrer une conversation professionnelle réaliste (chantier
// Dubai Mall / boutique de luxe / Emaar) sans jamais suivre un déroulé figé.
export const ROLEPLAY_TOPICS: string[] = [
  "checking the shop window lighting before opening",
  "aligning the light lines along the display shelving",
  "masking exposed cables behind the boxing-in",
  "adjusting a hot spot on a mannequin's face",
  "fixing a flickering LED strip under a shelf",
  "correcting the color temperature on the cosmetics counter",
  "dealing with a stray reflection on the showcase glass",
  "positioning a spotlight on a perfume display",
  "resolving a DALI address conflict on site",
  "reviewing the snag list before client walkthrough",
  "explaining a delay in the delivery of spare parts",
  "briefing the electrician on the wiring diagram",
  "checking the dimming curve on the entrance signage",
  "handling a driver overheating issue on a track spotlight",
  "coordinating with the shopfitter on niche backlighting",
  "verifying the color rendering on the jewellery vitrine",
  "discussing the site handover schedule with the site supervisor",
  "adjusting the beam angle on the VIP fitting lounge lighting",
  "troubleshooting a short circuit found during commissioning",
  "presenting the lighting scenes to the brand manager",
  "checking grounding and polarity before energizing a circuit",
  "resolving a customer glare complaint near the fitting rooms",
  "coordinating the cleaning mode schedule with the store manager",
  "reviewing the bill of materials with the systems integrator",
  "fixing a buzzing noise coming from a dimmable driver",
  "adjusting the wall grazer alignment on the marble backdrop",
  "explaining a delay caused by a structural opening not ready",
  "calibrating the DALI scenes for the demo mode",
  "checking battery backup for the emergency lighting",
  "walking the creative director through the accent lighting",
  "transferring spare parts and tools to the incoming shift",
]

export const SCENARIOS: Record<string, Scenario> = {
  customs: {
    title: "Douanes / aéroport",
    icon: "🛃",
    context: "Customs officer at Dubai airport, business trip for lighting commissioning work",
    who: "Customs Officer",
    voice: "en-GB-SoniaNeural",
    openingLines: [
      { en: "Passport, please. What is the purpose of your visit?", fr: "Passeport, s'il vous plaît. Quel est le motif de votre visite ?" },
      { en: "Good morning. Business or leisure, sir?", fr: "Bonjour. Affaires ou tourisme, monsieur ?" },
      { en: "Passport and boarding pass, please. Are you here for work?", fr: "Passeport et carte d'embarquement, s'il vous plaît. Vous êtes ici pour le travail ?" },
    ],
  },
  electrician: {
    title: "Électricien sur échelle",
    icon: "🪜",
    context: "Electrician on a ladder, DALI lighting commissioning, luxury retail store in Dubai",
    who: "Electrician",
    // Accent anglais indien (main-d'œuvre technique très présente sur les chantiers à Dubaï).
    voice: "en-IN-PrabhatNeural",
    openingLines: [
      { en: "The strip is flickering when I dim it below 20 percent, what do you want me to do?", fr: "Le ruban scintille quand je le baisse en dessous de 20 %, qu'est-ce que vous voulez que je fasse ?" },
      { en: "Hey, this fixture won't respond to the DALI address, any idea what's wrong?", fr: "Hé, ce luminaire ne répond pas à l'adresse DALI, une idée de ce qui cloche ?" },
      { en: "I'm up on the ladder, the downlight next to the mannequin is showing a hot spot. What should I check first?", fr: "Je suis sur l'échelle, le spot encastré à côté du mannequin montre un point chaud. Je vérifie quoi en premier ?" },
    ],
  },
  manager: {
    title: "Manager stressé",
    icon: "👔",
    context: "Stressed brand manager, luxury retail store opening in 2 days, Dubai",
    who: "Brand Manager",
    // Accent anglais britannique neutre, cohérent avec le milieu du retail de luxe à Dubaï.
    voice: "en-GB-RyanNeural",
    openingLines: [
      { en: "The color temperature on the showcase looks too cold, the opening is in 2 days, can you fix this now?", fr: "La température de couleur de la vitrine paraît trop froide, l'ouverture est dans 2 jours, vous pouvez régler ça maintenant ?" },
      { en: "I need this fixed before the client walkthrough this afternoon, how long will it take?", fr: "J'ai besoin que ce soit réglé avant la visite du client cet après-midi, ça va prendre combien de temps ?" },
      { en: "There's a reflection on the showcase glass, it's distracting. Can we solve that today?", fr: "Il y a un reflet sur le verre de la vitrine, c'est gênant. On peut régler ça aujourd'hui ?" },
    ],
  },
  full_day: {
    title: "Parcours complet (Jour J-2)",
    icon: "🗓️",
    context: "",
    who: "",
    voice: "en-GB-SoniaNeural",
    openingLines: [],
    parts: [
      { scenarioKey: "customs" },
      { scenarioKey: "electrician", transition: "Plus tard dans la journée, sur le chantier..." },
      { scenarioKey: "manager", transition: "En fin de journée, en boutique..." },
    ],
  },
}
