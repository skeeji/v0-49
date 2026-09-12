// Phrasebook "Linking words" (connecteurs logiques) — enchaîner deux idées à
// l'oral (cause, conséquence, opposition...) casse presque autant que les
// chiffres en anglais courant, alors que ça revient sans arrêt dès qu'on
// explique un problème ou une décision sur le chantier. Toujours en contexte
// (jamais le connecteur isolé) pour s'entraîner à le placer dans une vraie
// phrase. Même mécanique que numbers-data.ts (fr/en/tip + progression
// partagée via /api/progress, préfixe d'id dédié "lw-").

export type LinkingWordCategory = "ADD" | "CONTRAST" | "CAUSE" | "CONSEQ" | "SEQ" | "EXAMPLE"

export interface LinkingWordPhrase {
  id: string
  fr: string
  en: string
  tip: string
  cat: LinkingWordCategory
}

export const LINKING_WORD_CAT_LABELS: Record<LinkingWordCategory, string> = {
  ADD: "Ajouter une idée",
  CONTRAST: "Opposer / nuancer",
  CAUSE: "Expliquer une cause",
  CONSEQ: "Donner une conséquence",
  SEQ: "Ordonner les étapes",
  EXAMPLE: "Exemple & conclusion",
}

export const LINKING_WORD_CAT_CONTEXT: Record<LinkingWordCategory, string> = {
  ADD: "Adding an extra point while discussing lighting work on a commissioning site in Dubai",
  CONTRAST: "Contrasting or nuancing two points while discussing lighting work on a commissioning site in Dubai",
  CAUSE: "Explaining the cause of a problem or decision on a lighting commissioning site in Dubai",
  CONSEQ: "Explaining the consequence of a problem or decision on a lighting commissioning site in Dubai",
  SEQ: "Describing the steps of a task in order on a lighting commissioning site in Dubai",
  EXAMPLE: "Giving an example or wrapping up a point while discussing lighting work on a commissioning site in Dubai",
}

