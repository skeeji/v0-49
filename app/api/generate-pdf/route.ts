import { NextRequest, NextResponse } from "next/server"
import { PDFDocument, rgb, StandardFonts } from "pdf-lib"
import clientPromise from "@/lib/mongodb"

// Couleurs du design Gersaint
const GOLD = { r: 200/255, g: 169/255, b: 110/255 }
const DARK = { r: 26/255, g: 26/255, b: 26/255 }
const GRAY = { r: 102/255, g: 102/255, b: 102/255 }

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

interface LuminaireItem {
  image_id: string
  prix_manuel?: string
  puissance_manuelle?: string
  nom?: string
  artiste?: string
  annee?: string
  dimensions?: string
  materiaux?: string
  categorie?: string
}

interface PDFRequest {
  client_name: string
  items: LuminaireItem[]
}

// Fonction pour charger une image depuis une URL
async function loadImageFromUrl(url: string): Promise<ArrayBuffer | null> {
  try {
    const response = await fetch(url, { 
      headers: { 
        'Accept': 'image/*',
      },
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
  // Remplacer les caracteres speciaux par leurs equivalents ASCII
  return text
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
    // Supprimer tout autre caractere non-ASCII
    .replace(/[^\x00-\x7F]/g, '')
}

// Fonction pour recuperer les donnees d'un luminaire depuis MongoDB par imageId
async function fetchLuminaireDataFromDB(imageId: string): Promise<LuminaireItem | null> {
  try {
    console.log("[v0] Fetching luminaire data for imageId:", imageId)
    
    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")
    
    // Chercher par imageId ou par nom de fichier
    const luminaire = await collection.findOne({
      $or: [
        { imageId: imageId },
        { "Nom du fichier": imageId },
        { filename: imageId },
        { "Image luminaire (Nom du fichier)": imageId },
      ]
    })
    
    if (!luminaire) {
      console.log("[v0] Luminaire not found for imageId:", imageId)
      return null
    }
    
    console.log("[v0] Found luminaire:", luminaire.nom || luminaire["Nom luminaire"])
    
    return {
      image_id: imageId,
      nom: luminaire.nom || luminaire["Nom luminaire"] || luminaire.name || imageId,
      artiste: luminaire.designer || luminaire["Artiste / Dates"] || luminaire["Artiste, ca annee"] || "",
      annee: luminaire.annee || luminaire["Annee"] || luminaire.year || "",
      dimensions: luminaire.dimensions || luminaire["Dimensions"] || "",
      materiaux: luminaire.materiaux || luminaire["Materiaux"] || luminaire.materials || "",
      categorie: luminaire.categorie || luminaire["Categorie"] || luminaire.category || "",
    }
  } catch (error) {
    console.error("[v0] Error fetching luminaire from DB:", error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: PDFRequest = await request.json()
    const { client_name, items } = body

    console.log("[v0] PDF generation request:", { client_name, itemCount: items?.length })

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "No items provided" },
        { status: 400 }
      )
    }

    // Creer le document PDF
    const pdfDoc = await PDFDocument.create()
    const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman)
    const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold)
    const timesRomanItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic)
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    const pageWidth = 595.28  // A4
    const pageHeight = 841.89 // A4

    // ===============================================
    // PAGE 1 : COUVERTURE
    // ===============================================
    const coverPage = pdfDoc.addPage([pageWidth, pageHeight])
    
    // Titre GERSAINT
    const gersaintText = "GERSAINT"
    const gersaintWidth = timesRomanBold.widthOfTextAtSize(gersaintText, 32)
    coverPage.drawText(gersaintText, {
      x: (pageWidth - gersaintWidth) / 2,
      y: pageHeight - 220,
      size: 32,
      font: timesRomanBold,
      color: rgb(DARK.r, DARK.g, DARK.b),
    })

    // Sous-titre PARIS
    const parisText = "P A R I S"
    const parisWidth = helvetica.widthOfTextAtSize(parisText, 12)
    coverPage.drawText(parisText, {
      x: (pageWidth - parisWidth) / 2,
      y: pageHeight - 250,
      size: 12,
      font: helvetica,
      color: rgb(DARK.r, DARK.g, DARK.b),
    })

    // Ligne decorative
    const lineWidth = 40
    coverPage.drawLine({
      start: { x: (pageWidth - lineWidth) / 2, y: pageHeight - 275 },
      end: { x: (pageWidth + lineWidth) / 2, y: pageHeight - 275 },
      thickness: 1,
      color: rgb(GOLD.r, GOLD.g, GOLD.b),
    })

    // Texte du bas
    const selectionText = "Selection de luminaires"
    const selectionWidth = timesRoman.widthOfTextAtSize(selectionText, 14)
    coverPage.drawText(selectionText, {
      x: (pageWidth - selectionWidth) / 2,
      y: 180,
      size: 14,
      font: timesRoman,
      color: rgb(DARK.r, DARK.g, DARK.b),
    })

    const cleanClientName = cleanTextForPdf(client_name)
    const clientWidth = timesRoman.widthOfTextAtSize(cleanClientName, 14)
    coverPage.drawText(cleanClientName, {
      x: (pageWidth - clientWidth) / 2,
      y: 155,
      size: 14,
      font: timesRoman,
      color: rgb(DARK.r, DARK.g, DARK.b),
    })

    // ===============================================
    // PAGES CATALOGUE
    // ===============================================
    const itemsPerPage = 3
    const enrichedItems: LuminaireItem[] = []

    // Enrichir les items avec les donnees de MongoDB
    for (const item of items) {
      console.log("[v0] Processing item:", item.image_id)
      const dbData = await fetchLuminaireDataFromDB(item.image_id)
      
      enrichedItems.push({
        image_id: item.image_id,
        nom: dbData?.nom || item.image_id,
        artiste: dbData?.artiste || "",
        annee: dbData?.annee || "",
        dimensions: dbData?.dimensions || "",
        materiaux: dbData?.materiaux || "",
        categorie: dbData?.categorie || "",
        prix_manuel: item.prix_manuel || "",
        puissance_manuelle: item.puissance_manuelle || "",
      })
    }

    console.log("[v0] Enriched items:", enrichedItems.length)

    // Generer les pages catalogue
    for (let pageIndex = 0; pageIndex < Math.ceil(enrichedItems.length / itemsPerPage); pageIndex++) {
      const catalogPage = pdfDoc.addPage([pageWidth, pageHeight])
      const startIdx = pageIndex * itemsPerPage
      const pageItems = enrichedItems.slice(startIdx, startIdx + itemsPerPage)
      
      // En-tete
      catalogPage.drawText("Luminaires", {
        x: 50,
        y: pageHeight - 50,
        size: 11,
        font: helveticaBold,
        color: rgb(DARK.r, DARK.g, DARK.b),
      })

      const prixHeader = "Prix HT (hors livraison)"
      const prixHeaderWidth = helvetica.widthOfTextAtSize(prixHeader, 9)
      catalogPage.drawText(prixHeader, {
        x: pageWidth - 50 - prixHeaderWidth,
        y: pageHeight - 50,
        size: 9,
        font: helvetica,
        color: rgb(GRAY.r, GRAY.g, GRAY.b),
      })

      // Ligne doree sous l'en-tete
      catalogPage.drawLine({
        start: { x: 50, y: pageHeight - 60 },
        end: { x: pageWidth - 50, y: pageHeight - 60 },
        thickness: 1,
        color: rgb(GOLD.r, GOLD.g, GOLD.b),
      })

      let yPosition = pageHeight - 100

      for (const item of pageItems) {
        const nom = cleanTextForPdf(item.nom) || item.image_id || "Luminaire"
        const artiste = cleanTextForPdf(item.artiste) || ""
        const annee = cleanTextForPdf(item.annee) || ""
        const dimensions = cleanTextForPdf(item.dimensions) || ""
        const materiaux = cleanTextForPdf(item.materiaux) || ""
        const categorie = cleanTextForPdf(item.categorie) || ""
        const prix = cleanTextForPdf(item.prix_manuel) || "Prix sur demande"
        const puissance = cleanTextForPdf(item.puissance_manuelle) || ""

        // Zone image (placeholder gris)
        const imageX = 50
        const imageY = yPosition - 120
        const imageSize = 120

        // Essayer de charger l'image
        const imageUrl = `https://storage.googleapis.com/gersaint-images/images/luminaires/${item.image_id}`
        const imageBytes = await loadImageFromUrl(imageUrl)
        
        if (imageBytes) {
          try {
            let embeddedImage
            const uint8Array = new Uint8Array(imageBytes)
            
            // Detecter le type d'image
            if (uint8Array[0] === 0xFF && uint8Array[1] === 0xD8) {
              embeddedImage = await pdfDoc.embedJpg(imageBytes)
            } else if (uint8Array[0] === 0x89 && uint8Array[1] === 0x50) {
              embeddedImage = await pdfDoc.embedPng(imageBytes)
            }
            
            if (embeddedImage) {
              const imgDims = embeddedImage.scale(1)
              const scale = Math.min(imageSize / imgDims.width, imageSize / imgDims.height)
              const scaledWidth = imgDims.width * scale
              const scaledHeight = imgDims.height * scale
              
              catalogPage.drawImage(embeddedImage, {
                x: imageX + (imageSize - scaledWidth) / 2,
                y: imageY + (imageSize - scaledHeight) / 2,
                width: scaledWidth,
                height: scaledHeight,
              })
            } else {
              // Placeholder
              catalogPage.drawRectangle({
                x: imageX,
                y: imageY,
                width: imageSize,
                height: imageSize,
                color: rgb(0.93, 0.92, 0.90),
                borderColor: rgb(0.8, 0.8, 0.8),
                borderWidth: 0.5,
              })
            }
          } catch {
            // Placeholder en cas d'erreur
            catalogPage.drawRectangle({
              x: imageX,
              y: imageY,
              width: imageSize,
              height: imageSize,
              color: rgb(0.93, 0.92, 0.90),
              borderColor: rgb(0.8, 0.8, 0.8),
              borderWidth: 0.5,
            })
          }
        } else {
          // Placeholder si pas d'image
          catalogPage.drawRectangle({
            x: imageX,
            y: imageY,
            width: imageSize,
            height: imageSize,
            color: rgb(0.93, 0.92, 0.90),
            borderColor: rgb(0.8, 0.8, 0.8),
            borderWidth: 0.5,
          })
        }

        // Texte a droite de l'image
        const textX = imageX + imageSize + 20
        let textY = yPosition

        // Nom du luminaire (dore)
        catalogPage.drawText(nom, {
          x: textX,
          y: textY,
          size: 12,
          font: timesRomanBold,
          color: rgb(GOLD.r, GOLD.g, GOLD.b),
        })
        textY -= 18

        // Artiste et annee
        const artisteLine = annee ? `${artiste}  -  ${annee}` : artiste
        if (artisteLine) {
          catalogPage.drawText(artisteLine, {
            x: textX,
            y: textY,
            size: 10,
            font: timesRomanItalic,
            color: rgb(DARK.r, DARK.g, DARK.b),
          })
          textY -= 16
        }

        // Specifications
        const specs: string[] = []
        if (categorie) specs.push(`Categorie : ${categorie}`)
        if (dimensions) specs.push(`Dimensions : ${dimensions}`)
        if (materiaux) specs.push(`Materiaux : ${materiaux}`)
        if (puissance) specs.push(`Puissance : ${puissance}`)

        for (const spec of specs) {
          catalogPage.drawText(spec, {
            x: textX,
            y: textY,
            size: 9,
            font: helvetica,
            color: rgb(DARK.r, DARK.g, DARK.b),
          })
          textY -= 14
        }

        // Prix
        textY -= 4
        catalogPage.drawText(prix, {
          x: textX,
          y: textY,
          size: 11,
          font: helveticaBold,
          color: rgb(DARK.r, DARK.g, DARK.b),
        })

        // Ligne separatrice doree
        catalogPage.drawLine({
          start: { x: 50, y: imageY - 15 },
          end: { x: pageWidth - 50, y: imageY - 15 },
          thickness: 0.5,
          color: rgb(GOLD.r, GOLD.g, GOLD.b),
        })

        yPosition = imageY - 40
      }
    }

    // ===============================================
    // PAGE FINALE : FOOTER
    // ===============================================
    const footerPage = pdfDoc.addPage([pageWidth, pageHeight])

    // GERSAINT
    const footerGersaintWidth = timesRomanBold.widthOfTextAtSize("GERSAINT", 32)
    footerPage.drawText("GERSAINT", {
      x: (pageWidth - footerGersaintWidth) / 2,
      y: pageHeight / 2 + 60,
      size: 32,
      font: timesRomanBold,
      color: rgb(DARK.r, DARK.g, DARK.b),
    })

    // PARIS
    const footerParisWidth = helvetica.widthOfTextAtSize("P A R I S", 12)
    footerPage.drawText("P A R I S", {
      x: (pageWidth - footerParisWidth) / 2,
      y: pageHeight / 2 + 30,
      size: 12,
      font: helvetica,
      color: rgb(DARK.r, DARK.g, DARK.b),
    })

    // Coordonnees
    const contactLines = [
      "42 rue de Maubeuge",
      "75009 Paris",
      "01 83 64 35 15",
      "https://gersaintparis.fr/"
    ]

    let contactY = pageHeight / 2 - 30
    for (const line of contactLines) {
      const lineW = helvetica.widthOfTextAtSize(line, 11)
      footerPage.drawText(line, {
        x: (pageWidth - lineW) / 2,
        y: contactY,
        size: 11,
        font: helvetica,
        color: rgb(GRAY.r, GRAY.g, GRAY.b),
      })
      contactY -= 20
    }

    // Generer le PDF
    const pdfBytes = await pdfDoc.save()

    console.log("[v0] PDF generated successfully, size:", pdfBytes.length)

    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="selection_gersaint_${cleanClientName.replace(/\s+/g, '_')}.pdf"`,
      },
    })
  } catch (error) {
    console.error("[v0] PDF generation error:", error)
    return NextResponse.json(
      { error: "Internal server error during PDF generation", details: String(error) },
      { status: 500 }
    )
  }
}
