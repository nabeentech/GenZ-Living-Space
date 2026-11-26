export interface BlueprintRowConfig {
  id: string;
  label: string;
  leftOffsets: number[];
  centerType: "CORRIDOR" | "LIFT_SHAFT";
  rightOffsets: number[];
}

/**
 * Exact architectural floor plan matching the 40-room H-corridor hostel layout
 * (Left & Right wings separated by vertical Lift Shaft / Corridor and 3 horizontal corridors).
 * Room number = (floor * 100) + offset (e.g. Floor 1: 101..140, Floor 2: 201..240).
 */
export const FLOOR_BLUEPRINT_ROWS: BlueprintRowConfig[] = [
  {
    id: "row-1",
    label: "Top Block · 2 Sharing",
    leftOffsets: [35, 34, 33, 32, 31],
    centerType: "CORRIDOR",
    rightOffsets: [30, 29, 28, 27, 26],
  },
  {
    id: "row-2",
    label: "Upper Mid · 3 Sharing",
    leftOffsets: [36, 37, 38, 39, 40],
    centerType: "CORRIDOR",
    rightOffsets: [21, 22, 23, 24, 25],
  },
  {
    id: "row-3",
    label: "Lower Mid · Single & 2 Sharing",
    leftOffsets: [15, 14, 13, 12, 11],
    centerType: "LIFT_SHAFT",
    rightOffsets: [10, 9, 8, 7, 6],
  },
  {
    id: "row-4",
    label: "Bottom Block · 2 Sharing",
    leftOffsets: [16, 17, 18, 19, 20],
    centerType: "CORRIDOR",
    rightOffsets: [1, 2, 3, 4, 5],
  },
];

export function mapFloorRoomsToBlueprint(floorRooms: any[], floorNumber: number) {
  const roomByNumber = new Map<string, any>();
  floorRooms.forEach((r) => {
    roomByNumber.set(String(r.roomNumber).trim(), r);
  });

  const usedRoomIds = new Set<string>();

  const rows = FLOOR_BLUEPRINT_ROWS.map((row) => {
    const resolveSlot = (offset: number) => {
      const targetNum = String(floorNumber * 100 + offset);
      const room = roomByNumber.get(targetNum) || null;
      if (room) usedRoomIds.add(room.id);
      return {
        roomNumber: targetNum,
        offset,
        room,
      };
    };

    return {
      ...row,
      leftSlots: row.leftOffsets.map(resolveSlot),
      rightSlots: row.rightOffsets.map(resolveSlot),
    };
  });

  const extraRooms = floorRooms.filter((r) => !usedRoomIds.has(r.id));

  return { rows, extraRooms };
}
