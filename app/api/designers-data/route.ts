import { type NextRequest, NextResponse } from "next/server"

// Simulation d'une base de données
const designersData = [
  {
    Nom: "Ingo Maurer",
    imagedesigner: "ingo_maurer.jpg",
  },
  {
    Nom: "Achille Castiglioni",
    imagedesigner: "achille_castiglioni.jpg",
  },
  {
    Nom: "Eileen Gray",
    imagedesigner: "eileen_gray.jpg",
  },
  {
    Nom: "Serge Mouille",
    imagedesigner: "serge_mouille.jpg",
  },
  {
    Nom: "Gino Sarfatti",
    imagedesigner: "gino_sarfatti.jpg",
  },
  {
    Nom: "Poul Henningsen",
    imagedesigner: "poul_henningsen.jpg",
  },
  {
    Nom: "Isamu Noguchi",
    imagedesigner: "isamu_noguchi.jpg",
  },
  {
    Nom: "Hans Wegner",
    imagedesigner: "hans_wegner.jpg",
  },
  {
    Nom: "Verner Panton",
    imagedesigner: "verner_panton.jpg",
  },
  {
    Nom: "Joe Colombo",
    imagedesigner: "joe_colombo.jpg",
  },
]

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 API GET /api/designers-data appelée")

    return NextResponse.json({
      success: true,
      designers: designersData,
      total: designersData.length,
    })
  } catch (error: any) {
    console.error("❌ Erreur dans GET /api/designers-data:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur serveur",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
