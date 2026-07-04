import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard, Search, IndianRupee, TrendingUp, Users,
  Clock, CheckCircle2, AlertCircle, Plus, Pencil, Trash2,
  History, X, ChevronDown, BarChart3, Wallet, Percent
} from 'lucide-react';
import { Student, AcademyFeeRecord, PaymentEntry, DiscountType } from '../../types';
import { studentService, feeService, feeCalculationService, USE_FIREBASE_FEES, subscribeToFees } from '../../services';
import { useAuth } from '../../context/AuthContext';
import PageWrapper from '../../components/ui/PageWrapper';
import PageHeader from '../../components/ui/PageHeader';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Skeleton from '../../components/ui/Skeleton';
import StudentAvatar from '../../components/ui/StudentAvatar';

// ─── Helpers ────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });

const todayISO = () => new Date().toISOString().split('T')[0];

const COURSE_DISPLAY: Record<string, { label: string; color: string }> = {
  c1: { label: 'C',           color: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
  c2: { label: 'C++',         color: 'bg-purple-500/15 text-purple-400 border-purple-500/20' },
  c3: { label: 'Python',      color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20' },
  c4: { label: 'Java',        color: 'bg-orange-500/15 text-orange-400 border-orange-500/20' },
  c5: { label: 'DMO',         color: 'bg-pink-500/15 text-pink-400 border-pink-500/20' },
  c6: { label: 'Tally',       color: 'bg-teal-500/15 text-teal-400 border-teal-500/20' },
  c7: { label: 'HTML CSS JS', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
};

function getStatusStyle(status: string) {
  switch (status) {
    case 'Paid':          return 'success';
    case 'Partially Paid': return 'warning';
    default:              return 'error';
  }
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  gradient: string;
  delay?: number;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, sub, icon, gradient, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
    className="glass-card rounded-2xl p-4 flex items-center gap-4 hover:border-white/10 transition-all duration-300 group"
  >
    <div className={`p-3 rounded-xl ${gradient} shrink-0 group-hover:scale-110 transition-transform duration-300`}>
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-[10px] font-display uppercase tracking-widest text-slate-500 mb-0.5">{label}</p>
      <p className="text-lg font-display font-extrabold text-white leading-none">{value}</p>
      {sub && <p className="text-[10px] text-slate-500 mt-0.5">{sub}</p>}
    </div>
  </motion.div>
);

// ─── Mini Bar Chart ──────────────────────────────────────────────────────────

interface MiniBarProps { paid: number; partial: number; pending: number; }
const MiniBar: React.FC<MiniBarProps> = ({ paid, partial, pending }) => {
  const total = paid + partial + pending || 1;
  const paidPct  = (paid    / total) * 100;
  const partPct  = (partial / total) * 100;
  const pendPct  = (pending / total) * 100;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-display font-bold text-slate-300 uppercase tracking-wider">Payment Distribution</p>
      {[
        { label: 'Paid',          count: paid,    pct: paidPct,  color: 'bg-emerald-500' },
        { label: 'Partially Paid',count: partial, pct: partPct,  color: 'bg-amber-500'   },
        { label: 'Pending',       count: pending, pct: pendPct,  color: 'bg-rose-500'    },
      ].map(({ label, count, pct, color }) => (
        <div key={label} className="flex items-center gap-3">
          <span className="text-[10px] text-slate-400 w-24 shrink-0">{label}</span>
          <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className={`h-full rounded-full ${color}`}
            />
          </div>
          <span className="text-[10px] font-semibold text-slate-300 w-4 text-right">{count}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Revenue Arc ─────────────────────────────────────────────────────────────

const RevenueArc: React.FC<{ pct: number; collected: number; total: number }> = ({ pct, collected, total }) => {
  const r = 42;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-xs font-display font-bold text-slate-300 uppercase tracking-wider">Collection Rate</p>
      <div className="relative w-28 h-28">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
          <motion.circle
            cx="50" cy="50" r={r}
            fill="none"
            stroke="url(#goldGrad)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ - dash }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          />
          <defs>
            <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="#D4AF37" />
              <stop offset="100%" stopColor="#F5E6C4" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-display font-extrabold text-gold">{pct}%</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-[10px] text-slate-500">Collected</p>
        <p className="text-sm font-bold text-white">{fmt(collected)}</p>
        <p className="text-[10px] text-slate-500 mt-1">of {fmt(total)} expected</p>
      </div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

interface FeeRow {
  student: Student;
  record: AcademyFeeRecord;
}

type ModalMode = 'payment' | 'discount' | 'history' | null;

export const AdminFees: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading]     = useState(true);
  const [rows, setRows]           = useState<FeeRow[]>([]);
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatus] = useState('All');
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [activeRow, setActiveRow] = useState<FeeRow | null>(null);

  // Payment modal state
  const [payAmount, setPayAmount]     = useState('');
  const [payRemarks, setPayRemarks]   = useState('');
  // Discount modal state
  const [discType, setDiscType]       = useState<DiscountType>('none');
  const [discValue, setDiscValue]     = useState('');

  // ── Load data ──────────────────────────────────────────────────────────────
  const loadData = async () => {
    setLoading(true);
    try {
      const students = await studentService.getAll();
      const feeRecords = await feeService.getAllAcademyFees();

      const feeMap = new Map<string, AcademyFeeRecord>();
      feeRecords.forEach(r => feeMap.set(r.studentId, r));

      // Auto-create fee records for any new students not yet tracked
      const newRows: FeeRow[] = [];
      for (const student of students) {
        let record = feeMap.get(student.id);
        if (!record) {
          record = await feeService.ensureAcademyFeeExists(
            student.id,
            student.courseIds || student.enrolledCourses || []
          );
        } else {
          // Sync bill amount if student's courses changed
          const expectedBill = feeCalculationService.calculateCourseFee(
            student.courseIds || student.enrolledCourses || []
          );
          if (record.totalBillAmount !== expectedBill) {
            record = await feeService.saveAcademyFee({
              ...record,
              totalBillAmount: expectedBill,
            });
          }
        }
        newRows.push({ student, record });
      }
      setRows(newRows);
    } catch (err) {
      console.error('Error loading fee data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!USE_FIREBASE_FEES) {
      loadData();
      return;
    }

    setLoading(true);
    let active = true;
    let unsubFees = () => {};

    const unsubStudents = studentService.onSnapshot ? studentService.onSnapshot(async (studentsList) => {
      try {
        unsubFees();
        unsubFees = subscribeToFees(async (feeRecords) => {
          const feeMap = new Map<string, AcademyFeeRecord>();
          feeRecords.forEach(r => feeMap.set(r.studentId, r));

          const newRows: FeeRow[] = [];
          for (const student of studentsList) {
            let record = feeMap.get(student.id);
            if (!record) {
              record = await feeService.ensureAcademyFeeExists(
                student.id,
                student.courseIds || student.enrolledCourses || []
              );
            } else {
              // Sync bill amount if student's courses changed
              const expectedBill = feeCalculationService.calculateCourseFee(
                student.courseIds || student.enrolledCourses || []
              );
              if (record.totalBillAmount !== expectedBill) {
                record = await feeService.saveAcademyFee({
                  ...record,
                  totalBillAmount: expectedBill,
                });
              }
            }
            newRows.push({ student, record });
          }

          if (active) {
            setRows(newRows);
            setLoading(false);
          }
        });
      } catch (err) {
        console.error('Error loading real-time fee data:', err);
        if (active) setLoading(false);
      }
    }) : () => {
      loadData();
    };

    return () => {
      active = false;
      unsubStudents();
      unsubFees();
    };
  }, []);

  // ── Filtered rows ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return rows.filter(({ student, record }) => {
      const q = search.toLowerCase();
      const matchSearch =
        student.name.toLowerCase().includes(q) ||
        (student.registerNumber || student.rollNo || '').toLowerCase().includes(q);
      const matchStatus =
        statusFilter === 'All' || record.paymentStatus === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [rows, search, statusFilter]);

  // ── Statistics ─────────────────────────────────────────────────────────────
  const stats = useMemo(() =>
    feeCalculationService.getRevenueStatistics(rows.map(r => r.record)),
    [rows]
  );

  // ── Modal open helpers ─────────────────────────────────────────────────────
  const openPayment = (row: FeeRow) => {
    setActiveRow(row);
    setPayAmount('');
    setPayRemarks('');
    setModalMode('payment');
  };

  const openDiscount = (row: FeeRow) => {
    setActiveRow(row);
    setDiscType(row.record.discountType);
    setDiscValue(row.record.discountValue > 0 ? String(row.record.discountValue) : '');
    setModalMode('discount');
  };

  const openHistory = (row: FeeRow) => {
    setActiveRow(row);
    setModalMode('history');
  };

  const closeModal = () => { setModalMode(null); setActiveRow(null); };

  // ── Save Payment ───────────────────────────────────────────────────────────
  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRow) return;
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) return;

    const adminName = user?.name || 'System Admin';

    const entry: PaymentEntry = {
      id: `pay_${Date.now()}`,
      amount,
      date: todayISO(),
      remarks: payRemarks || undefined,
      receivedBy: adminName,
    };

    const updated: AcademyFeeRecord = {
      ...activeRow.record,
      payments: [...activeRow.record.payments, entry],
    };

    setLoading(true);
    closeModal();
    try {
      await feeService.saveAcademyFee(updated);
      if (!USE_FIREBASE_FEES) {
        await loadData();
      }
    } catch (err) { console.error(err); setLoading(false); }
  };

  // ── Save Discount ──────────────────────────────────────────────────────────
  const handleSaveDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRow) return;

    const updated: AcademyFeeRecord = {
      ...activeRow.record,
      discountType:  discType,
      discountValue: parseFloat(discValue) || 0,
    };

    setLoading(true);
    closeModal();
    try {
      await feeService.saveAcademyFee(updated);
      if (!USE_FIREBASE_FEES) {
        await loadData();
      }
    } catch (err) { console.error(err); setLoading(false); }
  };

  // ── Remove Discount ────────────────────────────────────────────────────────
  const handleRemoveDiscount = async (row: FeeRow) => {
    const updated: AcademyFeeRecord = {
      ...row.record,
      discountType: 'none',
      discountValue: 0,
    };
    setLoading(true);
    try {
      await feeService.saveAcademyFee(updated);
      if (!USE_FIREBASE_FEES) {
        await loadData();
      }
    } catch (err) { console.error(err); setLoading(false); }
  };

  // ── Preview discount while typing ─────────────────────────────────────────
  const previewDiscount = useMemo(() => {
    if (!activeRow) return { discountedAmount: 0, finalPayable: activeRow?.record.totalBillAmount || 0 };
    const bill = activeRow.record.totalBillAmount;
    const discountedAmount = feeCalculationService.calculateDiscount(bill, discType, parseFloat(discValue) || 0);
    const finalPayable = feeCalculationService.calculateFinalAmount(bill, discountedAmount);
    return { discountedAmount, finalPayable };
  }, [activeRow, discType, discValue]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <PageWrapper className="flex-1 flex flex-col gap-5">
      <PageHeader
        title="Fee Management"
        subtitle="Manage student fees, track payments and monitor revenue for Sri Tech Academy."
        icon={CreditCard}
        iconColor="text-emerald-400"
        breadcrumbRoot="Admin Portal"
        breadcrumbRootPath="/admin"
      />

      {/* ── Statistics Cards ──────────────────────────────────────────────── */}
      {loading && rows.length === 0 ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="glass-card rounded-2xl p-4 h-20">
              <Skeleton variant="text" count={2} />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard delay={0}    label="Total Students"   value={String(stats.totalStudents)}         icon={<Users className="h-5 w-5 text-sky-400" />}     gradient="bg-sky-500/10"     />
          <StatCard delay={0.05} label="Expected Revenue" value={fmt(stats.totalExpectedRevenue)}     icon={<IndianRupee className="h-5 w-5 text-gold" />}   gradient="bg-gold/10"        />
          <StatCard delay={0.1}  label="Collected"        value={fmt(stats.totalCollected)}           icon={<CheckCircle2 className="h-5 w-5 text-emerald-400" />} gradient="bg-emerald-500/10" />
          <StatCard delay={0.15} label="Pending"          value={fmt(stats.totalPending)}             icon={<Clock className="h-5 w-5 text-amber-400" />}    gradient="bg-amber-500/10"   />
          <StatCard delay={0.2}  label="Collection Rate"  value={`${stats.collectionPercentage}%`}   icon={<TrendingUp className="h-5 w-5 text-purple-400" />} gradient="bg-purple-500/10" />
        </div>
      )}

      {/* ── Analytics Row ─────────────────────────────────────────────────── */}
      {rows.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <GlassCard hoverable={false} className="lg:col-span-2 bg-slate-950/40 border border-white/5 p-5">
            <MiniBar
              paid={stats.paidCount}
              partial={stats.partialCount}
              pending={stats.pendingCount}
            />
          </GlassCard>
          <GlassCard hoverable={false} className="bg-slate-950/40 border border-white/5 p-5 flex justify-center">
            <RevenueArc
              pct={stats.collectionPercentage}
              collected={stats.totalCollected}
              total={stats.totalExpectedRevenue}
            />
          </GlassCard>
        </div>
      )}

      {/* ── Filters ───────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            id="fee-search"
            type="text"
            placeholder="Search student or register no..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 rounded-xl border border-white/5 bg-slate-950/60 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-gold/50 text-sm transition-all w-64"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatus(e.target.value)}
          className="px-3 py-2 rounded-xl border border-white/5 bg-slate-950/60 text-slate-300 text-xs focus:outline-none focus:border-gold/50 cursor-pointer"
        >
          <option value="All">All Status</option>
          <option value="Paid">Paid</option>
          <option value="Partially Paid">Partially Paid</option>
          <option value="Pending">Pending</option>
        </select>
        <span className="ml-auto text-[10px] text-slate-500 font-display uppercase tracking-wider">
          {filtered.length} of {rows.length} students
        </span>
      </div>

      {/* ── Main Table ────────────────────────────────────────────────────── */}
      <GlassCard hoverable={false} className="bg-slate-950/40 border border-white/5 p-0 overflow-hidden flex-1">
        {loading && rows.length === 0 ? (
          <div className="p-6"><Skeleton variant="text" count={8} /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 text-center text-slate-400">
            <IndianRupee className="h-12 w-12 text-slate-600 mb-4" />
            <p className="text-base font-semibold text-slate-300">No fee records found</p>
            <p className="text-xs text-slate-500 mt-1">Try adjusting the search or filter</p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse" style={{ minWidth: '1100px' }}>
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  {['Student', 'Register No', 'Courses', 'Total Bill', 'Discount', 'Final Payable', 'Paid', 'Remaining', 'Status', 'Actions'].map(col => (
                    <th key={col} className="px-4 py-3.5 text-[10px] font-display font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filtered.map(({ student, record }, idx) => {
                    const courseIds = student.courseIds || student.enrolledCourses || [];
                    return (
                      <motion.tr
                        key={student.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25, delay: idx * 0.03 }}
                        className="border-b border-white/[0.04] hover:bg-white/[0.025] transition-colors group"
                      >
                        {/* Student */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <StudentAvatar
                              name={student.name}
                              size="sm"
                              variant="circle"
                              status={student.status}
                            />
                            <div>
                              <p className="text-sm font-semibold text-white whitespace-nowrap">{student.name}</p>
                              <p className="text-[10px] text-slate-500">{student.status}</p>
                            </div>
                          </div>
                        </td>

                        {/* Register No */}
                        <td className="px-4 py-3">
                          <span className="font-mono text-[10px] text-gold uppercase tracking-wider">
                            {student.registerNumber || student.rollNo || '—'}
                          </span>
                        </td>

                        {/* Courses */}
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {courseIds.slice(0, 3).map(cid => {
                              const c = COURSE_DISPLAY[cid];
                              return c ? (
                                <span key={cid} className={`text-[10px] font-display font-semibold px-2 py-0.5 rounded-full border ${c.color}`}>
                                  {c.label}
                                </span>
                              ) : null;
                            })}
                            {courseIds.length > 3 && (
                              <span className="text-[10px] text-slate-500">+{courseIds.length - 3}</span>
                            )}
                          </div>
                        </td>

                        {/* Total Bill */}
                        <td className="px-4 py-3">
                          <span className="text-sm font-bold text-slate-200">{fmt(record.totalBillAmount)}</span>
                        </td>

                        {/* Discount */}
                        <td className="px-4 py-3">
                          {record.discountType !== 'none' && record.discountedAmount > 0 ? (
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-semibold text-emerald-400">{fmt(record.discountedAmount)}</span>
                              <span className="text-[10px] text-slate-600">
                                ({record.discountType === 'percentage' ? `${record.discountValue}%` : '₹ fixed'})
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-600 italic">—</span>
                          )}
                        </td>

                        {/* Final Payable */}
                        <td className="px-4 py-3">
                          <span className="text-sm font-extrabold text-gold">{fmt(record.finalPayableAmount)}</span>
                        </td>

                        {/* Paid */}
                        <td className="px-4 py-3">
                          <span className="text-sm font-semibold text-emerald-400">{fmt(record.paidAmount)}</span>
                        </td>

                        {/* Remaining */}
                        <td className="px-4 py-3">
                          <span className={`text-sm font-semibold ${record.remainingAmount > 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                            {fmt(record.remainingAmount)}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <Badge color={getStatusStyle(record.paymentStatus)}>
                            {record.paymentStatus}
                          </Badge>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
                            {record.remainingAmount > 0 && (
                              <button
                                id={`btn-pay-${student.id}`}
                                title="Record Payment"
                                onClick={() => openPayment({ student, record })}
                                className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/40 transition-all active:scale-95"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button
                              id={`btn-disc-${student.id}`}
                              title="Manage Discount"
                              onClick={() => openDiscount({ student, record })}
                              className="p-1.5 rounded-lg text-gold hover:bg-gold/10 border border-gold/20 hover:border-gold/40 transition-all active:scale-95"
                            >
                              <Percent className="h-3.5 w-3.5" />
                            </button>
                            <button
                              id={`btn-hist-${student.id}`}
                              title="Payment History"
                              onClick={() => openHistory({ student, record })}
                              className="p-1.5 rounded-lg text-sky-400 hover:bg-sky-500/10 border border-sky-500/20 hover:border-sky-500/40 transition-all active:scale-95"
                            >
                              <History className="h-3.5 w-3.5" />
                            </button>
                            {record.discountType !== 'none' && (
                              <button
                                id={`btn-remdisc-${student.id}`}
                                title="Remove Discount"
                                onClick={() => handleRemoveDiscount({ student, record })}
                                className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 hover:border-rose-500/40 transition-all active:scale-95"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* ════════════════════════════════════════════════════════════════════
          PAYMENT MODAL
      ════════════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={modalMode === 'payment'}
        onClose={closeModal}
        title="Record Payment"
        size="md"
      >
        {activeRow && (
          <form onSubmit={handleSavePayment} className="flex flex-col gap-5">
            {/* Student summary */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
              <StudentAvatar
                name={activeRow.student.name}
                size="sm"
                variant="circle"
                status={activeRow.student.status}
              />
              <div>
                <p className="text-sm font-bold text-white">{activeRow.student.name}</p>
                <p className="text-[10px] text-slate-500">{activeRow.student.registerNumber || activeRow.student.rollNo}</p>
              </div>
            </div>

            {/* Courses */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-display font-bold uppercase tracking-widest text-slate-500">Enrolled Courses</label>
              <div className="flex flex-wrap gap-2">
                {(activeRow.student.courseIds || activeRow.student.enrolledCourses || []).map(cid => {
                  const c = COURSE_DISPLAY[cid];
                  return c ? (
                    <span key={cid} className={`text-[10px] font-display font-semibold px-2 py-0.5 rounded-full border ${c.color}`}>{c.label}</span>
                  ) : null;
                })}
              </div>
            </div>

            {/* Fee Summary */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Original Fee',    value: fmt(activeRow.record.totalBillAmount),    dim: false },
                { label: 'Discount',        value: activeRow.record.discountedAmount > 0 ? `-${fmt(activeRow.record.discountedAmount)}` : '—', dim: true  },
                { label: 'Final Payable',   value: fmt(activeRow.record.finalPayableAmount),  dim: false },
                { label: 'Already Paid',    value: fmt(activeRow.record.paidAmount),           dim: true  },
                { label: 'Remaining',       value: fmt(activeRow.record.remainingAmount),       dim: false },
              ].map(({ label, value, dim }) => (
                <div key={label} className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                  <p className="text-[9px] text-slate-500 font-display uppercase tracking-widest">{label}</p>
                  <p className={`text-sm font-bold mt-0.5 ${dim ? 'text-slate-400' : 'text-gold'}`}>{value}</p>
                </div>
              ))}
            </div>

            {/* Amount */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400 font-display">Payment Amount (₹)</label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  id="pay-amount-input"
                  type="number"
                  required
                  min={1}
                  max={activeRow.record.remainingAmount}
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                  placeholder={`Max: ${fmt(activeRow.record.remainingAmount)}`}
                  className="glass-input pl-10 pr-4 py-2.5 rounded-xl text-slate-100 placeholder-slate-600 text-sm w-full"
                />
              </div>
            </div>

            {/* Remarks */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400 font-display">Remarks (optional)</label>
              <input
                id="pay-remarks-input"
                type="text"
                value={payRemarks}
                onChange={e => setPayRemarks(e.target.value)}
                placeholder="e.g. UPI / Cash / Bank Transfer"
                className="glass-input px-4 py-2.5 rounded-xl text-slate-100 placeholder-slate-600 text-sm w-full"
              />
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-white/5 pt-4">
              <Button type="button" variant="glass" size="sm" onClick={closeModal}>Cancel</Button>
              <Button type="submit" variant="gold" size="sm" className="font-semibold"
                leftIcon={<Wallet className="h-4 w-4 mr-1.5" />}>
                Save Payment
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ════════════════════════════════════════════════════════════════════
          DISCOUNT MODAL
      ════════════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={modalMode === 'discount'}
        onClose={closeModal}
        title="Manage Discount"
        size="sm"
      >
        {activeRow && (
          <form onSubmit={handleSaveDiscount} className="flex flex-col gap-5">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
              <IndianRupee className="h-5 w-5 text-gold shrink-0" />
              <div>
                <p className="text-sm font-bold text-white">{activeRow.student.name}</p>
                <p className="text-[10px] text-slate-500">Original Fee: {fmt(activeRow.record.totalBillAmount)}</p>
              </div>
            </div>

            {/* Discount Type */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400 font-display">Discount Type</label>
              <div className="grid grid-cols-3 gap-2">
                {(['none', 'fixed', 'percentage'] as DiscountType[]).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setDiscType(t); if (t === 'none') setDiscValue(''); }}
                    className={`py-2 rounded-xl text-xs font-display font-semibold border transition-all ${
                      discType === t
                        ? 'bg-gold/15 border-gold/40 text-gold'
                        : 'bg-white/5 border-white/5 text-slate-400 hover:border-white/10'
                    }`}
                  >
                    {t === 'none' ? 'No Discount' : t === 'fixed' ? '₹ Fixed' : '% Percent'}
                  </button>
                ))}
              </div>
            </div>

            {/* Discount Value */}
            {discType !== 'none' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400 font-display">
                  {discType === 'fixed' ? 'Discount Amount (₹)' : 'Discount Percentage (%)'}
                </label>
                <div className="relative">
                  {discType === 'fixed'
                    ? <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    : <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  }
                  <input
                    id="disc-value-input"
                    type="number"
                    required
                    min={0}
                    max={discType === 'percentage' ? 100 : activeRow.record.totalBillAmount}
                    value={discValue}
                    onChange={e => setDiscValue(e.target.value)}
                    placeholder={discType === 'fixed' ? 'e.g. 500' : 'e.g. 10'}
                    className="glass-input pl-10 pr-4 py-2.5 rounded-xl text-slate-100 placeholder-slate-600 text-sm w-full"
                  />
                </div>
              </div>
            )}

            {/* Live Preview */}
            {discType !== 'none' && discValue && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="grid grid-cols-3 gap-2"
              >
                {[
                  { label: 'Original',    value: fmt(activeRow.record.totalBillAmount)   },
                  { label: 'Discount',    value: `-${fmt(previewDiscount.discountedAmount)}` },
                  { label: 'Final',       value: fmt(previewDiscount.finalPayable)        },
                ].map(({ label, value }) => (
                  <div key={label} className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-center">
                    <p className="text-[9px] text-slate-500 font-display uppercase tracking-widest">{label}</p>
                    <p className="text-sm font-bold text-gold mt-0.5">{value}</p>
                  </div>
                ))}
              </motion.div>
            )}

            <div className="flex items-center justify-end gap-3 border-t border-white/5 pt-4">
              <Button type="button" variant="glass" size="sm" onClick={closeModal}>Cancel</Button>
              <Button type="submit" variant="gold" size="sm" className="font-semibold"
                leftIcon={<Pencil className="h-4 w-4 mr-1.5" />}>
                Apply Discount
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ════════════════════════════════════════════════════════════════════
          PAYMENT HISTORY MODAL
      ════════════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={modalMode === 'history'}
        onClose={closeModal}
        title="Payment History"
        size="md"
      >
        {activeRow && (
          <div className="flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
              <div className="flex items-center gap-3">
                <StudentAvatar
                  name={activeRow.student.name}
                  size="sm"
                  variant="circle"
                  status={activeRow.student.status}
                />
                <div>
                  <p className="text-sm font-bold text-white">{activeRow.student.name}</p>
                  <Badge color={getStatusStyle(activeRow.record.paymentStatus)} className="mt-0.5">
                    {activeRow.record.paymentStatus}
                  </Badge>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-500">Remaining</p>
                <p className="text-base font-extrabold text-rose-400">{fmt(activeRow.record.remainingAmount)}</p>
              </div>
            </div>

            {/* Summary row */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Final Payable', value: fmt(activeRow.record.finalPayableAmount), color: 'text-gold' },
                { label: 'Total Paid',    value: fmt(activeRow.record.paidAmount),          color: 'text-emerald-400' },
                { label: 'Remaining',     value: fmt(activeRow.record.remainingAmount),      color: 'text-rose-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-center">
                  <p className="text-[9px] text-slate-500 font-display uppercase tracking-widest">{label}</p>
                  <p className={`text-sm font-bold ${color} mt-0.5`}>{value}</p>
                </div>
              ))}
            </div>

            {/* Payment list */}
            <div className="flex flex-col gap-2 max-h-64 overflow-y-auto custom-scrollbar">
              {activeRow.record.payments.length === 0 ? (
                <div className="text-center py-8">
                  <History className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">No payments recorded yet</p>
                </div>
              ) : (
                [...activeRow.record.payments].reverse().map((p, i) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-white">{p.remarks || 'Payment recorded'}</p>
                        <p className="text-[10px] text-slate-500">{p.date}</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-emerald-400">{fmt(p.amount)}</span>
                  </div>
                ))
              )}
            </div>

            {/* Discount info */}
            {activeRow.record.discountType !== 'none' && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-gold/5 border border-gold/15">
                <div className="flex items-center gap-2">
                  <Percent className="h-4 w-4 text-gold" />
                  <span className="text-xs text-slate-300">
                    {activeRow.record.discountType === 'percentage'
                      ? `${activeRow.record.discountValue}% discount applied`
                      : `₹ Fixed discount applied`}
                  </span>
                </div>
                <span className="text-sm font-bold text-gold">-{fmt(activeRow.record.discountedAmount)}</span>
              </div>
            )}

            <div className="flex justify-end border-t border-white/5 pt-3">
              <Button variant="glass" size="sm" onClick={closeModal}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </PageWrapper>
  );
};

export default AdminFees;
