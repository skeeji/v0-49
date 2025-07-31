import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("📧 Début de l'envoi d'email Premium...")

    const body = await request.json()
    const { nom, prenom, email, telephone, duree, message } = body

    console.log("📋 Données reçues:", { nom, prenom, email, telephone, duree })

    // Validation des données
    if (!nom || !prenom || !email || !telephone || !duree) {
      return NextResponse.json({ success: false, error: "Tous les champs sont requis" }, { status: 400 })
    }

    // Import dynamique de Resend
    const { Resend } = await import("resend")
    const resend = new Resend("re_cc542KY5_7eEEa8TNMR5tMxyBTu6gyfcM")

    console.log("🔑 Resend initialisé avec la clé API")

    // Contenu HTML de l'email
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Demande d'abonnement Premium</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f97316, #ea580c); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
            .field { margin-bottom: 15px; }
            .label { font-weight: bold; color: #f97316; }
            .value { margin-left: 10px; }
            .message { background: white; padding: 15px; border-left: 4px solid #f97316; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎯 Nouvelle demande d'abonnement Premium</h1>
            </div>
            <div class="content">
              <div class="field">
                <span class="label">👤 Nom :</span>
                <span class="value">${nom}</span>
              </div>
              <div class="field">
                <span class="label">👤 Prénom :</span>
                <span class="value">${prenom}</span>
              </div>
              <div class="field">
                <span class="label">📧 Email :</span>
                <span class="value">${email}</span>
              </div>
              <div class="field">
                <span class="label">📞 Téléphone :</span>
                <span class="value">${telephone}</span>
              </div>
              <div class="field">
                <span class="label">⏰ Durée souhaitée :</span>
                <span class="value">${duree}</span>
              </div>
              <div class="message">
                <h3>💬 Message :</h3>
                <p>${message}</p>
              </div>
              <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
              <p style="font-size: 12px; color: #666;">
                📅 Demande reçue le ${new Date().toLocaleString("fr-FR")}
              </p>
            </div>
          </div>
        </body>
      </html>
    `

    // Envoi de l'email via Resend
    console.log("📤 Envoi de l'email via Resend...")

    const emailResult = await resend.emails.send({
      from: "Galerie Luminaires <noreply@resend.dev>",
      to: ["paul.quentin1@gmail.com"],
      subject: `🎯 Demande Premium - ${prenom} ${nom} (${duree})`,
      html: htmlContent,
      text: `
Nouvelle demande d'abonnement Premium

Nom: ${nom}
Prénom: ${prenom}
Email: ${email}
Téléphone: ${telephone}
Durée: ${duree}

Message:
${message}

Demande reçue le ${new Date().toLocaleString("fr-FR")}
      `,
    })

    console.log("✅ Email envoyé avec succès via Resend:", emailResult)

    return NextResponse.json({
      success: true,
      message: "Demande envoyée avec succès !",
      emailId: emailResult.data?.id,
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
