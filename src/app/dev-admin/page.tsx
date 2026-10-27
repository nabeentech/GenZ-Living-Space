import React from "react";
import prisma from "@/lib/prisma";
import { isDevAdminAuthenticated } from "@/lib/dev-auth";
import { TABLE_DEFINITIONS } from "@/lib/database-studio";
import DevAdminClient from "./DevAdminClient";

export const dynamic = "force-dynamic";

export default async function DevAdminPage() {
  const isAuth = await isDevAdminAuthenticated();

  let initialTables: (any)[] = [];
  let totalRecords = 0;

  if (isAuth) {
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
    initialTables = tableKeys.map((key) => ({
      ...TABLE_DEFINITIONS[key],
      count: countMap[key] || 0,
    }));
    totalRecords = countResults.reduce((acc, curr) => acc + curr.count, 0);
  }

  return (
    <DevAdminClient
      initialIsAuthenticated={isAuth}
      initialTables={initialTables}
      initialTotalRecords={totalRecords}
    />
  );
}
