// Script pour analyser la structure du CSV et identifier les bonnes clés
const csvUrl =
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/tu%20es%20sur%20de%20chaque%20key%20_%20peux%20tu%20me%20faire%20un%20pro...%20-%20tu%20es%20sur%20de%20chaque%20key%20_%20peux%20tu%20me%20faire%20un%20pro...-zs9u1giVDVjSUTjqroF11RdlPFYCcs.csv"

async function analyzeCsvStructure() {
  try {
    console.log("📊 Analyse de la structure CSV...")

    const response = await fetch(csvUrl)
    const csvText = await response.text()

    // Parser le CSV
    const lines = csvText.split("\n")
    const headers = lines[0].split(",").map((h) => h.replace(/"/g, "").trim())

    console.log("📋 En-têtes trouvés dans le CSV:")
    headers.forEach((header, index) => {
      console.log(`${index + 1}. "${header}"`)
    })

    // Analyser quelques lignes de données pour comprendre la structure
    console.log("\n📝 Exemple de données (première ligne):")
    if (lines[1]) {
      const firstDataLine = lines[1].split(",").map((cell) => cell.replace(/"/g, "").trim())
      headers.forEach((header, index) => {
        console.log(`${header}: "${firstDataLine[index] || ""}"`)
      })
    }

    // Mapping suggéré basé sur l'analyse
    const suggestedMapping = {
      "Libellé Utilisateur": headers,
      "Clé pour l'Import CSV (En-tête)": headers,
      "Clé pour le Formulaire (formData)": headers.map((h) =>
        h
          .toLowerCase()
          .replace(/[àáâãäå]/g, "a")
          .replace(/[èéêë]/g, "e")
          .replace(/[ìíîï]/g, "i")
          .replace(/[òóôõö]/g, "o")
          .replace(/[ùúûü]/g, "u")
          .replace(/[ç]/g, "c")
          .replace(/[^a-z0-9]/g, "")
          .replace(/\s+/g, ""),
      ),
    }

    console.log("\n🔑 Mapping suggéré:")
    console.log(JSON.stringify(suggestedMapping, null, 2))

    return { headers, suggestedMapping }
  } catch (error) {
    console.error("❌ Erreur lors de l'analyse:", error)
  }
}

// Exécuter l'analyse
analyzeCsvStructure()
