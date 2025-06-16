"use client"
import Image from "next/image";
import Link from "next/link";
// ... autres imports ...

export function GalleryGrid({ items }: { items: any[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {items.map((item) => {
        // Construction de l'URL de l'image
        const imageUrl = item.images && item.images[0]
          ? `/api/files/${item.images[0]}` // Pointe vers notre nouvelle API
          : "/placeholder.svg";

        return (
          <div key={item._id} className="group">
            <Link href={`/luminaires/${item._id}`}>
              <div className="aspect-square relative overflow-hidden rounded-lg">
                <Image
                  src={imageUrl}
                  alt={item.nom || "Luminaire"}
                  fill
                  sizes="(max-width: 768px) 50vw, 33vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="pt-2">
                <h3 className="font-playfair truncate">{item.nom || "Sans nom"}</h3>
                <p className="text-sm text-gray-500 truncate">{item.designer}</p>
              </div>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
