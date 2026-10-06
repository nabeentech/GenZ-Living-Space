"use client";

import React, { useState, useMemo } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { Bed as BedIcon, User, Sparkles, Filter, CheckCircle2, AlertTriangle, RefreshCw, ChevronRight, Edit2, Plus, Trash2 } from "lucide-react";

interface BedMatrixClientProps {
  hostels: any[];
}

export const BedMatrixClient: React.FC<BedMatrixClientProps> = ({ hostels }) => {
  const [selectedHostelId, setSelectedHostelId] = useState<string>(
    hostels[0]?.id || "all"
  );
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);

  const [selectedBed, setSelectedBed] = useState<any | null>(null);
  const [newBedStatus, setNewBedStatus] = useState<string>("");
  const [isUpdatingBed, setIsUpdatingBed] = useState(false);
  const [updateMsg, setUpdateMsg] = useState("");

  const [selectedRoom, setSelectedRoom] = useState<any | null>(null);
  const [roomGender, setRoomGender] = useState<string>("");
  const [roomStatus, setRoomStatus] = useState<string>("");
  const [roomCapacity, setRoomCapacity] = useState<number>(0);
  const [isUpdatingRoom, setIsUpdatingRoom] = useState(false);
  const [roomUpdateMsg, setRoomUpdateMsg] = useState("");

  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [newRoomNumber, setNewRoomNumber] = useState<string>("");
  const [newRoomFloor, setNewRoomFloor] = useState<number>(1);
  const [newRoomGender, setNewRoomGender] = useState<string>("MIXED");
  const [newRoomCapacity, setNewRoomCapacity] = useState<number>(4);
  const [isAddingRoom, setIsAddingRoom] = useState(false);
  const [addRoomMsg, setAddRoomMsg] = useState("");

  const [showAddFloorModal, setShowAddFloorModal] = useState(false);
  const [newFloorNumber, setNewFloorNumber] = useState<number>(7);
  const [newFloorRoomCount, setNewFloorRoomCount] = useState<number>(20);
  const [isAddingFloor, setIsAddingFloor] = useState(false);
  const [addFloorMsg, setAddFloorMsg] = useState("");

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState<any | null>(null);
  const [isDeletingRoom, setIsDeletingRoom] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState("");

  const filteredHostels = useMemo(() => {
    if (selectedHostelId === "all") return hostels;
    return hostels.filter((h) => h.id === selectedHostelId);
  }, [hostels, selectedHostelId]);

  // Get unique floors and calculate statistics
  const floorsWithStats = useMemo(() => {
    const hostel = filteredHostels[0];
    if (!hostel) return [];

    const floorMap = new Map<number, any>();

    hostel.rooms.forEach((room: any) => {
      if (!floorMap.has(room.floor)) {
        floorMap.set(room.floor, {
          floor: room.floor,
          totalRooms: 0,
          totalBeds: 0,
          availableBeds: 0,
          occupiedBeds: 0,
          cleaningBeds: 0,
          reservedBeds: 0,
          maintenanceBeds: 0,
        });
      }

      const floorData = floorMap.get(room.floor)!;
      floorData.totalRooms += 1;

      room.beds.forEach((bed: any) => {
        floorData.totalBeds += 1;
        if (bed.status === "AVAILABLE") floorData.availableBeds += 1;
        else if (bed.status === "OCCUPIED") floorData.occupiedBeds += 1;
        else if (bed.status === "CLEANING") floorData.cleaningBeds += 1;
        else if (bed.status === "RESERVED") floorData.reservedBeds += 1;
        else if (bed.status === "MAINTENANCE") floorData.maintenanceBeds += 1;
      });
    });

    return Array.from(floorMap.values()).sort((a, b) => a.floor - b.floor);
  }, [filteredHostels]);

  // Filter rooms by selected floor
  const filteredRooms = useMemo(() => {
    const hostel = filteredHostels[0];
    if (!hostel) return [];

    if (selectedFloor === null) return hostel.rooms;
    return hostel.rooms.filter((room: any) => room.floor === selectedFloor);
  }, [filteredHostels, selectedFloor]);

  const handleBedClick = (bed: any, room: any, hostel: any) => {
    setSelectedBed({ ...bed, room, hostel });
    setNewBedStatus(bed.status);
    setUpdateMsg("");
  };

  const handleEditRoom = (room: any) => {
    setSelectedRoom(room);
    setRoomGender(room.genderCategory);
    setRoomStatus(room.status);
    setRoomCapacity(room.capacity);
    setRoomUpdateMsg("");
  };

  const handleUpdateRoom = async () => {
    if (!selectedRoom) return;
    setIsUpdatingRoom(true);
    setRoomUpdateMsg("");

    try {
      const res = await fetch(`/api/admin/rooms/${selectedRoom.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          genderCategory: roomGender,
          status: roomStatus,
          capacity: roomCapacity
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to update room");
      }

      setRoomUpdateMsg(json.message);
      setTimeout(() => {
        setSelectedRoom(null);
        setRoomUpdateMsg("");
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      setRoomUpdateMsg(err.message || "Update error");
    } finally {
      setIsUpdatingRoom(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedBed || !newBedStatus) return;
    setIsUpdatingBed(true);
    setUpdateMsg("");

    try {
      const res = await fetch(`/api/admin/beds/${selectedBed.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newBedStatus }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to update bed status");
      }

      setUpdateMsg(json.message);
      // Update local state
      selectedBed.status = newBedStatus;
      setTimeout(() => {
        setSelectedBed(null);
        setUpdateMsg("");
        window.location.reload(); // Refresh to reflect inventory
      }, 1000);
    } catch (err: any) {
      setUpdateMsg(err.message || "Update error");
    } finally {
      setIsUpdatingBed(false);
    }
  };

  const handleAddRoom = async () => {
    if (!newRoomNumber || !filteredHostels[0]) return;
    setIsAddingRoom(true);
    setAddRoomMsg("");

    try {
      const res = await fetch(`/api/admin/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostelId: filteredHostels[0].id,
          roomNumber: newRoomNumber,
          floor: newRoomFloor,
          genderCategory: newRoomGender,
          capacity: newRoomCapacity,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to add room");
      }

      setAddRoomMsg(json.message);
      setTimeout(() => {
        setShowAddRoomModal(false);
        setNewRoomNumber("");
        setNewRoomFloor(1);
        setNewRoomGender("MIXED");
        setNewRoomCapacity(4);
        setAddRoomMsg("");
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      setAddRoomMsg(err.message || "Add room error");
    } finally {
      setIsAddingRoom(false);
    }
  };

  const handleAddFloor = async () => {
    if (!filteredHostels[0]) return;
    setIsAddingFloor(true);
    setAddFloorMsg("");

    try {
      const res = await fetch(`/api/admin/floors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostelId: filteredHostels[0].id,
          floorNumber: newFloorNumber,
          roomCount: newFloorRoomCount,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to add floor");
      }

      setAddFloorMsg(json.message);
      setTimeout(() => {
        setShowAddFloorModal(false);
        setNewFloorNumber(7);
        setNewFloorRoomCount(20);
        setAddFloorMsg("");
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      setAddFloorMsg(err.message || "Add floor error");
    } finally {
      setIsAddingFloor(false);
    }
  };

  const handleDeleteRoom = async () => {
    if (!roomToDelete) return;
    setIsDeletingRoom(true);
    setDeleteMsg("");

    try {
      const res = await fetch(`/api/admin/rooms/${roomToDelete.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to delete room");
      }

      setDeleteMsg(json.message);
      setTimeout(() => {
        setShowDeleteConfirm(false);
        setRoomToDelete(null);
        setSelectedRoom(null);
        setDeleteMsg("");
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      setDeleteMsg(err.message || "Delete error");
    } finally {
      setIsDeletingRoom(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hostel & Status Filter Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 bg-[#111827]/80 flex flex-wrap items-center justify-between gap-4">
        {/* Hostel Selector */}
        <div className="flex flex-wrap items-center gap-2">
          {hostels.map((h) => (
            <button
              key={h.id}
              onClick={() => setSelectedHostelId(h.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                selectedHostelId === h.id
                  ? "bg-indigo-600 text-white shadow-glow"
                  : "bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
              }`}
            >
              {h.name} ({h.city})
            </button>
          ))}
        </div>

        {/* Legend / Status Filter */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {[
            { id: "all", label: "All Statuses" },
            { id: "AVAILABLE", label: "Available", color: "text-emerald-400" },
            { id: "OCCUPIED", label: "Occupied", color: "text-purple-400" },
            { id: "RESERVED", label: "Reserved", color: "text-blue-400" },
            { id: "CLEANING", label: "Cleaning", color: "text-amber-400" },
            { id: "MAINTENANCE", label: "Maintenance", color: "text-red-400" },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id)}
              className={`px-2.5 py-1 rounded-lg transition text-xs font-semibold ${
                statusFilter === st.id
                  ? "bg-slate-800 text-white border border-slate-700"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span className={st.color || ""}>{st.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Floor Selection with Statistics */}
      {floorsWithStats.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-slate-300">Floor Overview</h3>
            <div className="flex gap-2">
              {selectedFloor !== null && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedFloor(null)}
                  className="text-xs"
                >
                  View All Floors
                </Button>
              )}
              <Button
                variant="glow"
                size="sm"
                onClick={() => setShowAddRoomModal(true)}
                className="text-xs flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Room
              </Button>
              <Button
                variant="glow"
                size="sm"
                onClick={() => setShowAddFloorModal(true)}
                className="text-xs flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Floor
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            {floorsWithStats.map((floor) => (
              <button
                key={floor.floor}
                onClick={() => setSelectedFloor(floor.floor)}
                className={`p-4 rounded-2xl border transition ${
                  selectedFloor === floor.floor
                    ? "bg-indigo-950 border-indigo-500 shadow-glow"
                    : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-lg font-black text-white">
                    Floor {floor.floor}
                  </span>
                  {selectedFloor === floor.floor && (
                    <ChevronRight className="w-4 h-4 text-indigo-400" />
                  )}
                </div>
                
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Rooms:</span>
                    <span className="font-bold text-white">{floor.totalRooms}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Total Beds:</span>
                    <span className="font-bold text-white">{floor.totalBeds}</span>
                  </div>
                  
                  <div className="pt-2 border-t border-slate-800 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-emerald-400">Available:</span>
                      <span className="font-bold text-emerald-300">{floor.availableBeds}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-purple-400">Occupied:</span>
                      <span className="font-bold text-purple-300">{floor.occupiedBeds}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-amber-400">Cleaning:</span>
                      <span className="font-bold text-amber-300">{floor.cleaningBeds}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-400">Reserved:</span>
                      <span className="font-bold text-blue-300">{floor.reservedBeds}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-red-400">Maintenance:</span>
                      <span className="font-bold text-red-300">{floor.maintenanceBeds}</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Grid of Rooms and Beds */}
      <div className="space-y-8">
        {filteredHostels.map((h) => (
          <div
            key={h.id}
            className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 bg-[#101626]/80 space-y-6"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-xl font-black text-white">{h.name}</h2>
                <span className="text-xs text-slate-400">{h.address}</span>
              </div>
              <Badge variant="indigo" size="md">
                {selectedFloor !== null
                  ? `Floor ${selectedFloor}: ${filteredRooms.length} Rooms`
                  : `${h.rooms.length} Rooms`}
              </Badge>
            </div>

            {/* Rooms Grid */}
            <div className="space-y-6">
              {filteredRooms.map((room: any) => {
                const visibleBeds =
                  statusFilter === "all"
                    ? room.beds
                    : room.beds.filter((b: any) => b.status === statusFilter);

                if (visibleBeds.length === 0 && statusFilter !== "all") {
                  return null;
                }

                return (
                  <div
                    key={room.id}
                    className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-3 hover:border-slate-700 transition"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2.5">
                          <span className="text-lg font-black text-white">
                            Room {room.roomNumber}
                          </span>
                          <Badge 
                            variant={
                              room.genderCategory === "MALE" ? "default" :
                              room.genderCategory === "FEMALE" ? "available" :
                              room.genderCategory === "PRIVATE" ? "maintenance" :
                              "occupied"
                            } 
                            size="sm"
                          >
                            {room.genderCategory}
                          </Badge>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                          <span>Floor {room.floor}</span>
                          <span>•</span>
                          <span>{room.building}</span>
                          <span>•</span>
                          <Badge variant="default" size="sm">
                            {room.roomType.name}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-3">
                        <div className="flex items-center gap-3">
                          <div>
                            <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">
                              Beds in Room
                            </div>
                            <div className="text-3xl font-black text-white">
                              {room.capacity}
                            </div>
                          </div>
                          <Button
                            variant="glow"
                            size="sm"
                            onClick={() => handleEditRoom(room)}
                            className="text-xs flex items-center gap-1 h-fit"
                          >
                            <Edit2 className="w-4 h-4" />
                            Edit
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Beds in Room */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 pt-2">
                      {room.beds.map((bed: any) => {
                        const occupant = bed.bookings[0];
                        const isMatch =
                          statusFilter === "all" || bed.status === statusFilter;

                        const statusStyle = {
                          AVAILABLE:
                            "bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:border-emerald-400",
                          OCCUPIED:
                            "bg-purple-950/40 border-purple-500/40 text-purple-300 hover:border-purple-400",
                          RESERVED:
                            "bg-blue-950/40 border-blue-500/40 text-blue-300 hover:border-blue-400",
                          CLEANING:
                            "bg-amber-950/40 border-amber-500/40 text-amber-300 hover:border-amber-400",
                          MAINTENANCE:
                            "bg-red-950/40 border-red-500/40 text-red-300 hover:border-red-400",
                          BLOCKED:
                            "bg-slate-950 border-slate-800 text-slate-500",
                        }[bed.status as string] || "bg-slate-900 border-slate-800 text-slate-300";

                        return (
                          <div
                            key={bed.id}
                            onClick={() => handleBedClick(bed, room, h)}
                            className={`p-3 rounded-xl border flex flex-col items-center text-center gap-1.5 transition cursor-pointer ${statusStyle} ${
                              !isMatch ? "opacity-30" : ""
                            }`}
                          >
                            <BedIcon className="w-5 h-5" />
                            <span className="font-extrabold text-xs block">
                              {bed.bedNumber}
                            </span>
                            <span className="text-[9px] uppercase font-bold tracking-wider">
                              {bed.status}
                            </span>
                            {occupant && (
                              <span className="text-[9px] text-slate-400 truncate max-w-[80px]">
                                {occupant.guestName.split(" ")[0]}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bed Detail & Quick Status Edit Modal */}
      {selectedBed && (
        <Modal
          isOpen={!!selectedBed}
          onClose={() => setSelectedBed(null)}
          title={`Bed Details — ${selectedBed.bedNumber}`}
          description={`${selectedBed.hostel.name} • Room ${selectedBed.room.roomNumber}`}
        >
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Tier:</span>
                <span className="font-bold text-white">
                  {selectedBed.tier.replace("_", " ")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Current Status:</span>
                <Badge
                  variant={
                    selectedBed.status === "AVAILABLE"
                      ? "available"
                      : selectedBed.status === "OCCUPIED"
                      ? "occupied"
                      : selectedBed.status === "CLEANING"
                      ? "cleaning"
                      : selectedBed.status === "RESERVED"
                      ? "reserved"
                      : "maintenance"
                  }
                  size="sm"
                >
                  {selectedBed.status}
                </Badge>
              </div>
              {selectedBed.bookings?.[0] && (
                <div className="pt-2 border-t border-slate-800 space-y-1">
                  <span className="font-bold text-indigo-300 block">
                    Current Occupant:
                  </span>
                  <p className="text-white font-semibold">
                    {selectedBed.bookings[0].guestName} ({selectedBed.bookings[0].bookingReference})
                  </p>
                  <p className="text-slate-400 text-[11px]">
                    Dates: {new Date(selectedBed.bookings[0].checkInDate).toLocaleDateString()} —{" "}
                    {new Date(selectedBed.bookings[0].checkOutDate).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>

            {/* Change Status Form */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1.5">
                Update Status Override
              </label>
              <select
                value={newBedStatus}
                onChange={(e) => setNewBedStatus(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm font-semibold text-white focus:outline-none"
              >
                <option value="AVAILABLE">AVAILABLE (Ready for new guest)</option>
                <option value="OCCUPIED">OCCUPIED (Resident currently staying)</option>
                <option value="RESERVED">RESERVED (Upcoming booking held)</option>
                <option value="CLEANING">CLEANING (Housekeeping in progress)</option>
                <option value="MAINTENANCE">MAINTENANCE (Repair / block)</option>
                <option value="BLOCKED">BLOCKED (Admin override)</option>
              </select>
            </div>

            {updateMsg && (
              <div className="p-3 rounded-xl bg-indigo-950 border border-indigo-500 text-xs text-indigo-300">
                {updateMsg}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedBed(null)}
                disabled={isUpdatingBed}
              >
                Cancel
              </Button>
              <Button
                variant="glow"
                size="sm"
                isLoading={isUpdatingBed}
                onClick={handleUpdateStatus}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Room Edit Modal */}
      {selectedRoom && (
        <Modal
          isOpen={!!selectedRoom}
          onClose={() => setSelectedRoom(null)}
          title={`Edit Room — ${selectedRoom.roomNumber}`}
          description={`Floor ${selectedRoom.floor} • ${selectedRoom.building} • ${selectedRoom.roomType.name}`}
        >
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Room Number:</span>
                <span className="font-bold text-white">{selectedRoom.roomNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Room Type:</span>
                <span className="font-bold text-white">{selectedRoom.roomType.name}</span>
              </div>
            </div>

            {/* Bed Management */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-3">
                Manage Beds in Room
              </label>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900 border border-slate-700">
                  <div>
                    <div className="text-xs text-slate-400 mb-1">Total Beds</div>
                    <div className="text-2xl font-black text-white">{roomCapacity}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setRoomCapacity(Math.max(1, roomCapacity - 1))}
                      className="text-lg px-3"
                    >
                      −
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setRoomCapacity(roomCapacity + 1)}
                      className="text-lg px-3"
                    >
                      +
                    </Button>
                  </div>
                </div>
                
                {roomCapacity !== selectedRoom.capacity && (
                  <div className="p-3 rounded-xl bg-amber-950 border border-amber-500 text-xs text-amber-300">
                    {roomCapacity > selectedRoom.capacity
                      ? `Will add ${roomCapacity - selectedRoom.capacity} bed(s) to this room`
                      : `Will remove ${selectedRoom.capacity - roomCapacity} bed(s) from this room`}
                  </div>
                )}
              </div>
            </div>

            {/* Gender Category */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1.5">
                Gender Category
              </label>
              <select
                value={roomGender}
                onChange={(e) => setRoomGender(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm font-semibold text-white focus:outline-none"
              >
                <option value="MALE">Male Only</option>
                <option value="FEMALE">Female Only</option>
                <option value="MIXED">Mixed Gender</option>
                <option value="PRIVATE">Private</option>
              </select>
            </div>

            {/* Room Status */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1.5">
                Room Status
              </label>
              <select
                value={roomStatus}
                onChange={(e) => setRoomStatus(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm font-semibold text-white focus:outline-none"
              >
                <option value="ACTIVE">Active (Available for booking)</option>
                <option value="MAINTENANCE">Maintenance (Under repair)</option>
                <option value="BLOCKED">Blocked (Admin override)</option>
              </select>
            </div>

            {roomUpdateMsg && (
              <div className="p-3 rounded-xl bg-indigo-950 border border-indigo-500 text-xs text-indigo-300">
                {roomUpdateMsg}
              </div>
            )}

            <div className="flex justify-between gap-3 pt-2">
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  setRoomToDelete(selectedRoom);
                  setShowDeleteConfirm(true);
                }}
                disabled={isUpdatingRoom}
                className="text-xs flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4" />
                Delete Room
              </Button>
              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedRoom(null)}
                  disabled={isUpdatingRoom}
                >
                  Cancel
                </Button>
                <Button
                  variant="glow"
                  size="sm"
                  isLoading={isUpdatingRoom}
                  onClick={handleUpdateRoom}
                >
                  Save Room Changes
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Room Modal */}
      {showAddRoomModal && (
        <Modal
          isOpen={showAddRoomModal}
          onClose={() => setShowAddRoomModal(false)}
          title="Add New Room"
          description={`Add a new room to ${filteredHostels[0]?.name}`}
        >
          <div className="space-y-4 py-2">
            {/* Room Number */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1.5">
                Room Number
              </label>
              <input
                type="text"
                value={newRoomNumber}
                onChange={(e) => setNewRoomNumber(e.target.value)}
                placeholder="e.g., 701, 702, etc."
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm font-semibold text-white placeholder-slate-500 focus:outline-none"
              />
            </div>

            {/* Floor Selection */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1.5">
                Floor Number
              </label>
              <select
                value={newRoomFloor}
                onChange={(e) => setNewRoomFloor(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm font-semibold text-white focus:outline-none"
              >
                {floorsWithStats.map((floor) => (
                  <option key={floor.floor} value={floor.floor}>
                    Floor {floor.floor}
                  </option>
                ))}
                {[...Array(3)].map((_, i) => {
                  const newFloor = Math.max(...floorsWithStats.map((f) => f.floor)) + i + 1;
                  return (
                    <option key={newFloor} value={newFloor}>
                      Floor {newFloor}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Gender Category */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1.5">
                Gender Category
              </label>
              <select
                value={newRoomGender}
                onChange={(e) => setNewRoomGender(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm font-semibold text-white focus:outline-none"
              >
                <option value="MALE">Male Only</option>
                <option value="FEMALE">Female Only</option>
                <option value="MIXED">Mixed Gender</option>
                <option value="PRIVATE">Private</option>
              </select>
            </div>

            {/* Bed Capacity */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1.5">
                Bed Capacity
              </label>
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900 border border-slate-700">
                <span className="text-lg font-black text-white">{newRoomCapacity} beds</span>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setNewRoomCapacity(Math.max(1, newRoomCapacity - 1))}
                    className="text-lg px-3"
                  >
                    −
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setNewRoomCapacity(Math.min(20, newRoomCapacity + 1))}
                    className="text-lg px-3"
                  >
                    +
                  </Button>
                </div>
              </div>
            </div>

            {addRoomMsg && (
              <div className={`p-3 rounded-xl text-xs ${
                addRoomMsg.includes("success") || addRoomMsg.includes("added")
                  ? "bg-emerald-950 border border-emerald-500 text-emerald-300"
                  : "bg-red-950 border border-red-500 text-red-300"
              }`}>
                {addRoomMsg}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddRoomModal(false)}
                disabled={isAddingRoom}
              >
                Cancel
              </Button>
              <Button
                variant="glow"
                size="sm"
                isLoading={isAddingRoom}
                onClick={handleAddRoom}
              >
                Create Room
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Floor Modal */}
      {showAddFloorModal && (
        <Modal
          isOpen={showAddFloorModal}
          onClose={() => setShowAddFloorModal(false)}
          title="Add New Floor"
          description={`Add a new floor with multiple rooms to ${filteredHostels[0]?.name}`}
        >
          <div className="space-y-4 py-2">
            {/* Floor Number */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1.5">
                Floor Number
              </label>
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900 border border-slate-700">
                <span className="text-2xl font-black text-white">Floor {newFloorNumber}</span>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setNewFloorNumber(Math.max(1, newFloorNumber - 1))}
                    className="text-lg px-3"
                  >
                    −
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setNewFloorNumber(newFloorNumber + 1)}
                    className="text-lg px-3"
                  >
                    +
                  </Button>
                </div>
              </div>
            </div>

            {/* Room Count */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1.5">
                Number of Rooms on Floor
              </label>
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900 border border-slate-700">
                <span className="text-2xl font-black text-white">{newFloorRoomCount} rooms</span>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setNewFloorRoomCount(Math.max(1, newFloorRoomCount - 1))}
                    className="text-lg px-3"
                  >
                    −
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setNewFloorRoomCount(Math.min(50, newFloorRoomCount + 1))}
                    className="text-lg px-3"
                  >
                    +
                  </Button>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-indigo-950 border border-indigo-500 text-xs text-indigo-300">
              Will create Floor {newFloorNumber} with {newFloorRoomCount} rooms. Each room will start with 4 beds (can be edited after creation).
            </div>

            {addFloorMsg && (
              <div className={`p-3 rounded-xl text-xs ${
                addFloorMsg.includes("success") || addFloorMsg.includes("created")
                  ? "bg-emerald-950 border border-emerald-500 text-emerald-300"
                  : "bg-red-950 border border-red-500 text-red-300"
              }`}>
                {addFloorMsg}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddFloorModal(false)}
                disabled={isAddingFloor}
              >
                Cancel
              </Button>
              <Button
                variant="glow"
                size="sm"
                isLoading={isAddingFloor}
                onClick={handleAddFloor}
              >
                Create Floor
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Room Confirmation Modal */}
      {showDeleteConfirm && roomToDelete && (
        <Modal
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          title="Delete Room"
          description={`Are you sure you want to delete Room ${roomToDelete.roomNumber}?`}
        >
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/30 space-y-2">
              <p className="text-xs text-rose-300">
                <span className="font-bold">Warning:</span> This action cannot be undone. All beds in this room will be deleted.
              </p>
              <p className="text-xs text-rose-300">
                Room Number: <span className="font-bold text-white">{roomToDelete.roomNumber}</span>
              </p>
              <p className="text-xs text-rose-300">
                Floor: <span className="font-bold text-white">Floor {roomToDelete.floor}</span>
              </p>
              <p className="text-xs text-rose-300">
                Current Beds: <span className="font-bold text-white">{roomToDelete.capacity}</span>
              </p>
            </div>

            {deleteMsg && (
              <div className={`p-3 rounded-xl text-xs ${
                deleteMsg.includes("success") || deleteMsg.includes("deleted")
                  ? "bg-emerald-950 border border-emerald-500 text-emerald-300"
                  : "bg-red-950 border border-red-500 text-red-300"
              }`}>
                {deleteMsg}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeletingRoom}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                isLoading={isDeletingRoom}
                onClick={handleDeleteRoom}
                className="flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4" />
                Delete Room Permanently
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default BedMatrixClient;
