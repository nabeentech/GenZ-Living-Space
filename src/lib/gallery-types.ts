export interface GalleryCategoryItem {
  id: string;
  label: string;
}

export const DEFAULT_GALLERY_CATEGORIES: GalleryCategoryItem[] = [
  { id: "ROOMS", label: "Rooms & Pods" },
  { id: "COMMON_AREA", label: "Lounge & Chill" },
  { id: "ROOFTOP", label: "Rooftop Terrace" },
  { id: "WORKSPACE", label: "Work & Study" },
  { id: "DINING", label: "Café & Dining" },
  { id: "EVENTS", label: "Gaming & Community" },
  { id: "OTHER", label: "Other Facilities" },
];

/**
 * Get display label for a category ID with fallback
 */
export function getCategoryLabel(
  categoryId: string,
  categories: GalleryCategoryItem[] = DEFAULT_GALLERY_CATEGORIES
): string {
  const found = categories.find(
    (c) => c.id.toUpperCase() === (categoryId || "").toUpperCase()
  );
  if (found) return found.label;

  // Fallback: capitalize snake_case
  return (categoryId || "")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
