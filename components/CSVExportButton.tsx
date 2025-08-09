"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/useToast";

interface CSVExportButtonProps {
  data: any[];
  filename: string;
}

export function CSVExportButton({ data, filename }: CSVExportButtonProps) {
  const { showToast } = useToast();

  const exportToCSV = () => {
    if (data.length === 0) {
      showToast("Aucune donnée à exporter", "error");
      return;
    }

    // On utilise les clés de la BDD pour le mapping
    const headers = {
      _id: "ID",
      nom: "Nom du luminaire",
      designer: "Artiste / Dates",
      // AJOUT
      categorie: "Catégorie",
      annee: "Année",
      periode: "Période",
      materiaux: "Matériaux",
      description: "Description",
      dimensions: "Dimensions",
      // ... autres champs si vous en avez
    };

    const headerKeys = Object.keys(headers);
    const headerRow = headerKeys.map((key) => headers[key]).join(",");

    const rows = data.map((item) => {
      return headerKeys
        .map((key) => {
          let value = item[key] || "";
          if (Array.isArray(value)) {
            value = value.join("; "); // Sépare les éléments d'un tableau
          }
          const escapedValue = String(value).replace(/"/g, '""');
          return `"${escapedValue}"`;
        })
        .join(",");
    });

    const csvContent = [headerRow, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("Export CSV réussi", "success");
  };

  return (
    <Button onClick={exportToCSV} disabled={data.length === 0} className="bg-orange hover:bg-orange/90">
      <Download className="w-4 h-4 mr-2" />
      Exporter (.csv)
    </Button>
  );
}
