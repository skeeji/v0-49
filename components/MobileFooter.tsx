"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Search, Lightbulb, Users, Clock, DollarSign } from "lucide-react"

export function MobileFooter() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="grid grid-cols-6 gap-1 px-2 py-2">
        <Link
          href="/"
          className={`flex flex-col items-center justify-center py-2 rounded-lg transition-colors ${
            pathname === "/" ? "bg-[#f5f1e8] text-[#8b7355]" : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          <Home className="w-5 h-5 mb-1" />
          <span className="text-xs">Home</span>
        </Link>

        <Link
          href="/recherche"
          className={`flex flex-col items-center justify-center py-2 rounded-lg transition-colors ${
            pathname === "/recherche" ? "bg-[#f5f1e8] text-[#8b7355]" : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          <Search className="w-5 h-5 mb-1" />
          <span className="text-xs">Recherche</span>
        </Link>

        <Link
          href="/luminaires"
          className={`flex flex-col items-center justify-center py-2 rounded-lg transition-colors ${
            pathname.startsWith("/luminaires") ? "bg-[#f5f1e8] text-[#8b7355]" : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          <Lightbulb className="w-5 h-5 mb-1" />
          <span className="text-xs">Luminaires</span>
        </Link>

        <Link
          href="/designers"
          className={`flex flex-col items-center justify-center py-2 rounded-lg transition-colors ${
            pathname.startsWith("/designers") ? "bg-[#f5f1e8] text-[#8b7355]" : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          <Users className="w-5 h-5 mb-1" />
          <span className="text-xs">Designers</span>
        </Link>

        <Link
          href="/chronologie"
          className={`flex flex-col items-center justify-center py-2 rounded-lg transition-colors ${
            pathname === "/chronologie" ? "bg-[#f5f1e8] text-[#8b7355]" : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          <Clock className="w-5 h-5 mb-1" />
          <span className="text-xs">Chrono</span>
        </Link>

        <Link
          href="/pricing"
          className={`flex flex-col items-center justify-center py-2 rounded-lg transition-colors ${
            pathname === "/pricing" ? "bg-[#f5f1e8] text-[#8b7355]" : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          <DollarSign className="w-5 h-5 mb-1" />
          <span className="text-xs">Prix</span>
        </Link>
      </div>
    </nav>
  )
}

export default MobileFooter
