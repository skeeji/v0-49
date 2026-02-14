"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { RoleGuard } from "@/components/RoleGuard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  Plus,
  X,
  Upload,
  ExternalLink,
  Trash2,
  ArrowLeft,
  Clock,
  AlertTriangle,
  Euro,
  FolderOpen,
  TrendingUp,
  CheckSquare,
  Square,
  ListChecks,
  CalendarDays,
  StickyNote,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"

interface CrmAction {
  id: string
  text: string
  done: boolean
  dueDate?: string | null
}

interface CrmProject {
  _id: string
  name: string
  status: "En cours" | "Gagné" | "Perdu"
  budget: number
  progress: number
  timeSpent: number
  timeEstimated: number
  deadline: string | null
  notes: string
  actions: CrmAction[]
  driveLink: string
  imageId: string | null
  createdAt: string
  updatedAt: string
}

function calcProgress(timeSpent: number, timeEstimated: number): number {
  if (timeEstimated <= 0) return 0
  return Math.min(Math.round((timeSpent / timeEstimated) * 100), 100)
}

interface CrmStats {
  caEnCours: number
  caGagne: number
  projetsActifs: number
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function isDeadlinePassed(deadline: string | null, status: string): boolean {
  if (!deadline || status !== "En cours") return false
  return new Date(deadline) < new Date()
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    "En cours": "bg-blue-50 text-blue-700 border-blue-200",
    "Gagné": "bg-emerald-50 text-emerald-700 border-emerald-200",
    "Perdu": "bg-red-50 text-red-700 border-red-200",
  }
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || "bg-gray-50 text-gray-700 border-gray-200"}`}
    >
      {status}
    </span>
  )
}

// --- New Project Modal ---
function NewProjectModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: () => void
}) {
  const [name, setName] = useState("")
  const [budget, setBudget] = useState("")
  const [timeEstimated, setTimeEstimated] = useState("")
  const [deadline, setDeadline] = useState("")
  const [saving, setSaving] = useState(false)

  const handleCreate = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      const res = await fetch("/api/crm/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          budget: Number(budget) || 0,
          timeEstimated: Number(timeEstimated) || 0,
          deadline: deadline || null,
        }),
      })
      if (res.ok) {
        onCreated()
        onClose()
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Nouveau projet</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Nom du projet *
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nom du projet"
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Budget (EUR)
              </label>
              <Input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Temps estime (heures)
              </label>
              <Input
                type="number"
                value={timeEstimated}
                onChange={(e) => setTimeEstimated(e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Date butoir
              </label>
              <Input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!name.trim() || saving}
              className="text-white"
              style={{ backgroundColor: "#8b7355" }}
            >
              {saving ? "Creation..." : "Creer"}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

// --- Detail Panel (Sheet) ---
function DetailPanel({
  project,
  onClose,
  onUpdate,
  onDelete,
}: {
  project: CrmProject
  onClose: () => void
  onUpdate: () => void
  onDelete: () => void
}) {
  const [notes, setNotes] = useState(project.notes || "")
  const [actions, setActions] = useState<CrmAction[]>(project.actions || [])
  const [newAction, setNewAction] = useState("")
  const [driveLink, setDriveLink] = useState(project.driveLink || "")
  const [timeSpent, setTimeSpent] = useState(project.timeSpent || 0)
  const [budget, setBudget] = useState(project.budget || 0)
  const [timeEstimated, setTimeEstimated] = useState(project.timeEstimated || 0)
  const [deadline, setDeadline] = useState(project.deadline || "")
  const [status, setStatus] = useState(project.status)
  const [name, setName] = useState(project.name)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [imageId, setImageId] = useState(project.imageId)
  const [deleting, setDeleting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSave = async () => {
    setSaving(true)
    try {
      await fetch(`/api/crm/projects/${project._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          notes,
          actions,
          driveLink,
          progress: calcProgress(timeSpent, timeEstimated),
          timeSpent,
          budget,
          timeEstimated,
          deadline: deadline || null,
          status,
        }),
      })
      onUpdate()
    } finally {
      setSaving(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("projectId", project._id)
      const res = await fetch("/api/crm/upload", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()
      if (data.success) {
        setImageId(data.fileId)
        onUpdate()
      }
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Supprimer ce projet ?")) return
    setDeleting(true)
    try {
      await fetch(`/api/crm/projects/${project._id}`, { method: "DELETE" })
      onDelete()
      onClose()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Retour</span>
          </button>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleDelete}
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
              disabled={deleting}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="p-6 flex flex-col gap-6">
          {/* Image */}
          <div>
            {imageId ? (
              <div className="relative w-full h-48 rounded-lg overflow-hidden bg-gray-100">
                <Image
                  src={`/api/crm/images/${imageId}`}
                  alt={name}
                  fill
                  className="object-cover"
                  unoptimized
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-2 right-2 bg-white/90 hover:bg-white text-gray-700 text-xs px-3 py-1.5 rounded-md shadow-sm transition-colors"
                >
                  Changer
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-36 border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-[#8b7355] hover:text-[#8b7355] transition-colors"
              >
                <Upload className="w-6 h-6" />
                <span className="text-sm">
                  {uploading ? "Upload en cours..." : "Ajouter une image"}
                </span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
          </div>

          {/* Name */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">
              Nom du projet
            </label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          {/* Status */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">
              Statut
            </label>
            <div className="flex gap-2">
              {(["En cours", "Gagné", "Perdu"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    status === s
                      ? s === "En cours"
                        ? "bg-blue-100 text-blue-700 ring-2 ring-blue-300"
                        : s === "Gagné"
                          ? "bg-emerald-100 text-emerald-700 ring-2 ring-emerald-300"
                          : "bg-red-100 text-red-700 ring-2 ring-red-300"
                      : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Budget */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">
              Budget (EUR)
            </label>
            <Input
              type="number"
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
            />
          </div>

          {/* Time tracking + auto progress */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">
              Temps passe / estime
            </label>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <span className="text-xs text-gray-400 block mb-1">Passe (h)</span>
                <Input
                  type="number"
                  value={timeSpent}
                  onChange={(e) => setTimeSpent(Number(e.target.value))}
                />
              </div>
              <div>
                <span className="text-xs text-gray-400 block mb-1">Estime (h)</span>
                <Input
                  type="number"
                  value={timeEstimated}
                  onChange={(e) => setTimeEstimated(Number(e.target.value))}
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Progress value={calcProgress(timeSpent, timeEstimated)} className="h-2 flex-1" />
              <span className="text-xs font-medium text-gray-600 w-10 text-right">
                {calcProgress(timeSpent, timeEstimated)}%
              </span>
            </div>
            {timeEstimated > 0 && timeSpent > timeEstimated && (
              <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Depassement de {timeSpent - timeEstimated}h sur l{"'"}estimation
              </p>
            )}
          </div>

          {/* Deadline */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">
              Date butoir
            </label>
            <Input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>

          {/* Drive link */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">
              Lien Google Drive
            </label>
            <div className="flex gap-2">
              <Input
                value={driveLink}
                onChange={(e) => setDriveLink(e.target.value)}
                placeholder="https://drive.google.com/..."
                className="flex-1"
              />
              {driveLink && (
                <a
                  href={driveLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-10 h-10 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>

          {/* Actions a mener */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">
              Actions a mener
            </label>
            <div className="flex flex-col gap-2">
              {actions.map((action) => {
                const isOverdue = !action.done && action.dueDate && new Date(action.dueDate) < new Date()
                return (
                  <div
                    key={action.id}
                    className={`flex items-start gap-2 group rounded-lg p-2 -mx-2 transition-colors ${isOverdue ? "bg-red-50/60" : ""}`}
                  >
                    <button
                      onClick={() =>
                        setActions((prev) =>
                          prev.map((a) =>
                            a.id === action.id ? { ...a, done: !a.done } : a
                          )
                        )
                      }
                      className="mt-0.5 flex-shrink-0 text-gray-400 hover:text-[#8b7355] transition-colors"
                    >
                      {action.done ? (
                        <CheckSquare className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <span
                        className={`text-sm block ${action.done ? "line-through text-gray-400" : "text-gray-700"}`}
                      >
                        {action.text}
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="date"
                          value={action.dueDate || ""}
                          onChange={(e) =>
                            setActions((prev) =>
                              prev.map((a) =>
                                a.id === action.id ? { ...a, dueDate: e.target.value || null } : a
                              )
                            )
                          }
                          className={`text-xs border-0 bg-transparent p-0 ${
                            isOverdue
                              ? "text-red-500 font-medium"
                              : action.dueDate
                                ? "text-gray-500"
                                : "text-gray-300"
                          }`}
                        />
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        setActions((prev) => prev.filter((a) => a.id !== action.id))
                      }
                      className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all flex-shrink-0 mt-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )
              })}
              <div className="flex gap-2">
                <Input
                  value={newAction}
                  onChange={(e) => setNewAction(e.target.value)}
                  placeholder="Ajouter une action..."
                  className="flex-1 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newAction.trim()) {
                      setActions((prev) => [
                        ...prev,
                        { id: Date.now().toString(), text: newAction.trim(), done: false, dueDate: null },
                      ])
                      setNewAction("")
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-shrink-0 px-3"
                  disabled={!newAction.trim()}
                  onClick={() => {
                    if (newAction.trim()) {
                      setActions((prev) => [
                        ...prev,
                        { id: Date.now().toString(), text: newAction.trim(), done: false, dueDate: null },
                      ])
                      setNewAction("")
                    }
                  }}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {actions.length === 0 && (
                <p className="text-xs text-gray-400 italic">Aucune action pour le moment</p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">
              Notes
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={6}
              placeholder="Notes sur le projet..."
              className="resize-none"
            />
          </div>

          {/* Save button */}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full text-white py-3"
            style={{ backgroundColor: "#8b7355" }}
          >
            {saving ? "Sauvegarde..." : "Sauvegarder"}
          </Button>
        </div>
      </div>
    </>
  )
}

// --- Main CRM Page ---
export default function CrmPage() {
  const { userData } = useAuth()
  const [projects, setProjects] = useState<CrmProject[]>([])
  const [stats, setStats] = useState<CrmStats>({ caEnCours: 0, caGagne: 0, projetsActifs: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [showNewModal, setShowNewModal] = useState(false)
  const [selectedProject, setSelectedProject] = useState<CrmProject | null>(null)

  const fetchProjects = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      if (filterStatus !== "all") params.set("status", filterStatus)
      const res = await fetch(`/api/crm/projects?${params.toString()}`)
      const data = await res.json()
      if (data.success) {
        setProjects(data.projects)
        setStats(data.stats)
      }
    } catch (error) {
      console.error("Error fetching CRM projects:", error)
    } finally {
      setLoading(false)
    }
  }, [search, filterStatus])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const handleRefresh = () => {
    fetchProjects()
    // Refresh selected project if open
    if (selectedProject) {
      const updated = projects.find((p) => p._id === selectedProject._id)
      if (updated) setSelectedProject(updated)
    }
  }

  const filters = [
    { key: "all", label: "Tous" },
    { key: "En cours", label: "En cours" },
    { key: "Gagné", label: "Gagne" },
    { key: "Perdu", label: "Perdu" },
  ]

  return (
    <RoleGuard requiredRole="admin">
      <div className="min-h-screen" style={{ backgroundColor: "#f5f1e8" }}>
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link
                  href="/"
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                  <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">CRM</h1>
                  <p className="text-sm text-gray-500 mt-0.5">Gestion des projets</p>
                </div>
              </div>
              <Button
                onClick={() => setShowNewModal(true)}
                className="text-white gap-2"
                style={{ backgroundColor: "#8b7355" }}
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Nouveau projet</span>
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
          {/* Stats cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Euro className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-sm font-medium text-gray-500">CA En Cours</span>
              </div>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(stats.caEnCours)}
              </p>
            </div>
            <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                </div>
                <span className="text-sm font-medium text-gray-500">CA Gagne</span>
              </div>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(stats.caGagne)}
              </p>
            </div>
            <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
                  <FolderOpen className="w-4 h-4 text-amber-600" />
                </div>
                <span className="text-sm font-medium text-gray-500">Projets actifs</span>
              </div>
              <p className="text-2xl font-semibold text-gray-900">{stats.projetsActifs}</p>
            </div>
          </div>

          {/* Search and filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un projet..."
                className="pl-10 bg-white"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto">
              {filters.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilterStatus(f.key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                    filterStatus === f.key
                      ? "bg-[#8b7355] text-white shadow-sm"
                      : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="bg-white rounded-xl p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8b7355] mx-auto" />
              <p className="text-gray-500 mt-4 text-sm">Chargement...</p>
            </div>
          ) : projects.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center border border-gray-100">
              <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Aucun projet trouve</p>
              <Button
                onClick={() => setShowNewModal(true)}
                variant="outline"
                className="mt-4"
              >
                Creer un premier projet
              </Button>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">
                        Projet
                      </th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">
                        Statut
                      </th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">
                        Temps / Progression
                      </th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">
                        Actions / Notes
                      </th>
                      <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">
                        Budget
                      </th>
                      <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">
                        Echeance
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((project) => {
                      const deadlinePassed = isDeadlinePassed(project.deadline, project.status)
                      const timeExceeded =
                        project.timeEstimated > 0 && project.timeSpent > project.timeEstimated
                      return (
                        <tr
                          key={project._id}
                          onClick={() => setSelectedProject(project)}
                          className="border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer transition-colors"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                {project.imageId ? (
                                  <Image
                                    src={`/api/crm/images/${project.imageId}`}
                                    alt=""
                                    width={36}
                                    height={36}
                                    className="w-full h-full object-cover"
                                    unoptimized
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs font-medium">
                                    {project.name.charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </div>
                              <span className="font-medium text-gray-900 text-sm">
                                {project.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <StatusBadge status={project.status} />
                          </td>
                          <td className="px-5 py-4">
                            {(() => {
                              const pct = calcProgress(project.timeSpent, project.timeEstimated)
                              return (
                                <div className="min-w-[140px]">
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <span className={`text-xs font-medium ${timeExceeded ? "text-amber-600" : "text-gray-600"}`}>
                                      {project.timeSpent}h
                                    </span>
                                    <span className="text-xs text-gray-300">/</span>
                                    <span className="text-xs text-gray-500">{project.timeEstimated}h</span>
                                    {timeExceeded && <AlertTriangle className="w-3 h-3 text-amber-500" />}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Progress value={pct} className="h-1.5 flex-1" />
                                    <span className="text-xs text-gray-400 w-7 text-right">{pct}%</span>
                                  </div>
                                </div>
                              )
                            })()}
                          </td>
                          <td className="px-5 py-4">
                            {(() => {
                              const projectActions = (project.actions || []) as CrmAction[]
                              const total = projectActions.length
                              const done = projectActions.filter((a) => a.done).length
                              const pending = total - done
                              const nextAction = projectActions.find((a) => !a.done)
                              const hasNotes = !!project.notes?.trim()
                              return (
                                <div className="flex flex-col gap-1 min-w-[160px] max-w-[240px]">
                                  {total > 0 && (
                                    <div className="flex items-center gap-1.5">
                                      <ListChecks className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                      <span className={`text-xs ${pending > 0 ? "text-amber-600 font-medium" : "text-emerald-600"}`}>
                                        {done}/{total}
                                      </span>
                                      {nextAction && (
                                        <span className="text-xs text-gray-500 truncate ml-1">
                                          - {nextAction.text}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  {nextAction?.dueDate && (
                                    <div className="flex items-center gap-1 ml-5">
                                      <CalendarDays className="w-3 h-3 text-gray-300 flex-shrink-0" />
                                      <span className={`text-xs ${new Date(nextAction.dueDate) < new Date() ? "text-red-500 font-medium" : "text-gray-400"}`}>
                                        {new Date(nextAction.dueDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                                      </span>
                                    </div>
                                  )}
                                  {hasNotes && (
                                    <div className="flex items-center gap-1.5">
                                      <StickyNote className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                                      <span className="text-xs text-gray-400 truncate">
                                        {project.notes!.substring(0, 40)}{project.notes!.length > 40 ? "..." : ""}
                                      </span>
                                    </div>
                                  )}
                                  {total === 0 && !hasNotes && (
                                    <span className="text-xs text-gray-300">-</span>
                                  )}
                                </div>
                              )
                            })()}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <span className="text-sm font-medium text-gray-900">
                              {formatCurrency(project.budget)}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            {project.deadline ? (
                              <span
                                className={`text-sm ${deadlinePassed ? "text-red-600 font-medium" : "text-gray-600"}`}
                              >
                                {new Date(project.deadline).toLocaleDateString("fr-FR", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="flex flex-col gap-3 md:hidden">
                {projects.map((project) => {
                  const deadlinePassed = isDeadlinePassed(project.deadline, project.status)
                  const timeExceeded =
                    project.timeEstimated > 0 && project.timeSpent > project.timeEstimated
                  return (
                    <div
                      key={project._id}
                      onClick={() => setSelectedProject(project)}
                      className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm cursor-pointer active:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                          {project.imageId ? (
                            <Image
                              src={`/api/crm/images/${project.imageId}`}
                              alt=""
                              width={40}
                              height={40}
                              className="w-full h-full object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm font-medium">
                              {project.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 text-sm truncate">
                            {project.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <StatusBadge status={project.status} />
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-gray-900">
                          {formatCurrency(project.budget)}
                        </span>
                      </div>
                      {/* Time + Progress */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs font-medium ${timeExceeded ? "text-amber-600" : "text-gray-600"}`}>
                          {project.timeSpent}h
                        </span>
                        <Progress value={calcProgress(project.timeSpent, project.timeEstimated)} className="h-1.5 flex-1" />
                        <span className="text-xs text-gray-400">
                          {project.timeEstimated}h
                        </span>
                      </div>

                      {/* Actions summary */}
                      {(() => {
                        const projectActions = (project.actions || []) as CrmAction[]
                        const total = projectActions.length
                        const done = projectActions.filter((a) => a.done).length
                        const pending = total - done
                        const nextAction = projectActions.find((a) => !a.done)
                        if (total === 0) return null
                        return (
                          <div className="mb-2 text-xs flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5">
                              <ListChecks className="w-3 h-3 text-gray-400 flex-shrink-0" />
                              <span className={pending > 0 ? "text-amber-600 font-medium" : "text-emerald-600"}>
                                {done}/{total}
                              </span>
                              {nextAction && (
                                <span className="text-gray-500 truncate">
                                  - {nextAction.text}
                                </span>
                              )}
                            </div>
                            {nextAction?.dueDate && (
                              <div className="flex items-center gap-1 ml-4">
                                <CalendarDays className="w-3 h-3 text-gray-300 flex-shrink-0" />
                                <span className={new Date(nextAction.dueDate) < new Date() ? "text-red-500 font-medium" : "text-gray-400"}>
                                  {new Date(nextAction.dueDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                                </span>
                              </div>
                            )}
                          </div>
                        )
                      })()}

                      {/* Notes preview */}
                      {project.notes?.trim() && (
                        <div className="flex items-center gap-1.5 mb-2 text-xs">
                          <StickyNote className="w-3 h-3 text-gray-300 flex-shrink-0" />
                          <span className="text-gray-400 truncate">
                            {project.notes.substring(0, 50)}{project.notes.length > 50 ? "..." : ""}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{calcProgress(project.timeSpent, project.timeEstimated)}%</span>
                        </div>
                        {project.deadline && (
                          <span className={deadlinePassed ? "text-red-600 font-medium" : ""}>
                            {new Date(project.deadline).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* New project modal */}
        {showNewModal && (
          <NewProjectModal
            onClose={() => setShowNewModal(false)}
            onCreated={() => fetchProjects()}
          />
        )}

        {/* Detail panel */}
        {selectedProject && (
          <DetailPanel
            key={selectedProject._id}
            project={selectedProject}
            onClose={() => setSelectedProject(null)}
            onUpdate={handleRefresh}
            onDelete={() => {
              setSelectedProject(null)
              fetchProjects()
            }}
          />
        )}
      </div>
    </RoleGuard>
  )
}
