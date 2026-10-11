import { NextResponse } from "next/server";
import { randomBytes, randomUUID } from "crypto";
import prisma from "@/lib/prisma";
import { getSessionUser, hasPermission, ROLES, hashPassword } from "@/lib/auth";
import { addBillingMonth } from "@/lib/resident-stays";
import { logAuditAction } from "@/lib/audit";

const allowedRoles = [ROLES.SUPER_ADMIN, ROLES.PROPERTY_MANAGER, ROLES.RECEPTIONIST];

export async function POST(req: Request) {
  const staff = await getSessionUser();
  if (!staff || !hasPermission(staff.role, allowedRoles)) {
    return NextResponse.json({ success: false, message: "Staff access required" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    const phone = String(body.phone || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const govtIdNumber = String(body.govtIdNumber || "").trim();
    const hostelId = String(body.hostelId || "");
    const roomId = String(body.roomId || "");
    const bedId = String(body.bedId || "");
    const joinedAt = new Date(`${String(body.joinedAt || "")}T00:00:00.000Z`);
    const monthlyFee = Number(body.monthlyFee);

    if (!name || !phone || !govtIdNumber || !hostelId || !roomId || !bedId || !Number.isFinite(joinedAt.getTime()) || !Number.isFinite(monthlyFee) || monthlyFee <= 0) {
      return NextResponse.json({ success: false, message: "Complete the resident, ID, bed, joining date, and monthly fee fields." }, { status: 400 });
    }

    const bed = await prisma.bed.findFirst({
      where: { id: bedId, roomId, hostelId, active: true, status: "AVAILABLE", room: { active: true, status: "ACTIVE" }, hostel: { active: true } },
      include: { room: true, hostel: true },
    });
    if (!bed) return NextResponse.json({ success: false, message: "That bed is no longer available. Refresh the page and choose another bed." }, { status: 409 });

    let resident = email ? await prisma.user.findUnique({ where: { email } }) : null;
    if (!resident) resident = await prisma.user.findFirst({ where: { phone, role: ROLES.CUSTOMER } });
    if (resident && (resident.role !== ROLES.CUSTOMER || (resident.phone && resident.phone !== phone))) {
      return NextResponse.json({ success: false, message: "An account with that email or phone already exists." }, { status: 409 });
    }
    if (resident && await prisma.residentStay.findFirst({ where: { residentId: resident.id, status: "ACTIVE" } })) {
      return NextResponse.json({ success: false, message: "This resident already has an active hostel stay." }, { status: 409 });
    }

    const joiningDate = new Date(Date.UTC(joinedAt.getUTCFullYear(), joinedAt.getUTCMonth(), joinedAt.getUTCDate()));
    const firstFeeCollected = body.firstFeeCollected === true;
    const firstPeriodEnd = addBillingMonth(joiningDate);
    const nextDueAt = firstFeeCollected ? firstPeriodEnd : joiningDate;

    const result = await prisma.$transaction(async (tx) => {
      if (resident && await tx.residentStay.findFirst({ where: { residentId: resident.id, status: "ACTIVE" } })) throw new Error("RESIDENT_ACTIVE");
      const occupied = await tx.bed.updateMany({ where: { id: bedId, status: "AVAILABLE", active: true }, data: { status: "OCCUPIED" } });
      if (occupied.count !== 1) throw new Error("BED_UNAVAILABLE");

      const savedResident = resident
        ? await tx.user.update({
            where: { id: resident.id },
            data: {
              name, phone, gender: body.gender || null, dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : null,
              address: String(body.address || "").trim() || null, emergencyContact: String(body.emergencyContact || "").trim() || null,
              govtIdType: body.govtIdType || "AADHAAR", govtIdNumber, active: true,
            },
          })
        : await tx.user.create({
            data: {
              name, phone, email: email || `resident-${randomUUID()}@residents.invalid`,
              passwordHash: await hashPassword(randomBytes(32).toString("hex")), role: ROLES.CUSTOMER,
              gender: body.gender || null, dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : null,
              address: String(body.address || "").trim() || null, emergencyContact: String(body.emergencyContact || "").trim() || null,
              govtIdType: body.govtIdType || "AADHAAR", govtIdNumber,
            },
          });

      await tx.bed.update({ where: { id: bedId }, data: { currentOccupantId: savedResident.id } });
      const stay = await tx.residentStay.create({
        data: { residentId: savedResident.id, hostelId, roomId, bedId, joinedAt: joiningDate, monthlyFee, nextDueAt, createdById: staff.id },
      });
      if (firstFeeCollected) {
        await tx.feeReceipt.create({
          data: { stayId: stay.id, residentId: savedResident.id, hostelId, amount: monthlyFee, periodStart: joiningDate, periodEnd: firstPeriodEnd, receivedBy: staff.name, method: body.firstFeeMethod || "CASH" },
        });
      }
      return { stay, resident: savedResident };
    });

    await logAuditAction({ userId: staff.id, userName: staff.name, action: "RESIDENT_REGISTERED_AND_ALLOCATED", entity: "ResidentStay", entityId: result.stay.id, newValue: { resident: name, hostel: bed.hostel.name, room: bed.room.roomNumber, bed: bed.bedNumber, monthlyFee, firstFeeCollected } });
    return NextResponse.json({ success: true, message: "Resident registered and bed allocated.", data: result }, { status: 201 });
  } catch (error: any) {
    if (error?.message === "BED_UNAVAILABLE") return NextResponse.json({ success: false, message: "That bed was just allocated to someone else. Refresh and try again." }, { status: 409 });
    if (error?.message === "RESIDENT_ACTIVE") return NextResponse.json({ success: false, message: "This resident already has an active hostel stay." }, { status: 409 });
    console.error("Resident registration error:", error);
    return NextResponse.json({ success: false, message: "Could not register the resident. Check the details and try again." }, { status: 500 });
  }
}
