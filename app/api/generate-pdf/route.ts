import { NextRequest, NextResponse } from "next/server"
import { PDFDocument, rgb, StandardFonts } from "pdf-lib"
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
    console.log("[v0] Loading image from:", url)
    const response = await fetch(url, { 
      headers: { 
        'Accept': 'image/*',
      },
    })
    if (!response.ok) {
      console.log("[v0] Image fetch failed:", response.status)
      return null
    }
    return await response.arrayBuffer()
  } catch (error) {
    console.log("[v0] Image fetch error:", error)
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
  console.log("[v0] ====== MONGODB LOOKUP START ======")
  console.log("[v0] Searching for image_id:", imageId)
  
  try {
    const client = await clientPromise
    console.log("[v0] MongoDB client connected successfully")
    
    const db = client.db(DBNAME)
    console.log("[v0] Using database:", DBNAME)
    
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
      { "Image luminaire (Nom du fichier)": { $regex: new RegExp(`^${imageId}$`, "i") } },
    ]
    
    console.log("[v0] Trying exact match queries...")
    
    // D'abord essayer les recherches exactes
    for (const query of searchQueries) {
      console.log("[v0] Query:", JSON.stringify(query))
      const result = await collection.findOne(query)
      if (result) {
        console.log("[v0] FOUND luminaire with query:", JSON.stringify(query))
        console.log("[v0] Luminaire _id:", result._id)
        console.log("[v0] ====== ALL FIELDS IN LUMINAIRE ======")
        Object.keys(result).forEach(key => {
          console.log(`[v0] Field "${key}":`, result[key])
        })
        console.log("[v0] ====== END FIELDS ======")
        return result
      }
    }
    
    console.log("[v0] No exact match, trying regex queries...")
    
    // Ensuite essayer avec regex
    for (const query of regexQueries) {
      console.log("[v0] Regex query:", JSON.stringify(query))
      const result = await collection.findOne(query)
      if (result) {
        console.log("[v0] FOUND luminaire with regex query")
        console.log("[v0] Luminaire _id:", result._id)
        console.log("[v0] ====== ALL FIELDS IN LUMINAIRE ======")
        Object.keys(result).forEach(key => {
          console.log(`[v0] Field "${key}":`, result[key])
        })
        console.log("[v0] ====== END FIELDS ======")
        return result
      }
    }
    
    // Afficher un exemple de document pour comprendre la structure
    console.log("[v0] No luminaire found for imageId:", imageId)
    console.log("[v0] Fetching a sample document to see field names...")
    const sampleDoc = await collection.findOne({})
    if (sampleDoc) {
      console.log("[v0] ====== SAMPLE DOCUMENT FIELDS ======")
      Object.keys(sampleDoc).forEach(key => {
        console.log(`[v0] Field "${key}":`, typeof sampleDoc[key], "=", String(sampleDoc[key]).substring(0, 100))
      })
      console.log("[v0] ====== END SAMPLE ======")
    }
    
    return null
  } catch (error: any) {
    console.error("[v0] MongoDB error:", error.message)
    console.error("[v0] MongoDB error stack:", error.stack)
    return null
  }
}

