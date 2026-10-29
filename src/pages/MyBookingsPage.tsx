import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CalendarClock, 
  MapPin, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  QrCode, 
  ArrowRight,
  Trash2,
  Send,
  FileText,
  ShieldCheck,
  ShieldAlert,
  ListOrdered,
  Scale,
  RotateCcw,
  AlertTriangle,
  ChevronRight,
  Layers,
  Sparkles,
  Compass
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { 
  getBookingsByBorrower, 
  getResourceById, 
  getResources,
  updateBookingStatus, 
  requestBookingExtension,
  checkAndUpdateOverdueBookings,
  checkFairnessLimits
} from '../data/store';
import { StatusBadge } from '../components/StatusBadge';
import { ConfirmModal } from '../components/ConfirmModal';
import { formatDateTime, handleImageError } from '../utils/formatters';
import type { Booking } from '../types';

export const MyBookingsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Run overdue scan periodically on page view
  React.useEffect(() => {
    checkAndUpdateOverdueBookings();
  }, []);

  const [activeTab, setActiveTab] = useState<'upcoming' | 'pending' | 'waitlist' | 'history'>('upcoming');
  const [cancelModalBooking, setCancelModalBooking] = useState<Booking | null>(null);
  const [extensionModalBooking, setExtensionModalBooking] = useState<Booking | null>(null);
  const [extensionHours, setExtensionHours] = useState<number>(2);
  const [extensionReason, setExtensionReason] = useState<string>('');
  const [extensionError, setExtensionError] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  if (!user) return null;

  const allBookings = getBookingsByBorrower(user.id);
  const quota = checkFairnessLimits(user.id, 0);
  const allResources = getResources();

  // Categorize bookings across all state machine phases
  const upcomingBookings = allBookings.filter(
    (b) => b.status === 'approved' || b.status === 'checked_in' || b.status === 'return_pending' || b.status === 'overdue' || b.status === 'incident_hold'
  );
  const pendingBookings = allBookings.filter(
    (b) => b.status === 'draft' || b.status === 'pending_approval' || b.status === 'pending'
  );
  const waitlistBookings = allBookings.filter((b) => b.status === 'waitlisted');
  const historyBookings = allBookings.filter(
    (b) => b.status === 'completed' || b.status === 'checked_out' || b.status === 'cancelled' || b.status === 'rejected'
  );

  const displayedBookings = {
    upcoming: upcomingBookings,
    pending: pendingBookings,
    waitlist: waitlistBookings,
    history: historyBookings,
  }[activeTab];

  const quotaPercent = Math.min(100, Math.round(((quota.hoursBookedThisWeek || 0) / (quota.maxHoursPerWeek || 30)) * 100));

  // Curated available recommendations
  const curatedResources = allResources
    .filter((r) => r.status === 'available')
    .slice(0, 3);

  const handleCancelConfirm = () => {
    if (!cancelModalBooking) return;
    const res = updateBookingStatus(cancelModalBooking.id, 'cancelled', user.id);
    if ('error' in res) {
      alert(res.error);
    } else {
      setActionSuccessMsg(`Booking #${cancelModalBooking.id} has been cancelled.`);
      setTimeout(() => setActionSuccessMsg(null), 4000);
    }
    setCancelModalBooking(null);
  };

  const handleSubmitDraft = (bookingId: string) => {
    const res = updateBookingStatus(bookingId, 'pending_approval', user.id);
    if ('error' in res) {
      alert(res.error);
    } else {
      setActionSuccessMsg('Draft reservation submitted for owner review.');
      setTimeout(() => setActionSuccessMsg(null), 4000);
    }
  };

  const handleExtensionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!extensionModalBooking) return;
    setExtensionError(null);

    const currentEnd = new Date(extensionModalBooking.end_time).getTime();
    const newEnd = new Date(currentEnd + extensionHours * 3600 * 1000).toISOString();

    const res = requestBookingExtension(
      extensionModalBooking.id,
      newEnd,
      user.id,
      extensionReason || `Requested +${extensionHours} hour extension for experiment completion`
    );

    if ('error' in res) {
      setExtensionError(res.error);
    } else {
      setActionSuccessMsg(`Extension request submitted! Lab staff will review shortly.`);
      setExtensionModalBooking(null);
      setExtensionReason('');
      setTimeout(() => setActionSuccessMsg(null), 5000);
    }
  };

  return (
    <div className="space-y-8 w-full max-w-full overflow-x-hidden pb-16">
      
      {/* ─── 01 / PERSONALIZED EDITORIAL HEADING ─── */}
      <section className="border-b border-[#DCD9CF] pb-6 pt-2">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#183D30] font-bold bg-[#183D30]/10 px-2.5 py-1 border border-[#183D30]/20">
              BORROWER PORTAL / 02
            </span>
            <span className="text-[11px] font-mono text-[#7E8276] uppercase tracking-wider">
              {user.department} // ID: {user.id.toUpperCase()}
            </span>
          </div>

          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-[#183D30] hover:bg-[#204e3e] text-[#D8FF3E] font-mono text-xs uppercase font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>NEW RESERVATION</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-display font-bold text-[#252722] tracking-tight leading-tight">
              Good morning, {user.full_name.split(' ')[0]}.
            </h1>
            <p className="mt-2 text-sm sm:text-base text-[#565950] font-sans leading-relaxed">
              Track active hardware loans, inspection timelines, and scheduled facility reservations.
            </p>
          </div>

          {/* Precision Quota Matrix */}
          <div className="grid grid-cols-3 sm:flex items-stretch gap-px bg-[#DCD9CF] border border-[#DCD9CF] shrink-0 font-mono w-full sm:w-auto">
            <div className="bg-[#FCFBF7] p-3 sm:px-4">
              <span className="text-[10px] uppercase text-[#7E8276] block">Weekly Usage</span>
              <span className="text-lg font-bold text-[#183D30] mt-0.5 block">
                {quota.hoursBookedThisWeek.toFixed(1)} / {quota.maxHoursPerWeek}H
              </span>
            </div>
            <div className="bg-[#FCFBF7] p-3 sm:px-4">
              <span className="text-[10px] uppercase text-[#7E8276] block">Active Slots</span>
              <span className="text-lg font-bold text-[#252722] mt-0.5 block">
                {quota.activeBookingCount} / {quota.maxActiveBookings}
              </span>
            </div>
            <div className="bg-[#FCFBF7] p-3 sm:px-4">
              <span className="text-[10px] uppercase text-[#7E8276] block">Quota Cap</span>
              <span className="text-lg font-bold text-[#252722] mt-0.5 block">
                {quotaPercent}%
              </span>
            </div>
          </div>
        </div>
      </section>

      {actionSuccessMsg && (
        <div className="p-3 bg-[#183D30] text-[#D8FF3E] font-mono text-xs flex items-center gap-2 border border-[#183D30]">
          <CheckCircle className="w-4 h-4 text-[#D8FF3E] shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* ─── 02 / UPCOMING-BOOKING TIMELINE CARDS ─── */}
      {upcomingBookings.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between border-b border-[#DCD9CF] pb-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#183D30] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#183D30]" />
              <span>TIMELINE: UPCOMING SESSIONS & DIGITAL HANDOVERS</span>
            </span>
            <span className="text-[11px] font-mono text-[#7E8276]">
              {upcomingBookings.length} RESERVATIONS IN PROGRESS
            </span>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {upcomingBookings.map((b) => {
              const res = getResourceById(b.resource_id);
              const isCheckedIn = b.status === 'checked_in';

              return (
                <div key={b.id} className="border border-[#183D30] bg-[#FCFBF7] p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-[#7E8276]">
                        SERIAL // LL-{res?.id.toUpperCase()}
                      </span>
                      <h3 className="text-base font-display font-bold text-[#252722] leading-snug">
                        {res?.name}
                      </h3>
                      <div className="flex items-center gap-2 text-xs font-mono text-[#565950] mt-1">
                        <MapPin className="w-3 h-3 text-[#7E8276]" />
                        <span>{res?.location_building}, Room {res?.location_room}</span>
                      </div>
                    </div>
                    <StatusBadge status={b.status} size="sm" />
                  </div>

                  {/* Horizontal Timeline Sequence */}
                  <div className="pt-2 border-t border-[#DCD9CF] space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[10px] font-mono text-[#7E8276] gap-1">
                      <span>SCHEDULE:</span>
                      <span className="text-[#183D30] font-bold">
                        {formatDateTime(b.start_time)} → {formatDateTime(b.end_time)}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-1 text-[9px] font-mono text-center">
                      <div className="p-1 bg-[#183D30] text-[#D8FF3E] font-bold">
                        1. SUBMITTED
                      </div>
                      <div className="p-1 bg-[#183D30] text-[#D8FF3E] font-bold">
                        2. APPROVED
                      </div>
                      <div className={`p-1 font-bold ${isCheckedIn ? 'bg-[#183D30] text-[#D8FF3E]' : 'bg-[#F3F0E8] text-[#7E8276] border border-[#DCD9CF]'}`}>
                        3. IN CUSTODY
                      </div>
                      <div className="p-1 bg-[#F3F0E8] text-[#7E8276] border border-[#DCD9CF]">
                        4. RETURN
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#DCD9CF] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <span className="text-[10px] font-mono text-[#7E8276]">
                      PURPOSE: {b.purpose}
                    </span>
                    {isCheckedIn ? (
                      <button
                        onClick={() => navigate(`/checkin?bookingId=${b.id}&mode=checkout`)}
                        className="px-3 py-1.5 bg-[#183D30] text-[#D8FF3E] font-mono text-xs uppercase font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>INITIATE RETURN</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => navigate(`/checkin?bookingId=${b.id}&mode=checkin`)}
                        className="px-3 py-1.5 bg-[#D8FF3E] text-[#183D30] font-mono text-xs uppercase font-bold flex items-center gap-1 border border-[#183D30] cursor-pointer"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>CHECK IN NOW</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ─── 03 / COMPACT BOOKING STATUS LIST ─── */}
      <section className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex bg-[#F3F0E8] p-1 border border-[#DCD9CF] gap-1 overflow-x-auto font-mono text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('upcoming')}
            className={`px-3.5 py-2 uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'upcoming' 
                ? 'bg-[#183D30] text-[#D8FF3E] font-bold' 
                : 'text-[#565950] hover:text-[#183D30]'
            }`}
          >
            <span>ACTIVE & IN-USE</span>
            <span className={`px-1.5 py-0.2 text-[10px] ${activeTab === 'upcoming' ? 'bg-[#D8FF3E]/20 text-[#D8FF3E]' : 'bg-[#DCD9CF] text-[#565950]'}`}>
              {upcomingBookings.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`px-3.5 py-2 uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'pending' 
                ? 'bg-[#183D30] text-[#D8FF3E] font-bold' 
                : 'text-[#565950] hover:text-[#183D30]'
            }`}
          >
            <span>DRAFTS & REVIEW</span>
            <span className={`px-1.5 py-0.2 text-[10px] ${activeTab === 'pending' ? 'bg-[#D8FF3E]/20 text-[#D8FF3E]' : 'bg-[#DCD9CF] text-[#565950]'}`}>
              {pendingBookings.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('waitlist')}
            className={`px-3.5 py-2 uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'waitlist' 
                ? 'bg-[#183D30] text-[#D8FF3E] font-bold' 
                : 'text-[#565950] hover:text-[#183D30]'
            }`}
          >
            <span>WAITLIST QUEUE</span>
            <span className={`px-1.5 py-0.2 text-[10px] ${activeTab === 'waitlist' ? 'bg-[#D8FF3E]/20 text-[#D8FF3E]' : 'bg-[#DCD9CF] text-[#565950]'}`}>
              {waitlistBookings.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-2 uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'history' 
                ? 'bg-[#183D30] text-[#D8FF3E] font-bold' 
                : 'text-[#565950] hover:text-[#183D30]'
            }`}
          >
            <span>ARCHIVE & LOG</span>
            <span className={`px-1.5 py-0.2 text-[10px] ${activeTab === 'history' ? 'bg-[#D8FF3E]/20 text-[#D8FF3E]' : 'bg-[#DCD9CF] text-[#565950]'}`}>
              {historyBookings.length}
            </span>
          </button>
        </div>

        {/* List Table / Cards */}
        {displayedBookings.length === 0 ? (
          <div className="border border-[#DCD9CF] bg-[#FCFBF7] p-10 text-center space-y-2">
            <span className="text-xs font-mono text-[#7E8276] uppercase block">
              NO RESERVATION RECORDS IN CURRENT CATEGORY
            </span>
            <button
              onClick={() => navigate('/dashboard')}
              className="mt-2 px-4 py-2 bg-[#183D30] text-[#D8FF3E] font-mono text-xs uppercase font-bold cursor-pointer"
            >
              BROWSE CATALOGUE
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedBookings.map((booking) => {
              const resource = getResourceById(booking.resource_id);

              return (
                <div
                  key={booking.id}
                  className="border border-[#DCD9CF] bg-[#FCFBF7] p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono text-xs hover:border-[#183D30] transition-colors"
                >
                  <div className="flex items-start gap-4 flex-1">
                    {/* Compact Image */}
                    <div className="w-16 h-16 bg-[#252722] overflow-hidden shrink-0 hidden sm:block border border-[#DCD9CF]">
                      {resource?.image_url && (
                        <img src={resource.image_url} alt={resource.name} onError={handleImageError} className="w-full h-full object-cover" />
                      )}
                    </div>

                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={booking.status} size="sm" />
                        <span className="text-[#7E8276] text-[10px]">ID: {booking.id.slice(0, 8)}</span>
                        {booking.priority_level && booking.priority_level !== 'normal' && (
                          <span className="px-1.5 py-0.2 bg-[#EAE5D8] text-[#854D0E] text-[9px] uppercase font-bold">
                            PRIORITY: {booking.priority_level}
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-display font-bold text-[#252722] leading-tight">
                        {resource?.name ?? 'Unknown Asset'}
                      </h3>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#565950]">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[#7E8276]" />
                          <span>{resource?.location_building}, Room {resource?.location_room}</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-[#183D30]">
                          <Clock className="w-3 h-3 text-[#7E8276]" />
                          <span>{formatDateTime(booking.start_time)} → {formatDateTime(booking.end_time)}</span>
                        </span>
                      </div>

                      <div className="text-[11px] font-sans text-[#7E8276] pt-1">
                        Purpose: {booking.purpose}
                      </div>
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="flex flex-wrap sm:flex-col gap-1.5 shrink-0 md:w-44">
                    {booking.status === 'draft' && (
                      <button
                        onClick={() => handleSubmitDraft(booking.id)}
                        className="w-full px-3 py-1.5 bg-[#183D30] text-[#D8FF3E] font-mono text-xs uppercase font-bold flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Send className="w-3 h-3" />
                        <span>SUBMIT DRAFT</span>
                      </button>
                    )}

                    {booking.status === 'approved' && (
                      <button
                        onClick={() => navigate(`/checkin?bookingId=${booking.id}&mode=checkin`)}
                        className="w-full px-3 py-1.5 bg-[#D8FF3E] text-[#183D30] font-mono text-xs uppercase font-bold flex items-center justify-center gap-1 border border-[#183D30] cursor-pointer"
                      >
                        <QrCode className="w-3 h-3" />
                        <span>CHECK IN</span>
                      </button>
                    )}

                    {booking.status === 'checked_in' && (
                      <>
                        <button
                          onClick={() => navigate(`/checkin?bookingId=${booking.id}&mode=checkout`)}
                          className="w-full px-3 py-1.5 bg-[#183D30] text-[#D8FF3E] font-mono text-xs uppercase font-bold flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <QrCode className="w-3 h-3" />
                          <span>INITIATE RETURN</span>
                        </button>
                        {booking.extension_status !== 'pending' && (
                          <button
                            onClick={() => {
                              setExtensionModalBooking(booking);
                              setExtensionHours(2);
                              setExtensionReason('');
                              setExtensionError(null);
                            }}
                            className="w-full px-3 py-1 bg-[#F3F0E8] hover:bg-[#DCD9CF] text-[#252722] font-mono text-[11px] uppercase border border-[#DCD9CF] cursor-pointer"
                          >
                            + EXTENSION
                          </button>
                        )}
                      </>
                    )}

                    {(booking.status === 'draft' ||
                      booking.status === 'pending' || 
                      booking.status === 'pending_approval' || 
                      booking.status === 'approved' || 
                      booking.status === 'waitlisted') && (
                      <button
                        onClick={() => setCancelModalBooking(booking)}
                        className="w-full px-3 py-1 bg-[#F3F0E8] hover:bg-[#EAE5D8] text-[#854D0E] font-mono text-[11px] uppercase border border-[#DCD9CF] cursor-pointer"
                      >
                        CANCEL
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ─── 04 / CURATED AVAILABLE RESOURCES ─── */}
      <section className="border-t border-[#DCD9CF] pt-8 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#183D30] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#183D30]" />
            <span>03 / CURATED SPECIMENS AVAILABLE FOR IMMEDIATE LOAN</span>
          </span>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-xs font-mono uppercase text-[#183D30] hover:underline"
          >
            VIEW ALL ({allResources.length}) →
          </button>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          {curatedResources.map((res) => (
            <div key={res.id} className="border border-[#DCD9CF] bg-[#FCFBF7] p-4 flex flex-col justify-between space-y-3">
              <div>
                <div className="relative h-28 bg-[#252722] overflow-hidden mb-2">
                  <img src={res.image_url} alt={res.name} onError={handleImageError} className="w-full h-full object-cover opacity-90" />
                  <div className="absolute top-2 right-2">
                    <StatusBadge status={res.status} size="sm" />
                  </div>
                </div>
                <h4 className="font-display font-bold text-sm text-[#252722] leading-snug line-clamp-1">
                  {res.name}
                </h4>
                <p className="text-[11px] font-mono text-[#7E8276] mt-0.5">
                  {res.location_building} • {res.walking_minutes}m walk
                </p>
              </div>

              <div className="pt-2 border-t border-[#DCD9CF] flex items-center justify-between">
                <span className="text-[10px] font-mono text-[#183D30] font-bold">
                  {res.cost_per_hour === 0 ? 'FREE / $0' : `$${res.cost_per_hour}/HR`}
                </span>
                <button
                  onClick={() => navigate(`/resources/${res.id}`)}
                  className="text-xs font-mono font-bold uppercase text-[#183D30] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>RESERVE</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Extension Request Modal */}
      {extensionModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#252722]/60 backdrop-blur-xs">
          <div className="bg-[#FCFBF7] border-2 border-[#183D30] max-w-md w-full p-6 space-y-4">
            <div className="flex items-start justify-between border-b border-[#DCD9CF] pb-3">
              <div>
                <h3 className="font-display font-bold text-base text-[#252722]">REQUEST TIME EXTENSION</h3>
                <p className="text-[11px] font-mono text-[#7E8276] mt-0.5">
                  Check availability and log extension to audit ledger
                </p>
              </div>
              <button
                onClick={() => setExtensionModalBooking(null)}
                className="text-[#7E8276] hover:text-[#252722] cursor-pointer"
              >
                ✕
              </button>
            </div>

            {extensionError && (
              <div className="p-2.5 bg-[#EAE5D8] border border-[#DCD9CF] text-xs font-mono text-[#854D0E] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{extensionError}</span>
              </div>
            )}

            <form onSubmit={handleExtensionSubmit} className="space-y-4 font-mono text-xs">
              <div>
                <label className="block uppercase text-[#7E8276] text-[10px] mb-1">
                  ADDITIONAL HOURS REQUIRED:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 4].map((hrs) => (
                    <button
                      key={hrs}
                      type="button"
                      onClick={() => setExtensionHours(hrs)}
                      className={`py-2 text-xs font-bold border cursor-pointer transition-colors ${
                        extensionHours === hrs
                          ? 'border-[#183D30] bg-[#183D30] text-[#D8FF3E]'
                          : 'border-[#DCD9CF] bg-[#F3F0E8] text-[#252722] hover:bg-[#DCD9CF]'
                      }`}
                    >
                      +{hrs} {hrs === 1 ? 'HOUR' : 'HOURS'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block uppercase text-[#7E8276] text-[10px] mb-1">
                  JUSTIFICATION RATIONALE:
                </label>
                <textarea
                  rows={3}
                  value={extensionReason}
                  onChange={(e) => setExtensionReason(e.target.value)}
                  required
                  placeholder="e.g. Synthesis reaction requires thermal logging through 16:30..."
                  className="w-full p-2.5 bg-[#F3F0E8] border border-[#DCD9CF] focus:outline-hidden focus:border-[#183D30] text-[#252722] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#DCD9CF]">
                <button
                  type="button"
                  onClick={() => setExtensionModalBooking(null)}
                  className="px-3 py-1.5 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722] cursor-pointer"
                >
                  DISMISS
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#183D30] text-[#D8FF3E] font-bold uppercase cursor-pointer"
                >
                  SUBMIT EXTENSION
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancellation Confirmation Dialog */}
      <ConfirmModal
        isOpen={Boolean(cancelModalBooking)}
        onClose={() => setCancelModalBooking(null)}
        onConfirm={handleCancelConfirm}
        title="Cancel Equipment Reservation"
        message="Are you sure you want to cancel this booking? The slot will immediately be released to waitlisted students or the campus equipment pool."
        confirmLabel="Yes, Cancel Booking"
        variant="danger"
      />
    </div>
  );
};
