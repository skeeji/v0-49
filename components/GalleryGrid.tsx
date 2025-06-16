"use client"
import Image from "next/image";
import Link from "next/link";

export function GalleryGrid({ items }: { items: any[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {items.map((item) => {
        const imageUrl = item.images && item.images[0]
          ? `/api/files/${item.images[0]}` // Pointe vers notre nouvelle API
          : "/placeholder.svg"; // Une image par défaut

        return (
          <div key={item._id} className="group">
            <Link href={`/luminaires/${item._id}`}>
              <div className="aspect-square relative bg-gray-100 rounded-lg overflow-hidden">
                <Image
                  src={imageUrl}
                  alt={item.nom || "Luminaire"}
                  fill
                  sizes="(max-width: 768px) 50vw, 33vw"
                  className="object-cover group-hover:scale-105 transition-transform"
                  onError={(e) => { e.currentTarget.src = "/placeholder.svg" }} // Fallback en cas d'erreur
                />
              </div>
              <div className="pt-2">
                <h3 className="font-semibold truncate">{item.nom || "Sans nom"}</h3>
                <p className="text-sm text-gray-600 truncate">{item.designer}</p>
              </div>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
