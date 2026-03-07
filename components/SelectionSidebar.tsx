"use client"

import { useState } from "react"
import { X, Trash2, FileText, Loader2, ShoppingBag, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSelection } from "@/contexts/SelectionContext"
import Image from "next/image"
import { toast } from "sonner"

export function SelectionSidebar() {
  const {
    selection,
    clientName,
    setClientName,
    removeFromSelection,
    updateLuminaire,
    clearSelection,
    isSelectionOpen,
    setIsSelectionOpen,
  } = useSelection()

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [expandedItem, setExpandedItem] = useState<string | null>(null)

  const handleGeneratePDF = async () => {
    if (!clientName.trim()) {
      toast.error("Veuillez saisir le nom du client")
      return
    }

    if (selection.length === 0) {
      toast.error("Votre sélection est vide")
      return
    }

    setIsGeneratingPDF(true)

    try {
      // Format payload with ALL editable data from selection
      const payload = {
        client_name: clientName,
        items: selection.map((item) => ({
          image_id: item.imageId || "",
          nom: item.nom || "",
          artiste: item.artiste || "",
          annee: item.annee || "",
          image_url: item.imageUrl || "",
          dimensions: item.dimensions || "",
          materiaux: item.materiaux || "",
          puissance: item.puissance || "",
          prix: item.prixHT || "",
        })),
      }

      const response = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || "Erreur lors de la génération du PDF")
      }

      // Download the PDF
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `selection_${clientName.replace(/\s+/g, "_")}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success("PDF généré avec succès")
    } catch (error) {
      console.error("PDF generation error:", error)
      toast.error("Erreur lors de la génération du PDF")
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedItem(expandedItem === id ? null : id)
  }

  return (
    <>
      {/* Floating toggle button - Mobile only */}
      <button
        onClick={() => setIsSelectionOpen(true)}
        className="fixed bottom-6 left-6 z-40 bg-[#8b7355] hover:bg-[#7a6548] text-white rounded-full p-4 shadow-lg transition-all duration-200 hover:scale-105 md:hidden"
        aria-label="Ouvrir la sélection"
      >
        <ShoppingBag className="w-5 h-5" />
        {selection.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
            {selection.length}
          </span>
        )}
      </button>

      {/* Overlay for mobile */}
      {isSelectionOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
          onClick={() => setIsSelectionOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`selection-sidebar fixed top-0 right-0 h-full z-50 bg-[#faf8f5] border-l border-stone-200 shadow-xl transition-transform duration-300 ease-in-out flex flex-col
          w-full sm:w-96 md:w-[420px]
          ${isSelectionOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-stone-200 bg-white">
          <div className="flex items-center gap-3">
            <ShoppingBag className="w-5 h-5 text-[#8b7355]" />
            <h2 className="text-xl font-serif text-stone-800 tracking-wide">Ma Sélection</h2>
            {selection.length > 0 && (
              <span className="px-2.5 py-0.5 bg-[#8b7355] text-white text-xs rounded-full font-medium">
                {selection.length}
              </span>
            )}
          </div>
          <button
            onClick={() => setIsSelectionOpen(false)}
            className="p-2 hover:bg-stone-100 rounded-full transition-colors"
            aria-label="Fermer"
          >
            <X className="w-5 h-5 text-stone-500" />
          </button>
        </div>

        {/* Client name input */}
        <div className="p-5 bg-white border-b border-stone-100">
          <Label htmlFor="clientName" className="text-sm font-medium text-stone-600 mb-2 block tracking-wide">
            Nom du Client
          </Label>
          <Input
            id="clientName"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Ex: David Bitton"
            className="bg-[#faf8f5] border-stone-200 focus:border-[#8b7355] focus:ring-[#8b7355]/20 h-11"
          />
        </div>

        {/* Selection list */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {selection.length === 0 ? (
            <div className="text-center py-16">
              <ShoppingBag className="w-14 h-14 mx-auto text-stone-200 mb-4" />
              <p className="text-stone-500 font-serif text-lg">Votre sélection est vide</p>
              <p className="text-stone-400 text-sm mt-2">
                Cliquez sur + pour ajouter des luminaires
              </p>
            </div>
          ) : (
            selection.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-lg border border-stone-100 overflow-hidden shadow-sm"
              >
                {/* Item header - Image left / Info right layout */}
                <div className="flex gap-4 p-4">
                  <div className="relative w-20 h-20 rounded overflow-hidden flex-shrink-0 bg-stone-50 border border-stone-100">
                    <Image
                      src={item.imageUrl || "/placeholder.svg"}
                      alt={item.nom}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-serif text-stone-800 text-base leading-tight line-clamp-2">
                      {item.nom}
                    </h4>
                    <p className="text-sm text-stone-500 mt-0.5 italic">{item.artiste}</p>
                    <button
                      onClick={() => toggleExpand(item.id)}
                      className="flex items-center gap-1 text-xs text-[#8b7355] mt-2 hover:underline font-medium"
                    >
                      Modifier
                      <ChevronRight
                        className={`w-3 h-3 transition-transform ${expandedItem === item.id ? "rotate-90" : ""}`}
                      />
                    </button>
                  </div>
                  <button
                    onClick={() => removeFromSelection(item.id)}
                    className="p-1.5 hover:bg-red-50 rounded-full transition-colors self-start -mt-1 -mr-1"
                    aria-label="Supprimer"
                  >
                    <Trash2 className="w-4 h-4 text-stone-300 hover:text-red-500" />
                  </button>
                </div>

                {/* Expanded edit section - All fields editable */}
                {expandedItem === item.id && (
                  <div className="px-4 pb-4 pt-2 border-t border-stone-50 space-y-3 bg-[#faf8f5]">
                    <div>
                      <Label className="text-xs text-stone-500 uppercase tracking-wider">Nom</Label>
                      <Input
                        value={item.nom || ""}
                        onChange={(e) => updateLuminaire(item.id, { nom: e.target.value })}
                        placeholder="Nom du luminaire"
                        className="h-9 text-sm bg-white border-stone-200 mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-stone-500 uppercase tracking-wider">Designer / Artiste</Label>
                      <Input
                        value={item.artiste || ""}
                        onChange={(e) => updateLuminaire(item.id, { artiste: e.target.value })}
                        placeholder="Ex: Evert Jelle Jelles"
                        className="h-9 text-sm bg-white border-stone-200 mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-stone-500 uppercase tracking-wider">Dimensions</Label>
                      <Input
                        value={item.dimensions || ""}
                        onChange={(e) => updateLuminaire(item.id, { dimensions: e.target.value })}
                        placeholder="Ex: H: 27 cm - L: 27 cm - P: 9 cm"
                        className="h-9 text-sm bg-white border-stone-200 mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-stone-500 uppercase tracking-wider">Materiaux</Label>
                      <Input
                        value={item.materiaux || ""}
                        onChange={(e) => updateLuminaire(item.id, { materiaux: e.target.value })}
                        placeholder="Ex: aluminium, laque"
                        className="h-9 text-sm bg-white border-stone-200 mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-stone-500 uppercase tracking-wider">Puissance / Lumens</Label>
                      <Input
                        value={item.puissance || ""}
                        onChange={(e) => updateLuminaire(item.id, { puissance: e.target.value })}
                        placeholder="Ex: E27 / LED integree"
                        className="h-9 text-sm bg-white border-stone-200 mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-stone-500 uppercase tracking-wider">Prix HT</Label>
                      <Input
                        value={item.prixHT || ""}
                        onChange={(e) => updateLuminaire(item.id, { prixHT: e.target.value })}
                        placeholder="Ex: 200 - 300"
                        className="h-9 text-sm bg-white border-stone-200 mt-1"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer actions */}
        <div className="p-5 bg-white border-t border-stone-200 space-y-3">
          <Button
            onClick={handleGeneratePDF}
            disabled={selection.length === 0 || isGeneratingPDF}
            className="w-full bg-[#8b7355] hover:bg-[#7a6548] text-white font-medium h-12 text-base"
          >
            {isGeneratingPDF ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Génération en cours...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                Générer la Sélection
              </>
            )}
          </Button>
          {selection.length > 0 && (
            <Button
              onClick={clearSelection}
              variant="ghost"
              className="w-full text-stone-500 hover:text-stone-700 hover:bg-stone-50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Vider la sélection
            </Button>
          )}
        </div>
      </div>
    </>
  )
}
