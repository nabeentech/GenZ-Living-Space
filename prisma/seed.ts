import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting GenZ Living Space database seed...");

  // Clean existing data in reverse order of dependencies
  await prisma.review.deleteMany();
  await prisma.additionalCharge.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.refund.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.housekeepingTask.deleteMany();
  await prisma.bed.deleteMany();
  await prisma.room.deleteMany();
  await prisma.roomType.deleteMany();
  await prisma.hostelAmenity.deleteMany();
  await prisma.amenity.deleteMany();
  await prisma.supportTicket.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.websiteContent.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.hostel.deleteMany();
  await prisma.user.deleteMany();

  console.log("Previous records cleared.");

  // 1. Create Core Users
  const passwordAdmin = await bcrypt.hash("Admin@123", 10);
  const passwordManager = await bcrypt.hash("Manager@123", 10);
  const passwordReception = await bcrypt.hash("Reception@123", 10);
  const passwordFinance = await bcrypt.hash("Finance@123", 10);
  const passwordHousekeeping = await bcrypt.hash("Clean@123", 10);
  const passwordSupport = await bcrypt.hash("Support@123", 10);
  const passwordCustomer = await bcrypt.hash("Customer@123", 10);

  const superAdmin = await prisma.user.create({
    data: {
      email: "admin@genzlivingspace.com",
      passwordHash: passwordAdmin,
      name: "Aarav Sharma",
      role: "SUPER_ADMIN",
      phone: "+91 98765 00001",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    },
  });

  const manager = await prisma.user.create({
    data: {
      email: "manager@genzlivingspace.com",
      passwordHash: passwordManager,
      name: "Rohan Verma",
      role: "PROPERTY_MANAGER",
      phone: "+91 98765 00002",
    },
  });

  const receptionist = await prisma.user.create({
    data: {
      email: "reception@genzlivingspace.com",
      passwordHash: passwordReception,
      name: "Priya Nair",
      role: "RECEPTIONIST",
      phone: "+91 98765 00003",
    },
  });

  await prisma.user.create({
    data: {
      email: "finance@genzlivingspace.com",
      passwordHash: passwordFinance,
      name: "Vikram Mehta",
      role: "FINANCE",
      phone: "+91 98765 00004",
    },
  });

  const housekeeper = await prisma.user.create({
    data: {
      email: "cleaning@genzlivingspace.com",
      passwordHash: passwordHousekeeping,
      name: "Raju Kumar",
      role: "HOUSEKEEPING",
      phone: "+91 98765 00005",
    },
  });

  await prisma.user.create({
    data: {
      email: "support@genzlivingspace.com",
      passwordHash: passwordSupport,
      name: "Kavya Rao",
      role: "SUPPORT_STAFF",
      phone: "+91 98765 00006",
    },
  });

  const customer1 = await prisma.user.create({
    data: {
      email: "sameer@gmail.com",
      passwordHash: passwordCustomer,
      name: "Sameer Deshmukh",
      role: "CUSTOMER",
      phone: "+91 98765 43210",
      gender: "MALE",
      govtIdType: "AADHAAR",
      govtIdNumber: "XXXX-XXXX-8921",
      avatarUrl: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80",
    },
  });

  const customer2 = await prisma.user.create({
    data: {
      email: "ananya@gmail.com",
      passwordHash: passwordCustomer,
      name: "Ananya Iyer",
      role: "CUSTOMER",
      phone: "+91 98765 87654",
      gender: "FEMALE",
      govtIdType: "PASSPORT",
      govtIdNumber: "Z-9827110",
      avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    },
  });

  console.log("Users created.");

  // 2. Create Amenities
  const amenitiesList = [
    { name: "Gigabit Optic Fiber Wi-Fi", icon: "Wifi", category: "TECH" },
    { name: "Creator & Podcast Pods", icon: "Mic", category: "TECH" },
    { name: "Ergonomic Workstations", icon: "Monitor", category: "COMMUNITY" },
    { name: "Rooftop Lounge & Cafe", icon: "Coffee", category: "COMMUNITY" },
    { name: "Biometric Smart Lock", icon: "ShieldCheck", category: "SECURITY" },
    { name: "Daily Housekeeping", icon: "Sparkles", category: "UTILITY" },
    { name: "PlayStation 5 & Gaming Zone", icon: "Gamepad2", category: "ENTERTAINMENT" },
    { name: "Swimming Pool & Sun Deck", icon: "Waves", category: "COMMUNITY" },
    { name: "Laundromat (Washer & Dryer)", icon: "Shirt", category: "UTILITY" },
    { name: "Community Kitchen & Chef Bar", icon: "UtensilsCrossed", category: "COMMUNITY" },
    { name: "Climate Control AC", icon: "Wind", category: "ROOM" },
    { name: "Personal Security Locker", icon: "Lock", category: "ROOM" },
  ];

  const amenityMap: Record<string, string> = {};
  for (const item of amenitiesList) {
    const created = await prisma.amenity.create({ data: item });
    amenityMap[item.name] = created.id;
  }

  console.log("Amenities created.");

  // 3. Create Room Types
  const dorm4 = await prisma.roomType.create({
    data: {
      name: "4-Bed Creator Dorm",
      slug: "4-bed-creator-dorm",
      description: "Spacious quad dorm equipped with ergonomic privacy pods, individual power stations, warm ambient lighting, and under-bed luggage lockers.",
      totalBeds: 4,
      genderCategory: "MIXED",
      basePrice: 899,
      weeklyDiscountPct: 12,
      monthlyPrice: 19999,
      securityDeposit: 3000,
      images: JSON.stringify([
        "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=800&auto=format&fit=crop&q=80",
      ]),
      amenities: JSON.stringify(["Personal Locker", "Bedside USB & Lamp", "Orthopedic Mattress", "Blackout Curtain"]),
    },
  });

  const dorm6Female = await prisma.roomType.create({
    data: {
      name: "6-Bed Female Sanctuary",
      slug: "6-bed-female-sanctuary",
      description: "Dedicated female-only dormitory with en-suite vanity station, full-length mirror, premium bedding, and keypad entry.",
      totalBeds: 6,
      genderCategory: "FEMALE",
      basePrice: 799,
      weeklyDiscountPct: 15,
      monthlyPrice: 17499,
      securityDeposit: 3000,
      images: JSON.stringify([
        "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&auto=format&fit=crop&q=80",
      ]),
      amenities: JSON.stringify(["Vanity Station", "En-Suite Bathroom", "Curtains", "Biometric Lock"]),
    },
  });

  const dorm8Nomad = await prisma.roomType.create({
    data: {
      name: "8-Bed Social Bunk Dorm",
      slug: "8-bed-social-bunk-dorm",
      description: "The ultimate social living space for digital nomads and backpackers. High energy, shared vibes, with ultra-comfortable bunk pods.",
      totalBeds: 8,
      genderCategory: "MIXED",
      basePrice: 599,
      weeklyDiscountPct: 15,
      monthlyPrice: 13499,
      securityDeposit: 2500,
      images: JSON.stringify([
        "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&auto=format&fit=crop&q=80",
      ]),
      amenities: JSON.stringify(["Reading Lamp", "Charging Socket", "Locker", "Linen Included"]),
    },
  });

  const twinRoom = await prisma.roomType.create({
    data: {
      name: "Twin Sharing Pod Room",
      slug: "twin-sharing-pod-room",
      description: "Shared between only two residents. Features two single beds, dedicated work desks, high-speed Ethernet ports, and attached balcony.",
      totalBeds: 2,
      genderCategory: "MIXED",
      basePrice: 1299,
      weeklyDiscountPct: 10,
      monthlyPrice: 27999,
      securityDeposit: 4000,
      images: JSON.stringify([
        "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&auto=format&fit=crop&q=80",
      ]),
      amenities: JSON.stringify(["Work Desks", "Attached Balcony", "Air Conditioning", "En-Suite Bath"]),
    },
  });

  const privateStudio = await prisma.roomType.create({
    data: {
      name: "Private Creator Studio",
      slug: "private-creator-studio",
      description: "Ultra-luxe private sanctuary for solo builders or founders. Includes king-size bed, private work nook, smart TV, and designer bath.",
      totalBeds: 1,
      genderCategory: "PRIVATE",
      basePrice: 2299,
      weeklyDiscountPct: 10,
      monthlyPrice: 42999,
      securityDeposit: 5000,
      images: JSON.stringify([
        "https://images.unsplash.com/photo-1591088398332-8a7791972843?w=800&auto=format&fit=crop&q=80",
      ]),
      amenities: JSON.stringify(["King Bed", "Smart TV", "Ergonomic Chair", "Mini Fridge", "En-Suite Bath"]),
    },
  });

  console.log("Room Types created.");

  // 4. The 2 Madhapur Properties
  const hostelsData = [
    {
      slug: "madhapur-01-hyd",
      name: "Madhapur - 01",
      tagline: "The Startup & Tech Creator Pad",
      city: "Madhapur - HYD",
      state: "Telangana",
      address: "Hitech City Road, Madhapur",
      postalCode: "500081",
      latitude: 17.4483,
      longitude: 78.3915,
      rating: 4.9,
      description: "Located in Madhapur's technology district, Madhapur - 01 is designed for tech founders, coders, and digital creators. Featuring a panoramic rooftop co-working terrace with gigabit fiber, soundproof podcast booths, and weekly community mixers.",
      coverImage: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200&auto=format&fit=crop&q=80",
      images: JSON.stringify([
        "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80"
      ]),
      contactPhone: "+91 98765 11001",
      contactEmail: "madhapur01@genzlivingspace.com",
      checkInTime: "13:00",
      checkOutTime: "11:00",
      rules: JSON.stringify([
        "Quiet co-working hours on rooftop: 10 PM to 8 AM",
        "Valid Government ID required at check-in",
        "No smoking inside room pods (designated outdoor terrace)",
        "Visitors permitted in common cafe until 9 PM"
      ]),
    },
  ];

  const createdHostels = [];
  for (const h of hostelsData) {
    const hostel = await prisma.hostel.create({ data: h });
    createdHostels.push(hostel);

    // Link amenities
    for (const [name, id] of Object.entries(amenityMap)) {
      await prisma.hostelAmenity.create({
        data: {
          hostelId: hostel.id,
          amenityId: id,
        },
      });
    }

    // Create Rooms for 1st Floor: 40 rooms with specific pricing and AC status
    // Room configurations: [roomNumber, roomType, capacity, isAC, monthlyPriceNonAC, monthlyPriceAC]
    const floor1Rooms = [
      // 2-Sharing Standard (₹15.5K Non-AC, ₹17K AC) - Rooms 101-105, 116-120, 126-130, 131-135
      { num: 101, type: twinRoom, capacity: 2, monthlyNonAC: 15500, monthlyAC: 17000 },
      { num: 102, type: twinRoom, capacity: 2, monthlyNonAC: 15500, monthlyAC: 17000 },
      { num: 103, type: twinRoom, capacity: 2, monthlyNonAC: 15500, monthlyAC: 17000 },
      { num: 104, type: twinRoom, capacity: 2, monthlyNonAC: 15500, monthlyAC: 17000 },
      { num: 105, type: twinRoom, capacity: 2, monthlyNonAC: 15500, monthlyAC: 17000 },
      { num: 116, type: twinRoom, capacity: 2, monthlyNonAC: 15500, monthlyAC: 17000 },
      { num: 117, type: twinRoom, capacity: 2, monthlyNonAC: 15500, monthlyAC: 17000 },
      { num: 118, type: twinRoom, capacity: 2, monthlyNonAC: 15500, monthlyAC: 17000 },
      { num: 119, type: twinRoom, capacity: 2, monthlyNonAC: 15500, monthlyAC: 17000 },
      { num: 120, type: twinRoom, capacity: 2, monthlyNonAC: 15500, monthlyAC: 17000 },
      { num: 126, type: twinRoom, capacity: 2, monthlyNonAC: 15500, monthlyAC: 17000 },
      { num: 127, type: twinRoom, capacity: 2, monthlyNonAC: 15500, monthlyAC: 17000 },
      { num: 128, type: twinRoom, capacity: 2, monthlyNonAC: 15500, monthlyAC: 17000 },
      { num: 129, type: twinRoom, capacity: 2, monthlyNonAC: 15500, monthlyAC: 17000 },
      { num: 130, type: twinRoom, capacity: 2, monthlyNonAC: 15500, monthlyAC: 17000 },
      { num: 131, type: twinRoom, capacity: 2, monthlyNonAC: 15500, monthlyAC: 17000 },
      { num: 132, type: twinRoom, capacity: 2, monthlyNonAC: 15500, monthlyAC: 17000 },
      { num: 133, type: twinRoom, capacity: 2, monthlyNonAC: 15500, monthlyAC: 17000 },
      { num: 134, type: twinRoom, capacity: 2, monthlyNonAC: 15500, monthlyAC: 17000 },
      { num: 135, type: twinRoom, capacity: 2, monthlyNonAC: 15500, monthlyAC: 17000 },
      
      // 2-Sharing Discounted (₹14.5K Non-AC, ₹16K AC) - Rooms 107, 108, 113, 114
      { num: 107, type: twinRoom, capacity: 2, monthlyNonAC: 14500, monthlyAC: 16000 },
      { num: 108, type: twinRoom, capacity: 2, monthlyNonAC: 14500, monthlyAC: 16000 },
      { num: 113, type: twinRoom, capacity: 2, monthlyNonAC: 14500, monthlyAC: 16000 },
      { num: 114, type: twinRoom, capacity: 2, monthlyNonAC: 14500, monthlyAC: 16000 },
      
      // Single Sharing (₹25K Non-AC, ₹27K AC) - Rooms 106, 109, 110, 111, 112, 115
      { num: 106, type: privateStudio, capacity: 1, monthlyNonAC: 25000, monthlyAC: 27000 },
      { num: 109, type: privateStudio, capacity: 1, monthlyNonAC: 25000, monthlyAC: 27000 },
      { num: 110, type: privateStudio, capacity: 1, monthlyNonAC: 25000, monthlyAC: 27000 },
      { num: 111, type: privateStudio, capacity: 1, monthlyNonAC: 25000, monthlyAC: 27000 },
      { num: 112, type: privateStudio, capacity: 1, monthlyNonAC: 25000, monthlyAC: 27000 },
      { num: 115, type: privateStudio, capacity: 1, monthlyNonAC: 25000, monthlyAC: 27000 },
      
      // 3-Sharing (₹11.5K Non-AC, ₹13K AC) - Rooms 121-125, 136-140
      { num: 121, type: dorm8Nomad, capacity: 3, monthlyNonAC: 11500, monthlyAC: 13000 },
      { num: 122, type: dorm8Nomad, capacity: 3, monthlyNonAC: 11500, monthlyAC: 13000 },
      { num: 123, type: dorm8Nomad, capacity: 3, monthlyNonAC: 11500, monthlyAC: 13000 },
      { num: 124, type: dorm8Nomad, capacity: 3, monthlyNonAC: 11500, monthlyAC: 13000 },
      { num: 125, type: dorm8Nomad, capacity: 3, monthlyNonAC: 11500, monthlyAC: 13000 },
      { num: 136, type: dorm8Nomad, capacity: 3, monthlyNonAC: 11500, monthlyAC: 13000 },
      { num: 137, type: dorm8Nomad, capacity: 3, monthlyNonAC: 11500, monthlyAC: 13000 },
      { num: 138, type: dorm8Nomad, capacity: 3, monthlyNonAC: 11500, monthlyAC: 13000 },
      { num: 139, type: dorm8Nomad, capacity: 3, monthlyNonAC: 11500, monthlyAC: 13000 },
      { num: 140, type: dorm8Nomad, capacity: 3, monthlyNonAC: 11500, monthlyAC: 13000 },
    ];

    for (const roomConfig of floor1Rooms) {
      const room = await prisma.room.create({
        data: {
          hostelId: hostel.id,
          roomTypeId: roomConfig.type.id,
          building: "Block A",
          floor: 1,
          roomNumber: roomConfig.num.toString(),
          capacity: roomConfig.capacity,
          genderCategory: "MIXED",
          isAC: false, // Default to Non-AC, can be toggled by admin
        },
      });

      // Create beds for this room
      for (let bedIndex = 1; bedIndex <= roomConfig.capacity; bedIndex++) {
        let bedNumber: string = `Bed ${bedIndex}`;
        let tier: string = "LOWER_BUNK";

        if (roomConfig.capacity === 1) {
          bedNumber = "Single Bed";
          tier = "SINGLE";
        } else if (roomConfig.capacity === 2) {
          bedNumber = bedIndex === 1 ? "Bed 1" : "Bed 2";
          tier = "SINGLE";
        } else if (roomConfig.capacity === 3) {
          bedNumber = `Bed ${bedIndex}`;
          tier = bedIndex <= 2 ? "LOWER_BUNK" : "UPPER_BUNK";
        }

        await prisma.bed.create({
          data: {
            roomId: room.id,
            hostelId: hostel.id,
            bedNumber: bedNumber,
            tier: tier,
            status: "AVAILABLE",
          },
        });
      }
    }
  }

  console.log("Both Madhapur properties with rooms and beds created.");

  // 5. Create Promotional Coupons
  await prisma.coupon.create({
    data: {
      code: "GENZFIRST",
      description: "15% off for your first adventure with GenZ Living Space",
      discountType: "PERCENTAGE",
      discountValue: 15,
      minBookingAmount: 1000,
      maxDiscountAmount: 500,
      startDate: new Date(),
      expiryDate: new Date("2028-12-31"),
      usageLimit: 1000,
      active: true,
    },
  });

  await prisma.coupon.create({
    data: {
      code: "COMMUNITY10",
      description: "10% off for verified creators and startup teams",
      discountType: "PERCENTAGE",
      discountValue: 10,
      minBookingAmount: 2000,
      maxDiscountAmount: 1000,
      startDate: new Date(),
      expiryDate: new Date("2028-12-31"),
      usageLimit: 500,
      active: true,
    },
  });

  await prisma.coupon.create({
    data: {
      code: "MONTHLYVIBE",
      description: "Flat ₹2,000 off on long-term monthly stay memberships",
      discountType: "FIXED",
      discountValue: 2000,
      minBookingAmount: 12000,
      startDate: new Date(),
      expiryDate: new Date("2028-12-31"),
      usageLimit: 200,
      active: true,
    },
  });

  console.log("Coupons created.");

  // 6. Create Demo Bookings
  const koramangala = createdHostels[0];
  const koramangalaRooms = await prisma.room.findMany({
    where: { hostelId: koramangala.id },
    include: { beds: true },
  });

  const targetRoom = koramangalaRooms[0];
  const targetBed = targetRoom.beds[0];

  // Mark bed as occupied for demo booking
  await prisma.bed.update({
    where: { id: targetBed.id },
    data: { status: "OCCUPIED", currentOccupantId: customer1.id },
  });

  const checkIn = new Date();
  const checkOut = new Date();
  checkOut.setDate(checkOut.getDate() + 4);

  const demoBooking = await prisma.booking.create({
    data: {
      bookingReference: "GZ-829104",
      customerId: customer1.id,
      hostelId: koramangala.id,
      roomId: targetRoom.id,
      bedId: targetBed.id,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      stayType: "DAILY",
      guestsCount: 1,
      baseAmount: 3596,
      taxAmount: 432,
      serviceFee: 99,
      discountAmount: 400,
      couponCode: "GENZFIRST",
      totalAmount: 3727,
      paidAmount: 3727,
      balanceAmount: 0,
      bookingStatus: "CONFIRMED",
      paymentStatus: "PAID",
      guestName: customer1.name,
      guestEmail: customer1.email,
      guestPhone: customer1.phone || "+91 98765 43210",
      guestGovtId: "XXXX-XXXX-8921",
      qrCodeData: JSON.stringify({ ref: "GZ-829104", guest: customer1.name }),
    },
  });

  // Create payment record for demo booking
  await prisma.payment.create({
    data: {
      bookingId: demoBooking.id,
      customerId: customer1.id,
      amount: 3727,
      currency: "INR",
      gateway: "RAZORPAY",
      gatewayPaymentId: "pay_sim_829104_ok",
      gatewayOrderId: "order_gz_seed_001",
      status: "CAPTURED",
      paymentMethod: "upi",
    },
  });

  // Create invoice for demo booking
  await prisma.invoice.create({
    data: {
      invoiceNumber: "GZ-INV-2026-00001",
      bookingId: demoBooking.id,
      customerId: customer1.id,
      hostelId: koramangala.id,
      issueDate: new Date(),
      dueDate: new Date(),
      baseAmount: 3596,
      taxAmount: 432,
      serviceFee: 99,
      discountAmount: 400,
      totalAmount: 3727,
      paidAmount: 3727,
      status: "PAID",
    },
  });

  // Create sample Review
  await prisma.review.create({
    data: {
      hostelId: koramangala.id,
      bookingId: demoBooking.id,
      customerId: customer1.id,
      overallRating: 5.0,
      cleanlinessRating: 5.0,
      locationRating: 5.0,
      staffRating: 5.0,
      facilitiesRating: 5.0,
      valueRating: 5.0,
      title: "Best tech nomad community in Madhapur!",
      comment: "Rooftop fiber speeds hit 850 Mbps and the founder community is electric. The pods are private, quiet, and spotless. Never staying anywhere else in Madhapur.",
      status: "APPROVED",
      staffResponse: "Thank you Sameer! So stoked to have you as part of our founder community.",
    },
  });

  // Create sample support ticket
  await prisma.supportTicket.create({
    data: {
      ticketNumber: "TKT-8291",
      customerId: customer1.id,
      hostelId: koramangala.id,
      category: "WIFI",
      priority: "MEDIUM",
      status: "RESOLVED",
      subject: "Secondary monitor desk access in quiet zone",
      description: "Can I request access to the HDMI 4K monitor station on floor 2 for my pitch presentation?",
      staffReply: "Hi Sameer, desk #4 on Floor 2 has been reserved for your team from 2 PM to 6 PM today!",
    },
  });

  // Create sample housekeeping task
  await prisma.housekeepingTask.create({
    data: {
      hostelId: koramangala.id,
      roomId: targetRoom.id,
      bedId: targetBed.id,
      taskType: "LINEN_CHANGE",
      status: "CLEAN",
      assignedTo: housekeeper.id,
      notes: "Fresh bamboo fiber linen replaced and pod sanitized.",
    },
  });

  // Create Website CMS content
  await prisma.websiteContent.create({
    data: {
      sectionKey: "hero",
      contentJson: JSON.stringify({
        badge: "India's #1 Gen-Z Living Experience",
        headline: "Find Your Space. Live Your Way.",
        subheadline: "Premium coliving, ultra-fast fiber, creative workspaces, and vibrant community living across 4 hand-curated hostel sanctuaries.",
        stats: [
          { value: "4", label: "Exclusive Hostels" },
          { value: "1 Gbps", label: "Fiber Wi-Fi" },
          { value: "4.9 ★", label: "Guest Rating" },
          { value: "10K+", label: "Creators Hosted" },
        ],
      }),
    },
  });

  console.log("Database seed completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
