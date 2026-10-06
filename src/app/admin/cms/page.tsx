import React from "react";
import prisma from "@/lib/prisma";
import CmsClient from "./CmsClient";

export const dynamic = "force-dynamic";

export default async function AdminCmsPage() {
  const content = await prisma.websiteContent.findUnique({
    where: { sectionKey: "hero" },
  });

  let initialHeroData = {
    badge: "India's #1 Gen-Z Living Experience",
    headline: "Find Your Space. Live Your Way.",
    subheadline:
      "Premium coliving, ultra-fast fiber, creative workspaces, and vibrant community living across 2 hand-curated Madhapur properties.",
    contactPhone: "+91 98765 43210",
    contactEmail: "hello@genzlivingspace.com",
  };

  if (content?.contentJson) {
    try {
      initialHeroData = { ...initialHeroData, ...JSON.parse(content.contentJson) };
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <span className="text-xs uppercase font-extrabold tracking-widest text-indigo-400">
          Content Management
        </span>
        <h1 className="text-3xl font-black text-white">Website CMS</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Edit public homepage copy, brand taglines, contact details, and marketing messaging without modifying code.
        </p>
      </div>

      <CmsClient initialData={initialHeroData} />
    </div>
  );
}
