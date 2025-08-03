import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/app/lib/db"
import { Luminaires } from "@/app/models/luminaires"

export async function GET(request: NextRequest) {
  const { searchParams } = request
  const designer = searchParams.get("designer")
  const query: any = {}

  // Filtre par designer
  if (designer) {
    query.$or = [
      { designer: { $regex: designer, $options: "i" } },
      { "Artiste / Dates": { $regex: designer, $options: "i" } },
    ]
  }

  try {
    await connectToDatabase()
    const luminaires = await Luminaires.find(query)
    return NextResponse.json(luminaires)
  } catch (error) {
    console.error("Error fetching luminaires:", error)
    return NextResponse.error("Internal Server Error", 500)
  }
}
