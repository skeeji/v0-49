import { type NextRequest, NextResponse } from "next/server"
import nodemailer from "nodemailer"

export async function POST(request: NextRequest) {
  try {
    const { nom, prenom, email, telephone, duree, message } = await request.json()

    // Validation des données
    if (!nom || !prenom || !email || !telephone || !duree) {
      return NextResponse.json({ error: "Tous les champs sont requis" }, { status: 400 })
    }

    // Configuration du transporteur Gmail
    const transporter = nodemailer.createTransporter({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    })

    // Configuration de l'email
    const mailOptions = {
      from: process.env.GMAIL_USER,
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

    // Envoi de l'email
    const info = await transporter.sendMail(mailOptions)

    console.log("Email envoyé avec succès:", info.messageId)
    console.log("Aperçu:", nodemailer.getTestMessageUrl(info))

    return NextResponse.json({
      success: true,
      message: "Demande envoyée avec succès",
      messageId: info.messageId,
    })
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'email:", error)

    return NextResponse.json(
      {
        error: "Erreur lors de l'envoi de l'email",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