export const LINKING_WORD_PHRASES: LinkingWordPhrase[] = [
  // --- Ajouter une idée ---
  { id: "lw-1", fr: "En plus, il faut vérifier le câblage", en: "Moreover, we need to check the wiring", tip: '"MOR-oh-ver, wee need too chek ze WY-ring"', cat: "ADD" },
  { id: "lw-2", fr: "De plus, la boutique ouvre dans 2 semaines", en: "Furthermore, the shop opens in 2 weeks", tip: '"FER-ther-mor, ze shop OH-penz in too weeks"', cat: "ADD" },
  { id: "lw-3", fr: "En plus de ça, le driver est défectueux", en: "In addition, the driver is faulty", tip: '"in uh-DISH-un, ze DRY-ver iz FAWL-tee"', cat: "ADD" },
  { id: "lw-4", fr: "Il faut aussi vérifier l'adressage", en: "We also need to check the addressing", tip: '"wee AWL-soh need too chek zi uh-DRESS-ing"', cat: "ADD" },
  { id: "lw-5", fr: "Le client veut aussi changer la température de couleur", en: "The client also wants to change the color temperature", tip: '"ze KLY-ent AWL-soh wants too chaynj ze KUL-er TEM-pruh-cher"', cat: "ADD" },
  { id: "lw-6", fr: "En plus du scintillement, il y a un bruit", en: "Besides the flickering, there's a noise", tip: '"bi-SYDZ ze FLIK-er-ing, thairz uh noyz"', cat: "ADD" },

  // --- Opposer / nuancer ---
  { id: "lw-7", fr: "Cependant, le niveau de lux est trop bas", en: "However, the lux level is too low", tip: '"haow-EV-er, ze luks LEV-ul iz too loh"', cat: "CONTRAST" },
  { id: "lw-8", fr: "D'un autre côté, le client préfère plus chaud", en: "On the other hand, the client prefers it warmer", tip: '"on zi UH-ther hand, ze KLY-ent pri-FERZ it WAR-mer"', cat: "CONTRAST" },
  { id: "lw-9", fr: "Bien que le driver soit neuf, il scintille", en: "Although the driver is new, it flickers", tip: '"awl-THOH ze DRY-ver iz nyoo, it FLIK-erz"', cat: "CONTRAST" },
  { id: "lw-10", fr: "Même si c'est réglé, ça éblouit encore", en: "Even though it's adjusted, it still glares", tip: '"EE-vun thoh its uh-JUS-ted, it stil glairz"', cat: "CONTRAST" },
  { id: "lw-11", fr: "Cette vitrine est sombre, alors que celle-là est trop lumineuse", en: "This window is dark, whereas that one is too bright", tip: '"this WIN-doh iz dark, wair-AZ that wun iz too bryt"', cat: "CONTRAST" },
  { id: "lw-12", fr: "Néanmoins, on doit finir aujourd'hui", en: "Nevertheless, we have to finish today", tip: '"nev-er-ze-LESS, wee hav too FIN-ish tuh-DAY"', cat: "CONTRAST" },

  // --- Expliquer une cause ---
  { id: "lw-13", fr: "Ça scintille parce que le driver est défectueux", en: "It flickers because the driver is faulty", tip: '"it FLIK-erz bi-KUZ ze DRY-ver iz FAWL-tee"', cat: "CAUSE" },
  { id: "lw-14", fr: "Puisque le client est pressé, on commence maintenant", en: "Since the client is in a hurry, we're starting now", tip: '"sins ze KLY-ent iz in uh HUR-ee, weer STAR-ting naow"', cat: "CAUSE" },
  { id: "lw-15", fr: "Comme il fait chaud, on prend une pause", en: "As it's hot, we're taking a break", tip: '"az its hot, weer TAY-king uh brayk"', cat: "CAUSE" },
  { id: "lw-16", fr: "En raison d'un retard de livraison, on ouvre plus tard", en: "Due to a delivery delay, we're opening later", tip: '"dyoo too uh di-LIV-er-ee di-LAY, weer OH-pen-ing LAY-ter"', cat: "CAUSE" },
  { id: "lw-17", fr: "À cause du court-circuit, le circuit est coupé", en: "Because of the short circuit, the circuit is cut off", tip: '"bi-KUZ uv ze short SER-kit, ze SER-kit iz kut awf"', cat: "CAUSE" },

  // --- Donner une conséquence ---
  { id: "lw-18", fr: "Le driver est cassé, donc on doit le remplacer", en: "The driver is broken, so we need to replace it", tip: '"ze DRY-ver iz BROH-kun, soh wee need too ri-PLAYS it"', cat: "CONSEQ" },
  { id: "lw-19", fr: "Le niveau était trop bas, on a donc augmenté l'intensité", en: "The level was too low, therefore we increased the intensity", tip: '"ze LEV-ul wuz too loh, THAIR-for wee in-KREEST zi in-TEN-si-tee"', cat: "CONSEQ" },
  { id: "lw-20", fr: "Il y avait un court-circuit ; par conséquent, tout s'est éteint", en: "There was a short circuit; as a result, everything went off", tip: '"thair wuz uh short SER-kit; az uh ri-ZULT, EV-ree-thing went awf"', cat: "CONSEQ" },
  { id: "lw-21", fr: "C'est pour ça qu'on a changé le driver", en: "That's why we changed the driver", tip: '"thats wy wee chaynjd ze DRY-ver"', cat: "CONSEQ" },
  { id: "lw-22", fr: "Par conséquent, la boutique ouvrira à l'heure", en: "Consequently, the shop will open on time", tip: '"KON-si-kwent-lee, ze shop wil OH-pen on tym"', cat: "CONSEQ" },

  // --- Ordonner les étapes ---
  { id: "lw-23", fr: "D'abord, on vérifie l'adressage", en: "First of all, we check the addressing", tip: '"first uv awl, wee chek zi uh-DRESS-ing"', cat: "SEQ" },
  { id: "lw-24", fr: "Ensuite, on règle l'intensité", en: "Then, we adjust the intensity", tip: '"then, wee uh-JUST zi in-TEN-si-tee"', cat: "SEQ" },
  { id: "lw-25", fr: "Après ça, on teste le scintillement", en: "After that, we test for flickering", tip: '"AF-ter that, wee test for FLIK-er-ing"', cat: "SEQ" },
  { id: "lw-26", fr: "Enfin, on ferme le boîtier", en: "Finally, we close the housing", tip: '"FY-nuh-lee, wee klohz ze HOW-zing"', cat: "SEQ" },
  { id: "lw-27", fr: "Pendant ce temps, le client attend dans le hall", en: "Meanwhile, the client is waiting in the lobby", tip: '"MEEN-wyl, ze KLY-ent iz WAY-ting in ze LOB-ee"', cat: "SEQ" },

  // --- Exemple & conclusion ---
  { id: "lw-28", fr: "Par exemple, cette vitrine a besoin de plus de lux", en: "For example, this window needs more lux", tip: '"for ig-ZAM-pul, this WIN-doh needz mor luks"', cat: "EXAMPLE" },
  { id: "lw-29", fr: "En fait, le problème vient du driver", en: "In fact, the problem comes from the driver", tip: '"in fakt, ze PROB-lem kumz from ze DRY-ver"', cat: "EXAMPLE" },
  { id: "lw-30", fr: "Autrement dit, il faut tout recommencer", en: "In other words, we need to start over", tip: '"in UH-ther werdz, wee need too start OH-ver"', cat: "EXAMPLE" },
  { id: "lw-31", fr: "Pour résumer, tout fonctionne correctement", en: "To sum up, everything is working properly", tip: '"too sum up, EV-ree-thing iz WER-king PROP-er-lee"', cat: "EXAMPLE" },
  { id: "lw-32", fr: "En conclusion, le chantier est prêt pour l'ouverture", en: "In conclusion, the site is ready for the opening", tip: '"in kun-KLOO-zhun, ze syt iz RED-ee for zi OH-pen-ing"', cat: "EXAMPLE" },
]
