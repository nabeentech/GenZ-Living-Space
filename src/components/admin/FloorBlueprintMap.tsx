"use client";

import React, { useMemo } from "react";
import { mapFloorRoomsToBlueprint } from "@/lib/floor-blueprint";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Edit2, Wind, Zap } from "lucide-react";

interface FloorBlueprintMapProps {
  hostel: any;
  floorNumber: number;
  floorRooms: any[];
  statusFilter: string;
  canEdit?: boolean;
  onSelectBed: (bed: any, room: any, hostel: any) => void;
  onEditRoom: (room: any) => void;
}

const getRoomTone = (room: any) => {
  if (!room) return "border-slate-800/50 bg-slate-950/40";
  if (room.capacity === 1) return "border-emerald-500/30 bg-emerald-950/15";
  if (room.capacity === 3) return "border-sky-500/30 bg-sky-950/15";
  // 2 Sharing
  const num = Number(room.roomNumber) % 100;
  if ([7, 8, 13, 14].includes(num)) {
    return "border-amber-500/30 bg-amber-950/15";
  }
  return "border-rose-500/30 bg-rose-950/15";
};

const getBedSeatStyle = (status: string) => {
  switch (status) {
    case "AVAILABLE":
      return "border-emerald-400/70 bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/35 hover:border-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.15)]";
    case "OCCUPIED":
      return "border-purple-400/60 bg-purple-500/25 text-purple-100 hover:bg-purple-500/40 hover:border-purple-300";
    case "RESERVED":
      return "border-blue-400/60 bg-blue-500/25 text-blue-100 hover:bg-blue-500/40 hover:border-blue-300";
    case "CLEANING":
      return "border-amber-400/60 bg-amber-500/20 text-amber-200 hover:bg-amber-500/35 hover:border-amber-300";
    case "MAINTENANCE":
      return "border-rose-400/60 bg-rose-500/25 text-rose-200 hover:bg-rose-500/40 hover:border-rose-300";
    default:
      return "border-slate-700 bg-slate-900 text-slate-500";
  }
};

