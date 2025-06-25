// Fichier : app/api/settings/route.ts
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

const DBNAME = "gersaint";

export async function GET() {
    try {
        const client = await clientPromise;
        const db = client.db(DBNAME);

        const videoSetting = await db.collection("settings").findOne({ key: "welcomeVideoId" });
        
        return NextResponse.json({ success: true, settings: videoSetting });
    } catch (error) {
        console.error("❌ Erreur API /api/settings GET:", error);
        return NextResponse.json({ success: false, error: "Erreur serveur." }, { status: 500 });
    }
}