// Fonction pour extraire les dimensions depuis les différents champs possibles
function extractDimensions(luminaire: any): string {
  console.log("[v0] Extracting dimensions from luminaire...")
  
  // Champs possibles pour dimensions
  const possibleDimensionFields = [
    'dimensions', 'Dimensions', 'DIMENSIONS',
    'dimension', 'Dimension',
  ]
  
  for (const field of possibleDimensionFields) {
    if (luminaire[field]) {
      console.log(`[v0] Found dimensions in field "${field}":`, luminaire[field])
      return String(luminaire[field])
    }
  }
  
  // Essayer de construire depuis hauteur/largeur/profondeur
  const hauteur = luminaire.hauteur || luminaire.Hauteur || luminaire["Hauteur (cm)"] || luminaire["H"] || luminaire["h"]
  const largeur = luminaire.largeur || luminaire.Largeur || luminaire["Largeur (cm)"] || luminaire["L"] || luminaire["l"]
  const profondeur = luminaire.profondeur || luminaire.Profondeur || luminaire["Profondeur (cm)"] || luminaire["P"] || luminaire["p"]
  
  console.log("[v0] Individual dimensions - H:", hauteur, "L:", largeur, "P:", profondeur)
  
  const parts = []
  if (hauteur) parts.push(`H ${hauteur} cm`)
  if (largeur) parts.push(`L ${largeur} cm`)
  if (profondeur) parts.push(`P ${profondeur} cm`)
  
  if (parts.length > 0) {
    const dims = parts.join(" x ")
    console.log("[v0] Constructed dimensions:", dims)
    return dims
  }
  
  console.log("[v0] No dimensions found")
  return ""
}

// Fonction pour extraire les matériaux
function extractMaterials(luminaire: any): string {
  console.log("[v0] Extracting materials from luminaire...")
  
  const possibleFields = [
    'materiaux', 'Materiaux', 'MATERIAUX',
    'Matériaux', 'matériaux',
    'materials', 'Materials',
    'material', 'Material',
    'matiere', 'Matiere', 'Matière', 'matière',
  ]
  
  for (const field of possibleFields) {
    if (luminaire[field]) {
      const value = luminaire[field]
      console.log(`[v0] Found materials in field "${field}":`, value)
      if (Array.isArray(value)) {
        return value.join(", ")
      }
      return String(value)
    }
  }
  
  console.log("[v0] No materials found")
  return ""
}

// Fonction pour extraire la puissance
function extractPuissance(luminaire: any): string {
  console.log("[v0] Extracting puissance from luminaire...")
  
  const possibleFields = [
    'puissance', 'Puissance', 'PUISSANCE',
    'Puissance (W)', 'puissance_w',
    'power', 'Power', 'wattage', 'Wattage',
    'lumens', 'Lumens',
  ]
  
  for (const field of possibleFields) {
    if (luminaire[field]) {
      console.log(`[v0] Found puissance in field "${field}":`, luminaire[field])
      return String(luminaire[field])
    }
  }
  
  console.log("[v0] No puissance found")
  return ""
}

// Fonction pour extraire le prix/estimation
function extractPrix(luminaire: any): string {
  console.log("[v0] Extracting prix from luminaire...")
  
  const possibleFields = [
    'prix', 'Prix', 'PRIX',
    'estimation', 'Estimation', 'ESTIMATION',
    'price', 'Price',
    'cout', 'Cout', 'Coût', 'coût',
    'valeur', 'Valeur',
  ]
  
  for (const field of possibleFields) {
    if (luminaire[field]) {
      console.log(`[v0] Found prix in field "${field}":`, luminaire[field])
      return String(luminaire[field])
    }
  }
  
  console.log("[v0] No prix found")
  return ""
}

