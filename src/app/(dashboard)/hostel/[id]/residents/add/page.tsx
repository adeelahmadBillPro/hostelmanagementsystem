"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { formatCurrency } from "@/lib/utils";
import {
  User,
  BedDouble,
  DollarSign,
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Info,
  Copy,
  KeyRound,
} from "lucide-react";

interface BuildingData {
  id: string;
  name: string;
}

interface FloorData {
  id: string;
  name: string;
  floorNumber: number;
}

interface RoomData {
  id: string;
  roomNumber: string;
  type: string;
  totalBeds: number;
  rentPerBed: number;
  beds: BedData[];
}

interface BedData {
  id: string;
  bedNumber: string;
  status: string;
}

const STEPS = [
  { number: 1, label: "Personal Info", icon: User },
  { number: 2, label: "Room Assignment", icon: BedDouble },
  { number: 3, label: "Financial", icon: DollarSign },
];

export default function AddResidentPage() {
  const params = useParams();
  const router = useRouter();
  const hostelId = params.id as string;

  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string; message: string } | null>(null);
  const [copied, setCopied] = useState("");
  const [error, setError] = useState("");

  // Step 1: Personal Info
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [cnic, setCnic] = useState("");
  const [gender, setGender] = useState("");
  const [institution, setInstitution] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [medicalCondition, setMedicalCondition] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");

  // Step 2: Room Assignment
  const [buildings, setBuildings] = useState<BuildingData[]>([]);
  const [floors, setFloors] = useState<FloorData[]>([]);
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState("");
  const [selectedFloor, setSelectedFloor] = useState("");
  const [selectedRoom, setSelectedRoom] = useState("");
  const [selectedBed, setSelectedBed] = useState("");
  const [selectedRoomData, setSelectedRoomData] = useState<RoomData | null>(null);
  const [loadingBuildings, setLoadingBuildings] = useState(false);
  const [loadingFloors, setLoadingFloors] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(false);

  // Step 3: Financial
  const [rentPerBed, setRentPerBed] = useState(0);
  const [advancePaid, setAdvancePaid] = useState("");
  const [securityDeposit, setSecurityDeposit] = useState("");
  const [foodPlan, setFoodPlan] = useState("FULL_MESS");
  const [customFoodFee, setCustomFoodFee] = useState("");
  const [residentType, setResidentType] = useState("SELF_PAYING");
  const [freeRoom, setFreeRoom] = useState(false);
  const [rentOverride, setRentOverride] = useState("");
  const [sponsorName, setSponsorName] = useState("");
  const [residentNotes, setResidentNotes] = useState("");
  const [moveInDate, setMoveInDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  // Fetch buildings
  useEffect(() => {
    const fetchBuildings = async () => {
      try {
        setLoadingBuildings(true);
        const res = await fetch(`/api/hostels/${hostelId}/buildings`);
        if (!res.ok) throw new Error("Failed to fetch buildings");
        const data = await res.json();
        setBuildings(Array.isArray(data) ? data : data.buildings || []);
      } catch (err) {
        console.error("Error fetching buildings:", err);
      } finally {
        setLoadingBuildings(false);
      }
    };
    fetchBuildings();
  }, [hostelId]);

  // Fetch floors when building selected
  useEffect(() => {
    if (!selectedBuilding) {
      setFloors([]);
      setSelectedFloor("");
      return;
    }
    const fetchFloors = async () => {
      try {
        setLoadingFloors(true);
        const res = await fetch(
          `/api/hostels/${hostelId}/floors?buildingId=${selectedBuilding}`
        );
        if (!res.ok) throw new Error("Failed to fetch floors");
        const data = await res.json();
        setFloors(Array.isArray(data) ? data : data.floors || []);
      } catch (err) {
        console.error("Error fetching floors:", err);
      } finally {
        setLoadingFloors(false);
      }
    };
    fetchFloors();
    setSelectedFloor("");
    setSelectedRoom("");
    setSelectedBed("");
    setRooms([]);
    setSelectedRoomData(null);
  }, [hostelId, selectedBuilding]);

  // Fetch rooms when floor selected
  useEffect(() => {
    if (!selectedFloor) {
      setRooms([]);
      setSelectedRoom("");
      return;
    }
    const fetchRooms = async () => {
      try {
        setLoadingRooms(true);
        const res = await fetch(
          `/api/hostels/${hostelId}/rooms?floorId=${selectedFloor}`
        );
        if (!res.ok) throw new Error("Failed to fetch rooms");
        const data = await res.json();
        const roomList = Array.isArray(data) ? data : data.rooms || [];
        // Only show rooms that have vacant beds
        const available = roomList.filter((r: RoomData) =>
          r.beds.some((b: BedData) => b.status === "VACANT")
        );
        setRooms(available);
      } catch (err) {
        console.error("Error fetching rooms:", err);
      } finally {
        setLoadingRooms(false);
      }
    };
    fetchRooms();
    setSelectedRoom("");
    setSelectedBed("");
    setSelectedRoomData(null);
  }, [hostelId, selectedFloor]);

  // Update room data when room selected
  useEffect(() => {
    if (!selectedRoom) {
      setSelectedRoomData(null);
      setSelectedBed("");
      setRentPerBed(0);
      return;
    }
    const room = rooms.find((r) => r.id === selectedRoom);
    if (room) {
      setSelectedRoomData(room);
      setRentPerBed(room.rentPerBed);
    }
    setSelectedBed("");
  }, [selectedRoom, rooms]);

  const vacantBeds = selectedRoomData
    ? selectedRoomData.beds.filter((b) => b.status === "VACANT")
    : [];

  const validateStep1 = () => {
    if (!name.trim()) return "Name is required";
    if (name.trim().length < 2) return "Name must be at least 2 characters";
    if (!email.trim()) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Invalid email address";
    // CNIC validation
    if (cnic) {
      const cleanCnic = cnic.replace(/\D/g, "");
      if (cleanCnic.length !== 13) return "CNIC must be exactly 13 digits";
      if (/^(\d)\1{12}$/.test(cleanCnic)) return "CNIC cannot be all same digits";
    }
    // Phone validation
    if (phone) {
      const cleanPhone = phone.replace(/\D/g, "");
      if (cleanPhone.length < 10 || cleanPhone.length > 12) return "Phone number must be 10-12 digits";
      if (/^(\d)\1{9,}$/.test(cleanPhone)) return "Phone cannot be all same digits";
    }
    return null;
  };

  const validateStep2 = () => {
    if (!selectedBuilding) return "Please select a building";
    if (!selectedFloor) return "Please select a floor";
    if (!selectedRoom) return "Please select a room";
    if (!selectedBed) return "Please select a bed";
    return null;
  };

  const validateStep3 = () => {
    if (!moveInDate) return "Move-in date is required";
    return null;
  };

  const handleNext = () => {
    setError("");
    if (currentStep === 1) {
      const err = validateStep1();
      if (err) {
        setError(err);
        return;
      }
    }
    if (currentStep === 2) {
      const err = validateStep2();
      if (err) {
        setError(err);
        return;
      }
    }
    setCurrentStep((prev) => Math.min(prev + 1, 3));
  };

  const handleBack = () => {
    setError("");
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    setError("");
    const err = validateStep3();
    if (err) {
      setError(err);
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`/api/hostels/${hostelId}/residents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          cnic: cnic.replace(/\D/g, "") || null,
          gender: gender || null,
          institution: institution.trim() || null,
          bloodGroup: bloodGroup || null,
          medicalCondition: medicalCondition.trim() || null,
          emergencyContact: emergencyContact.trim() || null,
          emergencyPhone: emergencyPhone.trim() || null,
          roomId: selectedRoom,
          bedId: selectedBed,
          advancePaid: parseFloat(advancePaid) || 0,
          securityDeposit: parseFloat(securityDeposit) || 0,
          foodPlan,
          customFoodFee: parseFloat(customFoodFee) || 0,
          residentType,
          freeRoom,
          rentOverride: rentOverride ? parseFloat(rentOverride) : null,
          sponsorName: sponsorName.trim() || null,
          notes: residentNotes.trim() || null,
          moveInDate,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create resident");
      }

      // Show login credentials if returned
      if (data.loginCredentials) {
        setCreatedCredentials(data.loginCredentials);
      } else {
        router.push(`/hostel/${hostelId}/residents?success=created`);
      }
    } catch (err: any) {
      setError(err.message || "Failed to create resident");
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(""), 2000);
  };

  // Show credentials screen after successful creation
  if (createdCredentials) {
    return (
      <DashboardLayout title="Resident Created" hostelId={hostelId}>
        <div className="max-w-lg mx-auto mt-8">
          <div className="card text-center p-8">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mx-auto mb-4">
              <Check size={32} className="text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-text-primary dark:text-white mb-2">
              Resident Added Successfully!
            </h2>
            <p className="text-sm text-text-muted mb-6">
              Share these login credentials with the resident so they can access the portal.
            </p>

            <div className="bg-slate-50 dark:bg-[#0B1222] rounded-2xl p-5 text-left space-y-4 mb-6">
              <div className="flex items-center gap-3">
                <KeyRound size={18} className="text-primary flex-shrink-0" />
                <span className="text-sm font-semibold text-text-primary dark:text-white">Login Credentials</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-white dark:bg-[#111C2E] rounded-xl px-4 py-3 border border-border dark:border-[#1E2D42]">
                  <div>
                    <p className="text-[11px] text-text-muted font-medium uppercase tracking-wider">Email</p>
                    <p className="text-sm font-semibold text-text-primary dark:text-white">{createdCredentials.email}</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(createdCredentials.email, "email")}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    {copied === "email" ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} className="text-text-muted" />}
                  </button>
                </div>
                <div className="flex items-center justify-between bg-white dark:bg-[#111C2E] rounded-xl px-4 py-3 border border-border dark:border-[#1E2D42]">
                  <div>
                    <p className="text-[11px] text-text-muted font-medium uppercase tracking-wider">Password</p>
                    <p className="text-sm font-mono font-bold text-primary">{createdCredentials.password}</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(createdCredentials.password, "password")}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    {copied === "password" ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} className="text-text-muted" />}
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-lg">
                Save these credentials now. The password cannot be retrieved later (admin can reset it).
              </p>
            </div>

            <div className="flex flex-col gap-2">
              {/* WhatsApp share */}
              <button
                onClick={() => {
                  const msg = encodeURIComponent(
                    `Assalam o Alaikum! Your HostelHub portal account is ready.\n\n` +
                    `Login at: ${window.location.origin}/login\n` +
                    `Email: ${createdCredentials.email}\n` +
                    `Password: ${createdCredentials.password}\n\n` +
                    `Please change your password after first login.`
                  );
                  window.open(`https://wa.me/?text=${msg}`, "_blank");
                }}
                className="btn-success w-full flex items-center justify-center gap-2"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Share via WhatsApp
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    copyToClipboard(
                      `HostelHub Login\nURL: ${window.location.origin}/login\nEmail: ${createdCredentials.email}\nPassword: ${createdCredentials.password}`,
                      "all"
                    );
                  }}
                  className="btn-secondary flex-1"
                >
                  {copied === "all" ? "Copied!" : "Copy All"}
                </button>
                <button
                  onClick={() => router.push(`/hostel/${hostelId}/residents`)}
                  className="btn-primary flex-1"
                >
                  Go to Residents
                </button>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Add Resident" hostelId={hostelId}>
      {/* Back button */}
      <button
        onClick={() => router.push(`/hostel/${hostelId}/residents`)}
        className="flex items-center gap-2 text-sm text-text-muted hover:text-text-primary dark:hover:text-white transition-colors mb-6"
      >
        <ArrowLeft size={16} />
        Back to Residents
      </button>

      {/* Stepper */}
      <div
        className="card p-6 mb-6 opacity-0 animate-fade-in-up"
        style={{ animationDelay: "0ms" }}
      >
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = currentStep === step.number;
            const isCompleted = currentStep > step.number;

            return (
              <div key={step.number} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      isCompleted
                        ? "bg-success text-white"
                        : isActive
                        ? "bg-primary text-white"
                        : "bg-bg-main dark:bg-[#0B1222] text-text-muted"
                    }`}
                  >
                    {isCompleted ? <Check size={20} /> : <StepIcon size={20} />}
                  </div>
                  <span
                    className={`text-xs mt-2 font-medium ${
                      isActive
                        ? "text-primary"
                        : isCompleted
                        ? "text-success"
                        : "text-text-muted"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-4 mt-[-20px] ${
                      currentStep > step.number
                        ? "bg-success"
                        : "bg-border dark:bg-[#1E2D42]"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-danger">
          {error}
        </div>
      )}

      {/* Step 1: Personal Info */}
      {currentStep === 1 && (
        <div
          className="card p-6 opacity-0 animate-fade-in-up"
          style={{ animationDelay: "100ms" }}
        >
          <h2 className="section-title mb-6">Personal Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">
                Full Name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                placeholder="Enter full name"
              />
            </div>
            <div>
              <label className="label">
                Email <span className="text-danger">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="Enter email address"
              />
            </div>
            <div>
              <label className="label">Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, "").slice(0, 11); setPhone(v); }}
                className="input"
                placeholder="03XXXXXXXXX" maxLength={11}
              />
            </div>
            <div>
              <label className="label">CNIC</label>
              <input
                type="text"
                value={cnic}
                onChange={(e) => {
                  let val = e.target.value.replace(/\D/g, "").slice(0, 13);
                  if (val.length > 5) val = val.slice(0, 5) + "-" + val.slice(5);
                  if (val.length > 13) val = val.slice(0, 13) + "-" + val.slice(13);
                  setCnic(val);
                }}
                className="input"
                placeholder="35202-1234567-1"
                maxLength={15}
              />
              {cnic && (
                <p className={`text-[11px] mt-1 font-medium ${
                  cnic.replace(/\D/g, "").length === 13 && !/^(\d)\1{12}$/.test(cnic.replace(/\D/g, ""))
                    ? "text-emerald-600" : "text-amber-600"
                }`}>
                  {cnic.replace(/\D/g, "").length === 13
                    ? (/^(\d)\1{12}$/.test(cnic.replace(/\D/g, "")) ? "Invalid: cannot be all same digits" : "Valid CNIC")
                    : `${cnic.replace(/\D/g, "").length}/13 digits entered`
                  }
                </p>
              )}
              {!cnic && <p className="text-[10px] text-text-muted mt-1">Format: XXXXX-XXXXXXX-X (13 digits)</p>}
            </div>
            <div>
              <label className="label">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="select"
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="label">Institution</label>
              <input
                type="text"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                className="input"
                placeholder="University / College / Company"
              />
            </div>
            <div>
              <label className="label">Blood Group</label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="select"
              >
                <option value="">Select Blood Group</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>
            <div>
              <label className="label">Medical Condition</label>
              <input
                type="text"
                value={medicalCondition}
                onChange={(e) => setMedicalCondition(e.target.value)}
                className="input"
                placeholder="Any known conditions (optional)"
              />
            </div>
            <div>
              <label className="label">Emergency Contact Name</label>
              <input
                type="text"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                className="input"
                placeholder="Emergency contact person"
              />
            </div>
            <div>
              <label className="label">Emergency Contact Phone</label>
              <input
                type="text"
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
                className="input"
                placeholder="Emergency phone number"
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Room Assignment */}
      {currentStep === 2 && (
        <div
          className="card p-6 opacity-0 animate-fade-in-up"
          style={{ animationDelay: "100ms" }}
        >
          <h2 className="section-title mb-6">Room Assignment</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">
                Building <span className="text-danger">*</span>
              </label>
              <select
                value={selectedBuilding}
                onChange={(e) => setSelectedBuilding(e.target.value)}
                className="select"
                disabled={loadingBuildings}
              >
                <option value="">
                  {loadingBuildings ? "Loading..." : "Select Building"}
                </option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">
                Floor <span className="text-danger">*</span>
              </label>
              <select
                value={selectedFloor}
                onChange={(e) => setSelectedFloor(e.target.value)}
                className="select"
                disabled={!selectedBuilding || loadingFloors}
              >
                <option value="">
                  {loadingFloors
                    ? "Loading..."
                    : !selectedBuilding
                    ? "Select building first"
                    : "Select Floor"}
                </option>
                {floors.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">
                Room <span className="text-danger">*</span>
              </label>
              <select
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                className="select"
                disabled={!selectedFloor || loadingRooms}
              >
                <option value="">
                  {loadingRooms
                    ? "Loading..."
                    : !selectedFloor
                    ? "Select floor first"
                    : rooms.length === 0
                    ? "No rooms with vacant beds"
                    : "Select Room"}
                </option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    Room {r.roomNumber} ({r.type} -{" "}
                    {r.beds.filter((b) => b.status === "VACANT").length} beds
                    available)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">
                Bed <span className="text-danger">*</span>
              </label>
              <select
                value={selectedBed}
                onChange={(e) => setSelectedBed(e.target.value)}
                className="select"
                disabled={!selectedRoom}
              >
                <option value="">
                  {!selectedRoom
                    ? "Select room first"
                    : vacantBeds.length === 0
                    ? "No vacant beds"
                    : "Select Bed"}
                </option>
                {vacantBeds.map((b) => (
                  <option key={b.id} value={b.id}>
                    Bed {b.bedNumber}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Room Details Card */}
          {selectedRoomData && (
            <div className="mt-6 p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800">
              <div className="flex items-center gap-2 mb-3">
                <Info size={16} className="text-primary" />
                <h3 className="text-sm font-semibold text-primary">Room Details</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-text-muted">Room Number</p>
                  <p className="text-sm font-semibold text-text-primary dark:text-white">
                    {selectedRoomData.roomNumber}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-text-muted">Type</p>
                  <p className="text-sm font-semibold text-text-primary dark:text-white">
                    {selectedRoomData.type}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-text-muted">Rent per Bed</p>
                  <p className="text-sm font-semibold text-text-primary dark:text-white">
                    {formatCurrency(selectedRoomData.rentPerBed)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-text-muted">Available Beds</p>
                  <p className="text-sm font-semibold text-success">
                    {vacantBeds.length} / {selectedRoomData.totalBeds}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Financial */}
      {currentStep === 3 && (
        <div
          className="card p-6 opacity-0 animate-fade-in-up"
          style={{ animationDelay: "100ms" }}
        >
          <h2 className="section-title mb-6">Financial Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Rent per Bed (PKR)</label>
              <input
                type="number"
                value={rentPerBed}
                readOnly
                className="input bg-bg-main dark:bg-[#0B1222] cursor-not-allowed"
              />
              <p className="text-xs text-text-muted mt-1">
                Auto-filled from selected room
              </p>
            </div>
            <div>
              <label className="label">
                Move-in Date <span className="text-danger">*</span>
              </label>
              <input
                type="date"
                value={moveInDate}
                onChange={(e) => setMoveInDate(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label">Advance Amount (PKR)</label>
              <input
                type="number"
                value={advancePaid}
                onChange={(e) => setAdvancePaid(e.target.value)}
                className="input"
                placeholder="0"
                min="0"
              />
            </div>
            <div>
              <label className="label">Security Deposit (PKR)</label>
              <input
                type="number"
                value={securityDeposit}
                onChange={(e) => setSecurityDeposit(e.target.value)}
                className="input"
                placeholder="0"
                min="0"
              />
            </div>
          </div>

          {/* Food Plan */}
          {/* Resident Type & Rent */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="label">Resident Type</label>
              <select value={residentType} onChange={(e) => {
                setResidentType(e.target.value);
                if (e.target.value === "GOVERNMENT" || e.target.value === "SCHOLARSHIP") setFreeRoom(true);
                else setFreeRoom(false);
              }} className="select">
                <option value="SELF_PAYING">Self Paying (Full rent)</option>
                <option value="SCHOLARSHIP">Scholarship (Free room)</option>
                <option value="GOVERNMENT">Government (Free room)</option>
                <option value="SPONSORED">Sponsored (Organization pays)</option>
              </select>
              <p className="text-[10px] text-text-muted mt-1">
                {residentType === "SELF_PAYING" && "Resident pays full room rent + food charges"}
                {residentType === "SCHOLARSHIP" && "Room is free. Only food/other charges apply."}
                {residentType === "GOVERNMENT" && "Government hostel - no room rent."}
                {residentType === "SPONSORED" && "Sponsored by an organization. Enter sponsor name below."}
              </p>
            </div>
            <div>
              {(residentType === "SPONSORED" || !freeRoom) && (
                <>
                  <label className="label">{freeRoom ? "Sponsor Name" : "Rent Override (PKR)"}</label>
                  {freeRoom || residentType === "SPONSORED" ? (
                    <input type="text" value={sponsorName} onChange={(e) => setSponsorName(e.target.value)} className="input" placeholder="Organization / sponsor name" />
                  ) : (
                    <>
                      <input type="number" value={rentOverride} onChange={(e) => setRentOverride(e.target.value)} className="input" placeholder={`Default: ${rentPerBed} (leave empty for room rent)`} min="0" />
                      <p className="text-[10px] text-text-muted mt-1">Leave empty to use room&apos;s default rent. Set custom amount for special pricing.</p>
                    </>
                  )}
                </>
              )}
              {freeRoom && residentType !== "SPONSORED" && (
                <div className="flex items-center gap-2 mt-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Free Room - No rent will be charged</span>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="mt-4">
            <label className="label">Additional Notes</label>
            <textarea value={residentNotes} onChange={(e) => setResidentNotes(e.target.value)} className="textarea" rows={2} placeholder="Any special notes about this resident (optional)" />
          </div>

          {/* Food Plan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="label">Food Plan</label>
              <select
                value={foodPlan}
                onChange={(e) => setFoodPlan(e.target.value)}
                className="select"
              >
                <option value="FULL_MESS">Full Mess - Fixed monthly fee</option>
                <option value="NO_MESS">No Mess - Only app food orders (Rs 0 fixed)</option>
                <option value="CUSTOM">Custom Fee - Set your own amount</option>
              </select>
              <p className="text-[11px] text-text-muted mt-1">
                {foodPlan === "FULL_MESS" && "Hostel's fixed food fee will be charged every billing cycle. Set the amount in Billing → Settings."}
                {foodPlan === "NO_MESS" && "No fixed food charge. Only charged if resident orders food through the app."}
                {foodPlan === "CUSTOM" && "Set a custom monthly food fee for this resident (different from hostel default)."}
              </p>
            </div>
            {foodPlan === "CUSTOM" && (
              <div>
                <label className="label">Custom Food Fee (PKR/month)</label>
                <input
                  type="number"
                  value={customFoodFee}
                  onChange={(e) => setCustomFoodFee(e.target.value)}
                  className="input"
                  placeholder="e.g., 3000"
                  min="0"
                />
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="mt-6 p-4 rounded-xl bg-bg-main dark:bg-[#0B1222] border border-border dark:border-[#1E2D42]">
            <h3 className="text-sm font-semibold text-text-primary dark:text-white mb-3">
              Summary
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Monthly Rent</span>
                <span className="font-medium text-text-primary dark:text-white">
                  {formatCurrency(rentPerBed)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Advance</span>
                <span className="font-medium text-text-primary dark:text-white">
                  {formatCurrency(parseFloat(advancePaid) || 0)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Security Deposit</span>
                <span className="font-medium text-text-primary dark:text-white">
                  {formatCurrency(parseFloat(securityDeposit) || 0)}
                </span>
              </div>
              <div className="border-t border-border dark:border-[#1E2D42] pt-2 mt-2">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-text-primary dark:text-white">
                    Total Due at Move-in
                  </span>
                  <span className="font-bold text-primary">
                    {formatCurrency(
                      rentPerBed +
                        (parseFloat(advancePaid) || 0) +
                        (parseFloat(securityDeposit) || 0)
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div
        className="flex items-center justify-between mt-6 opacity-0 animate-fade-in-up"
        style={{ animationDelay: "200ms" }}
      >
        <button
          onClick={handleBack}
          disabled={currentStep === 1}
          className={`btn-secondary flex items-center gap-2 ${
            currentStep === 1 ? "opacity-0 pointer-events-none" : ""
          }`}
        >
          <ArrowLeft size={16} />
          Previous
        </button>

        {currentStep < 3 ? (
          <button
            onClick={handleNext}
            className="btn-primary flex items-center gap-2"
          >
            Next
            <ArrowRight size={16} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="btn-success flex items-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Check size={16} />
                Create Resident
              </>
            )}
          </button>
        )}
      </div>
    </DashboardLayout>
  );
}
