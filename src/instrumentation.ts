/**
 * Next.js Server Lifecycle Instrumentation
 * Runs once when the Node.js server boots up.
 * Sets up the internal recurring payment reconciliation and hold cleanup timer.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { releaseExpiredBookingHolds } = await import("@/lib/booking-cleanup");

    // Run reconciliation and hold cleanup every 2 minutes in the background
    setInterval(async () => {
      try {
        await releaseExpiredBookingHolds();
      } catch (err) {
        console.warn("Background payment reconciliation heartbeat error:", err);
      }
    }, 2 * 60 * 1000);
  }
}
