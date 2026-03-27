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
    if (!email.trim()) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Invalid email address";
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
          moveInDate,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create resident");
      }

      router.push(`/hostel/${hostelId}/residents?success=created`);
    } catch (err: any) {
      setError(err.message || "Failed to create resident");
    } finally {
      setSubmitting(false);
    }
  };

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
                onChange={(e) => setPhone(e.target.value)}
                className="input"
                placeholder="03XX-XXXXXXX"
              />
            </div>
            <div>
              <label className="label">CNIC</label>
              <input
                type="text"
                value={cnic}
                onChange={(e) => setCnic(e.target.value)}
                className="input"
                placeholder="XXXXX-XXXXXXX-X"
              />
              <p className="text-xs text-text-muted mt-1">
                Format: XXXXX-XXXXXXX-X
              </p>
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
