import assert from "node:assert/strict";
import { test, before, after } from "node:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { randomUUID, createHash } from "node:crypto";
import { Prisma, PrismaClient as GeneratedPrismaClient } from "@prisma/client";
import { createPaymentReconciler, paymentTransaction } from "../src/lib/payment-reconciliation";
import { createPhonePeWebhookHandler } from "../src/lib/payment-webhook";
import { createCustomerPaymentStatus } from "../src/lib/payment-status-handler";
import { claimPhonePeAttempt, createPhonePeSender } from "../src/lib/payment-initiation";
import { reconcilePendingPhonePePayments } from "../src/lib/payment-reconciliation-job";
import { checkoutExpirySeconds, verifyPhonePeWebhook, PhonePePaymentNotCreatedError } from "../src/lib/phonepe";
import type { PhonePeOrderStatus } from "../src/lib/phonepe";

// New empty SQLite database, synthetic records only. The datasource always
// points to this test file; no repository/live database is opened. External
// gateway traffic fails closed.
const directory = mkdtempSync(join(tmpdir(), "genz-payment-tests-"));
const url = `file:${join(directory, "payments.db").replaceAll("\\", "/")}`;
// The bundled Windows binary-engine transport stalls on this host. Use the
// same installed Prisma version/schema with its in-process SQLite library for
// integration tests, without changing the application's generated client.
let generatedConfig: any;
new GeneratedPrismaClient({ __internal: { configOverride(config: any) {
  generatedConfig = { ...config, relativeEnvPaths: {} };
  return generatedConfig;
} } } as any);
const { getPrismaClient } = require("@prisma/client/runtime/library");
const LibraryClient = getPrismaClient({ ...generatedConfig,
  generator: { ...generatedConfig.generator, config: { ...generatedConfig.generator.config, engineType: "library" } },
}) as typeof GeneratedPrismaClient;
const db = new LibraryClient({ datasources: { db: { url } } });
const network = globalThis.fetch;
before(async () => {
  globalThis.fetch = async (input, init) => {
    // Prisma's binary engine speaks HTTP over loopback to its local SQLite
    // process. Permit only that transport; no external gateway is reachable.
    const host = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url).hostname;
    if (host === "127.0.0.1" || host === "localhost") return network(input, init);
    throw new Error("External network forbidden in payment tests");
  };
  // Build an empty SQLite fixture from the generated Prisma data model. This
  // avoids CLI schema-engine subprocesses and any repository .env loading.
  const { DatabaseSync } = require("node:sqlite") as { DatabaseSync: new (path: string) => { exec(sql: string): void; close(): void } };
  const sqlite = new DatabaseSync(join(directory, "payments.db"));
  for (const model of Prisma.dmmf.datamodel.models) {
    const columns = model.fields.filter(field => field.kind !== "object").map(field => {
      const type = ({ String: "TEXT", DateTime: "DATETIME", Float: "REAL", Int: "INTEGER", Boolean: "BOOLEAN" } as Record<string, string>)[field.type] || "TEXT";
      const value = field.default;
      const defaultSQL = typeof value === "object" && value !== null
        ? ((value as { name?: string }).name === "now" ? " DEFAULT CURRENT_TIMESTAMP" : "")
        : value === undefined ? "" : ` DEFAULT ${typeof value === "string" ? "'" + value.replaceAll("'", "''") + "'" : Number(value)}`;
      return `"${field.name}" ${type}${field.isId ? " PRIMARY KEY" : ""}${field.isRequired ? " NOT NULL" : ""}${field.isUnique ? " UNIQUE" : ""}${defaultSQL}`;
    });
    for (const fields of model.uniqueFields) columns.push(`UNIQUE (${fields.map(field => '"'+field+'"').join(",")})`);
    for (const field of model.fields.filter(field => field.kind === "object" && field.relationFromFields?.length)) {
      columns.push(`FOREIGN KEY (${field.relationFromFields!.map(key => '"'+key+'"').join(",")}) REFERENCES "${field.type}" (${field.relationToFields!.map(key => '"'+key+'"').join(",")})`);
    }
    sqlite.exec(`CREATE TABLE "${model.name}" (${columns.join(",")})`);
  }
  sqlite.close();
  await db.$connect();
});
after(async () => { await db.$disconnect(); globalThis.fetch = network; });

