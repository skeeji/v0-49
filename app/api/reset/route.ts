import { type NextRequest, NextResponse } from "next/server"

// Simulation des bases de données
const luminaires: any[] = []
const designers: any[] = []
const welcomeVideos: any[] = []

export async function DELETE(request: NextRequest) {
  try {
    console.log("🗑️ Début de la réinitialisation complète du serveur...")

    // Supprimer toutes les données simulées
    luminaires.length = 0
    designers.length = 0
    welcomeVideos.length = 0

    console.log("✅ Réinitialisation complète terminée")

    return NextResponse.json({
      success: true,
      message: "Serveur réinitialisé avec succès",
      details: {
        collections: 3,
        files: "Tous les fichiers supprimés",
      },
    })
  } catch (error: any) {
    console.error("❌ Erreur lors de la réinitialisation:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de la réinitialisation",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
