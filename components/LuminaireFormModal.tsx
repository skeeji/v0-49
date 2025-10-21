"use client"

import { useState } from "react"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@radix-ui/react-select"

const LuminaireFormModal = () => {
  const [formData, setFormData] = useState({
    signe: "",
    // other form data fields
  })

  return (
    <div>
      {/* Form fields here */}
      <div>
        <label htmlFor="signe">Signé</label>
        <Select value={formData.signe} onValueChange={(value) => setFormData({ ...formData, signe: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Oui">Oui</SelectItem>
            <SelectItem value="Non">Non</SelectItem>
            <SelectItem value="Attribué">Attribué</SelectItem>
            <SelectItem value="Etiquette">Etiquette</SelectItem>
            <SelectItem value="Non signé">Non signé</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {/* Other form fields here */}
    </div>
  )
}

export default LuminaireFormModal
