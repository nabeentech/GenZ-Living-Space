import prisma from "@/lib/prisma";

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

const SECTION_KEY = "gallery_categories";

/**
 * Fetch configured gallery categories from the database (or return defaults)
 */
export async function getGalleryCategories(): Promise<GalleryCategoryItem[]> {
  try {
    const record = await prisma.websiteContent.findUnique({
      where: { sectionKey: SECTION_KEY },
      select: { contentJson: true },
    });

    if (record?.contentJson) {
      const parsed = JSON.parse(record.contentJson);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
          .map((item: any) => ({
            id: String(item.id || "")
              .trim()
              .toUpperCase()
              .replace(/\s+/g, "_"),
            label: String(item.label || "").trim(),
          }))
          .filter(
            (item: GalleryCategoryItem) =>
              item.id.length > 0 && item.label.length > 0
          );
      }
    }
  } catch (error) {
    console.error("Failed to load gallery categories from database:", error);
  }

  return DEFAULT_GALLERY_CATEGORIES;
}

/**
 * Save updated category list to the database
 */
export async function saveGalleryCategories(
  categories: GalleryCategoryItem[]
): Promise<GalleryCategoryItem[]> {
  const sanitized = categories
    .map((item) => {
      const label = item.label.trim();
      let id = item.id
        ? item.id.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_")
        : "";
      if (!id) {
        id = label
          .toUpperCase()
          .replace(/[^A-Z0-9]+/g, "_")
          .replace(/^_+|_+$/g, "");
      }
      return { id, label };
    })
    .filter((item) => item.id.length > 0 && item.label.length > 0);

  if (sanitized.length === 0) {
    throw new Error("Category list cannot be empty");
  }

  // Ensure unique IDs
  const seen = new Set<string>();
  const uniqueCategories: GalleryCategoryItem[] = [];
  for (const item of sanitized) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      uniqueCategories.push(item);
    }
  }

  await prisma.websiteContent.upsert({
    where: { sectionKey: SECTION_KEY },
    create: {
      sectionKey: SECTION_KEY,
      contentJson: JSON.stringify(uniqueCategories),
    },
    update: {
      contentJson: JSON.stringify(uniqueCategories),
    },
  });

  return uniqueCategories;
}

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
