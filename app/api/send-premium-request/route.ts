import { type NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    console.log("📧 API /api/send-premium-request - Début de la requête")

    const body = await request.json()
    const { name, email, company, message } = body

    console.log("📋 Données reçues:", { name, email, company, message })

    if (!name || !email) {
      console.log("❌ Données manquantes")
      return NextResponse.json({ success: false, error: "Nom et email requis" }, { status: 400 })
    }

    // Vérifier que la clé API Resend est configurée
    if (!process.env.RESEND_API_KEY) {
      console.error("❌ RESEND_API_KEY non configurée")
      return NextResponse.json({ success: false, error: "Configuration email manquante" }, { status: 500 })
    }

    console.log("📤 Envoi de l'email via Resend depuis contact@gersaintparis.com...")

    // Envoyer l'email via Resend
    const emailData = await resend.emails.send({
      from: "contact@gersaintparis.com",
      to: "paul.quentin1@gmail.com",
      subject: `Nouvelle demande Premium - ${name}`,
      html: `
        <h2>Nouvelle demande d'accès Premium</h2>
        <p><strong>Nom:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Entreprise:</strong> ${company || "Non spécifiée"}</p>
        <p><strong>Message:</strong></p>
        <p>${message || "Aucun message"}</p>
        <hr>
        <p><em>Email envoyé automatiquement depuis gersaintparis.com</em></p>
      `,
    })

    console.log("✅ Email envoyé avec succès via Resend:", emailData)

    return NextResponse.json({
      success: true,
      message: "Demande envoyée avec succès",
      emailId: emailData.data?.id,
    })
  } catch (error: any) {
    console.error("❌ Erreur lors de l'envoi de l'email:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de l'envoi de l'email",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
