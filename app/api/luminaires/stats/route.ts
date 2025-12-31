import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

function extractYear(yearString: string | number): number | null {
  if (typeof yearString === "number") {
    return yearString
  }

  if (!yearString) return null

  const str = String(yearString).trim()
  const matches = str.match(/\b(1[0-9]{3}|20[0-9]{2})\b/g)

  if (matches && matches.length > 0) {
    return Number.parseInt(matches[0], 10)
  }

  return null
}

export async function GET(request: NextRequest) {
  try {
    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")

    // Get total count
    const totalCount = await collection.countDocuments()

    // Get year range using aggregation
    const pipeline = [
      {
        $addFields: {
          extractedYear: {
            $let: {
              vars: {
                yearField: {
                  $ifNull: ["$annee", { $ifNull: ["$Année", { $ifNull: ["$year", ""] }] }],
                },
              },
              in: {
                $cond: {
                  if: { $eq: [{ $type: "$$yearField" }, "number"] },
                  then: "$$yearField",
                  else: {
                    $let: {
                      vars: {
                        match: {
                          $regexFind: { input: { $toString: "$$yearField" }, regex: "\\b(1[0-9]{3}|20[0-9]{2})\\b" },
                        },
                      },
                      in: {
                        $cond: {
                          if: { $ne: ["$$match", null] },
                          then: { $toInt: "$$match.match" },
                          else: null,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      {
        $match: {
          extractedYear: { $ne: null },
        },
      },
      {
        $group: {
          _id: null,
          minYear: { $min: "$extractedYear" },
          maxYear: { $max: "$extractedYear" },
        },
      },
    ]

    const result = await collection.aggregate(pipeline).toArray()

    const yearRange = result.length > 0 ? { min: result[0].minYear, max: result[0].maxYear } : { min: 1900, max: 2024 }

    return NextResponse.json({
      success: true,
      data: {
        totalCount,
        yearRange,
      },
    })
  } catch (error: any) {
    console.error("Error fetching luminaires stats:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Error fetching stats",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
