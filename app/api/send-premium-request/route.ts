import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { nom, prenom, email, telephone, duree, message } = await request.json()

    // Validation des données
    if (!nom || !prenom || !email || !telephone || !duree) {
      return NextResponse.json({ error: "Tous les champs sont requis" }, { status: 400 })
    }

    // Configuration de l'email avec Resend
    const emailData = {
      from: "noreply@send.resend.dev", // Utilisation du domaine par défaut de Resend
      to: "paul.quentin1@gmail.com",
      subject: `Nouvelle demande d'abonnement Premium - ${prenom} ${nom}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #f2d895; border-bottom: 2px solid #f2d895; padding-bottom: 10px;">
            Nouvelle demande d'abonnement Premium
          </h2>
          
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Informations du client :</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Nom :</td>
                <td style="padding: 8px 0;">${nom}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Prénom :</td>
                <td style="padding: 8px 0;">${prenom}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Email :</td>
                <td style="padding: 8px 0;"><a href="mailto:${email}" style="color: #f2d895;">${email}</a></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Téléphone :</td>
                <td style="padding: 8px 0;"><a href="tel:${telephone}" style="color: #f2d895;">${telephone}</a></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Durée souhaitée :</td>
                <td style="padding: 8px 0; font-weight: bold; color: #f2d895;">${duree}</td>
              </tr>
            </table>
          </div>

          <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <h3 style="color: #333; margin-top: 0;">Message du client :</h3>
            <p style="line-height: 1.6; color: #666;">${message}</p>
          </div>

          <div style="margin-top: 30px; padding: 15px; background-color: #f0f0f0; border-radius: 8px; text-align: center;">
            <p style="margin: 0; color: #888; font-size: 14px;">
              Email envoyé automatiquement depuis le site Luminaires Gallery
            </p>
            <p style="margin: 5px 0 0 0; color: #888; font-size: 12px;">
              Date : ${new Date().toLocaleString("fr-FR")}
            </p>
          </div>
        </div>
      `,
      text: `
        Nouvelle demande d'abonnement Premium
        
        Informations du client :
        - Nom : ${nom}
        - Prénom : ${prenom}
        - Email : ${email}
        - Téléphone : ${telephone}
        - Durée souhaitée : ${duree}
        
        Message :
        ${message}
        
        Date : ${new Date().toLocaleString("fr-FR")}
      `,
    }

    // Vérification de la clé API Resend
    const apiKey = process.env.RESEND_API_KEY || "re_cc542KY5_7eEEa8TNMR5tMxyBTu6gyfcM"

    if (!apiKey) {
      console.error("RESEND_API_KEY non configurée")
      return NextResponse.json({ error: "Configuration email manquante" }, { status: 500 })
    }

    console.log("Tentative d'envoi d'email avec Resend...")
    console.log("Destinataire:", emailData.to)
    console.log("Expéditeur:", emailData.from)

    // Envoi avec Resend
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailData),
    })

    const responseText = await resendResponse.text()
    console.log("Réponse Resend (status):", resendResponse.status)
    console.log("Réponse Resend (body):", responseText)

    if (!resendResponse.ok) {
      let errorData
      try {
        errorData = JSON.parse(responseText)
      } catch {
        errorData = { message: responseText }
      }

      console.error("Erreur Resend:", errorData)
      return NextResponse.json(
        {
          error: "Erreur lors de l'envoi de l'email",
          details: errorData,
          status: resendResponse.status,
        },
        { status: 500 },
      )
    }

    let result
    try {
      result = JSON.parse(responseText)
    } catch {
      result = { message: "Email envoyé mais réponse non parsable" }
    }

    console.log("Email envoyé avec succès via Resend:", result)

    return NextResponse.json({
      success: true,
      message: "Demande envoyée avec succès",
      emailId: result.id || "unknown",
      debug: {
        apiKeyUsed: apiKey.substring(0, 10) + "...",
        responseStatus: resendResponse.status,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("Erreur complète lors de l'envoi de l'email:", error)
    console.error("Stack trace:", error.stack)

    return NextResponse.json(
      {
        error: "Erreur lors de l'envoi de l'email",
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
