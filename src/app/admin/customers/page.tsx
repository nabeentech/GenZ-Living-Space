import { getSessionUser, hasPermission, ROLES } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { CustomerDirectoryClient } from "./CustomerDirectoryClient";

export const metadata = {
  title: "Customers Directory - GenZ Hostels OS",
};

export default async function CustomersPage() {
  const sessionUser = await getSessionUser();

  if (!sessionUser || !hasPermission(sessionUser.role, [ROLES.SUPER_ADMIN, ROLES.PROPERTY_MANAGER])) {
    redirect("/");
  }

  // Fetch all customers with their booking history
  const customers = await prisma.user.findMany({
    where: {
      role: "CUSTOMER",
    },
    include: {
      bookings: {
        include: {
          hostel: true,
          room: true,
          bed: true,
        },
        orderBy: {
          checkInDate: "desc",
        },
        take: 5, // Get last 5 bookings
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <main className="p-6 sm:p-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Customers Directory</h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage and view all registered guests in the system
          </p>
        </div>
      </div>

      <CustomerDirectoryClient customers={customers} />
    </main>
  );
}
