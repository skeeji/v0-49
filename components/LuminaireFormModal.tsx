"use client";

import type React from "react";
import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// AJOUT
import { useAuth } from "@/contexts/AuthContext";

interface LuminaireFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (luminaireData: any) => void;
}

const luminaireCategories = [ "Suspension", "Lampadaire", "Lampe à poser", "Applique murale", "Plafonnier", "Spot", "Autre" ];

export function LuminaireFormModal({ isOpen, onClose, onSubmit }: LuminaireFormModalProps) {
  // AJOUT : Vérification du rôle admin
  const { userData } = useAuth();
  const isAdmin = userData?.role === "admin";

  const [formData, setFormData] = useState({
    nom: "",
    designer: "",
    annee: "",
    periode: "",
    // AJOUT
    categorie: "",
    materiaux: "",
    description: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
  };
  
  // ... (fonctions handleChange, etc. inchangées)

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-2xl font-playfair text-dark">Ajouter un luminaire</h2>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* ... autres champs ... */}
            
            {/* AJOUT : Champ Catégorie conditionnel */}
            {isAdmin && (
              <div>
                <label className="sr-only">Catégorie</label>
                <Select name="categorie" onValueChange={(value) => setFormData(prev => ({...prev, categorie: value}))} required={isAdmin}>
                  <SelectTrigger><SelectValue placeholder="Catégorie *" /></SelectTrigger>
                  <SelectContent>
                    {luminaireCategories.map((cat) => ( <SelectItem key={cat} value={cat}>{cat}</SelectItem> ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {/* ... autres champs ... */}
          </div>
          {/* ... autres champs ... */}
          <div className="flex justify-end gap-4 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit" className="bg-orange hover:bg-orange/90">Enregistrer</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
