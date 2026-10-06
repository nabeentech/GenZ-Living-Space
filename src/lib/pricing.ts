export interface PriceCalculationParams {
  checkInDate: Date;
  checkOutDate: Date;
  basePrice: number;
  weeklyDiscountPct?: number;
  monthlyPrice?: number;
  securityDeposit?: number;
  coupon?: {
    code: string;
    discountType: string; // "PERCENTAGE" | "FIXED"
    discountValue: number;
    minBookingAmount?: number;
    maxDiscountAmount?: number | null;
  } | null;
}

export interface PriceBreakdown {
  nights: number;
  stayType: "DAILY" | "WEEKLY" | "MONTHLY";
  baseRatePerNight: number;
  baseAmount: number;
  weeklyDiscountApplied: number;
  taxAmount: number; // 12% GST
  serviceFee: number;
  securityDeposit: number;
  discountAmount: number;
  couponCode: string | null;
  totalAmount: number;
}

export function calculateBookingPrice(params: PriceCalculationParams): PriceBreakdown {
  const {
    checkInDate,
    checkOutDate,
    basePrice,
    weeklyDiscountPct = 10,
    monthlyPrice = basePrice * 24, // 20% discount default if unspecified
    securityDeposit: defaultDeposit = 0,
    coupon,
  } = params;

  const diffMs = checkOutDate.getTime() - checkInDate.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const nights = Math.max(1, diffDays);

  let stayType: "DAILY" | "WEEKLY" | "MONTHLY" = "DAILY";
  let baseAmount = 0;
  let weeklyDiscountApplied = 0;
  let securityDeposit = 0;

  if (nights >= 28) {
    stayType = "MONTHLY";
    // Prorated based on 30-day month
    const months = nights / 30;
    baseAmount = Math.round(monthlyPrice * months);
    securityDeposit = defaultDeposit > 0 ? defaultDeposit : 3000;
  } else if (nights >= 7) {
    stayType = "WEEKLY";
    const rawDaily = basePrice * nights;
    weeklyDiscountApplied = Math.round(rawDaily * (weeklyDiscountPct / 100));
    baseAmount = rawDaily - weeklyDiscountApplied;
  } else {
    stayType = "DAILY";
    baseAmount = Math.round(basePrice * nights);
  }

  // Calculate Coupon Discount on taxable base amount
  let discountAmount = 0;
  let couponCode: string | null = null;

  if (coupon) {
    const minSpend = coupon.minBookingAmount || 0;
    if (baseAmount >= minSpend) {
      if (coupon.discountType === "PERCENTAGE") {
        const computed = (baseAmount * coupon.discountValue) / 100;
        discountAmount = coupon.maxDiscountAmount
          ? Math.min(computed, coupon.maxDiscountAmount)
          : computed;
      } else {
        discountAmount = coupon.discountValue;
      }
      discountAmount = Math.min(discountAmount, baseAmount); // Cannot exceed base
      discountAmount = Math.round(discountAmount);
      couponCode = coupon.code;
    }
  }

  const taxableAmount = Math.max(0, baseAmount - discountAmount);
  // GST Tax (12% standard hospitality tier in India)
  const taxAmount = Math.round(taxableAmount * 0.12);
  // Convenience & Platform Service Fee
  const serviceFee = nights >= 28 ? 199 : 99;

  const totalAmount = taxableAmount + taxAmount + serviceFee + securityDeposit;

  return {
    nights,
    stayType,
    baseRatePerNight: basePrice,
    baseAmount,
    weeklyDiscountApplied,
    taxAmount,
    serviceFee,
    securityDeposit,
    discountAmount,
    couponCode,
    totalAmount,
  };
}
