"use client";

import React, { useState, useRef, useTransition } from "react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import {
  UploadCloud,
  Image as ImageIcon,
  Trash2,
  Star,
  Maximize2,
  Edit2,
  Filter,
  Search,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  Layers,
  Sparkles,
  X,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Building2,
  Tag,
  Plus,
  ArrowUp,
  ArrowDown,
  RotateCcw,
} from "lucide-react";
import {
  GalleryCategoryItem,
  DEFAULT_GALLERY_CATEGORIES,
  getCategoryLabel,
} from "@/lib/gallery-categories";

export interface GalleryItem {
  id: string;
  title: string;
  description?: string | null;
  category: string;
  mimeType: string;
  fileSize?: number | null;
  isFeatured: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  hostelId?: string | null;
  src: string;
  hostel?: {
    id: string;
    name: string;
    slug: string;
    city: string;
  } | null;
}

interface HostelOption {
  id: string;
  name: string;
  slug: string;
  city: string;
}

interface GalleryClientProps {
  initialImages: GalleryItem[];
  hostels: HostelOption[];
  initialCategories?: GalleryCategoryItem[];
  initialStats: {
    totalImages: number;
    totalStorageBytes: number;
  };
}

function formatBytes(bytes: number = 0) {
  if (bytes === 0) return "0 KB";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export const GalleryClient: React.FC<GalleryClientProps> = ({
  initialImages,
  hostels,
  initialCategories,
  initialStats,
}) => {
  const [images, setImages] = useState<GalleryItem[]>(initialImages);
  const [categories, setCategories] = useState<GalleryCategoryItem[]>(
    initialCategories && initialCategories.length > 0
      ? initialCategories
      : DEFAULT_GALLERY_CATEGORIES
  );
  const [stats, setStats] = useState(initialStats);
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedHostelFilter, setSelectedHostelFilter] = useState("all");

  // Category management modal state
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);
  const [editingCategories, setEditingCategories] = useState<GalleryCategoryItem[]>(categories);
  const [newCategoryLabel, setNewCategoryLabel] = useState("");
  const [isSavingCategories, setIsSavingCategories] = useState(false);

  // Upload state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<{ file: File; preview: string }[]>([]);
  const [uploadCategory, setUploadCategory] = useState(categories[0]?.id || "COMMON_AREA");
  const [uploadHostelId, setUploadHostelId] = useState(hostels[0]?.id || "all");
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadFeatured, setUploadFeatured] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Status message
  const [alertMessage, setAlertMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Lightbox modal state
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Edit item state
  const [editingItem, setEditingItem] = useState<GalleryItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editHostelId, setEditHostelId] = useState("all");
  const [editFeatured, setEditFeatured] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete modal state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const showAlert = (type: "success" | "error", text: string) => {
    setAlertMessage({ type, text });
    setTimeout(() => {
      setAlertMessage((prev) => (prev?.text === text ? null : prev));
    }, 4000);
  };

  // Category management handlers
  const handleOpenCategoriesModal = () => {
    setEditingCategories(categories);
    setNewCategoryLabel("");
    setIsCategoriesModalOpen(true);
  };

  const handleMoveCategory = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index > 0) {
      setEditingCategories((prev) => {
        const copy = [...prev];
        const temp = copy[index - 1];
        copy[index - 1] = copy[index];
        copy[index] = temp;
        return copy;
      });
    } else if (direction === "down" && index < editingCategories.length - 1) {
      setEditingCategories((prev) => {
        const copy = [...prev];
        const temp = copy[index + 1];
        copy[index + 1] = copy[index];
        copy[index] = temp;
        return copy;
      });
    }
  };

  const handleCategoryLabelChange = (index: number, newLabel: string) => {
    setEditingCategories((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], label: newLabel };
      return copy;
    });
  };

  const handleDeleteCategory = (index: number) => {
    if (editingCategories.length <= 1) {
      showAlert("error", "You must keep at least 1 category tag.");
      return;
    }
    setEditingCategories((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddNewCategory = () => {
    const label = newCategoryLabel.trim();
    if (!label) return;

    const baseId =
      label
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "") || "CATEGORY";
    let id = baseId;
    let counter = 2;
    while (editingCategories.some((c) => c.id === id)) {
      id = `${baseId}_${counter++}`;
    }

    setEditingCategories((prev) => [...prev, { id, label }]);
    setNewCategoryLabel("");
  };

  const handleResetCategoriesToDefaults = () => {
    setEditingCategories(DEFAULT_GALLERY_CATEGORIES);
  };

  const handleSaveCategories = async () => {
    try {
      setIsSavingCategories(true);
      const res = await fetch("/api/admin/gallery/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories: editingCategories }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to save category tags");
      }
      setCategories(data.categories);
      setIsCategoriesModalOpen(false);
      showAlert("success", "Category tags saved successfully!");
    } catch (err: any) {
      showAlert("error", err.message || "Failed to update category tags");
    } finally {
      setIsSavingCategories(false);
    }
  };

  // Handle file selection
  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newFiles: File[] = [];
    const newPreviews: { file: File; preview: string }[] = [];

    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/")) {
        newFiles.push(file);
        newPreviews.push({
          file,
          preview: URL.createObjectURL(file),
        });
      }
    });

    setSelectedFiles((prev) => [...prev, ...newFiles]);
    setFilePreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeSelectedFile = (index: number) => {
    URL.revokeObjectURL(filePreviews[index].preview);
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setFilePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const clearUploadForm = () => {
    filePreviews.forEach((p) => URL.revokeObjectURL(p.preview));
    setSelectedFiles([]);
    setFilePreviews([]);
    setUploadTitle("");
    setUploadFeatured(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Compress large images in browser before upload for fast transfer & compact DB storage
  const compressImage = async (file: File): Promise<File> => {
    // If under 1MB, upload directly
    if (file.size <= 1024 * 1024) return file;

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const maxDim = 1920;
          let width = img.width;
          let height = img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(file);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob && blob.size < file.size) {
                const compressedFile = new File([blob], file.name, {
                  type: "image/jpeg",
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                resolve(file);
              }
            },
            "image/jpeg",
            0.85
          );
        };
        img.onerror = () => resolve(file);
      };
      reader.onerror = () => resolve(file);
    });
  };

  // Upload handler
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      showAlert("error", "Please select at least one photo to upload");
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      for (const file of selectedFiles) {
        const processedFile = await compressImage(file);
        formData.append("files", processedFile);
      }

      if (selectedFiles.length === 1 && uploadTitle.trim()) {
        formData.append("title", uploadTitle.trim());
      }
      formData.append("category", uploadCategory);
      formData.append("hostelId", uploadHostelId);
      formData.append("isFeatured", String(uploadFeatured));

      const res = await fetch("/api/admin/gallery", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to upload image(s)");
      }

      showAlert("success", `${json.message || "Photos uploaded successfully into server database!"}`);
      clearUploadForm();
      setIsUploadOpen(false);

      // Refresh gallery
      await refreshGallery();
    } catch (err: any) {
      showAlert("error", err.message || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  // Refresh list
  const refreshGallery = async () => {
    try {
      const res = await fetch("/api/admin/gallery");
      const json = await res.json();
      if (json.success && json.data) {
        setImages(json.data.images || []);
        if (json.data.stats) {
          setStats(json.data.stats);
        }
      }
    } catch {
      // silently handle
    }
  };

  // Toggle Featured status
  const handleToggleFeatured = async (item: GalleryItem) => {
    const newStatus = !item.isFeatured;
    try {
      const res = await fetch(`/api/admin/gallery/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFeatured: newStatus }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message);

      setImages((prev) =>
        prev.map((img) => (img.id === item.id ? { ...img, isFeatured: newStatus } : img))
      );
      showAlert(
        "success",
        newStatus ? `"${item.title}" marked as Featured!` : `"${item.title}" unfeatured`
      );
    } catch (err: any) {
      showAlert("error", err.message || "Could not update status");
    }
  };

  // Open Edit Modal
  const openEditModal = (item: GalleryItem) => {
    setEditingItem(item);
    setEditTitle(item.title);
    setEditCategory(item.category);
    setEditHostelId(item.hostelId || "all");
    setEditFeatured(item.isFeatured);
  };

  // Save Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setIsSavingEdit(true);
    try {
      const res = await fetch(`/api/admin/gallery/${editingItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          category: editCategory,
          hostelId: editHostelId === "all" ? null : editHostelId,
          isFeatured: editFeatured,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message);

      showAlert("success", "Photo details updated successfully!");
      setEditingItem(null);
      await refreshGallery();
    } catch (err: any) {
      showAlert("error", err.message || "Failed to update photo");
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Delete Image
  const handleDeleteConfirm = async () => {
    if (!deletingId) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/gallery/${deletingId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message);

      showAlert("success", "Photo successfully removed from database!");
      setImages((prev) => prev.filter((img) => img.id !== deletingId));
      setDeletingId(null);
      await refreshGallery();
    } catch (err: any) {
      showAlert("error", err.message || "Failed to delete photo");
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered images
  const filteredImages = images.filter((img) => {
    const matchesCategory =
      activeCategory === "ALL" || img.category.toUpperCase() === activeCategory.toUpperCase();
    const matchesSearch =
      searchQuery.trim() === "" ||
      img.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (img.hostel?.name || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesHostel =
      selectedHostelFilter === "all" || img.hostelId === selectedHostelFilter;

    return matchesCategory && matchesSearch && matchesHostel;
  });

  // Lightbox navigation
  const currentLightboxItem = lightboxIndex !== null ? filteredImages[lightboxIndex] : null;

  const showNextImage = () => {
    if (lightboxIndex !== null && lightboxIndex < filteredImages.length - 1) {
      setLightboxIndex(lightboxIndex + 1);
    } else {
      setLightboxIndex(0);
    }
  };

  const showPrevImage = () => {
    if (lightboxIndex !== null && lightboxIndex > 0) {
      setLightboxIndex(lightboxIndex - 1);
    } else {
      setLightboxIndex(filteredImages.length - 1);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Alert Banner */}
      {alertMessage && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-3 border shadow-lg animate-in slide-in-from-top-2 duration-200 ${
            alertMessage.type === "success"
              ? "bg-emerald-950/80 border-emerald-500/50 text-emerald-200"
              : "bg-rose-950/80 border-rose-500/50 text-rose-200"
          }`}
        >
          {alertMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span className="text-sm font-semibold">{alertMessage.text}</span>
          <button
            onClick={() => setAlertMessage(null)}
            className="ml-auto text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-indigo-600/15 border border-indigo-500/30 text-indigo-400">
              <ImageIcon className="w-5 h-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Hostel Gallery Management
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Upload and organize hostel photos. All images are securely stored directly in the
            server database (retained safely across server restarts, zero Git/ephemeral disk loss).
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenCategoriesModal}
            leftIcon={<Tag className="w-3.5 h-3.5 text-indigo-400" />}
          >
            Manage Categories
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshGallery}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>
          <Button
            variant="glow"
            size="md"
            onClick={() => setIsUploadOpen(true)}
            leftIcon={<UploadCloud className="w-4 h-4" />}
          >
            Upload Photos
          </Button>
        </div>
      </div>

      {/* Quick Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-[#111827]/70 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Total Photos</span>
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white">{images.length}</p>
          <span className="text-[11px] text-slate-400">Active in database</span>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-[#111827]/70 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Database Storage</span>
            <HardDrive className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-cyan-400">
            {formatBytes(stats.totalStorageBytes)}
          </p>
          <span className="text-[11px] text-slate-400">Stored in SQLite BLOBs</span>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-[#111827]/70 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Featured Highlights</span>
            <Star className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-300">
            {images.filter((i) => i.isFeatured).length}
          </p>
          <span className="text-[11px] text-slate-400">Promoted on Website Hero</span>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-[#111827]/70 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Property</span>
            <Building2 className="w-4 h-4 text-pink-400" />
          </div>
          <p className="text-sm sm:text-base font-black text-pink-400 truncate">
            {hostels[0]?.name || "GenZ Colive PG & Guest Rooms"}
          </p>
          <span className="text-[11px] text-slate-400">Dedicated Facility</span>
        </div>
      </div>

      {/* Upload Modal Drawer */}
      <Modal
        isOpen={isUploadOpen}
        onClose={() => {
          if (!isUploading) {
            clearUploadForm();
            setIsUploadOpen(false);
          }
        }}
        title="Upload Hostel Photos to Database"
        description="Photos are encoded as binary BLOBs and saved directly in your server database."
        maxWidth="xl"
      >
        <form onSubmit={handleUploadSubmit} className="space-y-5 pt-2">
          {/* Dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFilesSelected(e.dataTransfer.files);
            }}
            className="border-2 border-dashed border-indigo-500/40 hover:border-indigo-400 hover:bg-indigo-950/20 rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 bg-slate-900/50"
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFilesSelected(e.target.files)}
            />
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">
                Click to browse or drag and drop photos here
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                PNG, JPG, WEBP accepted. Select multiple photos at once.
              </p>
            </div>
          </div>

          {/* Selected Previews */}
          {filePreviews.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
                <span>Selected Files ({filePreviews.length})</span>
                <button
                  type="button"
                  onClick={clearUploadForm}
                  className="text-rose-400 hover:text-rose-300"
                >
                  Clear all
                </button>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-48 overflow-y-auto p-2 bg-slate-900/70 rounded-xl border border-slate-800">
                {filePreviews.map((p, idx) => (
                  <div key={idx} className="relative group rounded-lg overflow-hidden aspect-video border border-slate-700 bg-black">
                    <img
                      src={p.preview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeSelectedFile(idx)}
                      className="absolute top-1 right-1 p-1 rounded-full bg-black/70 text-rose-400 hover:bg-rose-600 hover:text-white transition"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[9px] bg-black/80 text-slate-300 font-mono">
                      {formatBytes(p.file.size)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Form Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                  Category
                </label>
                <button
                  type="button"
                  onClick={handleOpenCategoriesModal}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
                >
                  <Tag className="w-3 h-3" />
                  <span>Edit Categories</span>
                </button>
              </div>
              <select
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500 font-medium"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1.5">
                Hostel Property
              </label>
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-200 font-medium flex items-center gap-2">
                <Building2 className="w-4 h-4 text-pink-400 shrink-0" />
                <span className="truncate">{hostels[0]?.name || "GenZ Colive PG & Guest Rooms"}</span>
              </div>
            </div>
          </div>

          {selectedFiles.length === 1 && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1.5">
                Custom Title (Optional)
              </label>
              <input
                type="text"
                placeholder="Leave empty for no title (clean photo)"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                If left blank, no title will be attached (only pure image is displayed).
              </p>
            </div>
          )}

          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <input
              type="checkbox"
              id="uploadFeatured"
              checked={uploadFeatured}
              onChange={(e) => setUploadFeatured(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 bg-slate-800 border-slate-700 focus:ring-indigo-500 cursor-pointer"
            />
            <label htmlFor="uploadFeatured" className="text-xs text-slate-200 font-medium cursor-pointer">
              Mark as <span className="text-amber-400 font-bold">Featured Photo</span> (highlighted on website homepage hero)
            </label>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="ghost"
              size="md"
              disabled={isUploading}
              onClick={() => {
                clearUploadForm();
                setIsUploadOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="glow"
              size="md"
              isLoading={isUploading}
              disabled={selectedFiles.length === 0}
              leftIcon={<UploadCloud className="w-4 h-4" />}
            >
              {isUploading
                ? "Writing to Database..."
                : `Upload ${selectedFiles.length} Photo${selectedFiles.length !== 1 ? "s" : ""}`}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Filter and Search Toolbar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 bg-[#101626]/80 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search photos by title or property..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900/80 border border-slate-700/80 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Hostel Selector (if multiple) */}
        {hostels.length > 1 && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={selectedHostelFilter}
                onChange={(e) => setSelectedHostelFilter(e.target.value)}
                className="p-2 rounded-xl bg-slate-900/80 border border-slate-700/80 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
              >
                <option value="all">All Hostels</option>
                {hostels.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {[{ id: "ALL", label: "All Photos" }, ...categories].map((cat) => {
          const isActive = activeCategory === cat.id;
          const count =
            cat.id === "ALL"
              ? images.length
              : images.filter((img) => img.category.toUpperCase() === cat.id.toUpperCase()).length;

          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                isActive
                  ? "bg-indigo-600 text-white shadow-glow"
                  : "bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <span>{cat.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isActive ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={handleOpenCategoriesModal}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5 transition shrink-0 ml-auto"
          title="Edit and organize category tags"
        >
          <Tag className="w-3.5 h-3.5 text-indigo-400" />
          <span>Edit Tags</span>
        </button>
      </div>

      {/* Gallery Grid */}
      {filteredImages.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl border border-slate-800 text-center space-y-4 max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
            <ImageIcon className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">No photos found</h3>
            <p className="text-xs text-slate-400 mt-1">
              {searchQuery || activeCategory !== "ALL" || selectedHostelFilter !== "all"
                ? "Try adjusting your filters or search keywords."
                : "Your gallery is currently empty. Upload photos to showcase your hostel on the website."}
            </p>
          </div>
          <Button
            variant="glow"
            size="sm"
            onClick={() => setIsUploadOpen(true)}
            leftIcon={<UploadCloud className="w-4 h-4" />}
          >
            Upload First Photo
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredImages.map((img, index) => (
            <div
              key={img.id}
              className="glass-panel group rounded-2xl border border-slate-800/80 bg-[#111827]/70 overflow-hidden flex flex-col hover:border-indigo-500/40 hover:shadow-glow transition duration-300"
            >
              {/* Image Preview Container */}
              <div className="relative aspect-[4/3] bg-slate-950 overflow-hidden cursor-pointer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.src}
                  alt={img.title}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onClick={() => setLightboxIndex(index)}
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80 group-hover:opacity-95 transition" />

                {/* Top Badges */}
                <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1 pointer-events-none">
                  <Badge variant="indigo" size="sm" className="backdrop-blur-md bg-indigo-950/80">
                    {getCategoryLabel(img.category, categories)}
                  </Badge>

                  {img.isFeatured && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 backdrop-blur-md">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      Featured
                    </span>
                  )}
                </div>

                {/* Hover Quick Action Overlay */}
                <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/40 backdrop-blur-[2px]">
                  <button
                    onClick={() => setLightboxIndex(index)}
                    className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-white hover:text-black text-white transition shadow-lg"
                    title="Fullscreen Lightbox"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleToggleFeatured(img)}
                    className={`p-2.5 rounded-xl transition shadow-lg ${
                      img.isFeatured
                        ? "bg-amber-500 text-black hover:bg-amber-400"
                        : "bg-slate-900/90 text-amber-400 hover:bg-amber-400 hover:text-black"
                    }`}
                    title={img.isFeatured ? "Unfeature" : "Mark Featured"}
                  >
                    <Star className={`w-4 h-4 ${img.isFeatured ? "fill-black" : ""}`} />
                  </button>
                  <button
                    onClick={() => openEditModal(img)}
                    className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-indigo-600 text-white transition shadow-lg"
                    title="Edit Metadata"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeletingId(img.id)}
                    className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-rose-600 text-rose-300 hover:text-white transition shadow-lg"
                    title="Delete from Database"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Card Footer Information */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                <div>
                  <h4 className="text-sm font-bold text-white truncate" title={img.title || "No Title (Clean Image)"}>
                    {img.title ? (
                      img.title
                    ) : (
                      <span className="text-slate-400 font-normal italic text-xs">No Title (Clean Image)</span>
                    )}
                  </h4>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                    <span className="truncate">
                      {img.hostel ? img.hostel.name : (hostels[0]?.name || "GenZ Colive PG & Guest Rooms")}
                    </span>
                    <span>•</span>
                    <span className="font-mono">{formatBytes(img.fileSize || 0)}</span>
                    {img.mimeType === "image/webp" && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        WEBP
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[10px] text-slate-500">
                  <span>
                    {new Date(img.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <a
                    href={img.src}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300"
                  >
                    <span>Raw Link</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Metadata Modal */}
      <Modal
        isOpen={Boolean(editingItem)}
        onClose={() => setEditingItem(null)}
        title="Edit Photo Details"
        description="Update caption, category, and hostel assignment."
      >
        {editingItem && (
          <form onSubmit={handleSaveEdit} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
                Photo Title / Caption (Optional)
              </label>
              <input
                type="text"
                placeholder="Leave blank for no title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500 font-semibold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
                  Category
                </label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
                  Hostel
                </label>
                <select
                  value={editHostelId}
                  onChange={(e) => setEditHostelId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">All Hostels / General</option>
                  {hostels.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <input
                type="checkbox"
                id="editFeatured"
                checked={editFeatured}
                onChange={(e) => setEditFeatured(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 bg-slate-800 border-slate-700 focus:ring-indigo-500 cursor-pointer"
              />
              <label htmlFor="editFeatured" className="text-xs text-slate-200 font-medium cursor-pointer">
                Promote as <span className="text-amber-400 font-bold">Featured Photo</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <Button
                type="button"
                variant="ghost"
                size="md"
                disabled={isSavingEdit}
                onClick={() => setEditingItem(null)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="glow" size="md" isLoading={isSavingEdit}>
                Save Changes
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        title="Confirm Photo Deletion"
        description="This action cannot be undone. The photo binary will be completely removed from your server database."
      >
        <div className="space-y-4 pt-2">
          <p className="text-xs text-slate-300">
            Are you sure you want to permanently delete this photo from the database? It will no
            longer appear on the website.
          </p>
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="ghost"
              size="md"
              disabled={isDeleting}
              onClick={() => setDeletingId(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="md"
              isLoading={isDeleting}
              onClick={handleDeleteConfirm}
              leftIcon={<Trash2 className="w-4 h-4" />}
            >
              Delete Permanently
            </Button>
          </div>
        </div>
      </Modal>

      {/* Fullscreen Lightbox Modal */}
      {currentLightboxItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-200">
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 p-2.5 rounded-full bg-slate-900/80 text-white hover:bg-slate-800 transition z-10"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Navigation Arrows */}
          <button
            onClick={showPrevImage}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-slate-900/80 text-white hover:bg-indigo-600 transition z-10"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={showNextImage}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-slate-900/80 text-white hover:bg-indigo-600 transition z-10"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          <div className="max-w-5xl max-h-[90vh] flex flex-col items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentLightboxItem.src}
              alt={currentLightboxItem.title}
              className="max-h-[75vh] w-auto object-contain rounded-2xl shadow-2xl"
            />
            <div className="mt-4 text-center space-y-1">
              {currentLightboxItem.title && (
                <h3 className="text-lg font-bold text-white">{currentLightboxItem.title}</h3>
              )}
              <div className="flex items-center justify-center gap-3 text-xs text-slate-400">
                <Badge variant="indigo" size="sm">
                  {getCategoryLabel(currentLightboxItem.category, categories)}
                </Badge>
                {currentLightboxItem.hostel && (
                  <span>{currentLightboxItem.hostel.name}</span>
                )}
                <span>•</span>
                <span>{formatBytes(currentLightboxItem.fileSize || 0)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manage Categories / Tags Modal */}
      <Modal
        isOpen={isCategoriesModalOpen}
        onClose={() => setIsCategoriesModalOpen(false)}
        title="Manage Gallery Categories & Tags"
        description="Add, rename, reorder, or delete category tags for your gallery photos."
      >
        <div className="space-y-5 pt-2">
          {/* Header tip */}
          <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/20 text-xs text-indigo-300 flex items-start gap-2.5">
            <Tag className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <span>
              These category tags organize your photos across the admin dashboard and public website gallery. You can rename tags, add new ones, reorder them, or remove unused tags.
            </span>
          </div>

          {/* Categories List */}
          <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1 scrollbar-thin">
            {editingCategories.map((cat, idx) => {
              const imageCount = images.filter(
                (img) => img.category.toUpperCase() === cat.id.toUpperCase()
              ).length;

              return (
                <div
                  key={cat.id || idx}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition"
                >
                  {/* Reorder Buttons */}
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveCategory(idx, "up")}
                      className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-20 disabled:hover:text-slate-400 transition"
                      title="Move up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === editingCategories.length - 1}
                      onClick={() => handleMoveCategory(idx, "down")}
                      className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-20 disabled:hover:text-slate-400 transition"
                      title="Move down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Editable Label */}
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={cat.label}
                      onChange={(e) => handleCategoryLabelChange(idx, e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-sm font-semibold text-white focus:outline-none focus:border-indigo-500"
                      placeholder="Category display name"
                    />
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400 font-mono">
                      <span>ID: {cat.id}</span>
                      <span>•</span>
                      <span>{imageCount} {imageCount === 1 ? "photo" : "photos"}</span>
                    </div>
                  </div>

                  {/* Delete Button */}
                  <button
                    type="button"
                    disabled={editingCategories.length <= 1}
                    onClick={() => handleDeleteCategory(idx)}
                    className="p-2 rounded-lg text-rose-400 hover:bg-rose-950/50 hover:text-rose-300 disabled:opacity-20 transition"
                    title={
                      editingCategories.length <= 1
                        ? "Must keep at least 1 category"
                        : "Delete category"
                    }
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Add New Category Row */}
          <div className="pt-3 border-t border-slate-800">
            <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1.5">
              Add New Category Tag
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newCategoryLabel}
                onChange={(e) => setNewCategoryLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddNewCategory();
                  }
                }}
                placeholder="e.g. Swimming Pool, Fitness Gym, Study Pods..."
                className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddNewCategory}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Add Tag
              </Button>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={handleResetCategoriesToDefaults}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Defaults</span>
            </button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={() => setIsCategoriesModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="glow"
                size="md"
                isLoading={isSavingCategories}
                onClick={handleSaveCategories}
              >
                Save Categories
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default GalleryClient;