export async function POST(request: NextRequest) {
  try {
    const body: PDFRequest = await request.json()
    const { client_name, items } = body

    console.log("[v0] ====== PDF GENERATION START ======")
    console.log("[v0] Client name:", client_name)
    console.log("[v0] Items count:", items?.length)
    console.log("[v0] Items received:", JSON.stringify(items, null, 2))

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "No items provided" },
        { status: 400 }
      )
    }

    // Enrichir chaque item avec les données MongoDB
    const enrichedItems = []
    for (const item of items) {
      console.log("[v0] ====== PROCESSING ITEM ======")
      console.log("[v0] Item image_id:", item.image_id)
      
      // Chercher dans MongoDB
      const dbData = await fetchLuminaireFromMongoDB(item.image_id)
      
      // Extraire les données
      const nom = item.nom || (dbData ? (dbData.nom || dbData.Nom || dbData["Nom luminaire"] || dbData["Nom du luminaire"]) : null) || item.image_id || "Luminaire"
      const artiste = item.artiste || (dbData ? (dbData.designer || dbData.Designer || dbData["Artiste / Dates"] || dbData["Artiste, ca année"] || dbData.artiste || dbData.Artiste) : null) || ""
      const annee = dbData ? (dbData.annee || dbData.Annee || dbData.Année || dbData["Année"] || dbData.date || dbData.Date) : ""
      const dimensions = dbData ? extractDimensions(dbData) : ""
      const materiaux = dbData ? extractMaterials(dbData) : ""
      const puissanceDB = dbData ? extractPuissance(dbData) : ""
      const prixDB = dbData ? extractPrix(dbData) : ""
      
      const enrichedItem = {
        image_id: item.image_id,
        image_url: item.image_url,
        nom: nom,
        artiste: artiste,
        annee: annee,
        dimensions: dimensions,
        materiaux: materiaux,
        // Utiliser valeur manuelle si fournie, sinon valeur DB
        puissance: item.puissance_manuelle || puissanceDB,
        prix: item.prix_manuel || prixDB,
      }
      
      console.log("[v0] ====== ENRICHED ITEM ======")
      console.log("[v0] nom:", enrichedItem.nom)
      console.log("[v0] artiste:", enrichedItem.artiste)
      console.log("[v0] annee:", enrichedItem.annee)
      console.log("[v0] dimensions:", enrichedItem.dimensions)
      console.log("[v0] materiaux:", enrichedItem.materiaux)
      console.log("[v0] puissance:", enrichedItem.puissance)
      console.log("[v0] prix:", enrichedItem.prix)
      console.log("[v0] ============================")
      
      enrichedItems.push(enrichedItem)
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

    const cleanClientName = cleanTextForPdf(client_name) || "Client"
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
    const itemsPerPage = 2  // 2 items par page pour avoir plus de place

    for (let pageIndex = 0; pageIndex < Math.ceil(enrichedItems.length / itemsPerPage); pageIndex++) {
      const catalogPage = pdfDoc.addPage([pageWidth, pageHeight])
      const startIdx = pageIndex * itemsPerPage
      const pageItems = enrichedItems.slice(startIdx, startIdx + itemsPerPage)
      
      console.log("[v0] Creating catalog page", pageIndex + 1, "with", pageItems.length, "items")
      
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
        const nom = cleanTextForPdf(item.nom)
        const artiste = cleanTextForPdf(item.artiste)
        const annee = cleanTextForPdf(item.annee)
        const dimensions = cleanTextForPdf(item.dimensions)
        const materiaux = cleanTextForPdf(item.materiaux)
        const puissance = cleanTextForPdf(item.puissance)
        const prix = cleanTextForPdf(item.prix) || "Prix sur demande"

        console.log("[v0] Drawing item:", nom)

        // Zone image
        const imageX = 50
        const imageY = yPosition - 150
        const imageSize = 150

        // Essayer de charger l'image
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
                const scale = Math.min(imageSize / imgDims.width, imageSize / imgDims.height)
                const scaledWidth = imgDims.width * scale
                const scaledHeight = imgDims.height * scale
                
                catalogPage.drawImage(embeddedImage, {
                  x: imageX + (imageSize - scaledWidth) / 2,
                  y: imageY + (imageSize - scaledHeight) / 2,
                  width: scaledWidth,
                  height: scaledHeight,
                })
                imageLoaded = true
              }
            } catch (imgError) {
              console.log("[v0] Error embedding image:", imgError)
            }
          }
        }
        
        if (!imageLoaded) {
          // Placeholder gris
          catalogPage.drawRectangle({
            x: imageX,
            y: imageY,
            width: imageSize,
            height: imageSize,
            color: rgb(0.93, 0.92, 0.90),
            borderColor: rgb(0.8, 0.8, 0.8),
            borderWidth: 0.5,
          })
          // Image ID dans le placeholder
          const idText = cleanTextForPdf(item.image_id).substring(0, 25)
          catalogPage.drawText(idText, {
            x: imageX + 10,
            y: imageY + imageSize / 2,
            size: 8,
            font: helvetica,
            color: rgb(0.6, 0.6, 0.6),
          })
        }

        // Texte a droite de l'image
        const textX = imageX + imageSize + 25
        let textY = yPosition

        // Nom du luminaire (dore, en gras)
        catalogPage.drawText(nom || "Luminaire", {
          x: textX,
          y: textY,
          size: 13,
          font: timesRomanBold,
          color: rgb(GOLD.r, GOLD.g, GOLD.b),
        })
        textY -= 20

        // Artiste + Annee
        if (artiste || annee) {
          const artisteAnnee = artiste + (annee ? ` (${annee})` : "")
          catalogPage.drawText(artisteAnnee, {
            x: textX,
            y: textY,
            size: 10,
            font: timesRomanItalic,
            color: rgb(DARK.r, DARK.g, DARK.b),
          })
          textY -= 18
        }

        textY -= 8 // Espace

        // Dimensions
        if (dimensions) {
          catalogPage.drawText(`Dimensions : ${dimensions}`, {
            x: textX,
            y: textY,
            size: 9,
            font: helvetica,
            color: rgb(DARK.r, DARK.g, DARK.b),
          })
          textY -= 14
        }

        // Materiaux
        if (materiaux) {
          const matText = materiaux.length > 50 ? materiaux.substring(0, 50) + "..." : materiaux
          catalogPage.drawText(`Materiaux : ${matText}`, {
            x: textX,
            y: textY,
            size: 9,
            font: helvetica,
            color: rgb(DARK.r, DARK.g, DARK.b),
          })
          textY -= 14
        }

        // Puissance
        if (puissance) {
          catalogPage.drawText(`Puissance : ${puissance}`, {
            x: textX,
            y: textY,
            size: 9,
            font: helvetica,
            color: rgb(DARK.r, DARK.g, DARK.b),
          })
          textY -= 14
        }

        textY -= 8 // Espace avant prix

        // Prix (en gras)
        catalogPage.drawText(prix, {
          x: textX,
          y: textY,
          size: 12,
          font: helveticaBold,
          color: rgb(DARK.r, DARK.g, DARK.b),
        })

        // Ligne separatrice doree
        catalogPage.drawLine({
          start: { x: 50, y: imageY - 20 },
          end: { x: pageWidth - 50, y: imageY - 20 },
          thickness: 0.5,
          color: rgb(GOLD.r, GOLD.g, GOLD.b),
        })

        yPosition = imageY - 50
      }
    }

    // ===============================================
    // PAGE FINALE : FOOTER
    // ===============================================
    const footerPage = pdfDoc.addPage([pageWidth, pageHeight])

    const footerGersaintWidth = timesRomanBold.widthOfTextAtSize("GERSAINT", 32)
    footerPage.drawText("GERSAINT", {
      x: (pageWidth - footerGersaintWidth) / 2,
      y: pageHeight / 2 + 60,
      size: 32,
      font: timesRomanBold,
      color: rgb(DARK.r, DARK.g, DARK.b),
    })

    const footerParisWidth = helvetica.widthOfTextAtSize("P A R I S", 12)
    footerPage.drawText("P A R I S", {
      x: (pageWidth - footerParisWidth) / 2,
      y: pageHeight / 2 + 30,
      size: 12,
      font: helvetica,
      color: rgb(DARK.r, DARK.g, DARK.b),
    })

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

    console.log("[v0] ====== PDF GENERATION SUCCESS ======")
    console.log("[v0] PDF size:", pdfBytes.length, "bytes")

    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="selection_gersaint_${cleanClientName.replace(/\s+/g, '_')}.pdf"`,
      },
    })
  } catch (error: any) {
    console.error("[v0] PDF generation error:", error.message)
    console.error("[v0] Error stack:", error.stack)
    return NextResponse.json(
      { error: "Internal server error during PDF generation", details: error.message },
      { status: 500 }
    )
  }
}
