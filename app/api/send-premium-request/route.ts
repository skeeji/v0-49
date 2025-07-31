import { type NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    console.log("📧 API /api/send-premium-request - Début de la requête")

    const body = await request.json()
    const { name, email, message } = body

    console.log("📋 Données reçues:", { name, email, message: message?.substring(0, 100) + "..." })

    if (!name || !email || !message) {
      console.log("❌ Données manquantes")
      return NextResponse.json({ success: false, error: "Données manquantes" }, { status: 400 })
    }

    console.log("📤 Envoi de l'email via Resend...")
    console.log("📧 Expéditeur: contact@gersaintparis.com")
    console.log("📧 Destinataire: paul.quentin1@gmail.com")

    const emailData = await resend.emails.send({
      from: "contact@gersaintparis.com",
      to: "paul.quentin1@gmail.com",
      subject: `Demande Premium - ${name}`,
      html: `
        <h2>Nouvelle demande de compte Premium</h2>
        <p><strong>Nom:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, "<br>")}</p>
        <hr>
        <p><em>Email envoyé automatiquement depuis gersaintparis.com</em></p>
      `,
    })

    console.log("✅ Email envoyé avec succès:", emailData)

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
