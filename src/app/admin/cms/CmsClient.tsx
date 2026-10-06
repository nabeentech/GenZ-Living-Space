"use client";

import React, { useState } from "react";
import Button from "@/components/ui/Button";
import { Globe, Save, CheckCircle2 } from "lucide-react";

interface CmsClientProps {
  initialData: {
    badge: string;
    headline: string;
    subheadline: string;
    contactPhone: string;
    contactEmail: string;
  };
}

export const CmsClient: React.FC<CmsClientProps> = ({ initialData }) => {
  const [badge, setBadge] = useState(initialData.badge);
  const [headline, setHeadline] = useState(initialData.headline);
  const [subheadline, setSubheadline] = useState(initialData.subheadline);
  const [contactPhone, setContactPhone] = useState(initialData.contactPhone);
  const [contactEmail, setContactEmail] = useState(initialData.contactEmail);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetch("/api/admin/cms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionKey: "hero",
          contentJson: {
            badge,
            headline,
            subheadline,
            contactPhone,
            contactEmail,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to save CMS");
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 bg-[#111827]/85 max-w-3xl space-y-6">
      {saveSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500 text-xs text-emerald-300 font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Homepage CMS content successfully updated and published!</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
            Homepage Top Badge Pill
          </label>
          <input
            type="text"
            required
            value={badge}
            onChange={(e) => setBadge(e.target.value)}
            className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500 font-semibold"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
            Primary Hero Headline
          </label>
          <input
            type="text"
            required
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-base text-white focus:outline-none focus:border-indigo-500 font-black"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
            Hero Subheadline
          </label>
          <textarea
            rows={3}
            required
            value={subheadline}
            onChange={(e) => setSubheadline(e.target.value)}
            className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
              Central Support Phone
            </label>
            <input
              type="text"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
              Central Support Email
            </label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="flex justify-end pt-3">
          <Button
            type="submit"
            variant="glow"
            size="lg"
            isLoading={isSaving}
            leftIcon={<Save className="w-4 h-4" />}
          >
            Publish Website Updates
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CmsClient;
