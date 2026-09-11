// Piste "Musique" dédiée aux phrases techniques précises du séjour Dubaï/Doha/Abu
// Dhabi (chantier DIOR) — demandées mot pour mot par l'utilisateur, complétées de
// quelques phrases utiles du même registre. Séparé de survival-data.ts (qui reste
// piloté par Flashcards + Phrases utiles) pour ne toucher qu'à l'onglet Musique,
// comme demandé.

export interface PrecisePhrase {
  id: string
  fr: string
  en: string
  tip: string
}

export const PRECISE_SITE_PHRASES: PrecisePhrase[] = [
  { id: "pp-1", fr: "Je viens pour faire les réglages des luminaires pour une boutique DIOR", en: "I'm here to adjust the lighting fixtures for a DIOR store", tip: '"eyem heer too uh-JUST ze LY-ting FIKS-cherz for a dee-OR stor"' },
  { id: "pp-2", fr: "Je reste 2 jours à Doha et 3 jours à Abu Dhabi", en: "I'm staying 2 days in Doha and 3 days in Abu Dhabi", tip: '"eyem STAY-ing too dayz in DOH-ha and three dayz in AH-boo DAH-bee"' },
  { id: "pp-3", fr: "Je suis très heureux de vous rencontrer", en: "I'm very happy to meet you", tip: '"eyem VER-ee HAP-ee too meet yoo"' },
  { id: "pp-4", fr: "Je vous prie de m'excuser, je ne parle pas très bien anglais, ne soyez pas surprise si je suis un peu direct...", en: "Please excuse me, I don't speak English very well, don't be surprised if I'm a bit direct...", tip: '"pleez ek-SKYOOZ mee eye dohnt speek ING-lish VER-ee wel"' },
  { id: "pp-5", fr: "L'ambiance de la pièce est bonne, qu'en pensez-vous ?", en: "The ambience of the room is good, what do you think?", tip: '"zi AM-bee-ens uv ze room iz gud wot doo yoo think"' },
  { id: "pp-6", fr: "Nous avons 4000 lux sur le comptoir", en: "We have 4000 lux on the counter", tip: '"wee hav for-TAOW-zund luks on ze KOWN-ter"' },
  { id: "pp-7", fr: "C'est une ambiance tamisée pour le coin spa", en: "It's a dimmed, soft ambience for the spa corner", tip: '"its a dimd AM-bee-ens for ze spa KOR-ner"' },
  { id: "pp-8", fr: "C'était le nombre de lux validé et prévu pour cet espace", en: "That was the lux level validated and planned for this space", tip: '"that woz ze luks LEV-ul VAL-i-day-tid and pland for this spays"' },
  { id: "pp-9", fr: "Je vais faire les réglages, tous les luminaires sont bien alimentés/allumés", en: "I'm going to do the settings, all the fixtures are powered and switched on", tip: '"eyem GOH-ing too doo ze SET-ingz awl ze FIKS-cherz ar POW-erd"' },
  { id: "pp-10", fr: "Nous allons régler l'intensité de lumière pour chaque scène", en: "We're going to adjust the light intensity for each scene", tip: '"weer GOH-ing too uh-JUST ze lyt in-TEN-si-tee for eech seen"' },
  { id: "pp-11", fr: "Le service de nettoyage travaille à quelle heure ?", en: "What time does the cleaning team work?", tip: '"wot tym duz ze KLEEN-ing teem work"' },
  { id: "pp-12", fr: "Je peux bouger les produits ?", en: "Can I move the products?", tip: '"kan eye moov ze PROD-ukts"' },
  { id: "pp-13", fr: "Souhaitez-vous une accentuation de lumière sur la malle ?", en: "Would you like an accent light on the trunk?", tip: '"wud yoo lyk an AK-sent lyt on ze trunk"' },
  { id: "pp-14", fr: "Cela vous convient ?", en: "Does that work for you?", tip: '"duz that work for yoo"' },
  { id: "pp-15", fr: "Je vais régler ce downlight", en: "I'm going to adjust this downlight", tip: '"eyem GOH-ing too uh-JUST this DAOWN-lyt"' },
  { id: "pp-16", fr: "L'objectif de ces pièces est d'avoir une ambiance lumineuse plus douce et agréable", en: "The goal for these rooms is to have a softer, more pleasant lighting ambience", tip: '"ze gohl for theez roomz iz too hav a SOF-ter mor PLEZ-ant LY-ting AM-bee-ens"' },
  { id: "pp-17", fr: "Pouvez-vous tourner le downlight sur la droite/gauche ?", en: "Can you turn the downlight to the right/left?", tip: '"kan yoo turn ze DAOWN-lyt too ze ryt / left"' },
  { id: "pp-18", fr: "Souhaitez-vous que j'enlève les nids d'abeille ?", en: "Would you like me to remove the honeycomb louvre?", tip: '"wud yoo lyk mee too ri-MOOV ze HUN-ee-kohm LOO-ver"' },
  { id: "pp-19", fr: "La seule solution est d'augmenter l'intensité des drivers, mais attention cela n'est que provisoire, nous pouvons perdre la garantie", en: "The only solution is to increase the driver output, but be careful, this is only temporary, we could lose the warranty", tip: '"zi OHN-lee suh-LOO-shun iz too in-KREES ze DRY-ver OWT-put"' },
  { id: "pp-20", fr: "Il faudrait commander des spots plus puissants et avec un diamètre plus grand, cela nécessitera d'agrandir les trous au plafond", en: "We'd need to order more powerful downlights with a bigger diameter, this will require enlarging the holes in the ceiling", tip: '"weed need too OR-der mor POW-er-ful DAOWN-lyts with a BIG-er dy-AM-i-ter"' },
  { id: "pp-21", fr: "Je pense que 2000 lux sur la caisse c'est bien", en: "I think 2000 lux on the till is good", tip: '"eye think too-TAOW-zund luks on ze til iz gud"' },
  { id: "pp-22", fr: "Comment vous sentez-vous dans cet espace ?", en: "How do you feel in this space?", tip: '"haow doo yoo feel in this spays"' },
  { id: "pp-23", fr: "L'objectif était de créer une différence entre les deux espaces, la vente de produits et la zone spa", en: "The goal was to create a difference between the two areas, the product sales area and the spa zone", tip: '"ze gohl woz too kree-AYT a DIF-rens bi-TWEEN ze too AIR-ee-uz"' },
  { id: "pp-24", fr: "Il n'y a pas d'ombre sur votre visage ?", en: "Is there no shadow on your face?", tip: '"iz thair noh SHAD-oh on yor fays"' },
  { id: "pp-25", fr: "Vous êtes à l'aise pour vous maquiller ?", en: "Are you comfortable applying makeup?", tip: '"ar yoo KUM-fter-bul uh-PLY-ing MAYK-up"' },
  { id: "pp-26", fr: "Voyez-vous bien les produits ?", en: "Can you see the products well?", tip: '"kan yoo see ze PROD-ukts wel"' },
  { id: "pp-27", fr: "Comment faites-vous pour baisser la luminosité de ce downlight ?", en: "How do you lower the brightness of this downlight?", tip: '"haow doo yoo LOH-er ze BRYT-nes uv this DAOWN-lyt"' },

  // --- Complément utile, même registre (chantier/boutique, précis) ---
  { id: "pp-28", fr: "Est-ce que cette scène vous convient mieux que la précédente ?", en: "Does this scene work better for you than the previous one?", tip: '"duz this seen work BET-er for yoo than ze PREE-vee-us wun"' },
  { id: "pp-29", fr: "Je vais dupliquer ce réglage sur les autres downlights", en: "I'll duplicate this setting on the other downlights", tip: '"eyel DOO-pli-kayt this SET-ing on zi UTH-er DAOWN-lyts"' },
  { id: "pp-30", fr: "Combien de lux souhaitez-vous sur cette table ?", en: "How many lux would you like on this table?", tip: '"haow MEN-ee luks wud yoo lyk on this TAY-bul"' },
  { id: "pp-31", fr: "On peut toujours revenir en arrière si ça ne convient pas", en: "We can always go back if it doesn't work", tip: '"wee kan AWL-wayz goh bak if it DUZ-unt work"' },
  { id: "pp-32", fr: "Je vais éteindre puis rallumer pour vérifier", en: "I'll switch it off then back on to check", tip: '"eyel swich it of then bak on too chek"' },
  { id: "pp-33", fr: "Ce spot est-il trop fort pour vous ?", en: "Is this spotlight too strong for you?", tip: '"iz this SPOT-lyt too strong for yoo"' },
  { id: "pp-34", fr: "Je reviens dans 5 minutes avec l'échelle", en: "I'll be back in 5 minutes with the ladder", tip: '"eyel bee bak in fyv MIN-its with ze LAD-er"' },
  { id: "pp-35", fr: "Est-ce que la couleur de lumière vous convient ?", en: "Does the light color suit you?", tip: '"duz ze lyt KUL-er soot yoo"' },
  { id: "pp-36", fr: "On garde ce réglage comme référence", en: "We'll keep this setting as a reference", tip: '"weel keep this SET-ing az a REF-rens"' },
  { id: "pp-37", fr: "Je valide ce réglage avec vous avant de passer au suivant", en: "I'll confirm this setting with you before moving to the next one", tip: '"eyel kun-FERM this SET-ing with yoo bi-FOR MOOV-ing too ze nekst wun"' },
  { id: "pp-38", fr: "C'est la première fois que je viens sur ce chantier", en: "This is my first time on this site", tip: '"this iz my ferst tym on this syt"' },
  { id: "pp-39", fr: "Je travaille pour une société spécialisée en éclairage", en: "I work for a company specialized in lighting", tip: '"eye work for a KUM-puh-nee SPESH-uh-lyzd in LY-ting"' },
  { id: "pp-40", fr: "N'hésitez pas à me dire si quelque chose ne vous convient pas", en: "Don't hesitate to tell me if something doesn't work for you", tip: '"dohnt HEZ-i-tayt too tel mee if SUM-thing DUZ-unt work for yoo"' },
]
