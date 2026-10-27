import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { customerPhonePeStatus } from "@/lib/payment-status";

export const runtime = "nodejs";
export async function GET(req: NextRequest) {
  return customerPhonePeStatus(new URL(req.url).searchParams.get("merchantOrderId"), await getSessionUser());
}
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  return customerPhonePeStatus(body.merchantOrderId, await getSessionUser());
}
