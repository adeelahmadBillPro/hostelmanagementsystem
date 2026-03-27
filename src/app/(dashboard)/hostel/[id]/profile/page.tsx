"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import DashboardLayout from "@/components/layout/dashboard-layout";
import FileUpload from "@/components/ui/file-upload";
import { useToast } from "@/components/providers";
import {
  Building2, MapPin, Phone, Save, Plus, CheckCircle2, XCircle,
  Wifi, Zap, Tv, BookOpen, Dumbbell, ShieldCheck, Camera, Car,
  Utensils, Droplets, BedDouble, Snowflake, Fan, Plug, Lock,
  ChevronDown, ChevronRight, Info,
} from "lucide-react";

const CATEGORY_META: Record<string, { label: string; icon: any; color: string }> = {
  hostel: { label: "Hostel General Facilities", icon: Building2, color: "#4F46E5" },
  room: { label: "Room Facilities", icon: BedDouble, color: "#10B981" },
  washroom: { label: "Washroom / Bathroom", icon: Droplets, color: "#0EA5E9" },
  dining: { label: "Dining / Kitchen", icon: Utensils, color: "#F59E0B" },
  security: { label: "Safety & Security", icon: ShieldCheck, color: "#EF4444" },
  transport: { label: "Transport & Nearby", icon: Car, color: "#8B5CF6" },
};

interface Amenity {
  id: string;
  name: string;
  category: string;
  icon: string | null;
  isAvailable: boolean;
  description: string | null;
}

