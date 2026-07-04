// ============================================================
// SRI TECH ACADEMY PORTAL — Fee Calculation Service
// Centralized pricing engine. All fee math lives here only.
// ============================================================

import { AcademyFeeRecord, DiscountType, PaymentStatus } from '../../types';

// --------------- Course ID Constants ---------------
const COURSE_C   = 'c1';
const COURSE_CPP = 'c2';
const COURSE_PY  = 'c3';
const COURSE_JAVA = 'c4';

import { settingsService } from '../firebase/settingsService';

export function getCourseFees(): Record<string, number> {
  return settingsService.getCourseFees();
}

// --------------- Combo Fee Rules ---------------
// Sorted course-id sets → fixed combo price
const COMBO_RULES: { ids: Set<string>; fee: number }[] = [
  // All four programming courses
  { ids: new Set([COURSE_C, COURSE_CPP, COURSE_PY, COURSE_JAVA]), fee: 6000 },
  // Java + Python
  { ids: new Set([COURSE_PY, COURSE_JAVA]), fee: 4000 },
  // C + Java
  { ids: new Set([COURSE_C, COURSE_JAVA]), fee: 3500 },
  // C + Python
  { ids: new Set([COURSE_C, COURSE_PY]), fee: 3500 },
  // C++ + Java
  { ids: new Set([COURSE_CPP, COURSE_JAVA]), fee: 3500 },
  // C++ + Python
  { ids: new Set([COURSE_CPP, COURSE_PY]), fee: 3500 },
];

/** Check if two sets contain the exact same elements */
function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const item of a) {
    if (!b.has(item)) return false;
  }
  return true;
}

// ============================================================
// PUBLIC CALCULATION FUNCTIONS
// ============================================================

/**
 * Calculate the total course fee for a student's enrolled courses.
 * Applies combo discounts if the exact combination matches a rule.
 * Falls back to summing individual prices for unrecognised combos.
 */
export function calculateCourseFee(courseIds: string[]): number {
  if (!courseIds || courseIds.length === 0) return 0;

  const fees = getCourseFees();
  const idSet = new Set(courseIds);

  // Check combo rules first (most specific to least)
  for (const rule of COMBO_RULES) {
    if (setsEqual(idSet, rule.ids)) {
      return rule.fee;
    }
  }

  // Fallback: sum individual prices
  return courseIds.reduce((sum, id) => {
    return sum + (fees[id] ?? 1500);
  }, 0);
}

/**
 * Calculate the rupee amount saved by a discount.
 * @param totalBill   Original fee amount (₹)
 * @param type        'none' | 'fixed' | 'percentage'
 * @param value       ₹ amount (fixed) or % value (percentage)
 */
export function calculateDiscount(
  totalBill: number,
  type: DiscountType,
  value: number
): number {
  if (type === 'fixed') {
    return Math.min(value, totalBill); // Cannot exceed total bill
  }
  if (type === 'percentage') {
    const pct = Math.min(Math.max(value, 0), 100);
    return Math.round((totalBill * pct) / 100);
  }
  return 0;
}

/**
 * Calculate final payable amount after discount.
 */
export function calculateFinalAmount(
  totalBill: number,
  discountedAmount: number
): number {
  return Math.max(totalBill - discountedAmount, 0);
}

/**
 * Calculate remaining unpaid amount.
 */
export function calculateRemainingAmount(
  finalPayable: number,
  paidAmount: number
): number {
  return Math.max(finalPayable - paidAmount, 0);
}

/**
 * Determine payment status from remaining vs final amounts.
 */
export function calculatePaymentStatus(
  remainingAmount: number,
  finalPayableAmount: number,
  paidAmount: number
): PaymentStatus {
  if (finalPayableAmount === 0) return 'Paid'; // Zero-fee edge case
  if (paidAmount === 0) return 'Pending';
  if (remainingAmount <= 0) return 'Paid';
  return 'Partially Paid';
}

