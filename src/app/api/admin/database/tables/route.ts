import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { TABLE_DEFINITIONS } from "@/lib/database-studio";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Super Admin access required." },
        { status: 403 }
      );
    }

    const tableKeys = Object.keys(TABLE_DEFINITIONS);

    // Fetch counts in parallel
    const countPromises = tableKeys.map(async (key) => {
      try {
        const delegate = (prisma as any)[key];
        if (delegate && typeof delegate.count === "function") {
          const count = await delegate.count();
          return { key, count };
        }
        return { key, count: 0 };
      } catch (err) {
        console.error(`Error counting ${key}:`, err);
        return { key, count: 0 };
      }
    });

    const countResults = await Promise.all(countPromises);
    const countMap = Object.fromEntries(countResults.map((r) => [r.key, r.count]));

    const tables = tableKeys.map((key) => {
      const def = TABLE_DEFINITIONS[key];
      return {
        ...def,
        count: countMap[key] || 0,
      };
    });

    const totalRecords = countResults.reduce((acc, curr) => acc + curr.count, 0);

    return NextResponse.json({
      success: true,
      data: {
        tables,
        totalRecords,
      },
    });
  } catch (error: any) {
    console.error("Error fetching database tables:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load database tables" },
      { status: 500 }
    );
  }
}
