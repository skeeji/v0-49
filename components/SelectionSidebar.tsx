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
      const payload = {
        client_name: clientName,
        luminaires: selection.map((item) => ({
          image_id: item.imageId || item.luminaireId || item.id,
          nom: item.nom,
          artiste: item.artiste,
          dimensions: item.dimensions || "",
          puissance: item.puissance || "",
          prix_ht: item.prixHT || "",
          materiau: item.materiau || "",
          image_url: item.imageUrl,
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
        throw new Error("Erreur lors de la génération du PDF")
      }

      // Download the PDF
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `Selection_${clientName.replace(/\s+/g, "_")}.pdf`
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
      {/* Floating toggle button */}
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
        className={`fixed top-0 right-0 h-full z-50 bg-[#faf8f5] border-l border-stone-200 shadow-xl transition-transform duration-300 ease-in-out flex flex-col
          w-full sm:w-96 md:w-[400px]
          ${isSelectionOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-200 bg-white">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#8b7355]" />
            <h2 className="text-lg font-serif text-stone-800">Ma Sélection</h2>
            {selection.length > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-[#8b7355] text-white text-xs rounded-full">
                {selection.length}
              </span>
            )}
          </div>
          <button
            onClick={() => setIsSelectionOpen(false)}
            className="p-1.5 hover:bg-stone-100 rounded-full transition-colors"
            aria-label="Fermer"
          >
            <X className="w-5 h-5 text-stone-600" />
          </button>
        </div>

        {/* Client name input */}
        <div className="p-4 bg-white border-b border-stone-200">
          <Label htmlFor="clientName" className="text-sm font-medium text-stone-700 mb-1.5 block">
            Nom du Client
          </Label>
          <Input
            id="clientName"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Ex: David Bitton"
            className="bg-[#faf8f5] border-stone-300 focus:border-[#8b7355] focus:ring-[#8b7355]"
          />
        </div>

        {/* Selection list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {selection.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="w-12 h-12 mx-auto text-stone-300 mb-3" />
              <p className="text-stone-500 text-sm">Votre sélection est vide</p>
              <p className="text-stone-400 text-xs mt-1">
                Cliquez sur le bouton + des luminaires pour les ajouter
              </p>
            </div>
          ) : (
            selection.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-lg border border-stone-200 overflow-hidden shadow-sm"
              >
                {/* Item header */}
                <div className="flex gap-3 p-3">
                  <div className="relative w-16 h-16 rounded-md overflow-hidden flex-shrink-0 bg-stone-100">
                    <Image
                      src={item.imageUrl || "/placeholder.svg"}
                      alt={item.nom}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-stone-800 text-sm line-clamp-1">{item.nom}</h4>
                    <p className="text-xs text-stone-500">{item.artiste}</p>
                    <button
                      onClick={() => toggleExpand(item.id)}
                      className="flex items-center gap-1 text-xs text-[#8b7355] mt-1 hover:underline"
                    >
                      Éditer les détails
                      <ChevronRight
                        className={`w-3 h-3 transition-transform ${expandedItem === item.id ? "rotate-90" : ""}`}
                      />
                    </button>
                  </div>
                  <button
                    onClick={() => removeFromSelection(item.id)}
                    className="p-1.5 hover:bg-red-50 rounded-full transition-colors self-start"
                    aria-label="Supprimer"
                  >
                    <Trash2 className="w-4 h-4 text-red-400 hover:text-red-600" />
                  </button>
                </div>

                {/* Expanded edit section */}
                {expandedItem === item.id && (
                  <div className="px-3 pb-3 pt-1 border-t border-stone-100 space-y-2 bg-stone-50">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-stone-600">Dimensions</Label>
                        <Input
                          value={item.dimensions || ""}
                          onChange={(e) => updateLuminaire(item.id, { dimensions: e.target.value })}
                          placeholder="Ex: 45 x 55 cm"
                          className="h-8 text-sm bg-white"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-stone-600">Puissance</Label>
                        <Input
                          value={item.puissance || ""}
                          onChange={(e) => updateLuminaire(item.id, { puissance: e.target.value })}
                          placeholder="Ex: E27 / 866lm"
                          className="h-8 text-sm bg-white"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-stone-600">Matériau</Label>
                        <Input
                          value={item.materiau || ""}
                          onChange={(e) => updateLuminaire(item.id, { materiau: e.target.value })}
                          placeholder="Ex: Verre, Laiton"
                          className="h-8 text-sm bg-white"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-stone-600">Prix HT (€)</Label>
                        <Input
                          value={item.prixHT || ""}
                          onChange={(e) => updateLuminaire(item.id, { prixHT: e.target.value })}
                          placeholder="Ex: 698,00"
                          className="h-8 text-sm bg-white"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 bg-white border-t border-stone-200 space-y-2">
          <Button
            onClick={handleGeneratePDF}
            disabled={selection.length === 0 || isGeneratingPDF}
            className="w-full bg-[#8b7355] hover:bg-[#7a6548] text-white font-medium"
          >
            {isGeneratingPDF ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Génération en cours...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                Générer la Sélection PDF
              </>
            )}
          </Button>
          {selection.length > 0 && (
            <Button
              onClick={clearSelection}
              variant="outline"
              className="w-full border-stone-300 text-stone-600 hover:bg-stone-50"
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
