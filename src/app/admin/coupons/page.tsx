import React from "react";
import prisma from "@/lib/prisma";
import CouponsClient from "./CouponsClient";

export const dynamic = "force-dynamic";

export default async function AdminCouponsPage() {
  const coupons = await prisma.coupon.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <span className="text-xs uppercase font-extrabold tracking-widest text-indigo-400">
          Discounts & Marketing
        </span>
        <h1 className="text-3xl font-black text-white">Coupons Management</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Configure percentage discounts, flat fee coupons, minimum spend requirements, and usage caps.
        </p>
      </div>

      <CouponsClient initialCoupons={coupons} />
    </div>
  );
}
