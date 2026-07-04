import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { settingsService } from '../../services';
import PageWrapper from '../../components/ui/PageWrapper';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import PageHeader from '../../components/ui/PageHeader';
import StudentAvatar from '../../components/ui/StudentAvatar';
import { Settings, User, Building, IndianRupee, CheckCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const AdminSettings: React.FC = () => {
  const { user, updateProfile, updatePassword } = useAuth();

  // Toast / notification state
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // ────────────────────────────────────────────────────────────
  // SECTION 1: ACADEMY INFORMATION STATE
  // ────────────────────────────────────────────────────────────
  const [academyInfo, setAcademyInfo] = useState(() => settingsService.getAcademyInfo());

  // Real-time synchronization of settings from Firestore
  useEffect(() => {
    const unsub = settingsService.subscribe((data) => {
      setAcademyInfo(data.academyInfo);
      setCourseFees(data.courseFees);
    });
    return () => unsub();
  }, []);

  const handleSaveAcademyInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await settingsService.updateAcademyInfo(academyInfo);
      showToast('Academy Information updated successfully.');
    } catch (err) {
      console.error(err);
      showToast('Failed to update Academy Information.', 'error');
    }
  };

  // ────────────────────────────────────────────────────────────
  // SECTION 2: ADMINISTRATOR PROFILE STATE
  // ────────────────────────────────────────────────────────────
  const [adminName, setAdminName] = useState(user?.name || '');
  const [adminEmail, setAdminEmail] = useState(user?.email || '');
  const [adminPhone, setAdminPhone] = useState(user?.phone || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    try {
      // Validate password if entered
      if (newPassword) {
        if (!currentPassword) {
          showToast('Current password is required to update password.', 'error');
          setProfileLoading(false);
          return;
        }
        if (newPassword !== confirmPassword) {
          showToast('Passwords do not match.', 'error');
          setProfileLoading(false);
          return;
        }
        if (newPassword.length < 6) {
          showToast('Password must be at least 6 characters.', 'error');
          setProfileLoading(false);
          return;
        }
        await updatePassword(currentPassword, newPassword);
      }

      await updateProfile({
        name: adminName,
        email: adminEmail,
        phone: adminPhone
      });

      // Clear password fields on success
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      showToast('Administrator Profile saved successfully.');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to update administrator profile.', 'error');
    } finally {
      setProfileLoading(false);
    }
  };

  // ────────────────────────────────────────────────────────────
  // SECTION 3: COURSE FEE CONFIGURATION STATE
  // ────────────────────────────────────────────────────────────
  const [courseFees, setCourseFees] = useState(() => settingsService.getCourseFees());

  const handleSaveFees = async (e: React.FormEvent) => {
    e.preventDefault();
    for (const key in courseFees) {
      const val = courseFees[key as keyof typeof courseFees];
      if (isNaN(Number(val)) || Number(val) < 0) {
        showToast('Course fees must be valid non-negative numbers.', 'error');
        return;
      }
    }
    try {
      await settingsService.updateCourseFees(courseFees);
      showToast('Course fee configuration saved successfully.');
    } catch (err) {
      console.error(err);
      showToast('Failed to save fee configuration.', 'error');
    }
  };

  return (
    <PageWrapper className="flex-1 flex flex-col gap-6 max-w-4xl">
      <PageHeader
        title="Settings"
        subtitle="Manage your academy parameters, administrator credentials, and course prices."
        icon={Settings}
        iconColor="text-slate-400"
        breadcrumbRoot="Admin Portal"
        breadcrumbRootPath="/admin"
      />

      {/* Floating alert notifications */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`flex items-center gap-2 p-3.5 rounded-xl border text-xs font-medium z-50 ${
              notification.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-500/25 text-emerald-300'
                : 'bg-rose-950/40 border-rose-500/25 text-rose-300'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
            )}
            <span>{notification.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-8">
        
        {/* ────────────────────────────────────────────────────────────
            SECTION 1: ACADEMY INFORMATION
            ──────────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        >
          <GlassCard hoverable={false} className="bg-slate-950/45 p-6 border border-white/5">
            <h3 className="text-sm font-display font-extrabold text-white tracking-wider flex items-center gap-2.5 mb-6 border-b border-white/5 pb-4">
              <Building className="h-4.5 w-4.5 text-gold text-glow" /> ACADEMY INFORMATION
            </h3>

            <form onSubmit={handleSaveAcademyInfo} className="flex flex-col gap-5">
              
              {/* Grid Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 tracking-wider uppercase font-display">Academy Name</label>
                  <input
                    type="text"
                    required
                    value={academyInfo.name}
                    onChange={e => setAcademyInfo((prev: any) => ({ ...prev, name: e.target.value }))}
                    className="glass-input px-4 py-2.5 rounded-xl text-slate-100 text-xs w-full"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 tracking-wider uppercase font-display">Primary Contact Number</label>
                  <input
                    type="text"
                    required
                    value={academyInfo.primaryContact}
                    onChange={e => setAcademyInfo((prev: any) => ({ ...prev, primaryContact: e.target.value }))}
                    className="glass-input px-4 py-2.5 rounded-xl text-slate-100 text-xs w-full"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 tracking-wider uppercase font-display">Secondary Contact Number</label>
                  <input
                    type="text"
                    value={academyInfo.secondaryContact}
                    onChange={e => setAcademyInfo((prev: any) => ({ ...prev, secondaryContact: e.target.value }))}
                    className="glass-input px-4 py-2.5 rounded-xl text-slate-100 text-xs w-full"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 tracking-wider uppercase font-display">Email Address</label>
                  <input
                    type="email"
                    required
                    value={academyInfo.email}
                    onChange={e => setAcademyInfo((prev: any) => ({ ...prev, email: e.target.value }))}
                    className="glass-input px-4 py-2.5 rounded-xl text-slate-100 text-xs w-full"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 tracking-wider uppercase font-display">WhatsApp Number</label>
                  <input
                    type="text"
                    value={academyInfo.whatsapp}
                    onChange={e => setAcademyInfo((prev: any) => ({ ...prev, whatsapp: e.target.value }))}
                    className="glass-input px-4 py-2.5 rounded-xl text-slate-100 text-xs w-full"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 tracking-wider uppercase font-display">Academy Address</label>
                <textarea
                  rows={3}
                  required
                  value={academyInfo.address}
                  onChange={e => setAcademyInfo((prev: any) => ({ ...prev, address: e.target.value }))}
                  className="glass-input px-4 py-2.5 rounded-xl text-slate-100 text-xs w-full resize-none leading-relaxed"
                />
              </div>

              <Button
                type="submit"
                variant="gold"
                size="sm"
                className="font-bold self-start px-6 mt-2"
              >
                Save Academy Information
              </Button>
            </form>
          </GlassCard>
        </motion.div>

        {/* ────────────────────────────────────────────────────────────
            SECTION 2: ADMINISTRATOR PROFILE
            ──────────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1, ease: 'easeOut' }}
        >
          <GlassCard hoverable={false} className="bg-slate-950/45 p-6 border border-white/5">
            <h3 className="text-sm font-display font-extrabold text-white tracking-wider flex items-center gap-2.5 mb-6 border-b border-white/5 pb-4">
              <User className="h-4.5 w-4.5 text-gold text-glow" /> ADMINISTRATOR PROFILE
            </h3>

            <form onSubmit={handleSaveProfile} className="flex flex-col gap-5">
              
              {/* Profile Avatar Initials View */}
              <div className="flex items-center gap-5 p-4 rounded-2xl bg-white/3 border border-white/5">
                <StudentAvatar
                  name={adminName || 'Admin'}
                  size="xl"
                  variant="circle"
                />
                <div>
                  <p className="text-xs font-bold text-white">{adminName || 'Admin Director'}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Avatar generator handles display initials dynamically</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[9px] font-bold text-gold uppercase px-1.5 py-0.5 rounded bg-gold/10 border border-gold/20">
                      Role: Admin Director
                    </span>
                  </div>
                </div>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 tracking-wider uppercase font-display">Administrator Name</label>
                  <input
                    type="text"
                    required
                    value={adminName}
                    onChange={e => setAdminName(e.target.value)}
                    placeholder="e.g. Admin Director"
                    className="glass-input px-4 py-2.5 rounded-xl text-slate-100 text-xs w-full"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 tracking-wider uppercase font-display">Administrator Email</label>
                  <input
                    type="email"
                    required
                    value={adminEmail}
                    onChange={e => setAdminEmail(e.target.value)}
                    placeholder="e.g. admin@sritech.com"
                    className="glass-input px-4 py-2.5 rounded-xl text-slate-100 text-xs w-full"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 tracking-wider uppercase font-display">Administrator Phone Number</label>
                  <input
                    type="text"
                    value={adminPhone}
                    onChange={e => setAdminPhone(e.target.value)}
                    placeholder="e.g. 9952062229"
                    className="glass-input px-4 py-2.5 rounded-xl text-slate-100 text-xs w-full"
                  />
                </div>
              </div>

              {/* Password Fields */}
              <div className="border-t border-white/5 pt-4 mt-2">
                <p className="text-xs font-bold text-white font-display mb-3">Change Credentials Password</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 tracking-wider uppercase font-display">Current Password</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="glass-input px-4 py-2.5 rounded-xl text-slate-100 text-xs w-full"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 tracking-wider uppercase font-display">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="glass-input px-4 py-2.5 rounded-xl text-slate-100 text-xs w-full"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 tracking-wider uppercase font-display">Confirm New Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="glass-input px-4 py-2.5 rounded-xl text-slate-100 text-xs w-full"
                    />
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                variant="gold"
                size="sm"
                isLoading={profileLoading}
                className="font-bold self-start px-6 mt-2"
              >
                Save Profile
              </Button>
            </form>
          </GlassCard>
        </motion.div>

        {/* ────────────────────────────────────────────────────────────
            SECTION 3: COURSE FEE CONFIGURATION
            ──────────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.2, ease: 'easeOut' }}
        >
          <GlassCard hoverable={false} className="bg-slate-950/45 p-6 border border-white/5">
            <h3 className="text-sm font-display font-extrabold text-white tracking-wider flex items-center gap-2.5 mb-6 border-b border-white/5 pb-4">
              <IndianRupee className="h-4.5 w-4.5 text-gold text-glow" /> COURSE FEE CONFIGURATION
            </h3>

            <form onSubmit={handleSaveFees} className="flex flex-col gap-5">
              <p className="text-[10px] text-slate-400 leading-relaxed max-w-2xl">
                Configure global academy course fees. Changes made here will update the price calculations
                for all future student enrollment billing plans.
              </p>

              {/* Course inputs grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { id: 'c1', label: 'C Programming' },
                  { id: 'c2', label: 'C++ Programming' },
                  { id: 'c4', label: 'Java Course' },
                  { id: 'c3', label: 'Python Course' },
                  { id: 'c5', label: 'DMO (Diploma in Microsoft Office)' },
                  { id: 'c6', label: 'Tally Course' },
                  { id: 'c7', label: 'HTML CSS JS' }
                ].map(course => (
                  <div key={course.id} className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 tracking-wider uppercase font-display">{course.label}</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">₹</span>
                      <input
                        type="number"
                        min="0"
                        required
                        value={courseFees[course.id as keyof typeof courseFees] || ''}
                        onChange={e => setCourseFees({ ...courseFees, [course.id]: Number(e.target.value) })}
                        className="glass-input pl-7 pr-4 py-2.5 rounded-xl text-slate-100 text-xs w-full font-bold"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <Button
                type="submit"
                variant="gold"
                size="sm"
                className="font-bold self-start px-6 mt-2"
              >
                Save Fee Configuration
              </Button>
            </form>
          </GlassCard>
        </motion.div>

      </div>
    </PageWrapper>
  );
};

export default AdminSettings;
