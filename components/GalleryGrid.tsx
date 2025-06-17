"use client";
import Image from "next/image";
import Link from "next/link";

export function GalleryGrid({ items }: { items: any[] }) {
  if (!items) return <div className="text-center py-10">Chargement...</div>;
  if (items.length === 0) return <div className="text-center py-10">Aucun luminaire à afficher pour le moment.</div>;
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {items.map((item) => {
        // L'image est le premier ID dans le tableau `images`
        const imageUrl = item.images && item.images[0] 
          ? `/api/files/${item.images[0]}` // Pointe vers notre API qui sert les fichiers
          : "/placeholder.svg"; // Image par défaut

        return (
          <div key={item._id} className="group">
            <Link href={`/luminaires/${item._id}`}>
              <div className="aspect-square relative bg-gray-100 rounded-lg overflow-hidden">
                <Image
                  src={imageUrl}
                  alt={item.nom || "Luminaire"}
                  fill
                  sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => { e.currentTarget.src = "/placeholder.svg"; }}
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