// ============================================================
// REVENUE STATISTICS
// ============================================================

export interface RevenueStatistics {
  totalStudents: number;
  totalExpectedRevenue: number;   // Sum of all finalPayableAmounts
  totalCollected: number;         // Sum of all paidAmounts
  totalPending: number;           // Sum of all remainingAmounts
  collectionPercentage: number;   // (collected / expected) * 100
  paidCount: number;
  partialCount: number;
  pendingCount: number;
}

/**
 * Aggregate revenue statistics across all fee records.
 */
export function getRevenueStatistics(records: AcademyFeeRecord[]): RevenueStatistics {
  const totalStudents = records.length;
  const totalExpectedRevenue = records.reduce((s, r) => s + r.finalPayableAmount, 0);
  const totalCollected = records.reduce((s, r) => s + r.paidAmount, 0);
  const totalPending = records.reduce((s, r) => s + r.remainingAmount, 0);
  const collectionPercentage = totalExpectedRevenue > 0
    ? Math.round((totalCollected / totalExpectedRevenue) * 100)
    : 0;

  const paidCount    = records.filter(r => r.paymentStatus === 'Paid').length;
  const partialCount = records.filter(r => r.paymentStatus === 'Partially Paid').length;
  const pendingCount = records.filter(r => r.paymentStatus === 'Pending').length;

  return {
    totalStudents,
    totalExpectedRevenue,
    totalCollected,
    totalPending,
    collectionPercentage,
    paidCount,
    partialCount,
    pendingCount,
  };
}

/**
 * Helper: Build a default AcademyFeeRecord for a new student.
 * All amounts are computed fresh from the student's courseIds.
 */
export function buildDefaultFeeRecord(
  studentId: string,
  courseIds: string[]
): AcademyFeeRecord {
  const totalBillAmount = calculateCourseFee(courseIds);
  const discountedAmount = 0;
  const finalPayableAmount = totalBillAmount;
  const paidAmount = 0;
  const remainingAmount = finalPayableAmount;
  const paymentStatus = calculatePaymentStatus(remainingAmount, finalPayableAmount, paidAmount);
  const now = new Date().toISOString();

  return {
    id: `afee_${studentId}`,
    studentId,
    totalBillAmount,
    discountType: 'none',
    discountValue: 0,
    discountedAmount,
    finalPayableAmount,
    paidAmount,
    remainingAmount,
    paymentStatus,
    payments: [],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Recalculate all derived fields on a fee record after any mutation.
 * Always call this before saving to keep the record self-consistent.
 */
export function recalculateFeeRecord(record: AcademyFeeRecord): AcademyFeeRecord {
  const discountedAmount = calculateDiscount(
    record.totalBillAmount,
    record.discountType,
    record.discountValue
  );
  const finalPayableAmount = calculateFinalAmount(record.totalBillAmount, discountedAmount);
  const paidAmount = record.payments.reduce((s, p) => s + p.amount, 0);
  const remainingAmount = calculateRemainingAmount(finalPayableAmount, paidAmount);
  const paymentStatus = calculatePaymentStatus(remainingAmount, finalPayableAmount, paidAmount);

  return {
    ...record,
    discountedAmount,
    finalPayableAmount,
    paidAmount,
    remainingAmount,
    paymentStatus,
    updatedAt: new Date().toISOString(),
  };
}

class FeeCalculationService {
  calculateCourseFee = calculateCourseFee;
  calculateDiscount = calculateDiscount;
  calculateFinalAmount = calculateFinalAmount;
  calculateRemainingAmount = calculateRemainingAmount;
  calculatePaymentStatus = calculatePaymentStatus;
  getRevenueStatistics = getRevenueStatistics;
  buildDefaultFeeRecord = buildDefaultFeeRecord;
  recalculateFeeRecord = recalculateFeeRecord;
  getCourseFees = getCourseFees;
}

export const feeCalculationService = new FeeCalculationService();
