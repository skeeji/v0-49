import { NextRequest, NextResponse } from "next/server"
import { PDFDocument, rgb, StandardFonts } from "pdf-lib"

// Couleurs du design Gersaint
const GOLD = { r: 200/255, g: 169/255, b: 110/255 }
const DARK = { r: 26/255, g: 26/255, b: 26/255 }
const GRAY = { r: 102/255, g: 102/255, b: 102/255 }

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
      next: { revalidate: 3600 } 
    })
    if (!response.ok) return null
    return await response.arrayBuffer()
  } catch {
    return null
  }
}

// Fonction pour récupérer les données d'un luminaire depuis l'API
async function fetchLuminaireData(imageId: string): Promise<LuminaireItem | null> {
  try {
    // Extraire l'ID numérique du nom de fichier (ex: "luminaire_5966.jpg" -> "5966")
    const match = imageId.match(/luminaire_(\d+)/)
    if (!match) return null
    
    const numericId = match[1]
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000'
    
    const response = await fetch(`${baseUrl}/api/luminaires/${numericId}`)
    if (!response.ok) return null
    
    const data = await response.json()
    return {
      image_id: imageId,
      nom: data.nom || data.name || imageId,
      artiste: data.artiste || data.designer || "",
      annee: data.annee || data.year || "",
      dimensions: data.dimensions || "",
      materiaux: data.materiaux || data.materials || "",
      categorie: data.categorie || data.category || "",
    }
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: PDFRequest = await request.json()
    const { client_name, items } = body

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "No items provided" },
        { status: 400 }
      )
    }

    // Créer le document PDF
    const pdfDoc = await PDFDocument.create()
    const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman)
    const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold)
    const timesRomanItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic)
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    const pageWidth = 595.28  // A4
    const pageHeight = 841.89 // A4

    // ═══════════════════════════════════════════
    // PAGE 1 : COUVERTURE
    // ═══════════════════════════════════════════
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

    // Symbole étoile
    const starText = "✦"
    const starWidth = helvetica.widthOfTextAtSize(starText, 18)
    coverPage.drawText(starText, {
      x: (pageWidth - starWidth) / 2,
      y: pageHeight - 280,
      size: 18,
      font: helvetica,
      color: rgb(DARK.r, DARK.g, DARK.b),
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

    const clientWidth = timesRoman.widthOfTextAtSize(client_name, 14)
    coverPage.drawText(client_name, {
      x: (pageWidth - clientWidth) / 2,
      y: 155,
      size: 14,
      font: timesRoman,
      color: rgb(DARK.r, DARK.g, DARK.b),
    })

    // ═══════════════════════════════════════════
    // PAGES CATALOGUE
    // ═══════════════════════════════════════════
    const itemsPerPage = 3
    const enrichedItems: LuminaireItem[] = []

    // Enrichir les items avec les données de l'API si nécessaire
    for (const item of items) {
      const apiData = await fetchLuminaireData(item.image_id)
      enrichedItems.push({
        ...apiData,
        ...item,
        nom: item.nom || apiData?.nom || item.image_id,
        artiste: item.artiste || apiData?.artiste || "",
        annee: item.annee || apiData?.annee || "",
        dimensions: item.dimensions || apiData?.dimensions || "",
        materiaux: item.materiaux || apiData?.materiaux || "",
        categorie: item.categorie || apiData?.categorie || "",
      })
    }

    // Générer les pages catalogue
    for (let pageIndex = 0; pageIndex < Math.ceil(enrichedItems.length / itemsPerPage); pageIndex++) {
      const catalogPage = pdfDoc.addPage([pageWidth, pageHeight])
      const startIdx = pageIndex * itemsPerPage
      const pageItems = enrichedItems.slice(startIdx, startIdx + itemsPerPage)
      
      // En-tête
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

      // Ligne dorée sous l'en-tête
      catalogPage.drawLine({
        start: { x: 50, y: pageHeight - 60 },
        end: { x: pageWidth - 50, y: pageHeight - 60 },
        thickness: 1,
        color: rgb(GOLD.r, GOLD.g, GOLD.b),
      })

      let yPosition = pageHeight - 100

      for (const item of pageItems) {
        const nom = item.nom || item.image_id || "Luminaire"
        const artiste = item.artiste || ""
        const annee = item.annee || ""
        const dimensions = item.dimensions || ""
        const materiaux = item.materiaux || ""
        const categorie = item.categorie || ""
        const prix = item.prix_manuel || "Prix sur demande"
        const puissance = item.puissance_manuelle || ""

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
            
            // Détecter le type d'image
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

        // Texte à droite de l'image
        const textX = imageX + imageSize + 20
        let textY = yPosition

        // Nom du luminaire (doré)
        catalogPage.drawText(nom, {
          x: textX,
          y: textY,
          size: 12,
          font: timesRomanBold,
          color: rgb(GOLD.r, GOLD.g, GOLD.b),
        })
        textY -= 18

        // Artiste et année
        const artisteLine = annee ? `${artiste}  ·  ${annee}` : artiste
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

        // Spécifications
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

        // Ligne séparatrice dorée
        catalogPage.drawLine({
          start: { x: 50, y: imageY - 15 },
          end: { x: pageWidth - 50, y: imageY - 15 },
          thickness: 0.5,
          color: rgb(GOLD.r, GOLD.g, GOLD.b),
        })

        yPosition = imageY - 40
      }
    }

    // ═══════════════════════════════════════════
    // PAGE FINALE : FOOTER
    // ═══════════════════════════════════════════
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

    // Coordonnées
    const contactLines = [
      "42 rue de Maubeuge",
      "75009 Paris",
      "01 83 64 35 15",
      "https://gersaintparis.fr/"
    ]

    let contactY = pageHeight / 2 - 30
    for (const line of contactLines) {
      const lineWidth = helvetica.widthOfTextAtSize(line, 11)
      footerPage.drawText(line, {
        x: (pageWidth - lineWidth) / 2,
        y: contactY,
        size: 11,
        font: helvetica,
        color: rgb(GRAY.r, GRAY.g, GRAY.b),
      })
      contactY -= 20
    }

    // Générer le PDF
    const pdfBytes = await pdfDoc.save()

    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="selection_gersaint_${client_name.replace(/\s+/g, '_')}.pdf"`,
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
