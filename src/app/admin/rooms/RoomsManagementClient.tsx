"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Wind, Zap, AlertCircle, Search, Loader2, CheckCircle2, X, Sun, Home, Sparkles } from "lucide-react";
import Badge from "@/components/ui/Badge";
import { SHARING_NAMES, getRoomVariantInfo, RoomVariant } from "@/lib/room-types";

interface Room {
  id: string;
  roomNumber: string;
  floor: number;
  capacity: number;
  isAC: boolean;
  status: string;
  bedCount?: number;
  roomTypeId?: string;
  roomType?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

interface RoomResponse {
  id: string;
  roomNumber: string;
  floor: number;
  capacity: number;
  isAC: boolean;
  status: string;
  roomTypeId?: string;
  roomType?: {
    id: string;
    name: string;
    slug: string;
  };
  beds?: any[];
}

interface RoomsManagementClientProps {
  canEdit?: boolean;
}

export const RoomsManagementClient: React.FC<RoomsManagementClientProps> = ({ canEdit = true }) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSharing, setFilterSharing] = useState<number | "all">("all");
  const [filterVariant, setFilterVariant] = useState<"all" | "TYPE_1" | "TYPE_2">("all");
  const [filterAC, setFilterAC] = useState<"all" | "ac" | "non-ac">("all");
  const [updatingRoomId, setUpdatingRoomId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Fetch all rooms
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/admin/rooms");
        if (!response.ok) throw new Error("Failed to fetch rooms");
        const data = (await response.json()) as RoomResponse[];
        const formattedRooms: Room[] = data.map((room) => ({
          id: room.id,
          roomNumber: room.roomNumber,
          floor: room.floor,
          capacity: room.capacity,
          isAC: room.isAC,
          status: room.status,
          bedCount: room.beds?.length || room.capacity,
          roomTypeId: room.roomTypeId,
          roomType: room.roomType,
        }));
        setRooms(formattedRooms);
        setFilteredRooms(formattedRooms);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, []);

  // Filter rooms based on search, sharing, variant, and AC
  useEffect(() => {
    let result = rooms;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (room) =>
          room.roomNumber.toLowerCase().includes(q) ||
          room.floor.toString().includes(q)
      );
    }

    if (filterSharing !== "all") {
      result = result.filter((room) => room.capacity === filterSharing);
    }

    if (filterVariant !== "all") {
      result = result.filter((room) => {
        const info = getRoomVariantInfo(room);
        return info.variant === filterVariant;
      });
    }

    if (filterAC !== "all") {
      result = result.filter((room) => (filterAC === "ac" ? room.isAC : !room.isAC));
    }

    setFilteredRooms(result);
  }, [searchTerm, filterSharing, filterVariant, filterAC, rooms]);

  // Toggle AC status
  const toggleAC = useCallback(
    async (roomId: string, currentStatus: boolean) => {
      try {
        setUpdatingRoomId(roomId);
        const response = await fetch(`/api/admin/rooms/${roomId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ isAC: !currentStatus }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || "Failed to update room");
        }

        const data = await response.json();

        // Update local state
        setRooms((prev) =>
          prev.map((room) =>
            room.id === roomId ? { ...room, isAC: !currentStatus, roomType: data.room?.roomType || room.roomType } : room
          )
        );

        setToast({
          message: `Room ${rooms.find((r) => r.id === roomId)?.roomNumber} updated to ${!currentStatus ? "AC" : "Non-AC"}`,
          type: "success",
        });
      } catch (err: any) {
        setToast({
          message: err.message || "Failed to update room",
          type: "error",
        });
      } finally {
        setUpdatingRoomId(null);
      }
    },
    [rooms]
  );

  // Switch Room Variant (Ventilated vs Standard)
  const setRoomVariant = useCallback(
    async (roomId: string, targetVariant: RoomVariant) => {
      try {
        setUpdatingRoomId(roomId);
        const response = await fetch(`/api/admin/rooms/${roomId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ variant: targetVariant }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || "Failed to update room variant");
        }

        const data = await response.json();

        setRooms((prev) =>
          prev.map((room) =>
            room.id === roomId
              ? {
                  ...room,
                  roomTypeId: data.room?.roomTypeId || room.roomTypeId,
                  roomType: data.room?.roomType || room.roomType,
                }
              : room
          )
        );

        const targetRoom = rooms.find((r) => r.id === roomId);
        const isThreeShare = targetRoom?.capacity === 3;
        const targetLabel =
          targetVariant === "TYPE_1"
            ? (isThreeShare ? "Spacious" : "Ventilated")
            : "Standard";
        setToast({
          message: `Room ${targetRoom?.roomNumber} set to ${targetLabel}`,
          type: "success",
        });
      } catch (err: any) {
        setToast({
          message: err.message || "Failed to update room variant",
          type: "error",
        });
      } finally {
        setUpdatingRoomId(null);
      }
    },
    [rooms]
  );

  // Group rooms by floor
  const roomsByFloor = filteredRooms.reduce(
    (acc, room) => {
      if (!acc[room.floor]) {
        acc[room.floor] = [];
      }
      acc[room.floor].push(room);
      return acc;
    },
    {} as Record<number, Room[]>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto mb-2" />
          <p className="text-slate-400">Loading rooms inventory...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-800 rounded-lg p-6 max-w-md mx-auto mt-8">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-300 mb-1">Error Loading Rooms</h3>
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Room Management</h1>
        <p className="text-slate-400">
          Configure room sharing, Ventilated vs Standard, and AC/Non-AC status. Changes save instantly.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 flex items-center gap-2 bg-slate-950 rounded-lg px-4 py-2 border border-slate-700">
            <Search className="w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search room number or floor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-transparent text-white placeholder-slate-500 outline-none text-sm"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm("")} className="text-slate-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Sharing Filter */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-700 overflow-x-auto text-xs font-semibold">
            <button
              onClick={() => setFilterSharing("all")}
              className={`px-3 py-1.5 rounded-md transition ${
                filterSharing === "all" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              All Sharing
            </button>
            <button
              onClick={() => setFilterSharing(2)}
              className={`px-3 py-1.5 rounded-md transition ${
                filterSharing === 2 ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              2-Share
            </button>
            <button
              onClick={() => setFilterSharing(3)}
              className={`px-3 py-1.5 rounded-md transition ${
                filterSharing === 3 ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              3-Share
            </button>
          </div>
        </div>

        {/* Secondary Filter Row: Variant & AC */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-400 font-medium">Ventilation:</span>
            <div className="inline-flex rounded-lg bg-slate-950 p-1 border border-slate-800">
              <button
                onClick={() => setFilterVariant("all")}
                className={`px-2.5 py-1 rounded text-xs transition ${
                  filterVariant === "all" ? "bg-slate-700 text-white font-bold" : "text-slate-400 hover:text-white"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterVariant("TYPE_1")}
                className={`px-2.5 py-1 rounded text-xs transition flex items-center gap-1 ${
                  filterVariant === "TYPE_1" ? "bg-teal-600 text-white font-bold" : "text-teal-400 hover:text-teal-300"
                }`}
              >
                <Sun className="w-3 h-3" /> Ventilated / Spacious
              </button>
              <button
                onClick={() => setFilterVariant("TYPE_2")}
                className={`px-2.5 py-1 rounded text-xs transition flex items-center gap-1 ${
                  filterVariant === "TYPE_2" ? "bg-amber-600 text-white font-bold" : "text-amber-400 hover:text-amber-300"
                }`}
              >
                <Home className="w-3 h-3" /> Standard
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Climate:</span>
            <div className="inline-flex rounded-lg bg-slate-950 p-1 border border-slate-800">
              <button
                onClick={() => setFilterAC("all")}
                className={`px-2.5 py-1 rounded text-xs transition ${
                  filterAC === "all" ? "bg-slate-700 text-white font-bold" : "text-slate-400 hover:text-white"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterAC("ac")}
                className={`px-2.5 py-1 rounded text-xs transition flex items-center gap-1 ${
                  filterAC === "ac" ? "bg-blue-600 text-white font-bold" : "text-blue-400 hover:text-blue-300"
                }`}
              >
                <Wind className="w-3 h-3" /> AC
              </button>
              <button
                onClick={() => setFilterAC("non-ac")}
                className={`px-2.5 py-1 rounded text-xs transition flex items-center gap-1 ${
                  filterAC === "non-ac" ? "bg-orange-600 text-white font-bold" : "text-orange-400 hover:text-orange-300"
                }`}
              >
                <Zap className="w-3 h-3" /> Non-AC
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 rounded-lg p-4 flex items-center gap-3 z-50 shadow-xl ${
            toast.type === "success"
              ? "bg-green-950 border border-green-700 text-green-300"
              : "bg-red-950 border border-red-700 text-red-300"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-green-400" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400" />
          )}
          <p className="text-sm font-medium">{toast.message}</p>
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Rooms by Floor */}
      <div className="space-y-6">
        {Object.entries(roomsByFloor)
          .sort(([floorA], [floorB]) => parseInt(floorA) - parseInt(floorB))
          .map(([floor, floorRooms]) => (
            <div key={floor} className="bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden">
              {/* Floor Header */}
              <div className="bg-gradient-to-r from-indigo-950/60 to-purple-950/60 border-b border-slate-800 px-6 py-3 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">Floor {floor}</h2>
                  <p className="text-xs text-slate-400">{floorRooms.length} rooms listed</p>
                </div>
              </div>

              {/* Rooms Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
                {floorRooms.map((room) => {
                  const variantInfo = getRoomVariantInfo(room);
                  const isMultiShare = room.capacity === 2 || room.capacity === 3;
                  const isUpdating = updatingRoomId === room.id;

                  return (
                    <div
                      key={room.id}
                      className="bg-slate-950 rounded-xl border border-slate-800 p-4 hover:border-slate-700 transition flex flex-col justify-between"
                    >
                      {/* Top Info */}
                      <div>
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                              {room.roomNumber}
                              {room.isAC ? (
                                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                  AC
                                </span>
                              ) : (
                                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20">
                                  Non-AC
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1.5">
                              <Badge variant="indigo" size="sm">
                                {SHARING_NAMES[room.capacity] || `${room.capacity} beds`}
                              </Badge>
                              {isMultiShare && (
                                <span
                                  className={`text-[11px] px-2 py-0.5 rounded font-bold border ${
                                    variantInfo.isVentilated
                                      ? "bg-teal-500/10 text-teal-300 border-teal-500/30"
                                      : "bg-amber-500/10 text-amber-300 border-amber-500/30"
                                  }`}
                                >
                                  {variantInfo.badgeText}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Room Type Selector (Ventilated vs Standard) */}
                        {isMultiShare && (
                          <div className="bg-slate-900/80 rounded-lg p-2.5 mb-3 border border-slate-800">
                            <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-2 flex items-center justify-between">
                              <span>Room Variant</span>
                              <span className="text-xs text-slate-500 font-normal">
                                {variantInfo.shortLabel}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                              <button
                                disabled={!canEdit || isUpdating}
                                onClick={() => setRoomVariant(room.id, "TYPE_1")}
                                className={`py-1.5 px-2 rounded-md text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
                                  variantInfo.variant === "TYPE_1"
                                    ? "bg-teal-600/30 border-teal-500 text-teal-200 shadow-sm"
                                    : "bg-slate-950/70 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
                                } disabled:opacity-50`}
                              >
                                {room.capacity === 3 ? (
                                  <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                                ) : (
                                  <Sun className="w-3.5 h-3.5 text-teal-400" />
                                )}
                                <span>{room.capacity === 3 ? "Spacious" : "Ventilated"}</span>
                              </button>
                              <button
                                disabled={!canEdit || isUpdating}
                                onClick={() => setRoomVariant(room.id, "TYPE_2")}
                                className={`py-1.5 px-2 rounded-md text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
                                  variantInfo.variant === "TYPE_2"
                                    ? "bg-amber-600/30 border-amber-500 text-amber-200 shadow-sm"
                                    : "bg-slate-950/70 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
                                } disabled:opacity-50`}
                              >
                                <Home className="w-3.5 h-3.5 text-amber-400" />
                                <span>Standard</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Climate Toggle Button */}
                      <div className="mt-2 pt-2 border-t border-slate-800/80">
                        {!canEdit ? (
                          <div className="w-full py-2 px-3 rounded-lg text-xs text-slate-500 bg-slate-900 border border-slate-800 text-center font-medium">
                            Locked (View Only)
                          </div>
                        ) : (
                          <button
                            onClick={() => toggleAC(room.id, room.isAC)}
                            disabled={isUpdating}
                            className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
                              isUpdating
                                ? "bg-slate-800 text-slate-400 border-slate-700 cursor-not-allowed"
                                : room.isAC
                                ? "bg-orange-500/10 text-orange-300 hover:bg-orange-500/20 border-orange-500/30"
                                : "bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 border-blue-500/30"
                            }`}
                          >
                            {isUpdating ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Updating...
                              </>
                            ) : room.isAC ? (
                              <>
                                <Zap className="w-3.5 h-3.5 text-orange-400" />
                                Switch to Non-AC
                              </>
                            ) : (
                              <>
                                <Wind className="w-3.5 h-3.5 text-blue-400" />
                                Switch to AC
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
      </div>

      {/* Empty State */}
      {filteredRooms.length === 0 && (
        <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-10 text-center">
          <Search className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-white font-semibold">No rooms match your filter criteria.</p>
          <p className="text-slate-400 text-sm mt-1">Try resetting search or filters.</p>
        </div>
      )}

      {/* Summary Statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-teal-950/20 border border-teal-800/40 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Sun className="w-6 h-6 text-teal-400" />
            <div>
              <p className="text-xs text-teal-300 font-semibold">Ventilated / Spacious Rooms</p>
              <p className="text-2xl font-black text-white">
                {rooms.filter((r) => getRoomVariantInfo(r).variant === "TYPE_1").length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-amber-950/20 border border-amber-800/40 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Home className="w-6 h-6 text-amber-400" />
            <div>
              <p className="text-xs text-amber-300 font-semibold">Standard Rooms</p>
              <p className="text-2xl font-black text-white">
                {rooms.filter((r) => getRoomVariantInfo(r).variant === "TYPE_2").length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-blue-950/20 border border-blue-800/40 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Wind className="w-6 h-6 text-blue-400" />
            <div>
              <p className="text-xs text-blue-300 font-semibold">AC Rooms</p>
              <p className="text-2xl font-black text-white">
                {rooms.filter((r) => r.isAC).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-orange-950/20 border border-orange-800/40 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Zap className="w-6 h-6 text-orange-400" />
            <div>
              <p className="text-xs text-orange-300 font-semibold">Non-AC Rooms</p>
              <p className="text-2xl font-black text-white">
                {rooms.filter((r) => !r.isAC).length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomsManagementClient;
