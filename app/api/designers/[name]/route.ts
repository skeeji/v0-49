import { NextResponse } from "next/server"
import clientPromise from "../../../../lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE

if (!DBNAME) {
  throw new Error('Invalid/Missing environment variable: "MONGO_INITDB_DATABASE"')
}

// Gérer les requêtes GET pour récupérer un designer par nom
export async function GET(request: Request, { params }: { params: { name: string } }) {
  try {
    const client = await clientPromise
    const db = client.db(DBNAME)

    const decodedName = decodeURIComponent(params.name)
    const designer = await db.collection("designers").findOne({ nom: decodedName })

    if (!designer) {
      return NextResponse.json({ success: false, error: "Designer non trouvé" }, { status: 404 })
    }

    // Récupérer aussi les luminaires de ce designer
    const luminaires = await db.collection("luminaires").find({ designer: decodedName }).toArray()

    return NextResponse.json(
      {
        success: true,
        data: {
          designer,
          luminaires,
        },
      },
      { status: 200 },
    )
  } catch (error) {
    console.error(error)
    return NextResponse.json({ success: false, error: "Server Error" }, { status: 500 })
  }
}
