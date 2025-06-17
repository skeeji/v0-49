const DBNAME = process.env.MONGO_INITDB_DATABASE!;

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(DBNAME);

    // Crée un luminaire de test unique à chaque fois
    const testLuminaire = {
      _id: new ObjectId(),
      nom: `Lampe de Test - ${new Date().getTime()}`,
      designer: "Debug Joe",
      annee: 2025,
      filename: "test-image.jpg",
      images: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Insère le luminaire de test
    await db.collection("luminaires").insertOne(testLuminaire);

    // Tente de le relire immédiatement
    const allLuminaires = await db.collection("luminaires").find({}).limit(5).toArray();

    return NextResponse.json({
      message: "TEST RÉUSSI : 1 luminaire a été créé.",
      dernier_cree: testLuminaire,
      premiers_luminaires_dans_la_db: allLuminaires,
    });

  } catch (error: any) {
    console.error("ERREUR DANS L'API DE TEST:", error);
    return NextResponse.json(
      { message: "TEST ÉCHOUÉ", error: error.message },
      { status: 500 }
    );
  }
}
```