export const FloorBlueprintMap: React.FC<FloorBlueprintMapProps> = ({
  hostel,
  floorNumber,
  floorRooms,
  statusFilter,
  canEdit = true,
  onSelectBed,
  onEditRoom,
}) => {
  const { rows, extraRooms } = useMemo(
    () => mapFloorRoomsToBlueprint(floorRooms, floorNumber),
    [floorRooms, floorNumber]
  );

  const renderRoomBox = (slot: { roomNumber: string; room: any | null }) => {
    const room = slot.room;
    if (!room) {
      return (
        <div
          key={slot.roomNumber}
          className="rounded-xl border border-dashed border-slate-800/60 bg-slate-950/30 p-2 flex flex-col items-center justify-center min-h-[118px] text-[10px] text-slate-600"
        >
          <span className="font-mono font-bold">{slot.roomNumber}</span>
          <span>No Room</span>
        </div>
      );
    }

    const sharingLabel =
      room.capacity === 1 ? "Single" : `${room.capacity} Sh`;

    return (
      <div
        key={room.id}
        className={`group rounded-xl border p-2 flex flex-col justify-between min-h-[118px] transition hover:border-indigo-400/60 ${getRoomTone(room)}`}
      >
        {/* Room Header */}
        <div className="flex items-start justify-between gap-1 border-b border-white/10 pb-1.5 mb-1.5">
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-xs font-black text-white leading-none">
                {room.roomNumber}
              </span>
              <span
                title={room.isAC ? "AC Room" : "Non-AC Room"}
                className={`inline-flex items-center rounded px-1 py-0.5 text-[8px] font-bold ${
                  room.isAC
                    ? "bg-cyan-500/20 text-cyan-300"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                {room.isAC ? <Wind className="w-2.5 h-2.5" /> : <Zap className="w-2.5 h-2.5" />}
              </span>
            </div>
            <span className="text-[9px] font-semibold text-slate-400 block mt-0.5">
              {sharingLabel} · {room.genderCategory === "FEMALE" ? "F" : room.genderCategory === "MALE" ? "M" : "Mix"}
            </span>
          </div>

          {canEdit && (
            <button
              type="button"
              onClick={() => onEditRoom(room)}
              title={`Edit Room ${room.roomNumber}`}
              className="opacity-70 group-hover:opacity-100 rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              <Edit2 className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* RedBus Sleeper Berth Style Bed Seats */}
        <div
          className={`grid gap-1.5 flex-1 ${
            room.beds.length === 1
              ? "grid-cols-1"
              : room.beds.length === 2
              ? "grid-cols-2"
              : "grid-cols-3"
          }`}
        >
          {room.beds.map((bed: any) => {
            const occupant = bed.bookings?.[0];
            const isMatch = statusFilter === "all" || bed.status === statusFilter;
            const hasNotice = occupant && occupant.stayType === "MONTHLY" && !occupant.isOpenEnded;
            const hasBalanceDue = occupant && (occupant.balanceAmount || 0) > 0;

            return (
              <button
                key={bed.id}
                type="button"
                onClick={() => onSelectBed(bed, room, hostel)}
                title={
                  occupant
                    ? `${bed.bedNumber} · ${occupant.guestName} (${bed.status})`
                    : `${bed.bedNumber} · ${bed.status}`
                }
                className={`relative rounded-lg border px-1 py-1.5 min-w-0 overflow-hidden flex flex-col items-center justify-between text-center transition cursor-pointer min-h-[60px] ${getBedSeatStyle(bed.status)} ${
                  !isMatch ? "opacity-20" : ""
                }`}
              >
                {/* Sleeper berth pillow bar at top (RedBus style) */}
                <span className="w-4/5 h-1 rounded-full bg-current opacity-40 shrink-0" />

                {/* Alert dot if Notice Active or Balance Due */}
                {(hasNotice || hasBalanceDue) && (
                  <span
                    title={hasNotice ? "Vacate Notice Active" : "Balance Due"}
                    className={`absolute top-1 right-1 w-2 h-2 rounded-full ring-1 ring-[#0B0F19] ${
                      hasNotice ? "bg-rose-500" : "bg-amber-400"
                    }`}
                  />
                )}

                <span className="font-extrabold text-[10px] leading-tight truncate max-w-full">
                  {bed.bedNumber.replace(/Bed\s*/i, "B")}
                </span>

                <span className="text-[9px] font-semibold truncate w-full px-0.5 opacity-90 leading-tight">
                  {occupant
                    ? occupant.guestName.split(" ")[0]
                    : bed.status === "AVAILABLE"
                    ? "Free"
                    : bed.status.slice(0, 5)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 min-w-0">
      {/* BookMyShow / RedBus Legend Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-[11px]">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5 text-emerald-300 font-semibold">
            <span className="w-3 h-3 rounded border border-emerald-400 bg-emerald-500/30" /> Available (Click to Book)
          </span>
          <span className="flex items-center gap-1.5 text-purple-200 font-semibold">
            <span className="w-3 h-3 rounded border border-purple-400 bg-purple-500/30" /> Occupied
          </span>
          <span className="flex items-center gap-1.5 text-blue-200 font-semibold">
            <span className="w-3 h-3 rounded border border-blue-400 bg-blue-500/30" /> Reserved
          </span>
          <span className="flex items-center gap-1.5 text-amber-200 font-semibold">
            <span className="w-3 h-3 rounded border border-amber-400 bg-amber-500/30" /> Cleaning
          </span>
          <span className="flex items-center gap-1.5 text-rose-200 font-semibold">
            <span className="w-3 h-3 rounded border border-rose-400 bg-rose-500/30" /> Maintenance
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400" /> Rent Due
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500" /> Vacate Notice
          </span>
        </div>
      </div>

      {/* Horizontal Scroll Hint */}
      <div className="flex items-center justify-between text-[11px] text-indigo-300 bg-indigo-950/30 border border-indigo-500/20 rounded-xl px-3.5 py-2 2xl:hidden">
        <span>← Scroll or swipe left/right inside the blueprint to view all rooms &amp; wings →</span>
        <span className="font-bold text-[10px] text-slate-400 uppercase shrink-0 ml-2">Full Floor Map</span>
      </div>

      {/* Interactive Architectural Floor Plan Container (Never compressed; scrolls smoothly inside the frame) */}
      <div className="rounded-3xl border-2 border-slate-700/80 bg-[#0B101D] p-3 sm:p-4 shadow-2xl space-y-2.5 overflow-hidden">
        <div className="text-center pb-0.5">
          <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-indigo-300">
            Floor {floorNumber} Interactive Blueprint · {hostel.name}
          </span>
        </div>

        <div className="w-full overflow-x-auto pb-2">
          <div className="w-[1528px] min-w-[1528px] space-y-2">
            {rows.map((row, idx) => (
              <React.Fragment key={row.id}>
                {/* Room Row: 5 Left Wing | Vertical Center Shaft | 5 Right Wing */}
                <div className="grid grid-cols-[repeat(5,136px)_88px_repeat(5,136px)] gap-2 items-stretch">
                  {row.leftSlots.map((slot) => renderRoomBox(slot))}

                  {/* Central Vertical Lift Shaft / Vertical Corridor */}
                  <div
                    className={`rounded-xl border flex flex-col items-center justify-center text-center px-1 py-2 ${
                      row.centerType === "LIFT_SHAFT"
                        ? "border-indigo-500/40 bg-indigo-950/30 text-indigo-200"
                        : "border-slate-700/80 bg-slate-900/65 text-slate-400"
                    }`}
                  >
                    {row.centerType === "LIFT_SHAFT" ? (
                      <>
                        <ArrowUp className="w-3.5 h-3.5 text-indigo-300 mb-1" />
                        <span className="text-[9px] font-black uppercase leading-tight tracking-wider">
                          Lift Shaft / Open to Sky
                        </span>
                        <ArrowDown className="w-3.5 h-3.5 text-indigo-300 mt-1" />
                      </>
                    ) : (
                      <span className="text-[9px] font-bold uppercase tracking-widest [writing-mode:vertical-rl] rotate-180">
                        Corridor
                      </span>
                    )}
                  </div>

                  {row.rightSlots.map((slot) => renderRoomBox(slot))}
                </div>

                {/* Horizontal Corridor Walkways (idx 0 = top corridor, idx 2 = bottom corridor; idx 1 = back-to-back empty divider) */}
                {idx < rows.length - 1 && (
                  idx === 1 ? (
                    <div className="h-3 my-0.5 rounded-lg bg-slate-950/60 border border-slate-800/40" />
                  ) : (
                    <div className="grid grid-cols-[1fr_88px_1fr] gap-2 items-center my-1">
                      <div className="h-7 rounded-lg bg-slate-900/80 border border-slate-700/80 flex items-center justify-center gap-3 text-[10px] font-extrabold uppercase tracking-[0.25em] text-slate-400">
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Corridor</span>
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </div>
                      <div className="h-7 rounded-lg bg-slate-900/50 border border-slate-800/60 flex items-center justify-center text-[9px] text-slate-500 font-bold">
                        ┼
                      </div>
                      <div className="h-7 rounded-lg bg-slate-900/80 border border-slate-700/80 flex items-center justify-center gap-3 text-[10px] font-extrabold uppercase tracking-[0.25em] text-slate-400">
                        <ArrowRight className="w-3.5 h-3.5" />
                        <span>Corridor</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  )
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Fallback for any custom-numbered rooms outside X01-X40 */}
      {extraRooms.length > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Additional Rooms on Floor {floorNumber} ({extraRooms.length})
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {extraRooms.map((room) => renderRoomBox({ roomNumber: room.roomNumber, room }))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FloorBlueprintMap;