async function fixture(options: { status?: string; amount?: number; paid?: number; expired?: boolean; rent?: boolean; paymentStatus?: string } = {}) {
  const key = randomUUID();
  const user = await db.user.create({ data: { email: `${key}@test.invalid`, name: "Test" } });
  const hostel = await db.hostel.create({ data: { slug: key, name: "Test", tagline: "Test", city: "Test", state: "Test", address: "Test", postalCode: "0", description: "Test", coverImage: "", contactPhone: "0", contactEmail: "test@test.invalid" } });
  const roomType = await db.roomType.create({ data: { slug: key, name: "Test", description: "Test" } });
  const room = await db.room.create({ data: { hostelId: hostel.id, roomTypeId: roomType.id, roomNumber: key } });
  const bed = await db.bed.create({ data: { roomId: room.id, hostelId: hostel.id, bedNumber: key, status: "RESERVED", currentOccupantId: user.id } });
  const checkout = new Date("2027-01-01T00:00:00Z");
  const booking = await db.booking.create({ data: { customerId: user.id, hostelId: hostel.id, roomId: room.id, bedId: bed.id,
    bookingReference: key, checkInDate: new Date("2026-12-01T00:00:00Z"), checkOutDate: checkout,
    baseAmount: 100, taxAmount: 0, totalAmount: 100, paidAmount: options.paid || 0, balanceAmount: 100 - (options.paid || 0),
    bookingStatus: options.status || "PAYMENT_PENDING", paymentStatus: "PENDING", guestName: "Test", guestEmail: "test@test.invalid", guestPhone: "0",
    holdExpiresAt: new Date(Date.now() + (options.expired ? -60000 : 900000)),
  } });
  const amount = options.amount || 100;
  const invoice = await db.invoice.create({ data: { invoiceNumber: key, bookingId: booking.id, customerId: user.id, hostelId: hostel.id,
    issueDate: new Date(), dueDate: new Date(), baseAmount: amount, taxAmount: 0, totalAmount: amount,
    paidAmount: 0, balanceDue: amount, status: "DUE" } });
  const merchantOrderId = `TEST_${key}`;
  const meta = options.rent ? { type: "MONTHLY_RENT", cycleStart: checkout.toISOString(), cycleEnd: "2027-01-31T00:00:00.000Z", invoiceId: invoice.id } : {};
  const payment = await db.payment.create({ data: { bookingId: booking.id, customerId: user.id, amount, gateway: "PHONEPE", gatewayOrderId: merchantOrderId, status: options.paymentStatus || "PENDING", metadata: JSON.stringify(meta) } });
  return { booking, bed, payment, merchantOrderId, invoice };
}
function service(status: (id: string) => Promise<PhonePeOrderStatus>) {
  const events: Array<{event: string; details: Record<string, unknown>}> = [];
  const reconciler = createPaymentReconciler({ db, checkStatus: status, generateQR: async () => "TEST_QR", createInvoice: async () => { throw new Error("Unexpected invoice creation"); }, log: (event, details) => { events.push({ event, details }); } });
  return { ...reconciler, events };
}
const completed = (amount = 10000): PhonePeOrderStatus => ({ orderId: "OMO_TEST", state: "COMPLETED", amount, paymentDetails: [{ amount, state: "COMPLETED", transactionId: "TXN_TEST", paymentMode: "UPI_QR" }] });

