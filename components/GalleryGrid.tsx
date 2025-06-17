"use client";
import Image from "next/image";
import Link from "next/link";

export function GalleryGrid({ items }: { items: any[] }) {
  if (!items || items.length === 0) {
    return <p className="text-center text-gray-500">Aucun luminaire à afficher.</p>;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {items.map((item) => {
        // L'image est le premier ID dans le tableau `images` du luminaire
        const imageUrl = item.images && item.images[0]
          ? `/api/files/${item.images[0]}` // Pointe vers notre API de service de fichiers
          : "/placeholder.svg"; // Image par défaut

        return (
          <div key={item._id} className="group">
            <Link href={`/luminaires/${item._id}`}>
              <div className="aspect-square relative bg-gray-100 rounded-lg overflow-hidden transition-transform duration-300 group-hover:scale-105">
                <Image
                  src={imageUrl}
                  alt={item.nom || "Luminaire"}
                  fill
                  sizes="(max-width: 768px) 50vw, 33vw"
                  className="object-cover"
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
