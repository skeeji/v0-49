import { NextRequest, NextResponse } from "next/server"
import { PDFDocument, rgb, StandardFonts, PDFName, PDFString } from "pdf-lib"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

// Couleurs du design Gersaint
const GOLD = { r: 200/255, g: 169/255, b: 110/255 }
const DARK = { r: 26/255, g: 26/255, b: 26/255 }
const GRAY = { r: 102/255, g: 102/255, b: 102/255 }

interface LuminaireItem {
  image_id: string
  nom?: string
  artiste?: string
  image_url?: string
  prix_manuel?: string
  puissance_manuelle?: string
}

interface PDFRequest {
  client_name: string
  items: LuminaireItem[]
}

// Fonction pour charger une image depuis une URL
async function loadImageFromUrl(url: string): Promise<ArrayBuffer | null> {
  try {
    const response = await fetch(url, { 
      headers: { 'Accept': 'image/*' },
    })
    if (!response.ok) return null
    return await response.arrayBuffer()
  } catch {
    return null
  }
}

// Fonction pour nettoyer le texte pour PDF (remplacer caracteres non-ASCII)
function cleanTextForPdf(text: string | undefined | null): string {
  if (!text) return ""
  return String(text)
    .replace(/[éèêë]/g, 'e')
    .replace(/[àâä]/g, 'a')
    .replace(/[ùûü]/g, 'u')
    .replace(/[îï]/g, 'i')
    .replace(/[ôö]/g, 'o')
    .replace(/[ç]/g, 'c')
    .replace(/[œ]/g, 'oe')
    .replace(/[æ]/g, 'ae')
    .replace(/[ÉÈÊË]/g, 'E')
    .replace(/[ÀÂÄÆ]/g, 'A')
    .replace(/[ÙÛÜ]/g, 'U')
    .replace(/[ÎÏ]/g, 'I')
    .replace(/[ÔÖ]/g, 'O')
    .replace(/[Ç]/g, 'C')
    .replace(/[Œ]/g, 'OE')
    .replace(/[€]/g, 'EUR')
    .replace(/[•·]/g, '-')
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .replace(/[—–]/g, '-')
    .replace(/[…]/g, '...')
    .replace(/[^\x00-\x7F]/g, '')
}

// Fonction pour chercher un luminaire dans MongoDB par image_id
async function fetchLuminaireFromMongoDB(imageId: string): Promise<any | null> {
  console.log("[PDF] Searching MongoDB for:", imageId)
  
  try {
    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")
    
    // Essayer plusieurs champs possibles pour trouver le luminaire
    const searchQueries = [
      { filename: imageId },
      { "Nom du fichier": imageId },
      { "Image luminaire (Nom du fichier)": imageId },
      { image_principale: imageId },
      { imageId: imageId },
    ]
    
    // Aussi essayer avec regex case-insensitive
    const regexQueries = [
      { filename: { $regex: new RegExp(`^${imageId}$`, "i") } },
      { "Nom du fichier": { $regex: new RegExp(`^${imageId}$`, "i") } },
    ]
    
    // D'abord essayer les recherches exactes
    for (const query of searchQueries) {
      const result = await collection.findOne(query)
      if (result) {
        console.log("[PDF] FOUND luminaire:", result._id)
        console.log("[PDF] Fields:", Object.keys(result).join(", "))
        return result
      }
    }
    
    // Ensuite essayer avec regex
    for (const query of regexQueries) {
      const result = await collection.findOne(query)
      if (result) {
        console.log("[PDF] FOUND luminaire (regex):", result._id)
        return result
      }
    }
    
    console.log("[PDF] No luminaire found for:", imageId)
    return null
  } catch (error: any) {
    console.error("[PDF] MongoDB error:", error.message)
    return null
  }
}

// Fonction pour extraire les dimensions
function extractDimensions(luminaire: any): string {
  // Champs possibles pour dimensions combinées
  const combinedFields = ['dimensions', 'Dimensions', 'DIMENSIONS']
  for (const field of combinedFields) {
    if (luminaire[field]) return String(luminaire[field])
  }
  
  // Construire depuis champs individuels
  const h = luminaire.hauteur || luminaire.Hauteur || luminaire["Hauteur (cm)"] || luminaire["H"]
  const l = luminaire.largeur || luminaire.Largeur || luminaire["Largeur (cm)"] || luminaire["L"]
  const p = luminaire.profondeur || luminaire.Profondeur || luminaire["Profondeur (cm)"] || luminaire["P"]
  
  const parts = []
  if (h) parts.push(`H : ${h} cm`)
  if (l) parts.push(`L : ${l} cm`)
  if (p) parts.push(`P : ${p} cm`)
  
  return parts.length > 0 ? parts.join(" - ") : ""
}

