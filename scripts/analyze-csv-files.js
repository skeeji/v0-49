// Analyser les fichiers CSV fournis
async function analyzeCSVFiles() {
  console.log("🔍 Analyse des fichiers CSV...")

  // Analyser le fichier DESIGNER.csv
  try {
    const designerResponse = await fetch(
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/DESIGNER-VGpyNVQ0qaGiggwG6DKwgKKd0kRR2A.csv",
    )
    const designerContent = await designerResponse.text()

    console.log("📊 DESIGNER.csv - Premières lignes:")
    console.log(designerContent.split("\n").slice(0, 5).join("\n"))

    const designerLines = designerContent.split("\n").filter((line) => line.trim())
    console.log(`📊 DESIGNER.csv - ${designerLines.length} lignes total`)
  } catch (error) {
    console.error("❌ Erreur lecture DESIGNER.csv:", error)
  }

  // Analyser le fichier luminaire_data corrigé2.csv
  try {
    const luminaireResponse = await fetch(
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/luminaire_data%20corrig%C3%A92-fS9wK4mDl5Zkv5Nwv5XCqsm9nAFoeM.csv",
    )
    const luminaireContent = await luminaireResponse.text()

    console.log("📊 luminaire_data corrigé2.csv - Premières lignes:")
    console.log(luminaireContent.split("\n").slice(0, 5).join("\n"))

    const luminaireLines = luminaireContent.split("\n").filter((line) => line.trim())
    console.log(`📊 luminaire_data corrigé2.csv - ${luminaireLines.length} lignes total`)
  } catch (error) {
    console.error("❌ Erreur lecture luminaire_data corrigé2.csv:", error)
  }
}

analyzeCSVFiles()
