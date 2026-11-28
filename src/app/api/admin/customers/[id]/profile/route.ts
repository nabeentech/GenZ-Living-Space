import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { canAccessModule, canUserEdit } from "@/lib/permissions";
import { logAuditAction } from "@/lib/audit";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (
      !user ||
      !canUserEdit(user) ||
      (!canAccessModule(user, "customers") &&
        !canAccessModule(user, "payments") &&
        !canAccessModule(user, "bookings"))
    ) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const { id: customerId } = await params;
    const body = await req.json().catch(() => ({}));

    const existing = await prisma.user.findUnique({ where: { id: customerId } });
    if (!existing) {
      return NextResponse.json({ success: false, message: "Customer not found" }, { status: 404 });
    }
    if (existing.role !== "CUSTOMER") {
      return NextResponse.json({ success: false, message: "Only customer profiles can be edited here." }, { status: 400 });
    }

    const name = typeof body.name === "string" ? body.name.trim() : existing.name;
    if (!name || name.length > 100) {
      return NextResponse.json({ success: false, message: "Enter a valid customer name (1-100 characters)." }, { status: 400 });
    }

    const phone = body.phone !== undefined
      ? (typeof body.phone === "string" ? body.phone.replace(/\D/g, "").slice(0, 10) : "")
      : existing.phone || "";
    if (phone && !/^\d{10}$/.test(phone)) {
      return NextResponse.json({ success: false, message: "Mobile number must be exactly 10 digits." }, { status: 400 });
    }

    const rawEmail = typeof body.email === "string" ? body.email.trim().toLowerCase() : existing.email;
    if (!rawEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail) || rawEmail.length > 254) {
      return NextResponse.json({ success: false, message: "Enter a valid email address." }, { status: 400 });
    }

    const emailChanged = rawEmail !== existing.email.toLowerCase();
    if (emailChanged) {
      const duplicate = await prisma.user.findUnique({ where: { email: rawEmail } });
      if (duplicate && duplicate.id !== customerId) {
        return NextResponse.json(
          { success: false, message: `Email ${rawEmail} is already registered to another account (${duplicate.name}).` },
          { status: 409 }
        );
      }
    }

    const govtIdType = typeof body.govtIdType === "string" && body.govtIdType
      ? body.govtIdType
      : existing.govtIdType || "AADHAAR";
    const govtIdNumber = body.govtIdNumber !== undefined
      ? (typeof body.govtIdNumber === "string" ? body.govtIdNumber.trim() : "")
      : existing.govtIdNumber || "";

    if (govtIdType === "AADHAAR") {
      if (!/^\d{12}$/.test(govtIdNumber)) {
        return NextResponse.json(
          { success: false, message: "Aadhaar number must be exactly 12 numeric digits." },
          { status: 400 }
        );
      }
    } else if (!govtIdNumber) {
      return NextResponse.json(
        { success: false, message: "Government ID number is required." },
        { status: 400 }
      );
    }

    const hasVehicle = body.hasVehicle !== undefined ? Boolean(body.hasVehicle) : existing.hasVehicle;
    const vehicleNumber = hasVehicle
      ? (typeof body.vehicleNumber === "string" ? body.vehicleNumber.trim().toUpperCase() : existing.vehicleNumber || "")
      : null;
    const drivingLicenseNumber = hasVehicle
      ? (typeof body.drivingLicenseNumber === "string" ? body.drivingLicenseNumber.trim().toUpperCase() : existing.drivingLicenseNumber || "")
      : null;

    if (hasVehicle && !vehicleNumber) {
      return NextResponse.json(
        { success: false, message: "Vehicle number is required when the customer has their own vehicle." },
        { status: 400 }
      );
    }
    if (hasVehicle && !drivingLicenseNumber) {
      return NextResponse.json(
        { success: false, message: "Driving license number is required when the customer has their own vehicle." },
        { status: 400 }
      );
    }

    const aadhaarFrontImage = body.aadhaarFrontImage !== undefined
      ? (typeof body.aadhaarFrontImage === "string" && body.aadhaarFrontImage.startsWith("data:image/") ? body.aadhaarFrontImage : null)
      : existing.aadhaarFrontImage;
    const aadhaarBackImage = body.aadhaarBackImage !== undefined
      ? (typeof body.aadhaarBackImage === "string" && body.aadhaarBackImage.startsWith("data:image/") ? body.aadhaarBackImage : null)
      : existing.aadhaarBackImage;

    let avatarUrl = existing.avatarUrl;
    if (body.avatarUrl !== undefined) {
      if (body.avatarUrl === null || body.avatarUrl === "") {
        avatarUrl = null;
      } else if (typeof body.avatarUrl === "string") {
        const trimmed = body.avatarUrl.trim();
        if (!trimmed.startsWith("data:image/") && !trimmed.startsWith("https://")) {
          return NextResponse.json(
            { success: false, message: "Invalid customer profile photo format." },
            { status: 400 }
          );
        }
        if (trimmed.length > 1_500_000) {
          return NextResponse.json(
            { success: false, message: "Profile photo is too large. Please upload a smaller image." },
            { status: 400 }
          );
        }
        avatarUrl = trimmed;
      }
    }

    const address = body.address !== undefined ? (typeof body.address === "string" ? body.address.trim() || null : null) : existing.address;
    const emergencyContact = body.emergencyContact !== undefined ? (typeof body.emergencyContact === "string" ? body.emergencyContact.trim() || null : null) : existing.emergencyContact;

    const updated = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: customerId },
        data: {
          name,
          phone: phone || null,
          email: rawEmail,
          // Reset googleId if email changed so the new Gmail account can link on next Google Sign-In
          googleId: emailChanged ? null : existing.googleId,
          avatarUrl,
          govtIdType,
          govtIdNumber,
          aadhaarFrontImage,
          aadhaarBackImage,
          hasVehicle,
          vehicleNumber,
          drivingLicenseNumber,
          address,
          emergencyContact,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          avatarUrl: true,
          govtIdType: true,
          govtIdNumber: true,
          aadhaarFrontImage: true,
          aadhaarBackImage: true,
          hasVehicle: true,
          vehicleNumber: true,
          drivingLicenseNumber: true,
          address: true,
          emergencyContact: true,
          googleId: true,
        },
      });

      if (emailChanged || govtIdNumber !== existing.govtIdNumber || name !== existing.name || phone !== existing.phone) {
        await tx.booking.updateMany({
          where: { customerId },
          data: {
            ...(emailChanged ? { guestEmail: rawEmail } : {}),
            ...(govtIdNumber ? { guestGovtId: govtIdNumber } : {}),
            guestName: name,
            ...(phone ? { guestPhone: phone } : {}),
          },
        });
      }

      return updatedUser;
    });

    await logAuditAction({
      userId: user.id,
      userName: user.name,
      action: "UPDATE",
      entity: "CUSTOMER",
      entityId: customerId,
      previousValue: {
        email: existing.email,
        govtIdNumber: existing.govtIdNumber,
        vehicleNumber: existing.vehicleNumber,
      },
      newValue: {
        email: rawEmail,
        govtIdNumber,
        vehicleNumber,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("Update customer profile error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update customer profile" },
      { status: 500 }
    );
  }
}
