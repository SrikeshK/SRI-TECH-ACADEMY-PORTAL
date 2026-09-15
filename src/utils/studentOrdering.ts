/**
 * studentOrdering.ts
 * ─────────────────────────────────────────────────────────────
 * SRI TECH ACADEMY PORTAL – Unified Student Ordering Utility
 *
 * Provides deterministic, natural numeric sorting by student Register Number
 * (e.g., STA-2026-001, STA-2026-002 ... STA-2026-009, STA-2026-010).
 * ─────────────────────────────────────────────────────────────
 */

/**
 * Natural comparison of register numbers / alphanumeric IDs.
 * Correctly handles numeric chunks so 'STA-2026-010' comes AFTER 'STA-2026-009' and not before 'STA-2026-002'.
 */
export function compareRegisterNumbers(a?: string | null, b?: string | null): number {
  const strA = (a || '').trim();
  const strB = (b || '').trim();

  // If both are empty
  if (!strA && !strB) return 0;
  // Non-empty values come before empty/missing values
  if (!strA) return 1;
  if (!strB) return -1;

  // Natural numeric chunk comparison
  const result = strA.localeCompare(strB, undefined, { numeric: true, sensitivity: 'base' });
  if (result !== 0) return result;

  // Exact fallback if case or zero-padding differs
  return strA.localeCompare(strB);
}

/**
 * Sorts any array of student objects in ascending order by register number (or fallback rollNo).
 * If register numbers are identical or absent, falls back to name and id for determinism.
 */
export function sortStudentsByRegisterNumber<
  T extends { registerNumber?: string; rollNo?: string; name?: string; id?: string }
>(students: T[]): T[] {
  if (!Array.isArray(students)) return [];
  return [...students].sort((a, b) => {
    const regA = a?.registerNumber || a?.rollNo || '';
    const regB = b?.registerNumber || b?.rollNo || '';
    const comp = compareRegisterNumbers(regA, regB);
    if (comp !== 0) return comp;

    // Secondary sort by name
    const nameA = a?.name || '';
    const nameB = b?.name || '';
    const nameComp = nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
    if (nameComp !== 0) return nameComp;

    // Final tie-breaker by id
    return (a?.id || '').localeCompare(b?.id || '');
  });
}

/**
 * Sorts any array of row objects that contain a nested `student` property
 * in ascending order by student register number.
 */
export function sortStudentRowsByRegisterNumber<
  T extends { student: { registerNumber?: string; rollNo?: string; name?: string; id?: string } }
>(rows: T[]): T[] {
  if (!Array.isArray(rows)) return [];
  return [...rows].sort((a, b) => {
    const regA = a?.student?.registerNumber || a?.student?.rollNo || '';
    const regB = b?.student?.registerNumber || b?.student?.rollNo || '';
    const comp = compareRegisterNumbers(regA, regB);
    if (comp !== 0) return comp;

    const nameA = a?.student?.name || '';
    const nameB = b?.student?.name || '';
    const nameComp = nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
    if (nameComp !== 0) return nameComp;

    return (a?.student?.id || '').localeCompare(b?.student?.id || '');
  });
}