test("hold expiry is bounded, including minimum, invalid dates and retry deadline", () => {
  const now = 1000000;
  assert.equal(checkoutExpirySeconds(new Date(now + 900000), now), 840);
  assert.equal(checkoutExpirySeconds(new Date(now + 360000), now), 300);
  assert.equal(checkoutExpirySeconds(undefined, now), 1200);
  assert.throws(() => checkoutExpirySeconds(new Date(now + 359000), now));
  assert.throws(() => checkoutExpirySeconds(new Date(now - 1), now));
  assert.throws(() => checkoutExpirySeconds(new Date(NaN), now));
});
test("SHA requires configured credentials and rejects every unauthenticated/deprecated mode", () => {
  process.env.PHONEPE_WEBHOOK_AUTH_MODE = "SHA";
  delete process.env.PHONEPE_WEBHOOK_USERNAME; delete process.env.PHONEPE_WEBHOOK_PASSWORD;
  const header = createHash("sha256").update("test:secret").digest("hex");
  assert.equal(verifyPhonePeWebhook({ authorization: header }, ""), false);
  process.env.PHONEPE_WEBHOOK_USERNAME = "test"; process.env.PHONEPE_WEBHOOK_PASSWORD = "secret";
  assert.equal(verifyPhonePeWebhook({ authorization: header }, ""), true);
  for (const authorization of [undefined, "", "bad", "0".repeat(64), `Basic ${header}`]) assert.equal(verifyPhonePeWebhook({ authorization }, ""), false);
  process.env.PHONEPE_WEBHOOK_AUTH_MODE = "HMAC";
  assert.equal(verifyPhonePeWebhook({ authorization: header, signature: header }, "{}"), false);
  process.env.PHONEPE_WEBHOOK_AUTH_MODE = "SHA";
});
test("provider amount mismatch (missing, zero, fractional, one paise) never credits", async () => {
  const f = await fixture();
  for (const amount of [undefined, 0, 9999, 10001, 10000.5]) {
    const s = service(async () => ({ ...completed(), amount: amount as number }));
    await assert.rejects(s.reconcile(f.merchantOrderId), /amount/);
  }
  assert.equal((await db.payment.findUniqueOrThrow({where:{id:f.payment.id}})).status,"PENDING");
  assert.equal((await db.booking.findUniqueOrThrow({where:{id:f.booking.id}})).paidAmount,0);
});
test("booking completion updates payment, booking, invoice, bed and audit exactly once", async () => {
  const f = await fixture(); const s = service(async () => completed());
  const outcomes = await Promise.all([s.reconcile(f.merchantOrderId), s.reconcile(f.merchantOrderId)]);
  assert.equal(outcomes.filter(item => item.applied).length, 1);
  const booking = await db.booking.findUniqueOrThrow({where:{id:f.booking.id}});
  assert.equal(booking.paidAmount,100); assert.equal(booking.balanceAmount,0); assert.equal(booking.holdExpiresAt,null); assert.equal(booking.bookingStatus,"CONFIRMED");
  assert.equal((await db.invoice.findUniqueOrThrow({where:{id:f.invoice.id}})).status,"PAID");
  assert.equal(await db.auditLog.count({where:{entityId:f.booking.id,action:"PHONEPE_PAYMENT_RECONCILED"}}),1);
  const failed = service(async () => ({orderId:"OMO_TEST",state:"FAILED",amount:10000}));
  assert.equal((await failed.reconcile(f.merchantOrderId)).state,"COMPLETED");
  assert.equal((await db.payment.findUniqueOrThrow({where:{id:f.payment.id}})).status,"COMPLETED");
});
test("partial balance payment preserves CHECKED_IN and credits only actual amount", async () => {
  const f = await fixture({status:"CHECKED_IN",paid:50,amount:25});
  // Initial invoice belongs to full booking, not this balance attempt.
  await db.invoice.update({where:{id:f.invoice.id},data:{totalAmount:100,paidAmount:50,balanceDue:50}});
  await service(async () => completed(2500)).reconcile(f.merchantOrderId);
  const b=await db.booking.findUniqueOrThrow({where:{id:f.booking.id}});
  assert.equal(b.paidAmount,75);assert.equal(b.balanceAmount,25);assert.equal(b.paymentStatus,"PARTIAL");assert.equal(b.bookingStatus,"CHECKED_IN");
});
test("separate simultaneous attempts cannot overwrite totals or silently discard excess money", async () => {
  const f=await fixture();
  const second=await db.payment.create({data:{bookingId:f.booking.id,customerId:f.booking.customerId,amount:100,gateway:"PHONEPE",gatewayOrderId:`SECOND_${randomUUID()}`,status:"PENDING"}});
  const s=service(async()=>completed());
  const results=await Promise.all([s.reconcile(f.merchantOrderId),s.reconcile(second.gatewayOrderId!)]);
  assert.equal(results.filter(item=>item.state==="COMPLETED").length,1);assert.equal(results.filter(item=>item.state==="REVIEW_REQUIRED").length,1);
  assert.equal((await db.booking.findUniqueOrThrow({where:{id:f.booking.id}})).paidAmount,100);
});
test("late captured payment never resurrects a cancelled booking", async()=>{
  const f=await fixture({status:"CANCELLED"});
  const result=await service(async()=>completed()).reconcile(f.merchantOrderId);
  assert.equal(result.state,"REVIEW_REQUIRED");assert.equal((await db.booking.findUniqueOrThrow({where:{id:f.booking.id}})).bookingStatus,"CANCELLED");
});
test("monthly rent extends cycle and pays its invoice exactly once",async()=>{
  const f=await fixture({status:"CHECKED_IN",paid:100,rent:true});const s=service(async()=>completed());
  await s.reconcile(f.merchantOrderId);await s.reconcile(f.merchantOrderId);
  const b=await db.booking.findUniqueOrThrow({where:{id:f.booking.id}});
  assert.equal(b.totalAmount,200);assert.equal(b.paidAmount,200);assert.equal(b.checkOutDate.toISOString(),"2027-01-31T00:00:00.000Z");assert.equal(b.bookingStatus,"CHECKED_IN");
  assert.equal(await db.bookingExtension.count({where:{bookingId:b.id}}),1);
});
test("cron reconciliation persists actual completion without any browser return",async()=>{
  const f=await fixture();const s=service(async(id)=>id===f.merchantOrderId?completed():{orderId:"OTHER",state:"PENDING",amount:10000});
  const job=await reconcilePendingPhonePePayments(db,s.reconcile);
  assert.ok(job.completed>=1);assert.equal((await db.booking.findUniqueOrThrow({where:{id:f.booking.id}})).bookingStatus,"CONFIRMED");
});
test("cleanup retains beds on provider timeout, PENDING and unknown states",async()=>{
  for(const state of ["TIMEOUT","PENDING","UNKNOWN"]){
    const f=await fixture({expired:true});
    const s=service(async()=>{if(state==="TIMEOUT")throw new Error("offline");return{orderId:"OMO_TEST",state,amount:10000};});
    await s.releaseExpiredHolds();
    assert.equal((await db.booking.findUniqueOrThrow({where:{id:f.booking.id}})).bookingStatus,"PAYMENT_PENDING");
    assert.equal((await db.bed.findUniqueOrThrow({where:{id:f.bed.id}})).status,"RESERVED");
  }
});
test("cleanup checks older payable attempts and reconciles captured money before release",async()=>{
  const f=await fixture({expired:true});
  await db.payment.create({data:{bookingId:f.booking.id,customerId:f.booking.customerId,amount:100,gateway:"PHONEPE",gatewayOrderId:`LATER_${randomUUID()}`,status:"FAILED"}});
  const s=service(async(id)=>id===f.merchantOrderId?completed():{orderId:"LATER",state:"FAILED",amount:10000});
  await s.releaseExpiredHolds();
  assert.equal((await db.booking.findUniqueOrThrow({where:{id:f.booking.id}})).bookingStatus,"CONFIRMED");
});
test("cleanup releases only terminally failed orders and blocks concurrent initiation",async()=>{
  const f=await fixture({expired:true});const s=service(async()=>({orderId:"OMO_TEST",state:"FAILED",amount:10000}));
  await s.releaseExpiredHolds();
  assert.equal((await db.booking.findUniqueOrThrow({where:{id:f.booking.id}})).bookingStatus,"CANCELLED");
  assert.equal((await db.bed.findUniqueOrThrow({where:{id:f.bed.id}})).status,"AVAILABLE");
  await assert.rejects(paymentTransaction(db,tx=>claimPhonePeAttempt(tx,f.booking.id)),/not awaiting/);
});
test("new attempts cannot overlap unresolved payments or nearly expired holds",async()=>{
  const f=await fixture();
  await assert.rejects(paymentTransaction(db,tx=>claimPhonePeAttempt(tx,f.booking.id)),/earlier payment/);
  await db.payment.update({where:{id:f.payment.id},data:{status:"FAILED"}});
  await db.booking.update({where:{id:f.booking.id},data:{holdExpiresAt:new Date(Date.now()+120000)}});
  await assert.rejects(paymentTransaction(db,tx=>claimPhonePeAttempt(tx,f.booking.id)),/close to expiry/);
});
test("provider order ID and attempt amount mismatches roll back settlement",async()=>{
  const f=await fixture();
  await db.payment.update({where:{id:f.payment.id},data:{metadata:JSON.stringify({providerOrderId:"OTHER"})}});
  await assert.rejects(service(async()=>completed()).reconcile(f.merchantOrderId),/order does not match/);
  await db.payment.update({where:{id:f.payment.id},data:{metadata:"{}"}});
  const status=completed();status.paymentDetails![0].amount=9999;
  await assert.rejects(service(async()=>status).reconcile(f.merchantOrderId),/attempt amount/);
  assert.equal((await db.booking.findUniqueOrThrow({where:{id:f.booking.id}})).paidAmount,0);
});

