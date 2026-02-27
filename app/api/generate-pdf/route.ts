import { NextRequest, NextResponse } from "next/server"
import { PDFDocument, rgb, StandardFonts } from "pdf-lib"

interface LuminaireData {
  image_id: string
  nom: string
  artiste?: string
  dimensions?: string
  puissance?: string
  prix_ht?: string
  materiau?: string
  image_url?: string
}

interface PDFRequestBody {
  client_name: string
  luminaires: LuminaireData[]
}

async function fetchImageAsBase64(url: string): Promise<{ data: Uint8Array; type: "png" | "jpeg" } | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    
    const arrayBuffer = await response.arrayBuffer()
    const contentType = response.headers.get("content-type") || ""
    
    const type = contentType.includes("png") ? "png" : "jpeg"
    return { data: new Uint8Array(arrayBuffer), type }
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: PDFRequestBody = await request.json()
    const { client_name, luminaires } = body

    if (!client_name || !luminaires || luminaires.length === 0) {
      return NextResponse.json(
        { error: "Données manquantes" },
        { status: 400 }
      )
    }

    // Create PDF document
    const pdfDoc = await PDFDocument.create()
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman)
    const timesItalicFont = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic)

    // Colors
    const brownColor = rgb(0.545, 0.451, 0.333) // #8b7355
    const textColor = rgb(0.2, 0.2, 0.2)
    const lightGrayColor = rgb(0.6, 0.6, 0.6)

    // Page dimensions
    const pageWidth = 595.28 // A4
    const pageHeight = 841.89
    const margin = 50
    const contentWidth = pageWidth - 2 * margin

    // Calculate items per page (3 items per page after the first page header)
    const itemsPerPage = 3
    const itemHeight = 180

    // Helper to draw footer
    const drawFooter = (page: ReturnType<typeof pdfDoc.addPage>) => {
      const footerY = 40
      page.drawText("GERSAINT PARIS", {
        x: margin,
        y: footerY + 30,
        size: 10,
        font: helveticaBoldFont,
        color: brownColor,
      })
      page.drawText("42 rue de Maubeuge, 75009 Paris", {
        x: margin,
        y: footerY + 16,
        size: 8,
        font: helveticaFont,
        color: lightGrayColor,
      })
      page.drawText("01 83 64 35 15  |  gersaintparis.fr", {
        x: margin,
        y: footerY + 4,
        size: 8,
        font: helveticaFont,
        color: lightGrayColor,
      })
    }

    // Helper to draw header
    const drawHeader = (page: ReturnType<typeof pdfDoc.addPage>, isFirstPage: boolean): number => {
      let y = pageHeight - margin

      if (isFirstPage) {
        // Title
        page.drawText("Sélection de luminaires", {
          x: margin,
          y: y,
          size: 24,
          font: timesRomanFont,
          color: brownColor,
        })
        y -= 30

        // Client name
        page.drawText(client_name, {
          x: margin,
          y: y,
          size: 14,
          font: timesItalicFont,
          color: textColor,
        })
        y -= 40

        // Column headers
        page.drawText("Luminaires", {
          x: margin,
          y: y,
          size: 11,
          font: helveticaBoldFont,
          color: textColor,
        })
        page.drawText("Prix HT (hors livraison)", {
          x: pageWidth - margin - 130,
          y: y,
          size: 11,
          font: helveticaBoldFont,
          color: textColor,
        })
        y -= 8

        // Line separator
        page.drawLine({
          start: { x: margin, y: y },
          end: { x: pageWidth - margin, y: y },
          thickness: 1,
          color: rgb(0.85, 0.85, 0.85),
        })
        y -= 25
      } else {
        // Simple header for continuation pages
        page.drawText("Sélection de luminaires (suite)", {
          x: margin,
          y: y,
          size: 14,
          font: timesRomanFont,
          color: brownColor,
        })
        y -= 10
        page.drawLine({
          start: { x: margin, y: y },
          end: { x: pageWidth - margin, y: y },
          thickness: 0.5,
          color: rgb(0.85, 0.85, 0.85),
        })
        y -= 30
      }

      return y
    }

    // Process luminaires in pages
    let currentPage = pdfDoc.addPage([pageWidth, pageHeight])
    let currentY = drawHeader(currentPage, true)
    let itemsOnCurrentPage = 0
    let pageIndex = 0

    for (let i = 0; i < luminaires.length; i++) {
      const lum = luminaires[i]

      // Check if we need a new page
      if (currentY < margin + 100 || itemsOnCurrentPage >= itemsPerPage) {
        drawFooter(currentPage)
        currentPage = pdfDoc.addPage([pageWidth, pageHeight])
        pageIndex++
        currentY = drawHeader(currentPage, false)
        itemsOnCurrentPage = 0
      }

      const itemStartY = currentY

      // Try to load and embed image
      let imageWidth = 100
      let imageHeight = 100
      
      if (lum.image_url) {
        try {
          const imageData = await fetchImageAsBase64(lum.image_url)
          if (imageData) {
            let image
            if (imageData.type === "png") {
              image = await pdfDoc.embedPng(imageData.data)
            } else {
              image = await pdfDoc.embedJpg(imageData.data)
            }
            
            // Scale image to fit
            const scale = Math.min(imageWidth / image.width, imageHeight / image.height)
            const scaledWidth = image.width * scale
            const scaledHeight = image.height * scale
            
            currentPage.drawImage(image, {
              x: margin,
              y: itemStartY - scaledHeight,
              width: scaledWidth,
              height: scaledHeight,
            })
          }
        } catch {
          // Draw placeholder rectangle if image fails
          currentPage.drawRectangle({
            x: margin,
            y: itemStartY - imageHeight,
            width: imageWidth,
            height: imageHeight,
            borderColor: rgb(0.9, 0.9, 0.9),
            borderWidth: 1,
          })
        }
      }

      // Text content - positioned to the right of the image
      const textX = margin + imageWidth + 15
      let textY = itemStartY - 5

      // Luminaire name
      const displayName = lum.nom || `Luminaire ${i + 1}`
      currentPage.drawText(displayName, {
        x: textX,
        y: textY,
        size: 12,
        font: helveticaBoldFont,
        color: textColor,
      })
      textY -= 16

      // Dimensions
      if (lum.dimensions) {
        currentPage.drawText(`Dimensions : ${lum.dimensions}`, {
          x: textX,
          y: textY,
          size: 9,
          font: helveticaFont,
          color: lightGrayColor,
        })
        textY -= 13
      }

      // Puissance
      if (lum.puissance) {
        currentPage.drawText(`Puissance : ${lum.puissance}`, {
          x: textX,
          y: textY,
          size: 9,
          font: helveticaFont,
          color: lightGrayColor,
        })
        textY -= 13
      }

      // Matériau
      if (lum.materiau) {
        currentPage.drawText(`Matériau : ${lum.materiau}`, {
          x: textX,
          y: textY,
          size: 9,
          font: helveticaFont,
          color: lightGrayColor,
        })
        textY -= 13
      }

      // Price - positioned on the right
      const priceText = lum.prix_ht ? `${lum.prix_ht} €` : "Prix sur demande"
      currentPage.drawText(priceText, {
        x: pageWidth - margin - 100,
        y: itemStartY - 5,
        size: 11,
        font: helveticaBoldFont,
        color: brownColor,
      })

      // Separator line
      currentY = itemStartY - itemHeight
      currentPage.drawLine({
        start: { x: margin, y: currentY + 50 },
        end: { x: pageWidth - margin, y: currentY + 50 },
        thickness: 0.5,
        color: rgb(0.92, 0.92, 0.92),
      })

      currentY -= 20
      itemsOnCurrentPage++
    }

    // Draw footer on last page
    drawFooter(currentPage)

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save()

    // Return PDF as response
    return new NextResponse(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Selection_${client_name.replace(/\s+/g, "_")}.pdf"`,
      },
    })
  } catch (error) {
    console.error("PDF generation error:", error)
    return NextResponse.json(
      { error: "Erreur lors de la génération du PDF" },
      { status: 500 }
    )
  }
}
