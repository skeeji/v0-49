import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"
const ALERT_EMAIL = "contact@gersaintparis.fr"

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get("secret")
    if (secret !== process.env.CRON_SECRET && process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("crm")

    // Get today's date string (YYYY-MM-DD)
    const today = new Date()
    const todayStr = today.toISOString().substring(0, 10)

    // Find all active projects
    const activeStatuses = ["En negociation", "Devis envoye", "En cours"]
    const projects = await collection
      .find({ status: { $in: activeStatuses } })
      .toArray()

    // Collect projects with deadlines matching today
    interface AlertItem {
      projectName: string
      actions: string[]
    }

    const alertItems: AlertItem[] = []

    for (const project of projects) {
      const matchingActions: string[] = []

      // Check project deadline
      if (project.deadline && project.deadline.substring(0, 10) === todayStr) {
        matchingActions.push("ECHEANCE DU PROJET")
      }

      // Check action due dates
      if (project.actions && Array.isArray(project.actions)) {
        for (const action of project.actions) {
          if (!action.done && action.dueDate && action.dueDate.substring(0, 10) === todayStr) {
            matchingActions.push(action.text)
          }
        }
      }

      if (matchingActions.length > 0) {
        alertItems.push({
          projectName: project.name,
          actions: matchingActions,
        })
      }
    }

    // No alerts for today
    if (alertItems.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Aucune echeance pour aujourd'hui",
        date: todayStr,
      })
    }

    // Build email HTML
    const emailHtml = `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <div style="background-color: #f5f1e8; padding: 30px; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #8b7355; font-size: 22px; margin: 0;">Gersaint Paris - CRM</h1>
            <p style="color: #999; font-size: 13px; margin-top: 6px;">
              Echeances du ${today.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          
          <div style="background: white; border-radius: 10px; overflow: hidden; border: 1px solid #e5e1d8;">
            ${alertItems
              .map(
                (item) => `
              <div style="padding: 18px 20px; border-bottom: 1px solid #f0ece4;">
                <h3 style="margin: 0 0 10px 0; color: #1a1a1a; font-size: 16px;">${item.projectName}</h3>
                ${item.actions
                  .map(
                    (action) => `
                  <div style="display: flex; align-items: center; gap: 8px; padding: 4px 0;">
                    <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background-color: #8b7355; flex-shrink: 0;"></span>
                    <span style="font-size: 14px; color: #555;">${action}</span>
                  </div>
                `
                  )
                  .join("")}
              </div>
            `
              )
              .join("")}
          </div>
          
          <div style="text-align: center; margin-top: 20px;">
            <p style="font-size: 12px; color: #aaa; margin: 0;">
              Email automatique - Gersaint Paris CRM
            </p>
          </div>
        </div>
      </div>
    `

    const emailText = alertItems
      .map((item) => `${item.projectName}:\n${item.actions.map((a) => `  - ${a}`).join("\n")}`)
      .join("\n\n")

    // Send email via Resend
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "RESEND_API_KEY non configuree" },
        { status: 500 }
      )
    }

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "contact@gersaintparis.com",
        to: ALERT_EMAIL,
        subject: `[CRM] Echeances du ${today.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} - ${alertItems.length} projet${alertItems.length > 1 ? "s" : ""}`,
        html: emailHtml,
        text: emailText,
      }),
    })

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text()
      console.error("Resend error:", errorText)
      return NextResponse.json(
        { success: false, error: "Erreur envoi email", details: errorText },
        { status: 500 }
      )
    }

    const result = await resendResponse.json()

    return NextResponse.json({
      success: true,
      message: `Email envoye avec ${alertItems.length} echeance(s)`,
      date: todayStr,
      emailId: result.id,
      alertItems,
    })
  } catch (error: any) {
    console.error("Erreur daily alert:", error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
