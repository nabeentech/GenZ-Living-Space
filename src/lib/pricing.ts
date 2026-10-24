export interface PriceCalculationParams {
  checkInDate: Date;
  checkOutDate: Date;
  basePrice: number;
  weeklyDiscountPct?: number;
  monthlyPrice?: number;
  stayType?: "DAILY" | "MONTHLY";
  rates?: StayPriceRates;
  securityDeposit?: number;
  maintenanceFee?: number;
  coupon?: {
    code: string;
    discountType: string; // "PERCENTAGE" | "FIXED"
    discountValue: number;
    minBookingAmount?: number;
    maxDiscountAmount?: number | null;
  } | null;
}

export interface StayPriceRates {
  daily: number;
  days7: number;
  days10: number;
  days15: number;
  days30: number;
}

export function addUtcCalendarDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/** Select the configured AC/Non-AC admin rates with legacy values only as fallbacks. */
export function getRoomTypePriceRates(roomType: any, isAC: boolean): StayPriceRates {
  const dailyField = isAC ? roomType.pricePerDayAC : roomType.pricePerDayNonAC;
  const daily = dailyField ?? roomType.basePrice ?? 999;
  const weeklyDiscount = Math.max(0, Math.min(100, roomType.weeklyDiscountPct ?? 10));
  const monthlyField = isAC ? roomType.price30DaysAC : roomType.price30DaysNonAC;
  return {
    daily,
    days7: (isAC ? roomType.price7DaysAC : roomType.price7DaysNonAC) ?? Math.round(daily * 7 * (1 - weeklyDiscount / 100)),
    days10: (isAC ? roomType.price10DaysAC : roomType.price10DaysNonAC) ?? daily * 10,
    days15: (isAC ? roomType.price15DaysAC : roomType.price15DaysNonAC) ?? daily * 15,
    days30: monthlyField ?? roomType.monthlyPrice ?? daily * 30,
  };
}

/** Builds the lowest available combination of admin-defined duration rates. */
export function calculateStayBaseAmount(nights: number, rates: StayPriceRates): number {
  const duration = Math.max(1, Math.ceil(nights));
  const packages = [
    { days: 1, price: rates.daily },
    { days: 7, price: rates.days7 },
    { days: 10, price: rates.days10 },
    { days: 15, price: rates.days15 },
    { days: 30, price: rates.days30 },
  ];
  const exactPackage = packages.find((pack) => pack.days === duration);
  if (exactPackage) return Math.round(exactPackage.price);
  const amounts = Array<number>(duration + 1).fill(Number.POSITIVE_INFINITY);
  amounts[0] = 0;
  for (let day = 1; day <= duration; day += 1) {
    for (const pack of packages) {
      if (pack.days <= day) amounts[day] = Math.min(amounts[day], amounts[day - pack.days] + pack.price);
    }
  }
  return Math.round(amounts[duration]);
}

export interface PriceBreakdown {
  nights: number;
  stayType: "DAILY" | "WEEKLY" | "MONTHLY";
  baseRatePerNight: number;
  baseAmount: number;
  weeklyDiscountApplied: number;
  taxAmount: number;
  serviceFee: number;
  maintenanceFee?: number;
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
    monthlyPrice = basePrice * 30,
    stayType: requestedStayType,
    rates = {
      daily: basePrice,
      days7: Math.round(basePrice * 7 * (1 - weeklyDiscountPct / 100)),
      days10: basePrice * 10,
      days15: basePrice * 15,
      days30: monthlyPrice,
    },
    securityDeposit: configuredDeposit,
    maintenanceFee: configuredMaintenance,
    coupon,
  } = params;

  const diffMs = checkOutDate.getTime() - checkInDate.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const nights = Math.max(1, diffDays);

  let stayType: "DAILY" | "WEEKLY" | "MONTHLY" = requestedStayType || "DAILY";
  let baseAmount = 0;
  let weeklyDiscountApplied = 0;
  let securityDeposit = 0;

  if (requestedStayType === "MONTHLY" || (!requestedStayType && nights >= 28)) {
    stayType = "MONTHLY";
    baseAmount = Math.round(rates.days30 * (nights / 30));
    securityDeposit = configuredDeposit !== undefined && configuredDeposit !== null ? configuredDeposit : 5000;
  } else if (!requestedStayType && nights >= 7) {
    stayType = "WEEKLY";
  } else {
    stayType = "DAILY";
  }
  if (stayType !== "MONTHLY") baseAmount = calculateStayBaseAmount(nights, rates);

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
  // Hospitality GST removed (0%)
  const taxAmount = 0;
  // Maintenance fee for monthly stays (defaults to ₹2,000 or admin-configured rate), convenience platform fee for short stays (₹99)
  const monthlyMaintenance = configuredMaintenance !== undefined && configuredMaintenance !== null ? configuredMaintenance : 2000;
  const serviceFee = stayType === "MONTHLY" ? monthlyMaintenance : 99;

  const totalAmount = taxableAmount + taxAmount + serviceFee + securityDeposit;

  return {
    nights,
    stayType,
    baseRatePerNight: rates.daily,
    baseAmount,
    weeklyDiscountApplied,
    taxAmount,
    serviceFee,
    maintenanceFee: stayType === "MONTHLY" ? monthlyMaintenance : 0,
    securityDeposit,
    discountAmount,
    couponCode,
    totalAmount,
  };
}
