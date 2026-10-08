"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Wind, Zap, AlertCircle, Search, Loader2, CheckCircle2, X } from "lucide-react";
import Badge from "@/components/ui/Badge";

interface Room {
  id: string;
  roomNumber: string;
  floor: number;
  capacity: number;
  isAC: boolean;
  status: string;
  bedCount?: number;
}

interface RoomResponse {
  id: string;
  roomNumber: string;
  floor: number;
  capacity: number;
  isAC: boolean;
  status: string;
  beds?: any[];
}

export const RoomsManagementClient: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
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

  // Filter rooms based on search
  useEffect(() => {
    const filtered = rooms.filter(
      (room) =>
        room.roomNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        room.floor.toString().includes(searchTerm)
    );
    setFilteredRooms(filtered);
  }, [searchTerm, rooms]);

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

        // Update local state
        setRooms((prev) =>
          prev.map((room) =>
            room.id === roomId ? { ...room, isAC: !currentStatus } : room
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-2" />
          <p className="text-slate-400">Loading rooms...</p>
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
          Toggle AC/Non-AC status for each room. Changes are saved immediately.
        </p>
      </div>

      {/* Search Bar */}
      <div className="bg-slate-900/50 rounded-lg border border-slate-800 p-4">
        <div className="flex items-center gap-2 bg-slate-950 rounded-lg px-4 py-2 border border-slate-700">
          <Search className="w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by room number or floor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent text-white placeholder-slate-500 outline-none"
          />
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 rounded-lg p-4 flex items-center gap-3 z-50 ${
            toast.type === "success"
              ? "bg-green-900/20 border border-green-800"
              : "bg-red-900/20 border border-red-800"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-green-400" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400" />
          )}
          <p className={toast.type === "success" ? "text-green-300" : "text-red-300"}>{toast.message}</p>
          <button onClick={() => setToast(null)} className="ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Rooms by Floor */}
      <div className="space-y-6">
        {Object.entries(roomsByFloor)
          .sort(([floorA], [floorB]) => parseInt(floorA) - parseInt(floorB))
          .map(([floor, floorRooms]) => (
            <div key={floor} className="bg-slate-900/50 rounded-lg border border-slate-800 overflow-hidden">
              {/* Floor Header */}
              <div className="bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border-b border-slate-800 px-6 py-3">
                <h2 className="text-lg font-semibold text-white">Floor {floor}</h2>
                <p className="text-sm text-slate-400">{floorRooms.length} rooms</p>
              </div>

              {/* Rooms Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                {floorRooms.map((room) => (
                  <div
                    key={room.id}
                    className="bg-slate-950 rounded-lg border border-slate-700 p-4 hover:border-slate-600 transition-colors"
                  >
                    {/* Room Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="text-2xl font-bold text-white mb-1">{room.roomNumber}</div>
                        <div className="flex gap-2">
                          <Badge label="Capacity" value={`${room.capacity} beds`} />
                          <Badge label="Status" value={room.status} variant="info" />
                        </div>
                      </div>
                      {room.isAC ? (
                        <Wind className="w-6 h-6 text-blue-400" />
                      ) : (
                        <Zap className="w-6 h-6 text-orange-400" />
                      )}
                    </div>

                    {/* AC Status Display */}
                    <div className="bg-slate-900 rounded-lg p-3 mb-4 border border-slate-700">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">Current Type</span>
                        <span className={`font-semibold ${room.isAC ? "text-blue-400" : "text-orange-400"}`}>
                          {room.isAC ? "AC Room" : "Non-AC Room"}
                        </span>
                      </div>
                    </div>

                    {/* Toggle Button */}
                    <button
                      onClick={() => toggleAC(room.id, room.isAC)}
                      disabled={updatingRoomId === room.id}
                      className={`w-full py-2 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                        updatingRoomId === room.id
                          ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                          : room.isAC
                          ? "bg-orange-900/40 text-orange-300 hover:bg-orange-900/60 border border-orange-700"
                          : "bg-blue-900/40 text-blue-300 hover:bg-blue-900/60 border border-blue-700"
                      }`}
                    >
                      {updatingRoomId === room.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          {room.isAC ? (
                            <>
                              <Zap className="w-4 h-4" />
                              Switch to Non-AC
                            </>
                          ) : (
                            <>
                              <Wind className="w-4 h-4" />
                              Switch to AC
                            </>
                          )}
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
      </div>

      {/* Empty State */}
      {filteredRooms.length === 0 && (
        <div className="bg-slate-900/50 rounded-lg border border-slate-800 p-8 text-center">
          <Search className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No rooms found matching your search.</p>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Wind className="w-6 h-6 text-blue-400" />
            <div>
              <p className="text-sm text-blue-300">AC Rooms</p>
              <p className="text-2xl font-bold text-white">
                {rooms.filter((r) => r.isAC).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-orange-900/20 border border-orange-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Zap className="w-6 h-6 text-orange-400" />
            <div>
              <p className="text-sm text-orange-300">Non-AC Rooms</p>
              <p className="text-2xl font-bold text-white">
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
