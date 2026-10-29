import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  MapPin, 
  ShieldCheck, 
  Camera, 
  FileCheck2, 
  RotateCcw, 
  X, 
  FileDiff, 
  AlertCircle, 
  Edit3, 
  Info,
  Shield,
  Layers,
  Check
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { 
  getBookingsByBorrower, 
  getBookings,
  getResourceById, 
  getUserById,
  updateBookingStatus, 
  createConditionReport, 
  updateResourceStatus,
  validateEvidenceFile,
  compareHandoverReports,
  correctConditionReport,
  getHandoverTimeline,
  getReportsForBooking
} from '../data/store';
import { StatusBadge } from '../components/StatusBadge';
import { formatDateTime } from '../utils/formatters';
import type { 
  Booking, 
  ConditionRating, 
  EvidenceFile, 
  ConditionReport,
  HandoverTimelineEvent 
} from '../types';

export const CheckInOutPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const queryBookingId = searchParams.get('bookingId');
  const queryMode = searchParams.get('mode') as 'checkin' | 'checkout' | 'verify' | 'timeline' | null;

  const [selectedBookingId, setSelectedBookingId] = useState<string>(queryBookingId || '');
  const [mode, setMode] = useState<'checkin' | 'checkout' | 'verify' | 'timeline'>(queryMode || 'checkin');
  
  // Checklist & Condition items
  const [check1, setCheck1] = useState(true);
  const [check2, setCheck2] = useState(true);
  const [check3, setCheck3] = useState(true);
  const [conditionConfirmed, setConditionConfirmed] = useState(false);
  const [condition, setCondition] = useState<ConditionRating>('good');
  const [notes, setNotes] = useState('All standard accessories inspected and accounted for.');
  
  // Photo evidence files
  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceFile[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);

  // Accessories Checklist
  const [accessoryChecklist, setAccessoryChecklist] = useState<{ name: string; returned: boolean }[]>([]);

  // Correction Modal State
  const [correctingReport, setCorrectingReport] = useState<ConditionReport | null>(null);
  const [correctionCondition, setCorrectionCondition] = useState<ConditionRating>('good');
  const [correctionNotes, setCorrectionNotes] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');

  // Alerts
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!user) return null;

  const isOwnerOrStaff = user.role === 'owner' || user.role === 'manager' || user.role === 'admin';

  // Gather bookings
  const myBorrowerBookings: Booking[] = getBookingsByBorrower(user.id);
  const allSystemBookings: Booking[] = isOwnerOrStaff ? getBookings() : [];

  // Filter based on mode
  const checkinEligible = myBorrowerBookings.filter((b: Booking) => b.status === 'approved');
  const returnEligible = myBorrowerBookings.filter((b: Booking) => b.status === 'checked_in' || b.status === 'overdue');
  const pendingVerificationBookings = isOwnerOrStaff 
    ? allSystemBookings.filter((b: Booking) => b.status === 'return_pending' || b.status === 'incident_review' || b.status === 'incident_hold')
    : [];

  useEffect(() => {
    if (queryBookingId) {
      setSelectedBookingId(queryBookingId);
    } else {
      if (mode === 'checkin' && checkinEligible.length > 0 && !selectedBookingId) {
        setSelectedBookingId(checkinEligible[0].id);
      } else if (mode === 'checkout' && returnEligible.length > 0 && !selectedBookingId) {
        setSelectedBookingId(returnEligible[0].id);
      } else if (mode === 'verify' && pendingVerificationBookings.length > 0 && !selectedBookingId) {
        setSelectedBookingId(pendingVerificationBookings[0].id);
      }
    }
  }, [queryBookingId, mode, checkinEligible.length, returnEligible.length, pendingVerificationBookings.length]);

  const activeBooking = (isOwnerOrStaff ? allSystemBookings : myBorrowerBookings).find(
    (b: Booking) => b.id === selectedBookingId
  );
  const activeResource = activeBooking ? getResourceById(activeBooking.resource_id) : undefined;

  // Initialize accessories based on active resource
  useEffect(() => {
    if (activeResource) {
      let defaultAccessories: string[] = ['Main Power Supply & Cable', 'Standard Accessories Kit', 'User Documentation & Checklist'];
      if (activeResource.name.toLowerCase().includes('oscilloscope')) {
        defaultAccessories = ['100MHz Passive Probes (x4)', 'AC Power Cord', 'BNC-to-Alligator Lead', 'Front Protective Bezel Cover'];
      } else if (activeResource.name.toLowerCase().includes('printer')) {
        defaultAccessories = ['Tool Kit & Spatula', 'PEI Magnetic Flex Plate', 'USB Transfer Drive', 'Filament Guide Tube'];
      } else if (activeResource.name.toLowerCase().includes('soldering')) {
        defaultAccessories = ['Soldering Handpiece', 'Brass Cleaning Sponge & Stand', 'ESD Grounding Cord', 'Fume Extraction Nozzle'];
      }
      setAccessoryChecklist(defaultAccessories.map((name) => ({ name, returned: true })));
    }
  }, [activeResource?.id]);

  // Handle local file uploads with validation
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    if (!e.target.files) return;

    const files = Array.from(e.target.files);
    for (const file of files) {
      const validation = validateEvidenceFile({
        name: file.name,
        size: file.size,
        type: file.type,
      });

      if (!validation.valid) {
        setFileError(validation.error || 'Invalid file.');
        return;
      }

      // Convert to simulated data URL for offline demonstration
      const reader = new FileReader();
      reader.onload = (event) => {
        const newEvidenceFile: EvidenceFile = {
          id: `ev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: file.name,
          size: file.size,
          type: file.type,
          data_url: event.target?.result as string,
          uploaded_at: new Date().toISOString(),
        };
        setEvidenceFiles((prev) => [...prev, newEvidenceFile]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveFile = (fileId: string) => {
    setEvidenceFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  // Check-In Window Invariant: Valid within 2 hours before session start until session end
  const isCheckinWindowValid = (booking: Booking): { valid: boolean; reason?: string } => {
    const now = new Date().getTime();
    const startTime = new Date(booking.start_time).getTime();
    const endTime = new Date(booking.end_time).getTime();
    const twoHoursBefore = startTime - 2 * 60 * 60 * 1000;

    if (now < twoHoursBefore) {
      const minutesUntil = Math.ceil((twoHoursBefore - now) / (60 * 1000));
      return {
        valid: false,
        reason: `Check-in window opens 2 hours prior to scheduled start. Available in ${minutesUntil} minutes (${formatDateTime(new Date(twoHoursBefore).toISOString())}).`,
      };
    }

    if (now > endTime) {
      return {
        valid: false,
        reason: 'The scheduled booking window has already expired. Contact lab administrator.',
      };
    }

    return { valid: true };
  };

  // Fetch reports for comparison
  const bookingReports: ConditionReport[] = activeBooking ? getReportsForBooking(activeBooking.id) : [];
  const initialReport = bookingReports.find((r) => r.type === 'check_in');
  const returnReport = bookingReports.find((r) => r.type === 'check_out' || r.type === 'incident');

  // Compare Reports
  const comparison = compareHandoverReports(initialReport?.id, returnReport?.id);

  // Timeline events
  const timelineEvents: HandoverTimelineEvent[] = activeBooking ? getHandoverTimeline(activeBooking.id) : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!activeBooking || !activeResource) {
      setErrorMsg('Please select an active equipment reservation.');
      return;
    }

    if (!check1 || !check2 || !check3) {
      setErrorMsg('All physical verification checklist items must be confirmed.');
      return;
    }

    if (!conditionConfirmed) {
      setErrorMsg('Report confirmation required: Please confirm that the condition assessment accurately reflects physical inspection.');
      return;
    }

    if (mode === 'checkin') {
      if (activeBooking.borrower_id !== user.id && !isOwnerOrStaff) {
        setErrorMsg('Unauthorized: Only the assigned borrower can initiate check-in for this booking.');
        return;
      }

      const windowCheck = isCheckinWindowValid(activeBooking);
      if (!windowCheck.valid) {
        setErrorMsg(windowCheck.reason || 'Check-in window is invalid.');
        return;
      }

      const initialReport = createConditionReport(
        {
          resource_id: activeResource.id,
          booking_id: activeBooking.id,
          reporter_id: user.id,
          type: 'check_in',
          condition,
          notes: notes.trim(),
          evidence_files: evidenceFiles,
          confirmed_by_reporter: true,
          incident_status: condition === 'damaged' || condition === 'missing_components' ? 'open' : null,
        },
        user.id
      );

      const res = updateBookingStatus(activeBooking.id, 'checked_in', user.id, {
        initial_report_id: initialReport.id,
        confirmed_by_reporter: true,
      });

      if ('error' in res) {
        setErrorMsg(res.error);
        return;
      }

      updateResourceStatus(activeResource.id, 'in_use', user.id);

      setSuccessMsg(`Check-in verified! Session activated for ${activeResource.name}. Digital custody pass logged.`);
      setEvidenceFiles([]);
      setConditionConfirmed(false);
    } else if (mode === 'checkout') {
      const isDamagedOrMissing = condition === 'damaged' || condition === 'missing_components';

      const returnReport = createConditionReport(
        {
          resource_id: activeResource.id,
          booking_id: activeBooking.id,
          reporter_id: user.id,
          type: isDamagedOrMissing ? 'incident' : 'check_out',
          condition,
          notes: notes.trim(),
          evidence_files: evidenceFiles,
          accessories_returned: accessoryChecklist,
          confirmed_by_reporter: true,
          incident_status: isDamagedOrMissing ? 'open' : null,
        },
        user.id
      );

      const targetStatus = isDamagedOrMissing ? 'incident_review' : 'return_pending';
      const res = updateBookingStatus(activeBooking.id, targetStatus, user.id, {
        final_report_id: returnReport.id,
        incident_hold_reason: isDamagedOrMissing ? `Flagged during return: [${condition}] ${notes.trim()}` : undefined,
      });

      if ('error' in res) {
        setErrorMsg(res.error);
        return;
      }

      if (isDamagedOrMissing) {
        updateResourceStatus(activeResource.id, 'maintenance', user.id);
        setSuccessMsg(`Return submitted with damage/missing component alerts. Booking routed to Incident Review and asset placed in maintenance.`);
      } else {
        setSuccessMsg(`Return drop-off submitted! Initial vs final inspection logged. Awaiting owner/staff physical sign-off.`);
      }

      setEvidenceFiles([]);
      setConditionConfirmed(false);
    } else if (mode === 'verify') {
      if (!isOwnerOrStaff) {
        setErrorMsg('Unauthorized: Borrowers cannot unilaterally sign off returns or resolve incidents.');
        return;
      }

      if (condition === 'damaged' || condition === 'missing_components') {
        const res = updateBookingStatus(activeBooking.id, 'incident_review', user.id, {
          incident_hold_reason: `Staff inspection identified issues: [${condition}] ${notes.trim()}`,
        });
        if ('error' in res) {
          setErrorMsg(res.error);
          return;
        }
        updateResourceStatus(activeResource.id, 'maintenance', user.id);
        setSuccessMsg(`Incident review confirmed. ${activeResource.name} placed in maintenance for repairs.`);
      } else {
        const res = updateBookingStatus(activeBooking.id, 'completed', user.id, {
          notes: notes.trim(),
        });
        if ('error' in res) {
          setErrorMsg(res.error);
          return;
        }
        updateResourceStatus(activeResource.id, 'available', user.id);
        setSuccessMsg(`Custody sign-off complete! ${activeResource.name} restored to campus circulation.`);
      }
      setConditionConfirmed(false);
    }
  };

  // Correction Submit Handler
  const handleCorrectionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctingReport) return;

    const res = correctConditionReport(
      correctingReport.id,
      correctionCondition,
      correctionNotes,
      user.id,
      correctionReason
    );

    if ('error' in res) {
      setErrorMsg(res.error);
    } else {
      setSuccessMsg('Report correction successfully appended to audit ledger.');
      setCorrectingReport(null);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16 font-mono text-xs">
      
      {/* ─── 01 / FIELD WORK MASTHEAD ─── */}
      <section className="border-b border-[#DCD9CF] pb-6 pt-2">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#183D30] font-bold bg-[#183D30]/10 px-2.5 py-1 border border-[#183D30]/20">
              FIELD WORK TERMINAL / 03
            </span>
            <span className="text-[11px] font-mono text-[#7E8276] uppercase tracking-wider">
              CUSTODY & CONDITION LEDGER
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#D8FF3E] border border-[#183D30] animate-pulse"></span>
            <span className="text-xs font-mono font-bold text-[#183D30] uppercase">TERMINAL ACTIVE</span>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-[#252722] tracking-tight leading-tight">
              Digital Custody & Handover Station
            </h1>
            <p className="mt-2 text-sm text-[#565950] font-sans leading-relaxed max-w-xl">
              Inspect physical equipment, log condition changes, and transfer custodial accountability with immutable timestamps.
            </p>
          </div>

          {/* Mode Selector Strip */}
          <div className="flex flex-wrap gap-1 bg-[#F3F0E8] p-1 border border-[#DCD9CF]">
            <button
              type="button"
              onClick={() => { setMode('checkin'); setSelectedBookingId(''); }}
              className={`px-3 py-1.5 uppercase font-mono font-bold transition-colors cursor-pointer ${
                mode === 'checkin'
                  ? 'bg-[#183D30] text-[#D8FF3E]'
                  : 'text-[#565950] hover:text-[#183D30]'
              }`}
            >
              01 CHECK-IN
            </button>
            <button
              type="button"
              onClick={() => { setMode('checkout'); setSelectedBookingId(''); }}
              className={`px-3 py-1.5 uppercase font-mono font-bold transition-colors cursor-pointer ${
                mode === 'checkout'
                  ? 'bg-[#183D30] text-[#D8FF3E]'
                  : 'text-[#565950] hover:text-[#183D30]'
              }`}
            >
              02 RETURN
            </button>
            {isOwnerOrStaff && (
              <button
                type="button"
                onClick={() => { setMode('verify'); setSelectedBookingId(''); }}
                className={`px-3 py-1.5 uppercase font-mono font-bold transition-colors cursor-pointer ${
                  mode === 'verify'
                    ? 'bg-[#183D30] text-[#D8FF3E]'
                    : 'text-[#565950] hover:text-[#183D30]'
                }`}
              >
                03 SIGN-OFF
              </button>
            )}
            <button
              type="button"
              onClick={() => setMode('timeline')}
              className={`px-3 py-1.5 uppercase font-mono font-bold transition-colors cursor-pointer ${
                mode === 'timeline'
                  ? 'bg-[#183D30] text-[#D8FF3E]'
                  : 'text-[#565950] hover:text-[#183D30]'
              }`}
            >
              04 TIMELINE
            </button>
          </div>
        </div>
      </section>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3 bg-[#183D30] text-[#D8FF3E] font-mono text-xs flex items-center gap-2 border border-[#183D30]">
          <CheckCircle className="w-4 h-4 text-[#D8FF3E] shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-[#EAE5D8] border border-[#DCD9CF] text-[#854D0E] font-mono text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-[#854D0E] shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ─── 02 / RESERVATION RECORD SELECTOR ─── */}
      <div className="border border-[#DCD9CF] bg-[#FCFBF7] p-4 space-y-2">
        <label className="block uppercase text-[#7E8276] text-[10px] tracking-wider">
          TARGET RESERVATION RECORD:
        </label>
        {(isOwnerOrStaff ? allSystemBookings : myBorrowerBookings).length === 0 ? (
          <p className="text-[#854D0E] py-1 font-sans">
            No matching reservation records found for this operational mode.
          </p>
        ) : (
          <select
            value={selectedBookingId}
            onChange={(e) => setSelectedBookingId(e.target.value)}
            className="w-full p-2.5 bg-[#F3F0E8] border border-[#DCD9CF] font-mono text-xs text-[#252722] focus:border-[#183D30]"
          >
            <option value="">-- SELECT EQUIPMENT RECORD --</option>
            {(mode === 'checkin' 
              ? checkinEligible 
              : mode === 'checkout' 
              ? returnEligible 
              : mode === 'verify' 
              ? pendingVerificationBookings 
              : isOwnerOrStaff ? allSystemBookings : myBorrowerBookings
            ).map((b: Booking) => {
              const res = getResourceById(b.resource_id);
              return (
                <option key={b.id} value={b.id}>
                  {res?.name} — {b.status.toUpperCase()} ({formatDateTime(b.start_time)} → {formatDateTime(b.end_time)})
                </option>
              );
            })}
          </select>
        )}
      </div>

      {activeBooking && activeResource && (
        <>
          {/* Overdue Warning */}
          {new Date().getTime() > new Date(activeBooking.end_time).getTime() && (
            <div className="p-3.5 bg-[#EAE5D8] border border-[#DCD9CF] text-[#854D0E] flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-[#854D0E] shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">RESERVATION WINDOW ELAPSED:</strong>
                <span className="font-sans">
                  The scheduled slot concluded at {formatDateTime(activeBooking.end_time)}. Please complete return drop-off to release custody and update allocation records.
                </span>
              </div>
            </div>
          )}

          {/* ─── TIMELINE MODE ─── */}
          {mode === 'timeline' && (
            <div className="border border-[#DCD9CF] bg-[#FCFBF7] p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-[#DCD9CF] pb-3">
                <div>
                  <h3 className="font-display font-bold text-base text-[#252722]">
                    CHAIN OF CUSTODY TIMELINE
                  </h3>
                  <span className="text-[10px] text-[#7E8276] uppercase">
                    CHRONOLOGICAL AUDIT LEDGER FOR REF #{activeBooking.id.slice(0, 8).toUpperCase()}
                  </span>
                </div>
                <StatusBadge status={activeBooking.status} size="sm" />
              </div>

              <div className="space-y-4">
                {timelineEvents.map((event, idx) => (
                  <div key={event.id || idx} className="p-3 bg-[#F3F0E8] border-l-2 border-[#183D30] space-y-1">
                    <div className="flex items-center justify-between">
                      <strong className="text-xs uppercase text-[#183D30]">{event.title}</strong>
                      <span className="text-[10px] text-[#7E8276]">{formatDateTime(event.timestamp)}</span>
                    </div>
                    <p className="text-xs font-sans text-[#565950] leading-relaxed">{event.description}</p>
                    <div className="text-[10px] text-[#7E8276] pt-1">
                      ACTOR: <strong className="text-[#252722]">{event.actor_name}</strong> ({event.actor_role.toUpperCase()})
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── CHECKIN / CHECKOUT / VERIFY FORM ─── */}
          {mode !== 'timeline' && (
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Digital Custody Pass */}
              <div className="bg-[#183D30] text-[#F3F0E8] p-6 border-2 border-[#183D30] flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="space-y-2 text-center sm:text-left">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#D8FF3E] block">
                    CUSTODY PASS // LABLOOP-{activeBooking.id.slice(0, 8).toUpperCase()}
                  </span>
                  <h3 className="text-2xl font-display font-bold text-[#FCFBF7]">{activeResource.name}</h3>
                  <p className="text-xs text-[#DCD9CF] font-sans">
                    {activeResource.location_building}, Room {activeResource.location_room}
                  </p>
                  <div className="text-[10px] font-mono text-[#AAB6A1] pt-1">
                    ASSIGNED BORROWER: <strong className="text-[#FCFBF7]">{user.full_name}</strong> ({user.department})
                  </div>
                </div>

                <div className="p-3 bg-[#FCFBF7] border border-[#183D30] shrink-0 flex flex-col items-center">
                  <svg className="w-20 h-20" viewBox="0 0 100 100" fill="none">
                    <rect width="100" height="100" fill="#FCFBF7" />
                    <rect x="10" y="10" width="24" height="24" fill="#183D30" />
                    <rect x="14" y="14" width="16" height="16" fill="#FCFBF7" />
                    <rect x="18" y="18" width="8" height="8" fill="#183D30" />

                    <rect x="66" y="10" width="24" height="24" fill="#183D30" />
                    <rect x="70" y="14" width="16" height="16" fill="#FCFBF7" />
                    <rect x="74" y="18" width="8" height="8" fill="#183D30" />

                    <rect x="10" y="66" width="24" height="24" fill="#183D30" />
                    <rect x="14" y="70" width="16" height="16" fill="#FCFBF7" />
                    <rect x="18" y="74" width="8" height="8" fill="#183D30" />

                    <rect x="42" y="16" width="12" height="8" fill="#183D30" />
                    <rect x="40" y="38" width="20" height="20" fill="#183D30" />
                    <rect x="46" y="44" width="8" height="8" fill="#FCFBF7" />
                    <rect x="16" y="44" width="12" height="10" fill="#183D30" />
                    <rect x="70" y="44" width="14" height="8" fill="#183D30" />
                    <rect x="42" y="72" width="16" height="12" fill="#183D30" />
                    <rect x="72" y="72" width="14" height="14" fill="#183D30" />
                  </svg>
                  <span className="text-[9px] font-mono text-[#183D30] font-bold mt-1">PHYSICAL PASS</span>
                </div>
              </div>

              {/* Operating Directives */}
              <div className="border border-[#DCD9CF] bg-[#F3F0E8] p-4 space-y-2">
                <span className="text-[10px] font-mono uppercase font-bold text-[#183D30] flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>SAFETY DIRECTIVES & MANDATES</span>
                </span>
                <div className="grid sm:grid-cols-2 gap-2 text-[11px] font-sans text-[#565950]">
                  {activeResource.operating_rules.map((rule, idx) => (
                    <div key={idx} className="p-2 bg-[#FCFBF7] border border-[#DCD9CF]">
                      <strong className="block font-mono text-[#252722]">{rule.label}</strong>
                      <span>{rule.description}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Side-by-Side Comparison Diff */}
              {(mode === 'checkout' || mode === 'verify') && initialReport && (
                <div className="border border-[#DCD9CF] bg-[#FCFBF7] p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-[#DCD9CF] pb-2">
                    <span className="text-xs font-mono font-bold uppercase text-[#183D30] flex items-center gap-1.5">
                      <FileDiff className="w-4 h-4" />
                      <span>INITIAL CHECK-IN VS. RETURN CONDITION COMPARISON</span>
                    </span>
                    {comparison.degraded && (
                      <span className="px-2 py-0.5 bg-[#854D0E] text-white text-[9px] font-bold uppercase">
                        DEGRADATION FLAGGED
                      </span>
                    )}
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="p-3 bg-[#F3F0E8] border border-[#DCD9CF] space-y-1">
                      <span className="text-[10px] uppercase text-[#7E8276] block">
                        INITIAL CHECK-IN RECORD:
                      </span>
                      <div className="flex items-center justify-between">
                        <StatusBadge status={initialReport.condition} size="sm" />
                        <span className="text-[10px] text-[#7E8276]">{formatDateTime(initialReport.created_at)}</span>
                      </div>
                      <p className="text-xs font-sans text-[#565950] italic">"{initialReport.notes}"</p>
                    </div>

                    <div className={`p-3 border space-y-1 ${comparison.degraded ? 'bg-[#EAE5D8] border-[#DCD9CF]' : 'bg-[#F3F0E8] border-[#DCD9CF]'}`}>
                      <span className="text-[10px] uppercase text-[#7E8276] block">
                        INSPECTION DIFFERENTIAL:
                      </span>
                      <p className="text-xs font-sans text-[#252722]">{comparison.summary}</p>
                      {comparison.missingAccessories.length > 0 && (
                        <div className="text-[10px] font-bold text-[#854D0E] uppercase pt-1">
                          MISSING: {comparison.missingAccessories.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Inspection Checklist Box */}
              <div className="border border-[#DCD9CF] bg-[#FCFBF7] p-6 space-y-5">
                <span className="text-xs font-mono font-bold uppercase text-[#183D30] block">
                  PHYSICAL VERIFICATION PROTOCOL
                </span>

                <div className="space-y-2.5">
                  <label className="flex items-start gap-3 p-3 bg-[#F3F0E8] border border-[#DCD9CF] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={check1}
                      onChange={(e) => setCheck1(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded-none border-[#DCD9CF] text-[#183D30] focus:ring-0 cursor-pointer"
                    />
                    <span className="font-sans text-[#252722] leading-snug">
                      {mode === 'checkin'
                        ? 'Device powers on cleanly; diagnostic self-test passes without error alerts.'
                        : 'Device safely powered down via standard front-panel procedure; mains supply isolated.'}
                    </span>
                  </label>

                  <label className="flex items-start gap-3 p-3 bg-[#F3F0E8] border border-[#DCD9CF] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={check2}
                      onChange={(e) => setCheck2(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded-none border-[#DCD9CF] text-[#183D30] focus:ring-0 cursor-pointer"
                    />
                    <span className="font-sans text-[#252722] leading-snug">
                      {mode === 'checkin'
                        ? 'All standard accessories, probes, adapters, and manuals are physically present.'
                        : 'Accessories returned to storage pouches; work surface wiped down and free of debris.'}
                    </span>
                  </label>

                  <label className="flex items-start gap-3 p-3 bg-[#F3F0E8] border border-[#DCD9CF] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={check3}
                      onChange={(e) => setCheck3(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded-none border-[#DCD9CF] text-[#183D30] focus:ring-0 cursor-pointer"
                    />
                    <span className="font-sans text-[#252722] leading-snug">
                      {mode === 'checkin'
                        ? 'Visual inspection confirmed: No casing cracks, frayed wires, or loose connectors.'
                        : 'Local test files and user data wiped; device reset to standard baseline.'}
                    </span>
                  </label>
                </div>

                {/* Returned Accessories Checklist */}
                {(mode === 'checkout' || mode === 'verify') && (
                  <div className="pt-3 border-t border-[#DCD9CF] space-y-2">
                    <span className="block uppercase text-[10px] text-[#7E8276]">
                      ACCESSORY INVENTORY RECONCILIATION:
                    </span>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {accessoryChecklist.map((item, idx) => (
                        <label key={idx} className="flex items-center gap-2.5 p-2 bg-[#F3F0E8] border border-[#DCD9CF] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.returned}
                            onChange={(e) => {
                              const updated = [...accessoryChecklist];
                              updated[idx].returned = e.target.checked;
                              setAccessoryChecklist(updated);
                            }}
                            className="h-4 w-4 rounded-none border-[#DCD9CF] text-[#183D30] focus:ring-0 cursor-pointer"
                          />
                          <span className={item.returned ? 'text-[#252722]' : 'text-[#854D0E] font-bold'}>
                            {item.name} {!item.returned && '(MISSING)'}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Condition Selection Pills */}
                <div className="pt-3 border-t border-[#DCD9CF] space-y-2">
                  <span className="block uppercase text-[10px] text-[#7E8276]">
                    STRUCTURED CONDITION ASSESSMENT *:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {(['good', 'minor_wear', 'damaged', 'missing_components', 'other'] as ConditionRating[]).map((rating) => {
                      const isSelected = condition === rating;
                      return (
                        <button
                          key={rating}
                          type="button"
                          onClick={() => setCondition(rating)}
                          className={`p-2.5 border text-center font-mono text-xs uppercase font-bold cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-[#183D30] text-[#D8FF3E] border-[#183D30]'
                              : 'bg-[#F3F0E8] text-[#565950] border-[#DCD9CF] hover:border-[#183D30]'
                          }`}
                        >
                          {rating.replace('_', ' ')}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Evidence Photo Upload */}
                <div className="pt-3 border-t border-[#DCD9CF] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="block uppercase text-[10px] text-[#7E8276]">
                      PHOTOGRAPHIC EVIDENCE & CONDITION RECORD:
                    </span>
                    <span className="text-[10px] text-[#7E8276]">MAX 5MB (JPEG, PNG, WEBP)</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="px-4 py-2 bg-[#F3F0E8] hover:bg-[#DCD9CF] border border-[#DCD9CF] text-[#252722] font-mono text-xs uppercase font-bold flex items-center gap-2 cursor-pointer">
                      <Camera className="w-4 h-4 text-[#183D30]" />
                      <span>ATTACH INSPECTION PHOTO</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                    <span className="text-[#7E8276] text-xs">
                      {evidenceFiles.length} FILE(S) ATTACHED
                    </span>
                  </div>

                  {fileError && (
                    <div className="p-2 bg-[#EAE5D8] border border-[#DCD9CF] text-[#854D0E]">
                      {fileError}
                    </div>
                  )}

                  {evidenceFiles.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                      {evidenceFiles.map((file) => (
                        <div key={file.id} className="relative border border-[#DCD9CF] bg-[#252722] overflow-hidden">
                          {file.data_url && (
                            <img src={file.data_url} alt={file.name} className="w-full h-24 object-cover" />
                          )}
                          <div className="p-1 bg-[#FCFBF7] text-[9px] truncate font-mono text-[#565950]">
                            {file.name} ({(file.size / 1024).toFixed(0)} KB)
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(file.id)}
                            className="absolute top-1 right-1 p-1 bg-[#252722]/80 hover:bg-[#854D0E] text-white cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Handover Notes */}
                <div className="pt-3 border-t border-[#DCD9CF] space-y-1">
                  <label className="block uppercase text-[10px] text-[#7E8276]">
                    INSPECTION NOTES & OBSERVATIONS *:
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    required
                    placeholder="Document cosmetic condition, calibration readings, or accessories..."
                    className="w-full p-2.5 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722] focus:outline-hidden focus:border-[#183D30] resize-none"
                  />
                </div>

                {/* Mandatory Confirmation Checkbox */}
                <div className="p-4 bg-[#F3F0E8] border border-[#DCD9CF]">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={conditionConfirmed}
                      onChange={(e) => setConditionConfirmed(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded-none border-[#DCD9CF] text-[#183D30] focus:ring-0 cursor-pointer"
                    />
                    <span className="font-sans text-xs text-[#252722] leading-snug">
                      <strong className="block font-mono font-bold uppercase text-[#183D30]">
                        FORMAL CONDITION CONFIRMATION
                      </strong>
                      I have physically inspected the equipment, tested baseline functionality, and confirm that this report reflects true physical custody condition.
                    </span>
                  </label>
                </div>

                {/* Submit Action */}
                <button
                  type="submit"
                  disabled={!conditionConfirmed}
                  className={`w-full py-3.5 px-4 font-mono font-bold text-xs uppercase flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                    !conditionConfirmed
                      ? 'bg-[#DCD9CF] text-[#7E8276] cursor-not-allowed'
                      : 'bg-[#D8FF3E] hover:bg-[#c9ef30] text-[#183D30] border border-[#183D30]'
                  }`}
                >
                  <CheckCircle className="w-4 h-4 text-[#183D30]" />
                  <span>
                    {mode === 'checkin' && 'CONFIRM INITIAL INSPECTION & CHECK IN'}
                    {mode === 'checkout' && 'SUBMIT RETURN REPORT (DROP-OFF)'}
                    {mode === 'verify' && 'SIGN OFF CUSTODY & RESTORE TO INVENTORY'}
                  </span>
                </button>
              </div>
            </form>
          )}

          {/* Condition Report History */}
          {bookingReports.length > 0 && (
            <div className="border border-[#DCD9CF] bg-[#FCFBF7] p-5 space-y-3">
              <span className="text-xs font-mono font-bold uppercase text-[#183D30] block">
                SUBMITTED CONDITION INSPECTIONS ({bookingReports.length})
              </span>
              <div className="space-y-2">
                {bookingReports.map((report) => (
                  <div key={report.id} className="p-3 bg-[#F3F0E8] border border-[#DCD9CF] space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={report.condition} size="sm" />
                        <span className="font-bold text-[#252722] uppercase">{report.type.replace('_', ' ')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-[#7E8276]">
                        <span>{formatDateTime(report.created_at)}</span>
                        {isOwnerOrStaff && (
                          <button
                            type="button"
                            onClick={() => {
                              setCorrectingReport(report);
                              setCorrectionCondition(report.condition);
                              setCorrectionNotes(report.notes);
                              setCorrectionReason('');
                            }}
                            className="px-2 py-0.5 bg-[#FCFBF7] border border-[#DCD9CF] text-[#183D30] uppercase font-bold hover:bg-[#DCD9CF]"
                          >
                            CORRECT
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs font-sans text-[#565950]">"{report.notes}"</p>
                    {report.corrections && report.corrections.length > 0 && (
                      <div className="pt-1 border-t border-[#DCD9CF] text-[10px] text-[#854D0E]">
                        {report.corrections.map((c, i) => (
                          <div key={i}>AMENDMENT: {c.reason} (to {c.new_condition})</div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Report Correction Modal */}
      {correctingReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#252722]/60 backdrop-blur-xs">
          <div className="bg-[#FCFBF7] border-2 border-[#183D30] max-w-md w-full p-6 space-y-4 font-mono text-xs">
            <div className="flex items-start justify-between border-b border-[#DCD9CF] pb-3">
              <div>
                <h3 className="font-display font-bold text-base text-[#252722]">SUBMIT REPORT CORRECTION</h3>
                <p className="text-[10px] text-[#7E8276] mt-0.5">
                  Appends amendment to immutable audit trail
                </p>
              </div>
              <button
                onClick={() => setCorrectingReport(null)}
                className="text-[#7E8276] hover:text-[#252722] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCorrectionSubmit} className="space-y-4">
              <div>
                <label className="block uppercase text-[10px] text-[#7E8276] mb-1">
                  ADJUSTED CONDITION:
                </label>
                <select
                  value={correctionCondition}
                  onChange={(e) => setCorrectionCondition(e.target.value as ConditionRating)}
                  className="w-full p-2 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722]"
                >
                  <option value="good">GOOD</option>
                  <option value="minor_wear">MINOR WEAR</option>
                  <option value="fair">FAIR</option>
                  <option value="missing_components">MISSING COMPONENTS</option>
                  <option value="damaged">DAMAGED</option>
                  <option value="other">OTHER</option>
                </select>
              </div>

              <div>
                <label className="block uppercase text-[10px] text-[#7E8276] mb-1">
                  REASON FOR CORRECTION *:
                </label>
                <input
                  type="text"
                  required
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  placeholder="e.g. Minor scuff verified as pre-existing sticker adhesive"
                  className="w-full p-2 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722]"
                />
              </div>

              <div>
                <label className="block uppercase text-[10px] text-[#7E8276] mb-1">
                  CORRECTED NOTES:
                </label>
                <textarea
                  rows={2}
                  value={correctionNotes}
                  onChange={(e) => setCorrectionNotes(e.target.value)}
                  className="w-full p-2 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#DCD9CF]">
                <button
                  type="button"
                  onClick={() => setCorrectingReport(null)}
                  className="px-3 py-1.5 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722] cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#183D30] text-[#D8FF3E] font-bold uppercase cursor-pointer"
                >
                  SAVE CORRECTION
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
