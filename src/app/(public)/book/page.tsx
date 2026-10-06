import React, { Suspense } from "react";
import BookClient from "./BookClient";

export const dynamic = "force-dynamic";

export default function BookPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0B0F19] text-white flex items-center justify-center">
          <div className="text-center space-y-2">
            <span className="text-sm font-semibold text-indigo-400 animate-pulse">
              Loading GenZ Space Booking Engine...
            </span>
          </div>
        </div>
      }
    >
      <BookClient />
    </Suspense>
  );
}
