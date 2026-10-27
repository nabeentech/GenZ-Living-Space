import React from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { TABLE_DEFINITIONS } from "@/lib/database-studio";
import DatabaseStudioClient from "./DatabaseStudioClient";

export const dynamic = "force-dynamic";

export default async function AdminDatabasePage() {
  const user = await getSessionUser();

  if (!user || user.role !== "SUPER_ADMIN") {
    redirect("/admin");
  }

  // Pre-load table counts
  const tableKeys = Object.keys(TABLE_DEFINITIONS);
  const countResults = await Promise.all(
    tableKeys.map(async (key) => {
      try {
        const delegate = (prisma as any)[key];
        if (delegate && typeof delegate.count === "function") {
          const count = await delegate.count();
          return { key, count };
        }
        return { key, count: 0 };
      } catch {
        return { key, count: 0 };
      }
    })
  );

  const countMap = Object.fromEntries(countResults.map((r) => [r.key, r.count]));
  const initialTables = tableKeys.map((key) => ({
    ...TABLE_DEFINITIONS[key],
    count: countMap[key] || 0,
  }));

  const totalRecords = countResults.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <DatabaseStudioClient
      currentUser={user}
      initialTables={initialTables}
      initialTotalRecords={totalRecords}
    />
  );
}