export default function HostelProfilePage() {
  const params = useParams();
  const hostelId = params.id as string;
  const { addToast } = useToast();

  const [hostel, setHostel] = useState<any>(null);
  const [amenities, setAmenities] = useState<Record<string, Amenity[]>>({});
  const [stats, setStats] = useState({ total: 0, available: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [description, setDescription] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [expandedCats, setExpandedCats] = useState<string[]>(Object.keys(CATEGORY_META));
  const [changes, setChanges] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch(`/api/hostels/${hostelId}/amenities`)
      .then((r) => r.json())
      .then((data) => {
        setHostel(data.hostel);
        setAmenities(data.amenities || {});
        setStats(data.stats || { total: 0, available: 0 });
        setDescription(data.hostel?.description || "");
        setCoverImage(data.hostel?.coverImage || "");
      })
      .finally(() => setLoading(false));
  }, [hostelId]);

  const toggleAmenity = (id: string, current: boolean) => {
    setChanges((prev) => ({ ...prev, [id]: !current }));
    // Update local state
    setAmenities((prev) => {
      const updated = { ...prev };
      for (const cat in updated) {
        updated[cat] = updated[cat].map((a) =>
          a.id === id ? { ...a, isAvailable: !current } : a
        );
      }
      return updated;
    });
    setStats((prev) => ({
      ...prev,
      available: prev.available + (current ? -1 : 1),
    }));
  };

  const toggleCategory = (cat: string) => {
    setExpandedCats((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = Object.entries(changes).map(([id, isAvailable]) => ({
        id,
        isAvailable,
      }));

      await fetch(`/api/hostels/${hostelId}/amenities`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates, description, coverImage }),
      });

      setChanges({});
      addToast("Hostel profile saved!", "success");
    } catch {
      addToast("Failed to save", "error");
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = Object.keys(changes).length > 0 || description !== (hostel?.description || "") || coverImage !== (hostel?.coverImage || "");

  if (loading) {
    return (
      <DashboardLayout title="Hostel Profile" hostelId={hostelId}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Hostel Profile" hostelId={hostelId}>
      <div className="space-y-6">
        {/* Header with save */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="page-title">Hostel Profile</h1>
            <p className="text-sm text-text-secondary dark:text-slate-400 mt-1">
              Manage facilities and amenities. Residents can see what&apos;s available.
            </p>
          </div>
          {hasChanges && (
            <button onClick={handleSave} disabled={saving} className="btn-primary animate-scale-in">
              <Save size={16} />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          )}
        </div>

        {/* Stats bar */}
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-success" />
            <span className="font-semibold text-success">{stats.available}</span>
            <span className="text-text-secondary dark:text-slate-400">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle size={18} className="text-text-muted" />
            <span className="font-semibold text-text-muted">{stats.total - stats.available}</span>
            <span className="text-text-secondary dark:text-slate-400">Not Available</span>
          </div>
          <div className="sm:ml-auto text-text-muted text-xs">
            {stats.available}/{stats.total} facilities enabled
          </div>
        </div>

        {/* Hostel Info Card */}
        <div className="card">
          <h2 className="section-title mb-4">Hostel Information</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="label">Hostel Name</label>
                <p className="text-lg font-semibold text-text-primary dark:text-white">{hostel?.name}</p>
              </div>
              <div className="flex flex-wrap gap-4">
                <div>
                  <label className="label">Type</label>
                  <span className="badge-primary">{hostel?.type}</span>
                </div>
                <div>
                  <label className="label">City</label>
                  <p className="text-sm text-text-secondary dark:text-slate-300">{hostel?.city || "—"}</p>
                </div>
              </div>
              <div>
                <label className="label">Address</label>
                <div className="flex items-center gap-2 text-sm text-text-secondary dark:text-slate-300">
                  <MapPin size={14} />
                  {hostel?.address}
                </div>
              </div>
              <div>
                <label className="label">Contact</label>
                <div className="flex items-center gap-2 text-sm text-text-secondary dark:text-slate-300">
                  <Phone size={14} />
                  {hostel?.contact || "—"}
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">Cover Image</label>
                <FileUpload
                  onUpload={(url) => setCoverImage(url)}
                  accept="image/*"
                  label="Upload hostel cover photo"
                  currentUrl={coverImage}
                />
              </div>
            </div>
          </div>
          <div className="mt-4">
            <label className="label">Description / About</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="textarea dark:bg-[#0B1222] dark:border-[#1E2D42] dark:text-white"
              rows={4}
              placeholder="Describe your hostel - location, atmosphere, rules, nearby facilities..."
            />
          </div>
        </div>

        {/* Amenities by Category */}
        {Object.entries(CATEGORY_META).map(([catKey, catMeta]) => {
          const items = amenities[catKey] || [];
          const isExpanded = expandedCats.includes(catKey);
          const availableInCat = items.filter((a) => a.isAvailable).length;
          const CatIcon = catMeta.icon;

          return (
            <div key={catKey} className="card p-0 overflow-hidden animate-fade-in-up">
              {/* Category header */}
              <button
                onClick={() => toggleCategory(catKey)}
                className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-[#0B1222] transition-colors"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${catMeta.color}15` }}
                >
                  <CatIcon size={20} style={{ color: catMeta.color }} />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-semibold text-text-primary dark:text-white">
                    {catMeta.label}
                  </h3>
                  <p className="text-xs text-text-muted">
                    {availableInCat}/{items.length} available
                  </p>
                </div>
                {/* Progress */}
                <div className="w-24 h-2 bg-gray-100 dark:bg-[#0B1222] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${items.length ? (availableInCat / items.length) * 100 : 0}%`,
                      backgroundColor: catMeta.color,
                    }}
                  />
                </div>
                {isExpanded ? <ChevronDown size={18} className="text-text-muted" /> : <ChevronRight size={18} className="text-text-muted" />}
              </button>

              {/* Items */}
              {isExpanded && (
                <div className="border-t border-border dark:border-[#1E2D42] divide-y divide-border dark:divide-[#1E2D42]">
                  {items.map((amenity) => (
                    <div
                      key={amenity.id}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#0B1222] transition-colors"
                    >
                      {/* Toggle switch */}
                      <button
                        onClick={() => toggleAmenity(amenity.id, amenity.isAvailable)}
                        className={`relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${
                          amenity.isAvailable ? "bg-success" : "bg-gray-300 dark:bg-gray-600"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                            amenity.isAvailable ? "translate-x-[22px]" : "translate-x-0.5"
                          }`}
                        />
                      </button>

                      {/* Name */}
                      <span
                        className={`text-sm flex-1 ${
                          amenity.isAvailable
                            ? "text-text-primary dark:text-white font-medium"
                            : "text-text-muted line-through"
                        }`}
                      >
                        {amenity.name}
                      </span>

                      {/* Status icon */}
                      {amenity.isAvailable ? (
                        <CheckCircle2 size={16} className="text-success flex-shrink-0" />
                      ) : (
                        <XCircle size={16} className="text-gray-300 dark:text-gray-600 flex-shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Floating save button */}
        {hasChanges && (
          <div className="fixed bottom-6 right-6 z-40 animate-bounce-in">
            <button onClick={handleSave} disabled={saving} className="btn-primary shadow-xl px-6 py-3 text-base">
              <Save size={18} />
              {saving ? "Saving..." : `Save ${Object.keys(changes).length} Changes`}
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