test("webhook rejects unauthorized, malformed and wrong-amount events before provider calls", async () => {
  const f = await fixture(); let checked = 0;
  process.env.PHONEPE_WEBHOOK_AUTH_MODE="SHA";process.env.PHONEPE_WEBHOOK_USERNAME="test";process.env.PHONEPE_WEBHOOK_PASSWORD="secret";
  const digest=createHash("sha256").update("test:secret").digest("hex");
  const handler=createPhonePeWebhookHandler({db,verify:verifyPhonePeWebhook,reconcile:async()=>{checked++;return{state:"PENDING"};},log:()=>{}});
  const request=(body:string,auth?:string)=>new Request("https://example.test/api/payments/webhook",{method:"POST",headers:auth?{authorization:auth}:{},body});
  const event={event:"checkout.order.completed",payload:{merchantOrderId:f.merchantOrderId,amount:10000,state:"COMPLETED"}};
  assert.equal((await handler(request(JSON.stringify(event)))).status,401);
  assert.equal((await handler(request("{",digest))).status,400);
  for(const amount of [undefined,0,9999,10001]) assert.equal((await handler(request(JSON.stringify({...event,payload:{...event.payload,amount}}),digest))).status,400);
  assert.equal(checked,0);
  assert.equal((await handler(request(JSON.stringify(event),digest))).status,200);assert.equal(checked,1);
  const retry=createPhonePeWebhookHandler({db,verify:()=>true,reconcile:async()=>{throw new Error("provider unavailable");},log:()=>{}});
  assert.equal((await retry(request(JSON.stringify(event),digest))).status,503);
});
test("customer status requires the owner; other customers cannot trigger reconciliation",async()=>{
  const f=await fixture();let checked=0;
  const handler=createCustomerPaymentStatus({db,reconcile:async()=>{checked++;return{state:"PENDING",bookingId:f.booking.id,bookingReference:f.booking.bookingReference,amount:100};}});
  assert.equal((await handler(f.merchantOrderId,null)).status,401);
  assert.equal((await handler(f.merchantOrderId,{id:"OTHER_CUSTOMER"})).status,404);
  assert.equal((await handler("bad reference",{id:f.booking.customerId})).status,400);assert.equal(checked,0);
  assert.equal((await handler(f.merchantOrderId,{id:f.booking.customerId})).status,200);assert.equal(checked,1);
});
test("initiation distinguishes not-sent failures from uncertain provider acceptance",async()=>{
  for(const notSent of [true,false]){
    const f=await fixture();
    const send=createPhonePeSender(db,async()=>{throw notSent?new PhonePePaymentNotCreatedError("oauth failed"):new Error("network timeout after dispatch");},()=>{});
    await assert.rejects(send(f.payment,{merchantOrderId:f.merchantOrderId,amount:10000,redirectUrl:"https://example.test/return"}));
    const stored=await db.payment.findUniqueOrThrow({where:{id:f.payment.id}});
    assert.equal(stored.status,notSent?"FAILED":"PENDING");
    if(notSent){
      assert.equal(JSON.parse(stored.metadata!).initiationRejected,true);
      const result=await service(async()=>{throw new Error("Must not query an unsent order");}).reconcile(f.merchantOrderId);
      assert.equal(result.state,"FAILED");
    }
  }
});
test("provider order persistence cannot overwrite a payment already completed by webhook",async()=>{
  const f=await fixture();
  const send=createPhonePeSender(db,async()=>{
    await service(async()=>completed()).reconcile(f.merchantOrderId);
    return{orderId:"OMO_TEST",state:"PENDING",expireAt:Date.now()+10000,redirectUrl:"https://example.test/session"};
  },()=>{});
  await send(f.payment,{merchantOrderId:f.merchantOrderId,amount:10000,redirectUrl:"https://example.test/return"});
  const stored=await db.payment.findUniqueOrThrow({where:{id:f.payment.id}});assert.equal(stored.status,"COMPLETED");assert.equal(stored.gatewayPaymentId,"TXN_TEST");
});

test("cleanup racing a completion cannot cancel or release a paid reservation", async () => {
  const f = await fixture({ expired: true });
  const s = service(async () => completed());
  await Promise.all([s.releaseExpiredHolds(), s.reconcile(f.merchantOrderId)]);
  const booking = await db.booking.findUniqueOrThrow({ where: { id: f.booking.id } });
  assert.equal(booking.bookingStatus, "CONFIRMED");
  assert.equal(booking.paidAmount, 100);
  assert.equal((await db.bed.findUniqueOrThrow({ where: { id: f.bed.id } })).status, "RESERVED");
});