// Fonction pour extraire les matériaux
function extractMaterials(luminaire: any): string {
  const fields = ['materiaux', 'Materiaux', 'Matériaux', 'materials', 'Materials', 'matiere', 'Matiere']
  for (const field of fields) {
    if (luminaire[field]) {
      const val = luminaire[field]
      return Array.isArray(val) ? val.join(", ") : String(val)
    }
  }
  return ""
}

// Fonction pour extraire la puissance
function extractPuissance(luminaire: any): string {
  const fields = ['puissance', 'Puissance', 'Puissance (W)', 'power', 'wattage', 'lumens', 'Lumens']
  for (const field of fields) {
    if (luminaire[field]) return String(luminaire[field])
  }
  return ""
}

// Fonction pour extraire le prix/estimation
function extractPrix(luminaire: any): string {
  const fields = ['prix', 'Prix', 'estimation', 'Estimation', 'price', 'Price', 'valeur', 'Valeur']
  for (const field of fields) {
    if (luminaire[field]) return String(luminaire[field])
  }
  return ""
}

// Fonction pour rendre un champ de formulaire vraiment invisible
function makeFieldInvisible(field: any) {
  try {
    const widget = field.acroField.getWidgets()[0]
    if (widget) {
      const dict = widget.dict
      // Supprimer le highlighting mode - /H /N = no highlighting
      dict.set(PDFName.of('H'), PDFName.of('N'))
      // Supprimer la bordure d'annotation
      dict.delete(PDFName.of('BS'))
      dict.delete(PDFName.of('Border'))
      // Definir MK (appearance characteristics) vide pour supprimer le fond
      dict.delete(PDFName.of('MK'))
    }
  } catch (e) {
    // Ignorer les erreurs
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: PDFRequest = await request.json()
    const { client_name, items } = body

    console.log("[PDF] ====== START ======")
    console.log("[PDF] Client:", client_name)
    console.log("[PDF] Items:", items?.length)

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "No items provided" }, { status: 400 })
    }

    // Enrichir chaque item avec les données MongoDB
    const enrichedItems = []
    for (const item of items) {
      console.log("[PDF] Processing:", item.image_id)
      
      const dbData = await fetchLuminaireFromMongoDB(item.image_id)
      
      const nom = item.nom || (dbData ? (dbData.nom || dbData.Nom || dbData["Nom luminaire"] || dbData["Nom du luminaire"]) : null) || item.image_id || "Luminaire"
      const artiste = item.artiste || (dbData ? (dbData.designer || dbData.Designer || dbData["Artiste / Dates"] || dbData["Artiste, ca année"] || dbData.artiste) : null) || ""
      const annee = dbData ? (dbData.annee || dbData.Annee || dbData["Année"] || dbData.date || dbData.Date) : ""
      const dimensions = dbData ? extractDimensions(dbData) : ""
      const materiaux = dbData ? extractMaterials(dbData) : ""
      const puissanceDB = dbData ? extractPuissance(dbData) : ""
      const prixDB = dbData ? extractPrix(dbData) : ""
      
      const enrichedItem = {
        image_id: item.image_id,
        image_url: item.image_url,
        nom,
        artiste,
        annee,
        dimensions,
        materiaux,
        puissance: item.puissance_manuelle || puissanceDB,
        prix: item.prix_manuel || prixDB,
      }
      
      console.log("[PDF] Enriched:", JSON.stringify(enrichedItem))
      enrichedItems.push(enrichedItem)
    }

    // Creer le document PDF
    const pdfDoc = await PDFDocument.create()
    const form = pdfDoc.getForm()
    
    const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman)
    const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold)
    const timesRomanItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic)
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    const pageWidth = 595.28  // A4
    const pageHeight = 841.89 // A4
    const margin = 50

    // ===============================================
    // PAGE 1 : COUVERTURE
    // ===============================================
    const coverPage = pdfDoc.addPage([pageWidth, pageHeight])
    
    // Ligne doree en haut
    coverPage.drawLine({
      start: { x: margin, y: pageHeight - 80 },
      end: { x: pageWidth - margin, y: pageHeight - 80 },
      thickness: 1,
      color: rgb(GOLD.r, GOLD.g, GOLD.b),
    })

    // Titre GERSAINT
    const gersaintText = "GERSAINT"
    const gersaintWidth = timesRomanBold.widthOfTextAtSize(gersaintText, 36)
    coverPage.drawText(gersaintText, {
      x: (pageWidth - gersaintWidth) / 2,
      y: pageHeight - 200,
      size: 36,
      font: timesRomanBold,
      color: rgb(DARK.r, DARK.g, DARK.b),
    })

    // Sous-titre PARIS
    const parisText = "P A R I S"
    const parisWidth = helvetica.widthOfTextAtSize(parisText, 14)
    coverPage.drawText(parisText, {
      x: (pageWidth - parisWidth) / 2,
      y: pageHeight - 235,
      size: 14,
      font: helvetica,
      color: rgb(GRAY.r, GRAY.g, GRAY.b),
    })

    // Ligne decorative doree
    coverPage.drawLine({
      start: { x: (pageWidth - 60) / 2, y: pageHeight - 270 },
      end: { x: (pageWidth + 60) / 2, y: pageHeight - 270 },
      thickness: 1.5,
      color: rgb(GOLD.r, GOLD.g, GOLD.b),
    })

    // Selection de luminaires
    const selectionText = "Selection de luminaires"
    const selectionWidth = timesRomanItalic.widthOfTextAtSize(selectionText, 16)
    coverPage.drawText(selectionText, {
      x: (pageWidth - selectionWidth) / 2,
      y: 200,
      size: 16,
      font: timesRomanItalic,
      color: rgb(DARK.r, DARK.g, DARK.b),
    })

    // Nom du client
    const cleanClientName = cleanTextForPdf(client_name) || "Client"
    const clientWidth = timesRomanBold.widthOfTextAtSize(cleanClientName, 18)
    coverPage.drawText(cleanClientName, {
      x: (pageWidth - clientWidth) / 2,
      y: 170,
      size: 18,
      font: timesRomanBold,
      color: rgb(DARK.r, DARK.g, DARK.b),
    })

    // Ligne doree en bas
    coverPage.drawLine({
      start: { x: margin, y: 100 },
      end: { x: pageWidth - margin, y: 100 },
      thickness: 1,
      color: rgb(GOLD.r, GOLD.g, GOLD.b),
    })

    // ===============================================
    // PAGES CATALOGUE - 3 items par page
    // ===============================================
    const itemsPerPage = 3
    let itemCounter = 0

    for (let pageIndex = 0; pageIndex < Math.ceil(enrichedItems.length / itemsPerPage); pageIndex++) {
      const catalogPage = pdfDoc.addPage([pageWidth, pageHeight])
      const startIdx = pageIndex * itemsPerPage
      const pageItems = enrichedItems.slice(startIdx, startIdx + itemsPerPage)
      
      // En-tete de page
      catalogPage.drawText("Luminaires", {
        x: margin,
        y: pageHeight - 45,
        size: 12,
        font: helveticaBold,
        color: rgb(DARK.r, DARK.g, DARK.b),
      })

      const prixHeader = "Prix HT (hors livraison)"
      const prixHeaderWidth = helvetica.widthOfTextAtSize(prixHeader, 9)
      catalogPage.drawText(prixHeader, {
        x: pageWidth - margin - prixHeaderWidth,
        y: pageHeight - 45,
        size: 9,
        font: helvetica,
        color: rgb(GRAY.r, GRAY.g, GRAY.b),
      })

      // Ligne doree sous l'en-tete
      catalogPage.drawLine({
        start: { x: margin, y: pageHeight - 55 },
        end: { x: pageWidth - margin, y: pageHeight - 55 },
        thickness: 1,
        color: rgb(GOLD.r, GOLD.g, GOLD.b),
      })

      // Calcul de l'espace disponible pour 3 items
      const headerHeight = 60
      const footerHeight = 60
      const availableHeight = pageHeight - headerHeight - footerHeight
      const itemHeight = Math.floor(availableHeight / 3)
      
      let yPosition = pageHeight - headerHeight - 20

      for (const item of pageItems) {
        const nom = cleanTextForPdf(item.nom)
        const artiste = cleanTextForPdf(item.artiste)
        const annee = cleanTextForPdf(item.annee)
        const dimensions = cleanTextForPdf(item.dimensions)
        const materiaux = cleanTextForPdf(item.materiaux)
        const puissance = cleanTextForPdf(item.puissance)
        const prix = cleanTextForPdf(item.prix)

        // Zone image - taille adaptee pour remplir la page
        const imageX = margin
        const imageSize = Math.min(itemHeight - 40, 180)
        const imageY = yPosition - imageSize
        const imageWidth = imageSize
        const imageHeight = imageSize

        // Charger l'image
        let imageLoaded = false
        const imageUrl = item.image_url
        
        if (imageUrl && !imageUrl.includes('placeholder')) {
          const imageBytes = await loadImageFromUrl(imageUrl)
          
          if (imageBytes) {
            try {
              let embeddedImage
              const uint8Array = new Uint8Array(imageBytes)
              
              if (uint8Array[0] === 0xFF && uint8Array[1] === 0xD8) {
                embeddedImage = await pdfDoc.embedJpg(imageBytes)
              } else if (uint8Array[0] === 0x89 && uint8Array[1] === 0x50) {
                embeddedImage = await pdfDoc.embedPng(imageBytes)
              }
              
              if (embeddedImage) {
                const imgDims = embeddedImage.scale(1)
                const scale = Math.min(imageWidth / imgDims.width, imageHeight / imgDims.height)
                const scaledWidth = imgDims.width * scale
                const scaledHeight = imgDims.height * scale
                
                catalogPage.drawImage(embeddedImage, {
                  x: imageX + (imageWidth - scaledWidth) / 2,
                  y: imageY + (imageHeight - scaledHeight) / 2,
                  width: scaledWidth,
                  height: scaledHeight,
                })
                imageLoaded = true
              }
            } catch {
              // Ignore image errors
            }
          }
        }
        
        if (!imageLoaded) {
          // Rectangle placeholder
          catalogPage.drawRectangle({
            x: imageX,
            y: imageY,
            width: imageWidth,
            height: imageHeight,
            color: rgb(0.95, 0.94, 0.92),
            borderColor: rgb(0.85, 0.85, 0.85),
            borderWidth: 0.5,
          })
        }

        // Zone texte a droite
        const textX = imageX + imageWidth + 25
        let textY = yPosition - 8
        const fieldWidth = 280
        const lineHeight = 18

        // Nom du luminaire - Champ editable invisible
        const nomField = form.createTextField(`nom_${itemCounter}`)
        nomField.setText(nom || "")
        nomField.addToPage(catalogPage, {
          x: textX - 2,
          y: textY - 4,
          width: fieldWidth,
          height: 16,
          borderWidth: 0,
        })
        nomField.updateAppearances(timesRomanBold)
        makeFieldInvisible(nomField)
        textY -= lineHeight + 2

        // Artiste + Annee - Champ editable invisible
        const artisteAnnee = (artiste || "") + (annee ? `. (${annee})` : "")
        const artisteField = form.createTextField(`artiste_${itemCounter}`)
        artisteField.setText(artisteAnnee)
        artisteField.addToPage(catalogPage, {
          x: textX - 2,
          y: textY - 3,
          width: fieldWidth,
          height: 14,
          borderWidth: 0,
        })
        artisteField.updateAppearances(timesRomanItalic)
        makeFieldInvisible(artisteField)
        textY -= lineHeight + 4

        // Dimensions - Label fixe + champ editable
        catalogPage.drawText("Dimensions : ", {
          x: textX,
          y: textY,
          size: 9,
          font: helvetica,
          color: rgb(DARK.r, DARK.g, DARK.b),
        })
        const dimField = form.createTextField(`dimensions_${itemCounter}`)
        dimField.setText(dimensions || "")
        dimField.addToPage(catalogPage, {
          x: textX + 55,
          y: textY - 3,
          width: 220,
          height: 13,
          borderWidth: 0,
        })
        dimField.updateAppearances(helvetica)
        makeFieldInvisible(dimField)
        textY -= lineHeight

        // Materiaux - Label fixe + champ editable
        catalogPage.drawText("Materiaux : ", {
          x: textX,
          y: textY,
          size: 9,
          font: helvetica,
          color: rgb(DARK.r, DARK.g, DARK.b),
        })
        const matText = materiaux ? (materiaux.length > 50 ? materiaux.substring(0, 50) + "..." : materiaux) : ""
        const matField = form.createTextField(`materiaux_${itemCounter}`)
        matField.setText(matText)
        matField.addToPage(catalogPage, {
          x: textX + 50,
          y: textY - 3,
          width: 225,
          height: 13,
          borderWidth: 0,
        })
        matField.updateAppearances(helvetica)
        makeFieldInvisible(matField)
        textY -= lineHeight

        // Puissance - Label fixe + champ editable (toujours visible)
        catalogPage.drawText("Puissance : ", {
          x: textX,
          y: textY,
          size: 9,
          font: helvetica,
          color: rgb(DARK.r, DARK.g, DARK.b),
        })
        const puissanceField = form.createTextField(`puissance_${itemCounter}`)
        puissanceField.setText(puissance || "")
        puissanceField.addToPage(catalogPage, {
          x: textX + 50,
          y: textY - 3,
          width: 180,
          height: 13,
          borderWidth: 0,
        })
        puissanceField.updateAppearances(helvetica)
        makeFieldInvisible(puissanceField)
        textY -= lineHeight + 2

        // Prix HT - Label fixe + champ editable
        catalogPage.drawText("Prix HT : ", {
          x: textX,
          y: textY,
          size: 11,
          font: helveticaBold,
          color: rgb(DARK.r, DARK.g, DARK.b),
        })
        const prixField = form.createTextField(`prix_${itemCounter}`)
        prixField.setText(prix || "")
        prixField.addToPage(catalogPage, {
          x: textX + 48,
          y: textY - 3,
          width: 150,
          height: 14,
          borderWidth: 0,
        })
        prixField.updateAppearances(helveticaBold)
        makeFieldInvisible(prixField)

        // Ligne separatrice doree fine
        catalogPage.drawLine({
          start: { x: margin, y: imageY - 20 },
          end: { x: pageWidth - margin, y: imageY - 20 },
          thickness: 0.5,
          color: rgb(GOLD.r, GOLD.g, GOLD.b),
        })

        yPosition = yPosition - itemHeight
        itemCounter++
      }

      // Ligne doree en bas de page
      catalogPage.drawLine({
        start: { x: margin, y: 50 },
        end: { x: pageWidth - margin, y: 50 },
        thickness: 1,
        color: rgb(GOLD.r, GOLD.g, GOLD.b),
      })
    }

    // ===============================================
    // PAGE FINALE : CONTACT
    // ===============================================
    const footerPage = pdfDoc.addPage([pageWidth, pageHeight])

    // Ligne doree en haut
    footerPage.drawLine({
      start: { x: margin, y: pageHeight - 80 },
      end: { x: pageWidth - margin, y: pageHeight - 80 },
      thickness: 1,
      color: rgb(GOLD.r, GOLD.g, GOLD.b),
    })

    // GERSAINT centre
    const footerGersaintWidth = timesRomanBold.widthOfTextAtSize("GERSAINT", 36)
    footerPage.drawText("GERSAINT", {
      x: (pageWidth - footerGersaintWidth) / 2,
      y: pageHeight / 2 + 80,
      size: 36,
      font: timesRomanBold,
      color: rgb(DARK.r, DARK.g, DARK.b),
    })

    const footerParisWidth = helvetica.widthOfTextAtSize("P A R I S", 14)
    footerPage.drawText("P A R I S", {
      x: (pageWidth - footerParisWidth) / 2,
      y: pageHeight / 2 + 45,
      size: 14,
      font: helvetica,
      color: rgb(GRAY.r, GRAY.g, GRAY.b),
    })

    // Ligne decorative
    footerPage.drawLine({
      start: { x: (pageWidth - 60) / 2, y: pageHeight / 2 + 15 },
      end: { x: (pageWidth + 60) / 2, y: pageHeight / 2 + 15 },
      thickness: 1.5,
      color: rgb(GOLD.r, GOLD.g, GOLD.b),
    })

    // Coordonnees
    const contactLines = [
      "42 rue de Maubeuge",
      "75009 Paris",
      "",
      "01 83 64 35 15",
      "contact@gersaintparis.fr",
      "www.gersaintparis.fr"
    ]

    let contactY = pageHeight / 2 - 40
    for (const line of contactLines) {
      if (line) {
        const lineW = helvetica.widthOfTextAtSize(line, 11)
        footerPage.drawText(line, {
          x: (pageWidth - lineW) / 2,
          y: contactY,
          size: 11,
          font: helvetica,
          color: rgb(GRAY.r, GRAY.g, GRAY.b),
        })
      }
      contactY -= 18
    }

    // Ligne doree en bas
    footerPage.drawLine({
      start: { x: margin, y: 100 },
      end: { x: pageWidth - margin, y: 100 },
      thickness: 1,
      color: rgb(GOLD.r, GOLD.g, GOLD.b),
    })

    // Generer le PDF
    const pdfBytes = await pdfDoc.save()

    console.log("[PDF] ====== SUCCESS ======")
    console.log("[PDF] Size:", pdfBytes.length, "bytes")

    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="selection_gersaint_${cleanClientName.replace(/\s+/g, '_')}.pdf"`,
      },
    })
  } catch (error: any) {
    console.error("[PDF] Error:", error.message)
    console.error("[PDF] Stack:", error.stack)
    return NextResponse.json(
      { error: "Internal server error during PDF generation", details: error.message },
      { status: 500 }
    )
  }
}
