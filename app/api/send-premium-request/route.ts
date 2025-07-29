import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { nom, prenom, email, telephone, duree, message } = await request.json()

    // Ici vous pouvez intégrer votre service d'email préféré
    // Pour l'exemple, je simule l'envoi d'email

    const emailContent = `
      Nouvelle demande d'abonnement Premium
      
      Nom: ${nom}
      Prénom: ${prenom}
      Email: ${email}
      Téléphone: ${telephone}
      Durée: ${duree}
      
      Message:
      ${message}
    `

    // Simulation d'envoi d'email
    console.log("Email à envoyer à paul.quentin1@gmail.com:")
    console.log(emailContent)

    // Vous pouvez remplacer cette partie par votre service d'email
    // Exemple avec Nodemailer, SendGrid, etc.

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erreur lors de l'envoi:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
