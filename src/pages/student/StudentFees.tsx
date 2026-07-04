import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { databaseService } from '../../firebase/service';
import { Fee, AcademyFeeRecord } from '../../types';
import PageWrapper from '../../components/ui/PageWrapper';
import GlassCard from '../../components/ui/GlassCard';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Skeleton from '../../components/ui/Skeleton';
import PageHeader from '../../components/ui/PageHeader';
import { DollarSign, HelpCircle, Check, Landmark, CreditCard } from 'lucide-react';
import { feeService, USE_FIREBASE_FEES, subscribeToStudentFees } from '../../services';

export const StudentFees: React.FC = () => {
  const { user } = useAuth();
  const [fees, setFees] = useState<Fee[]>([]);
  const [feeRecord, setFeeRecord] = useState<AcademyFeeRecord | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedFee, setSelectedFee] = useState<Fee | null>(null);

  // Form states
  const [payNotes, setPayNotes] = useState('');

  const loadStudentBilling = async () => {
    if (!user?.studentId) return;
    try {
      const data = await databaseService.getFees();
      setFees(data.filter(f => f.studentId === user.studentId));
    } catch (err) {
      console.error('Failed to load student billing ledger:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.studentId) return;

    if (!USE_FIREBASE_FEES) {
      loadStudentBilling();
      return;
    }

    setLoading(true);
    const unsub = subscribeToStudentFees(user.studentId, (record) => {
      setFeeRecord(record);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  // Calculations
  const displayTotalFee = USE_FIREBASE_FEES
    ? (feeRecord?.finalPayableAmount ?? 0)
    : fees.reduce((sum, f) => sum + (f.amount || 0), 0);

  const displayPaidAmount = USE_FIREBASE_FEES
    ? (feeRecord?.paidAmount ?? 0)
    : fees.filter(f => f.status === 'Paid').reduce((sum, f) => sum + (f.amount || 0), 0);

  const displayRemainingAmount = USE_FIREBASE_FEES
    ? (feeRecord?.remainingAmount ?? 0)
    : fees.filter(f => f.status !== 'Paid').reduce((sum, f) => sum + (f.amount || 0), 0);

  const displayStatus = USE_FIREBASE_FEES
    ? (feeRecord?.paymentStatus ?? 'Pending')
    : (displayRemainingAmount === 0 ? 'Paid' : 'Pending');

  const openPayModal = (fee: Fee) => {
    setSelectedFee(fee);
    setPayNotes('');
    setIsPayModalOpen(true);
  };

  const handleMockPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFee) return;
    setLoading(true);
    setIsPayModalOpen(false);

    try {
      const updatedFee: Fee = {
        ...selectedFee,
        status: 'Paid',
        paidDate: new Date().toISOString().split('T')[0],
        remarks: payNotes || 'Paid via Online Student Checkout'
      };

      await databaseService.saveFee(updatedFee);
      await loadStudentBilling();
    } catch (err) {
      console.error('Error conducting mock checkout:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageWrapper className="flex-1 flex flex-col gap-6">
      <PageHeader
        title="Fees"
        subtitle="View your tuition invoices, check payment status and settle outstanding dues."
        icon={CreditCard}
        iconColor="text-emerald-400"
        breadcrumbRoot="Student Portal"
        breadcrumbRootPath="/student"
      />
      {loading ? (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton variant="card" count={3} />
          </div>
          <Skeleton variant="rectangular" className="h-64 w-full" />
        </div>
      ) : (
        <>
          {/* Summary Matrix Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <GlassCard hoverable={false} className="bg-slate-950/40 p-5 border border-white/5 flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Total Tuition Fee</span>
              <span className="text-2xl font-display font-extrabold text-gold mt-2">${displayTotalFee} USD</span>
            </GlassCard>

            <GlassCard hoverable={false} className="bg-slate-950/40 p-5 border border-white/5 flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Total Paid Amount</span>
              <span className="text-2xl font-display font-extrabold text-emerald-400 mt-2">${displayPaidAmount} USD</span>
            </GlassCard>

            <GlassCard hoverable={false} className="bg-slate-950/40 p-5 border border-white/5 flex flex-col">
              <div className="flex justify-between items-start">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Remaining Balance</span>
                <Badge color={displayStatus === 'Paid' ? 'success' : displayStatus === 'Partially Paid' ? 'warning' : 'error'}>
                  {displayStatus}
                </Badge>
              </div>
              <span className="text-2xl font-display font-extrabold text-rose-500 mt-2">${displayRemainingAmount} USD</span>
            </GlassCard>
          </div>

          {/* Table list */}
          <GlassCard hoverable={false} className="bg-slate-950/40 border border-white/5 p-0 overflow-hidden flex-grow">
            {((USE_FIREBASE_FEES && (!feeRecord || !feeRecord.payments || feeRecord.payments.length === 0)) || (!USE_FIREBASE_FEES && fees.length === 0)) ? (
              <div className="flex flex-col items-center justify-center p-20 text-center text-slate-400">
                <DollarSign className="h-12 w-12 text-slate-600 mb-4" />
                <p className="text-base font-semibold text-slate-300">No transactions listed</p>
                <p className="text-xs text-slate-500 mt-1">There are no fee receipts registered yet for your profile</p>
              </div>
            ) : (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/2">
                      <th className="px-6 py-4 text-xs font-display font-bold uppercase tracking-wider text-slate-400">
                        {USE_FIREBASE_FEES ? 'Receipt ID' : 'Invoice ID'}
                      </th>
                      <th className="px-6 py-4 text-xs font-display font-bold uppercase tracking-wider text-slate-400">
                        {USE_FIREBASE_FEES ? 'Payment Date' : 'Due Date'}
                      </th>
                      <th className="px-6 py-4 text-xs font-display font-bold uppercase tracking-wider text-slate-400">
                        {USE_FIREBASE_FEES ? 'Amount Paid' : 'Billing Amount'}
                      </th>
                      {USE_FIREBASE_FEES ? (
                        <>
                          <th className="px-6 py-4 text-xs font-display font-bold uppercase tracking-wider text-slate-400">Received By</th>
                          <th className="px-6 py-4 text-xs font-display font-bold uppercase tracking-wider text-slate-400">Remarks</th>
                        </>
                      ) : (
                        <>
                          <th className="px-6 py-4 text-xs font-display font-bold uppercase tracking-wider text-slate-400">Paid Date</th>
                          <th className="px-6 py-4 text-xs font-display font-bold uppercase tracking-wider text-slate-400">Payment Status</th>
                          <th className="px-6 py-4 text-xs font-display font-bold uppercase tracking-wider text-slate-400 text-right">Payment Actions</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {USE_FIREBASE_FEES ? (
                      (feeRecord?.payments || []).map(p => (
                        <tr key={p.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                          <td className="px-6 py-4 font-mono text-xs text-gold uppercase tracking-wider">{p.id}</td>
                          <td className="px-6 py-4">
                            <span className="text-xs text-slate-400">{p.date}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-bold text-slate-300">${p.amount} USD</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs text-slate-400">{p.receivedBy || 'System Admin'}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs text-slate-500 italic">{p.remarks || 'Receipt verified'}</span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      fees.map(fee => (
                        <tr key={fee.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                          <td className="px-6 py-4 font-mono text-xs text-gold uppercase tracking-wider">{fee.invoiceNo}</td>
                          <td className="px-6 py-4">
                            <span className="text-xs text-slate-400">{fee.dueDate}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs text-slate-500">{fee.paidDate || '-'}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-bold text-slate-300">${fee.amount}</span>
                          </td>
                          <td className="px-6 py-4">
                            <Badge color={fee.status === 'Paid' ? 'success' : fee.status === 'Overdue' ? 'error' : 'warning'}>
                              {fee.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {fee.status !== 'Paid' ? (
                              <Button
                                variant="gold"
                                size="sm"
                                onClick={() => openPayModal(fee)}
                                leftIcon={<CreditCard className="h-3.5 w-3.5 mr-1" />}
                                className="text-[10px] font-semibold py-1 px-3 rounded-lg"
                              >
                                Checkout Dues
                              </Button>
                            ) : (
                              <span className="text-[10px] font-medium text-slate-500 italic">
                                {fee.remarks || 'Receipt verified'}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>

          {/* Pay Invoice modal */}
          {!USE_FIREBASE_FEES && selectedFee && (
            <Modal isOpen={isPayModalOpen} onClose={() => setIsPayModalOpen(false)} title="Checkout Tuition Dues">
              <form onSubmit={handleMockPayment} className="flex flex-col gap-5">
                <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-xs flex flex-col gap-2.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Billing Statement:</span>
                    <span className="font-mono text-gold uppercase font-bold">{selectedFee.invoiceNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Student Profile:</span>
                    <span className="text-slate-200 font-semibold">{selectedFee.studentName}</span>
                  </div>
                  <div className="flex justify-between border-t border-white/5 pt-2 mt-1">
                    <span className="text-slate-500 font-medium text-slate-400">Checkout Price:</span>
                    <span className="text-gold font-extrabold text-sm">${selectedFee.amount} USD</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-white/5 bg-white/2 flex flex-col gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Landmark className="h-3.5 w-3.5 text-gold" /> Academy Settlement Coordinates
                  </span>
                  <div className="text-[10px] text-slate-500 flex flex-col gap-1 mt-1 leading-relaxed">
                    <p>Bank Name: Silicon Heights National Bank (SHNB)</p>
                    <p>Account Name: SRI TECH ACADEMY PORTAL LTD</p>
                    <p>Account Number: 8192-0419-1049-8080</p>
                    <p>IFSC Code: SHNB0002026</p>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400 font-display">Payment Notes / Txn Hash (for verification)</label>
                  <input
                    type="text"
                    required
                    value={payNotes}
                    onChange={e => setPayNotes(e.target.value)}
                    placeholder="e.g. Card payment or Txn ID: TXN-8190412"
                    className="glass-input px-4 py-2.5 rounded-xl text-slate-100 placeholder-slate-600 text-xs w-full"
                  />
                </div>

                {/* Form Actions */}
                <div className="flex items-center justify-end gap-3 border-t border-white/5 pt-4 mt-2">
                  <Button type="button" variant="glass" size="sm" onClick={() => setIsPayModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="gold"
                    size="sm"
                    className="font-semibold"
                  >
                    Confirm Settlement
                  </Button>
                </div>
              </form>
            </Modal>
          )}
        </>
      )}
    </PageWrapper>
  );
};

export default StudentFees;
