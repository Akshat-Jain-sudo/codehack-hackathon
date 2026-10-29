import React, { useState } from 'react';
import { 
  Inbox, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Check, 
  X, 
  AlertCircle,
  ShieldCheck, 
  ShieldAlert,
  Award,
  BookOpen,
  Scale,
  ListOrdered
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { 
  getPendingBookingsForOwner, 
  getResourceById, 
  getUserById, 
  updateBookingStatus, 
  hasOverlappingBooking,
  verifyBookingTrainingEvidence,
  resolveBookingExtension
} from '../data/store';
import { StatusBadge } from '../components/StatusBadge';
import { formatDateTime } from '../utils/formatters';
import type { Booking } from '../types';

export const OwnerApprovalQueue: React.FC = () => {
  const { user } = useAuth();
  const [rejectingBooking, setRejectingBooking] = useState<Booking | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  if (!user) return null;

  const pendingBookings = getPendingBookingsForOwner(user.id);

  const handleApprove = (booking: Booking) => {
    setActionError(null);
    setActionSuccess(null);

    const res = updateBookingStatus(booking.id, 'approved', user.id, {
      approved_by: user.id,
    });

    if ('error' in res) {
      setActionError(res.error);
    } else {
      setActionSuccess(`Reservation #${booking.id.slice(0, 8)} successfully approved.`);
    }
  };

  const handleWaitlist = (booking: Booking) => {
    setActionError(null);
    setActionSuccess(null);

    const res = updateBookingStatus(booking.id, 'waitlisted', user.id);
    if ('error' in res) {
      setActionError(res.error);
    } else {
      setActionSuccess(`Reservation placed on transparent waitlist.`);
    }
  };

  const handleVerifyEvidence = (booking: Booking) => {
    setActionError(null);
    setActionSuccess(null);

    const res = verifyBookingTrainingEvidence(booking.id, true, user.id);
    if ('error' in res) {
      setActionError(res.error);
    } else {
      setActionSuccess(`Qualification evidence verified for borrower.`);
    }
  };

  const handleExtensionDecision = (booking: Booking, decision: 'approved' | 'rejected') => {
    setActionError(null);
    setActionSuccess(null);

    const res = resolveBookingExtension(booking.id, decision, user.id);
    if ('error' in res) {
      setActionError(res.error);
    } else {
      setActionSuccess(`Extension request ${decision} successfully.`);
    }
  };

  const handleRejectConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingBooking) return;

    setActionError(null);
    setActionSuccess(null);

    const res = updateBookingStatus(rejectingBooking.id, 'rejected', user.id, {
      rejection_reason: rejectionReason.trim() || 'Schedule conflict or prerequisites unmet.',
    });

    if ('error' in res) {
      setActionError(res.error);
    } else {
      setActionSuccess(`Booking request rejected and constructive feedback dispatched to borrower.`);
    }

    setRejectingBooking(null);
    setRejectionReason('');
  };

  const conflictCount = pendingBookings.filter((b) =>
    hasOverlappingBooking(b.resource_id, b.start_time, b.end_time, b.id)
  ).length;
  const priorityCount = pendingBookings.filter((b) => b.priority_level && b.priority_level !== 'normal').length;
  const extensionCount = pendingBookings.filter((b) => b.extension_status === 'pending').length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 font-mono text-xs">
      
      {/* ─── 01 / MASTHEAD ─── */}
      <section className="border-b border-[#DCD9CF] pb-6 pt-2">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#183D30] font-bold bg-[#183D30]/10 px-2.5 py-1 border border-[#183D30]/20">
              FACULTY TRIAGE / QUEUE 02
            </span>
            <span className="text-[11px] font-mono text-[#7E8276] uppercase tracking-wider">
              DEPARTMENT CUSTODY // {user.department}
            </span>
          </div>

          <div className="text-[11px] font-mono text-[#565950] uppercase tracking-wider">
            STATUS: <span className="font-bold text-[#183D30]">{pendingBookings.length} PENDING DECISION</span>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-[#252722] tracking-tight leading-tight">
              Booking Approval & Triage
            </h1>
            <p className="mt-2 text-sm text-[#565950] font-sans leading-relaxed max-w-xl">
              Review borrower qualifications, verify equipment safety training credentials, evaluate capstone project priorities, and approve physical lab access.
            </p>
          </div>

          {/* Operational Metrics Matrix Strip */}
          <div className="flex items-stretch gap-px bg-[#DCD9CF] border border-[#DCD9CF] shrink-0 font-mono">
            <div className="bg-[#FCFBF7] p-3 sm:px-4">
              <span className="text-[10px] uppercase text-[#7E8276] block">Pending</span>
              <span className="text-xl font-bold text-[#854D0E] mt-0.5 block">{pendingBookings.length}</span>
            </div>
            <div className="bg-[#FCFBF7] p-3 sm:px-4">
              <span className="text-[10px] uppercase text-[#7E8276] block">Collisions</span>
              <span className={`text-xl font-bold mt-0.5 block ${conflictCount > 0 ? 'text-[#E11D48]' : 'text-[#252722]'}`}>
                {conflictCount}
              </span>
            </div>
            <div className="bg-[#FCFBF7] p-3 sm:px-4">
              <span className="text-[10px] uppercase text-[#7E8276] block">Priority Tier</span>
              <span className="text-xl font-bold text-[#183D30] mt-0.5 block">{priorityCount}</span>
            </div>
            <div className="bg-[#FCFBF7] p-3 sm:px-4">
              <span className="text-[10px] uppercase text-[#7E8276] block">Extensions</span>
              <span className="text-xl font-bold text-[#252722] mt-0.5 block">{extensionCount}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Notifications */}
      {actionError && (
        <div className="p-3 bg-[#EAE5D8] border border-[#DCD9CF] text-[#854D0E] font-mono text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#854D0E] shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-[#854D0E] hover:underline cursor-pointer uppercase">
            DISMISS
          </button>
        </div>
      )}

      {actionSuccess && (
        <div className="p-3 bg-[#183D30] text-[#D8FF3E] font-mono text-xs flex items-center justify-between border border-[#183D30]">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-[#D8FF3E] shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-[#D8FF3E] hover:underline cursor-pointer uppercase">
            DISMISS
          </button>
        </div>
      )}

      {/* ─── 02 / QUEUE LIST ─── */}
      {pendingBookings.length === 0 ? (
        <div className="bg-[#FCFBF7] border border-[#DCD9CF] p-12 text-center">
          <div className="w-12 h-12 bg-[#183D30]/10 text-[#183D30] flex items-center justify-center mx-auto mb-3 border border-[#183D30]/20">
            <Check className="w-6 h-6" />
          </div>
          <h3 className="text-base font-display font-bold text-[#252722] uppercase tracking-wide">Queue is Clear</h3>
          <p className="text-xs font-sans text-[#565950] mt-1 max-w-sm mx-auto">
            No pending equipment reservation requests or extensions require your review at this time.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingBookings.map((booking) => {
            const resource = getResourceById(booking.resource_id);
            const borrower = getUserById(booking.borrower_id);

            const hasConflict = hasOverlappingBooking(
              booking.resource_id,
              booking.start_time,
              booking.end_time,
              booking.id
            );

            const isEvidenceVerified = Boolean(booking.training_evidence_verified || borrower?.training_completed);

            return (
              <div
                key={booking.id}
                className="bg-[#FCFBF7] border border-[#DCD9CF] p-6 space-y-5"
              >
                {/* Top: Requested Specimen & Badges */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#DCD9CF]">
                  <div>
                    <span className="text-[10px] font-mono text-[#7E8276] uppercase tracking-wider block">
                      REQUESTED ASSET // LL-{booking.resource_id.toUpperCase()}
                    </span>
                    <h3 className="text-base font-display font-bold text-[#252722] mt-0.5">
                      {resource?.name}
                    </h3>
                    <p className="text-[11px] font-mono text-[#565950]">
                      {resource?.location_building}, Room {resource?.location_room} • Zone: {resource?.campus_zone}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {booking.priority_level && (
                      <span className="px-2 py-0.5 bg-[#183D30] text-[#D8FF3E] text-[10px] font-mono font-bold uppercase flex items-center gap-1">
                        <Award className="w-3 h-3 text-[#D8FF3E]" />
                        <span>{booking.priority_level.replace(/_/g, ' ')}</span>
                      </span>
                    )}

                    {hasConflict && (
                      <span className="px-2 py-0.5 bg-[#EAE5D8] border border-[#DCD9CF] text-[#854D0E] text-[10px] font-mono font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-[#854D0E]" />
                        <span>COLLISION DETECTED</span>
                      </span>
                    )}
                    <StatusBadge status={booking.status} size="sm" />
                  </div>
                </div>

                {/* Middle: Borrower Profile & Qualifications */}
                <div className="grid md:grid-cols-2 gap-4 text-xs font-mono">
                  {/* Left Column: Requester info */}
                  <div className="p-4 bg-[#F3F0E8] border border-[#DCD9CF] space-y-2">
                    <span className="text-[10px] uppercase text-[#7E8276] block tracking-wider">
                      BORROWER CREDENTIAL & QUALIFICATION
                    </span>
                    <div className="flex items-center justify-between">
                      <strong className="text-[#252722] font-bold text-sm">{borrower?.full_name}</strong>
                      <span className="text-[#565950] font-mono text-[11px]">{borrower?.student_id}</span>
                    </div>
                    <p className="text-[11px] text-[#565950]">{borrower?.department} • {borrower?.email}</p>

                    {booking.project_course_context && (
                      <div className="pt-1 text-[#252722] flex items-center gap-1.5 text-[11px]">
                        <BookOpen className="w-3.5 h-3.5 text-[#183D30] shrink-0" />
                        <span>Course/Project: {booking.project_course_context}</span>
                      </div>
                    )}
                    
                    {/* Qualification Evidence Verification Box */}
                    <div className="pt-2 border-t border-[#DCD9CF]">
                      {isEvidenceVerified ? (
                        <div className="flex items-center gap-1.5 text-[#183D30] bg-[#183D30]/10 px-2.5 py-1.5 border border-[#183D30]/20 text-[11px] font-bold">
                          <ShieldCheck className="w-4 h-4 text-[#183D30] shrink-0" />
                          <span>SAFETY TRAINING VERIFIED</span>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2 bg-[#EAE5D8] text-[#854D0E] px-2.5 py-1.5 border border-[#DCD9CF] text-[11px]">
                            <div className="flex items-center gap-1.5">
                              <ShieldAlert className="w-4 h-4 text-[#854D0E] shrink-0" />
                              <span className="truncate">Evidence: {booking.training_evidence || 'Self-declared (unverified)'}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleVerifyEvidence(booking)}
                              className="px-2 py-0.5 bg-[#183D30] text-[#D8FF3E] font-bold text-[10px] uppercase cursor-pointer"
                            >
                              VERIFY STAFF
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Time slot and allocation */}
                  <div className="p-4 bg-[#F3F0E8] border border-[#DCD9CF] space-y-2">
                    <span className="text-[10px] uppercase text-[#7E8276] block tracking-wider">
                      ALLOCATION WINDOW & PURPOSE
                    </span>
                    <div className="text-[#252722] text-xs font-bold">
                      {formatDateTime(booking.start_time)} → {formatDateTime(booking.end_time)}
                    </div>

                    <div className="pt-1 text-[#565950]">
                      <span className="text-[#7E8276] uppercase text-[10px] block">Research Purpose:</span>
                      <p className="font-sans text-xs text-[#252722] mt-0.5 italic">
                        "{booking.purpose}"
                      </p>
                    </div>

                    {booking.allocation_explanation && (
                      <div className="pt-2 border-t border-[#DCD9CF] flex items-start gap-1.5 text-[11px] text-[#565950]">
                        <Scale className="w-3.5 h-3.5 text-[#183D30] shrink-0 mt-0.5" />
                        <span className="font-sans text-xs">{booking.allocation_explanation}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Extension review (if pending) */}
                {booking.extension_status === 'pending' && booking.extension_requested_end_time && (
                  <div className="p-3.5 bg-[#183D30]/10 border border-[#183D30]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#183D30] shrink-0" />
                      <span className="font-bold text-[#183D30] uppercase">
                        SESSION EXTENSION REQUESTED UNTIL {new Date(booking.extension_requested_end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleExtensionDecision(booking, 'rejected')}
                        className="px-3 py-1 bg-[#F3F0E8] hover:bg-[#EAE5D8] text-[#854D0E] border border-[#DCD9CF] uppercase font-bold text-[11px] cursor-pointer"
                      >
                        DECLINE
                      </button>
                      <button
                        onClick={() => handleExtensionDecision(booking, 'approved')}
                        className="px-3 py-1 bg-[#183D30] hover:bg-[#204e3e] text-[#D8FF3E] uppercase font-bold text-[11px] cursor-pointer"
                      >
                        APPROVE EXTENSION
                      </button>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="pt-3 border-t border-[#DCD9CF] flex flex-wrap items-center justify-end gap-2.5 font-mono">
                  <button
                    onClick={() => {
                      setRejectingBooking(booking);
                      setRejectionReason('');
                    }}
                    className="px-4 py-2 bg-[#F3F0E8] border border-[#DCD9CF] hover:bg-[#EAE5D8] text-[#854D0E] text-xs font-bold uppercase cursor-pointer"
                  >
                    DECLINE WITH REASON
                  </button>

                  {booking.status !== 'waitlisted' && (
                    <button
                      onClick={() => handleWaitlist(booking)}
                      className="px-4 py-2 bg-[#F3F0E8] border border-[#DCD9CF] hover:bg-[#DCD9CF] text-[#252722] text-xs font-bold uppercase cursor-pointer flex items-center gap-1.5"
                    >
                      <ListOrdered className="w-3.5 h-3.5" />
                      <span>PLACE ON WAITLIST</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleApprove(booking)}
                    disabled={hasConflict}
                    className={`px-5 py-2 text-xs font-bold uppercase flex items-center gap-1.5 cursor-pointer ${
                      hasConflict
                        ? 'bg-[#DCD9CF] text-[#7E8276] cursor-not-allowed'
                        : 'bg-[#183D30] hover:bg-[#204e3e] text-[#D8FF3E]'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    <span>APPROVE RESERVATION</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rejection Modal */}
      {rejectingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#252722]/70 backdrop-blur-xs font-mono text-xs">
          <div className="bg-[#FCFBF7] border border-[#DCD9CF] max-w-md w-full p-6 space-y-4">
            <div className="flex items-start justify-between border-b border-[#DCD9CF] pb-3">
              <div>
                <span className="text-[10px] text-[#7E8276] uppercase block">DECISION RATIONALE</span>
                <h3 className="font-display text-base font-bold text-[#252722]">Decline Reservation Request</h3>
              </div>
              <button
                onClick={() => setRejectingBooking(null)}
                className="text-[#565950] hover:text-[#252722] p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRejectConfirm} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase text-[#7E8276] mb-1 font-bold">
                  REASON FOR REJECTION <span className="text-[#854D0E]">*</span>
                </label>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  required
                  placeholder="e.g. Missing required safety module completion; please complete online lab module 2 before resubmitting..."
                  className="w-full px-3 py-2 text-xs bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722] focus:outline-hidden focus:border-[#183D30]"
                />
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {[
                    'Missing verified laboratory safety training certification',
                    'Requested slot conflicts with scheduled departmental lab hours',
                    'Please schedule a shorter session (<3h) during peak research hours'
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setRejectionReason(preset)}
                      className="text-[10px] px-2 py-1 bg-[#F3F0E8] border border-[#DCD9CF] hover:bg-[#DCD9CF] text-[#565950] cursor-pointer text-left uppercase"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#DCD9CF]">
                <button
                  type="button"
                  onClick={() => setRejectingBooking(null)}
                  className="px-4 py-2 bg-[#F3F0E8] border border-[#DCD9CF] hover:bg-[#DCD9CF] text-[#252722] uppercase font-bold cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#854D0E] hover:bg-[#6b3e0b] text-[#FCFBF7] uppercase font-bold cursor-pointer"
                >
                  CONFIRM REJECTION
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
