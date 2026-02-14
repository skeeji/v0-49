"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { RoleGuard } from "@/components/RoleGuard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

// --- Types ---
interface CRMProject {
  _id: string
  nom: string
  statut: "En cours" | "Gagné" | "Perdu"
  budget: number
  progression: number
  tempsEstime: number
  tempsPasse: number
  dateButoire: string
  notes: string
  googleDriveLink: string
  imageId: string | null
  createdAt: string
  updatedAt: string
}

type FilterStatus = "Tous" | "En cours" | "Gagné" | "Perdu"

// --- Helpers ---
function formatEuro(value: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value)
}

function isDatePassed(dateStr: string): boolean {
  if (!dateStr) return false
  return new Date(dateStr) < new Date()
}

function statusOrder(s: string): number {
  if (s === "En cours") return 0
  if (s === "Gagné") return 1
  return 2
}

// --- Sheet / Drawer Component ---
function ProjectSheet({
  project,
  onClose,
  onSave,
}: {
  project: CRMProject
  onClose: () => void
  onSave: (updated: Partial<CRMProject>) => void
}) {
  const [notes, setNotes] = useState(project.notes || "")
  const [googleDriveLink, setGoogleDriveLink] = useState(project.googleDriveLink || "")
  const [progression, setProgression] = useState(project.progression || 0)
  const [tempsPasse, setTempsPasse] = useState(project.tempsPasse || 0)
  const [nom, setNom] = useState(project.nom || "")
  const [budget, setBudget] = useState(project.budget || 0)
  const [tempsEstime, setTempsEstime] = useState(project.tempsEstime || 0)
  const [dateButoire, setDateButoire] = useState(project.dateButoire || "")
  const [statut, setStatut] = useState<CRMProject["statut"]>(project.statut || "En cours")
  const [uploading, setUploading] = useState(false)
  const [imageId, setImageId] = useState(project.imageId)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = async (file: File) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("image", file)
      const res = await fetch("/api/crm/upload-image", { method: "POST", body: formData })
      const data = await res.json()
      if (data.success) {
        setImageId(data.imageId)
        toast.success("Image uploadee")
      } else {
        toast.error(data.error || "Erreur upload")
      }
    } catch {
      toast.error("Erreur upload")
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith("image/")) handleImageUpload(file)
  }

  const handleSave = () => {
    onSave({
      _id: project._id,
      nom,
      statut,
      budget,
      progression,
      tempsEstime,
      tempsPasse,
      dateButoire,
      notes,
      googleDriveLink,
      imageId,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative w-full max-w-lg bg-white h-full overflow-y-auto shadow-2xl animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-800 truncate">{nom || "Nouveau projet"}</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700 transition-colors p-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6 flex flex-col gap-6">
          {/* Nom */}
          <div>
            <Label className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5 block">Nom du projet</Label>
            <Input value={nom} onChange={(e) => setNom(e.target.value)} className="border-stone-300 focus:border-stone-500 focus:ring-stone-500" />
          </div>

          {/* Statut */}
          <div>
            <Label className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5 block">Statut</Label>
            <div className="flex gap-2">
              {(["En cours", "Gagné", "Perdu"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatut(s)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    statut === s
                      ? s === "En cours"
                        ? "bg-blue-100 text-blue-700 ring-2 ring-blue-300"
                        : s === "Gagné"
                          ? "bg-emerald-100 text-emerald-700 ring-2 ring-emerald-300"
                          : "bg-red-100 text-red-700 ring-2 ring-red-300"
                      : "bg-stone-100 text-stone-500 hover:bg-stone-200"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Budget + Temps Estime */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5 block">Budget (EUR)</Label>
              <Input type="number" value={budget} onChange={(e) => setBudget(Number(e.target.value))} className="border-stone-300 focus:border-stone-500 focus:ring-stone-500" />
            </div>
            <div>
              <Label className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5 block">Temps estime (h)</Label>
              <Input type="number" value={tempsEstime} onChange={(e) => setTempsEstime(Number(e.target.value))} className="border-stone-300 focus:border-stone-500 focus:ring-stone-500" />
            </div>
          </div>

          {/* Date butoire */}
          <div>
            <Label className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5 block">Date butoir</Label>
            <Input type="date" value={dateButoire} onChange={(e) => setDateButoire(e.target.value)} className="border-stone-300 focus:border-stone-500 focus:ring-stone-500" />
          </div>

          {/* Progression */}
          <div>
            <Label className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5 block">
              Progression : {progression}%
            </Label>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={progression}
              onChange={(e) => setProgression(Number(e.target.value))}
              className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-stone-700"
            />
          </div>

          {/* Temps passe */}
          <div>
            <Label className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5 block">Temps passe (heures)</Label>
            <Input type="number" value={tempsPasse} onChange={(e) => setTempsPasse(Number(e.target.value))} className="border-stone-300 focus:border-stone-500 focus:ring-stone-500" />
            {tempsEstime > 0 && tempsPasse > tempsEstime && (
              <p className="text-xs text-red-500 mt-1 font-medium">Depassement de {tempsPasse - tempsEstime}h par rapport a l{"'"}estimation</p>
            )}
          </div>

          {/* Notes */}
          <div>
            <Label className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5 block">Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
              placeholder="Ajouter des notes..."
              className="border-stone-300 focus:border-stone-500 focus:ring-stone-500 resize-none"
            />
          </div>

          {/* Google Drive */}
          <div>
            <Label className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5 block">Lien Google Drive</Label>
            <div className="flex gap-2">
              <Input
                value={googleDriveLink}
                onChange={(e) => setGoogleDriveLink(e.target.value)}
                placeholder="https://drive.google.com/..."
                className="flex-1 border-stone-300 focus:border-stone-500 focus:ring-stone-500"
              />
              {googleDriveLink && (
                <a
                  href={googleDriveLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center px-3 rounded-lg bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                </a>
              )}
            </div>
          </div>

          {/* Image upload */}
          <div>
            <Label className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5 block">Image du projet</Label>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-stone-300 rounded-xl p-6 text-center cursor-pointer hover:border-stone-400 hover:bg-stone-50 transition-all"
            >
              {imageId ? (
                <img
                  src={`/api/crm/images/${imageId}`}
                  alt="Projet"
                  className="w-full h-40 object-cover rounded-lg"
                  crossOrigin="anonymous"
                />
              ) : (
                <div className="text-stone-400">
                  <svg className="mx-auto mb-2" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                  <p className="text-sm">{uploading ? "Upload en cours..." : "Glisser-deposer ou cliquer"}</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleImageUpload(file)
                }}
              />
            </div>
          </div>

          {/* Save */}
          <Button onClick={handleSave} className="w-full bg-stone-800 hover:bg-stone-900 text-white py-3 text-sm font-medium">
            Enregistrer les modifications
          </Button>
        </div>
      </div>
    </div>
  )
}

// --- New Project Modal ---
function NewProjectModal({ onClose, onCreated }: { onClose: () => void; onCreated: (p: CRMProject) => void }) {
  const [nom, setNom] = useState("")
  const [budget, setBudget] = useState(0)
  const [tempsEstime, setTempsEstime] = useState(0)
  const [dateButoire, setDateButoire] = useState("")
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    if (!nom.trim()) {
      toast.error("Le nom est requis")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/crm/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom, budget, tempsEstime, dateButoire, statut: "En cours" }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Projet cree")
        onCreated(data.project)
      } else {
        toast.error(data.error || "Erreur")
      }
    } catch {
      toast.error("Erreur creation")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-stone-800">Nouveau projet</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700 transition-colors p-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="flex flex-col gap-4">
          <div>
            <Label className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5 block">Nom du projet</Label>
            <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex: Renovation Boutique" className="border-stone-300" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5 block">Budget (EUR)</Label>
              <Input type="number" value={budget} onChange={(e) => setBudget(Number(e.target.value))} className="border-stone-300" />
            </div>
            <div>
              <Label className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5 block">Temps estime (h)</Label>
              <Input type="number" value={tempsEstime} onChange={(e) => setTempsEstime(Number(e.target.value))} className="border-stone-300" />
            </div>
          </div>
          <div>
            <Label className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5 block">Date butoir</Label>
            <Input type="date" value={dateButoire} onChange={(e) => setDateButoire(e.target.value)} className="border-stone-300" />
          </div>
          <Button onClick={handleCreate} disabled={loading} className="w-full bg-stone-800 hover:bg-stone-900 text-white mt-2">
            {loading ? "Creation..." : "Creer le projet"}
          </Button>
        </div>
      </div>
    </div>
  )
}

// --- Main CRM Page ---
export default function CRMPage() {
  const [projects, setProjects] = useState<CRMProject[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<FilterStatus>("Tous")
  const [selectedProject, setSelectedProject] = useState<CRMProject | null>(null)
  const [showNewModal, setShowNewModal] = useState(false)

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/crm/projects")
      const data = await res.json()
      if (data.success) setProjects(data.projects)
    } catch {
      toast.error("Erreur chargement projets")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const handleSave = async (updated: Partial<CRMProject>) => {
    try {
      const res = await fetch("/api/crm/projects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Projet mis a jour")
        setSelectedProject(null)
        fetchProjects()
      } else {
        toast.error(data.error || "Erreur")
      }
    } catch {
      toast.error("Erreur sauvegarde")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce projet ?")) return
    try {
      const res = await fetch(`/api/crm/projects?id=${id}`, { method: "DELETE" })
      const data = await res.json()
      if (data.success) {
        toast.success("Projet supprime")
        fetchProjects()
      }
    } catch {
      toast.error("Erreur suppression")
    }
  }

  // Filter + sort
  const filteredProjects = projects
    .filter((p) => {
      if (filter !== "Tous" && p.statut !== filter) return false
      if (search && !p.nom.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
    .sort((a, b) => statusOrder(a.statut) - statusOrder(b.statut))

  // Stats
  const caEnCours = projects.filter((p) => p.statut === "En cours").reduce((s, p) => s + (p.budget || 0), 0)
  const caGagne = projects.filter((p) => p.statut === "Gagné").reduce((s, p) => s + (p.budget || 0), 0)
  const projetsActifs = projects.filter((p) => p.statut === "En cours").length

  return (
    <RoleGuard requiredRole="admin">
      <div className="min-h-screen" style={{ backgroundColor: "#f5f1e8" }}>
        {/* Header */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-semibold text-stone-800 tracking-tight">CRM</h1>
              <p className="text-sm text-stone-500 mt-0.5">Gestion de projets</p>
            </div>
            <Button
              onClick={() => setShowNewModal(true)}
              className="bg-stone-800 hover:bg-stone-900 text-white text-sm px-5 py-2.5 rounded-lg font-medium"
            >
              <svg className="mr-2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              Nouveau projet
            </Button>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-xl p-5 border border-stone-200/60 shadow-sm">
              <p className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-1">CA En Cours</p>
              <p className="text-2xl font-semibold text-blue-600">{formatEuro(caEnCours)}</p>
            </div>
            <div className="bg-white rounded-xl p-5 border border-stone-200/60 shadow-sm">
              <p className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-1">CA Gagne</p>
              <p className="text-2xl font-semibold text-emerald-600">{formatEuro(caGagne)}</p>
            </div>
            <div className="bg-white rounded-xl p-5 border border-stone-200/60 shadow-sm">
              <p className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-1">Projets Actifs</p>
              <p className="text-2xl font-semibold text-stone-800">{projetsActifs}</p>
            </div>
          </div>

          {/* Search + Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un projet..."
                className="pl-10 bg-white border-stone-200 focus:border-stone-400 focus:ring-stone-400"
              />
            </div>
            <div className="flex gap-1.5 bg-white rounded-lg border border-stone-200 p-1">
              {(["Tous", "En cours", "Gagné", "Perdu"] as FilterStatus[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-all ${
                    filter === f
                      ? "bg-stone-800 text-white shadow-sm"
                      : "text-stone-500 hover:text-stone-700 hover:bg-stone-50"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-stone-300 border-t-stone-700" />
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="bg-white rounded-xl border border-stone-200/60 p-12 text-center">
              <p className="text-stone-400 text-sm">Aucun projet trouve</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-stone-200/60 shadow-sm overflow-hidden">
              {/* Table Header */}
              <div className="hidden lg:grid grid-cols-[48px_1fr_100px_1fr_110px_100px_110px_40px] gap-3 px-5 py-3 border-b border-stone-100 bg-stone-50/50">
                <span className="text-[11px] font-medium text-stone-400 uppercase tracking-wider" />
                <span className="text-[11px] font-medium text-stone-400 uppercase tracking-wider">Nom</span>
                <span className="text-[11px] font-medium text-stone-400 uppercase tracking-wider">Statut</span>
                <span className="text-[11px] font-medium text-stone-400 uppercase tracking-wider">Progression</span>
                <span className="text-[11px] font-medium text-stone-400 uppercase tracking-wider">Budget</span>
                <span className="text-[11px] font-medium text-stone-400 uppercase tracking-wider">Temps</span>
                <span className="text-[11px] font-medium text-stone-400 uppercase tracking-wider">Echeance</span>
                <span />
              </div>

              {/* Rows */}
              {filteredProjects.map((project) => (
                <div
                  key={project._id}
                  onClick={() => setSelectedProject(project)}
                  className="group grid grid-cols-1 lg:grid-cols-[48px_1fr_100px_1fr_110px_100px_110px_40px] gap-3 px-5 py-4 border-b border-stone-100/70 last:border-0 cursor-pointer hover:bg-stone-50/70 transition-colors"
                >
                  {/* Image */}
                  <div className="hidden lg:flex items-center">
                    {project.imageId ? (
                      <img
                        src={`/api/crm/images/${project.imageId}`}
                        alt={project.nom}
                        className="w-10 h-10 rounded-lg object-cover"
                        crossOrigin="anonymous"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center">
                        <span className="text-stone-400 text-xs font-medium">
                          {project.nom?.charAt(0)?.toUpperCase() || "?"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Nom */}
                  <div className="flex items-center">
                    <span className="font-medium text-stone-800 text-sm">{project.nom}</span>
                  </div>

                  {/* Statut */}
                  <div className="flex items-center">
                    <Badge
                      className={`text-xs font-medium border-0 ${
                        project.statut === "En cours"
                          ? "bg-blue-50 text-blue-600"
                          : project.statut === "Gagné"
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-red-50 text-red-500"
                      }`}
                    >
                      {project.statut}
                    </Badge>
                  </div>

                  {/* Progress */}
                  <div className="flex items-center gap-3">
                    <Progress value={project.progression || 0} className="h-1.5 flex-1 bg-stone-100" />
                    <span className="text-xs text-stone-400 w-8 text-right">{project.progression || 0}%</span>
                  </div>

                  {/* Budget */}
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-stone-700">{formatEuro(project.budget || 0)}</span>
                  </div>

                  {/* Temps */}
                  <div className="flex items-center">
                    <span className={`text-sm ${project.tempsEstime > 0 && project.tempsPasse > project.tempsEstime ? "text-red-500 font-medium" : "text-stone-500"}`}>
                      {project.tempsPasse || 0}h
                      {project.tempsEstime > 0 && <span className="text-stone-300">/{project.tempsEstime}h</span>}
                    </span>
                  </div>

                  {/* Date */}
                  <div className="flex items-center">
                    {project.dateButoire ? (
                      <span
                        className={`text-sm ${
                          isDatePassed(project.dateButoire) && project.statut === "En cours"
                            ? "text-red-500 font-medium"
                            : "text-stone-500"
                        }`}
                      >
                        {new Date(project.dateButoire).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                      </span>
                    ) : (
                      <span className="text-stone-300 text-sm">--</span>
                    )}
                  </div>

                  {/* Delete */}
                  <div className="flex items-center justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(project._id)
                      }}
                      className="opacity-0 group-hover:opacity-100 text-stone-300 hover:text-red-400 transition-all p-1"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sheet */}
        {selectedProject && (
          <ProjectSheet
            project={selectedProject}
            onClose={() => setSelectedProject(null)}
            onSave={handleSave}
          />
        )}

        {/* New Project Modal */}
        {showNewModal && (
          <NewProjectModal
            onClose={() => setShowNewModal(false)}
            onCreated={(p) => {
              setProjects((prev) => [p, ...prev])
              setShowNewModal(false)
            }}
          />
        )}
      </div>
    </RoleGuard>
  )
}
