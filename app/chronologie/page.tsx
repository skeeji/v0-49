"use client"
import { useAuth } from "@/context/AuthContext"

const ChronologiePage = () => {
  const { isAdmin } = useAuth()

  return (
    <div>
      {/* Other code here */}
      {isAdmin && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-blue-800">
          <p className="flex items-center font-serif">
            <span className="mr-2">ℹ️</span>
            <span>Seuls les administrateurs peuvent modifier le contenu de la chronologie.</span>
          </p>
        </div>
      )}
      {/* Other code here */}
    </div>
  )
}

export default ChronologiePage
