import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Send, 
  Save, 
  Scale, 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  AlertTriangle, 
  ShieldCheck, 
  ShieldAlert,
  AlertCircle
} from 'lucide-react';
import { 
  getResourceById, 
  createBooking, 
  hasOverlappingBooking, 
  evaluateUserEligibility,
  checkFairnessLimits 
} from '../data/store';
import { useAuth } from '../contexts/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import { formatDateTime, handleImageError } from '../utils/formatters';
import type { Booking, BookingPriority, BookingStatus } from '../types';

export const BookingRequestPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isWaitlistIntent = searchParams.get('waitlist') === 'true';

  const { user } = useAuth();
  const resource = id ? getResourceById(id) : undefined;

  // Step state: 1 to 6
  const [step, setStep] = useState<number>(1);

  // Form states
  const todayStr = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(todayStr);
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('12:00');
  const [purpose, setPurpose] = useState('');
  const [projectCourseContext, setProjectCourseContext] = useState('');
  const [priorityLevel, setPriorityLevel] = useState<BookingPriority>('coursework');
  const [trainingEvidence, setTrainingEvidence] = useState('');
  const [hasHazardousReagents, setHasHazardousReagents] = useState(false);
  const [customAccessories, setCustomAccessories] = useState('');
  const [acceptedRules, setAcceptedRules] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Created booking result for Step 6
  const [createdBooking, setCreatedBooking] = useState<Booking | null>(null);

  if (!resource) {
    return (
      <div className="bg-[#FCFBF7] border border-[#DCD9CF] p-12 text-center max-w-xl mx-auto my-12">
        <h2 className="font-display text-lg font-bold text-[#252722]">SPECIMEN NOT CATALOGUED</h2>
        <button
          onClick={() => navigate('/dashboard')}
          className="mt-4 px-4 py-2 bg-[#183D30] text-[#D8FF3E] font-mono text-xs uppercase font-bold cursor-pointer"
        >
          RETURN TO DIRECTORY
        </button>
      </div>
    );
  }

  // Calculate full ISO strings
  const startIso = useMemo(() => {
    if (!date || !startTime) return '';
    const d = new Date(`${date}T${startTime}`);
    return isNaN(d.getTime()) ? '' : d.toISOString();
  }, [date, startTime]);
  const endIso = useMemo(() => {
    if (!date || !endTime) return '';
    const d = new Date(`${date}T${endTime}`);
    return isNaN(d.getTime()) ? '' : d.toISOString();
  }, [date, endTime]);

  // Validation
  const durationHours = useMemo(() => {
    try {
      const start = new Date(startIso).getTime();
      const end = new Date(endIso).getTime();
      if (isNaN(start) || isNaN(end) || end <= start) return 0;
      return (end - start) / (1000 * 60 * 60);
    } catch {
      return 0;
    }
  }, [startIso, endIso]);

  // Conflict detection
  const hasConflict = useMemo(() => {
    if (durationHours <= 0) return false;
    return hasOverlappingBooking(resource.id, startIso, endIso);
  }, [resource.id, startIso, endIso, durationHours]);

  // Eligibility evaluation against stored records
  const eligibility = useMemo(() => {
    if (!user) return null;
    return evaluateUserEligibility(user, resource);
  }, [user, resource]);

  // Fairness quota check
  const fairness = useMemo(() => {
    if (!user) return null;
    return checkFairnessLimits(user.id, durationHours);
  }, [user, durationHours]);

  // Step 1 Validation
  const validateStep1 = () => {
    if (durationHours <= 0) {
      setError('End time must be strictly after start time.');
      return false;
    }
    if (durationHours > resource.max_booking_hours) {
      setError(`Duration exceeds the maximum allowed limit of ${resource.max_booking_hours} hours per session.`);
      return false;
    }
    setError(null);
    return true;
  };

  // Step 2 Validation
  const validateStep2 = () => {
    if (!purpose.trim()) {
      setError('Please provide a specific academic or research purpose.');
      return false;
    }
    setError(null);
    return true;
  };

  // Step 3 Validation
  const validateStep3 = () => {
    if (resource.requires_training && !user?.training_completed && !trainingEvidence.trim()) {
      setError('Verified lab safety training is required. Please provide qualification evidence or cert ID for staff review.');
      return false;
    }
    setError(null);
    return true;
  };

  // Step 4 Validation
  const validateStep4 = () => {
    if (!acceptedRules) {
      setError('You must accept the resource operating directives and safety rules to proceed.');
      return false;
    }
    setError(null);
    return true;
  };

  const handleNextStep = () => {
    setError(null);
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    if (step === 3 && !validateStep3()) return;
    if (step === 4 && !validateStep4()) return;
    setStep((prev) => Math.min(prev + 1, 6));
  };

  const handlePrevStep = () => {
    setError(null);
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = (asDraft = false) => {
    setError(null);

    if (!user) {
      setError('You must be logged in to request a booking.');
      return;
    }

    if (!asDraft) {
      if (!validateStep1() || !validateStep2() || !validateStep3() || !validateStep4()) return;
    }

    setSubmitting(true);

    const initialStatus: BookingStatus = asDraft
      ? 'draft'
      : isWaitlistIntent
      ? 'waitlisted'
      : resource.requires_approval
      ? 'pending_approval'
      : hasConflict
      ? 'waitlisted'
      : 'approved';

    const result = createBooking(
      {
        resource_id: resource.id,
        borrower_id: user.id,
        start_time: startIso,
        end_time: endIso,
        status: initialStatus,
        purpose: purpose.trim() || 'Drafted reservation',
        project_course_context: projectCourseContext.trim() || 'General Academic Research',
        training_evidence: trainingEvidence.trim() || undefined,
        training_evidence_verified: user.training_completed,
        rules_acknowledged: acceptedRules,
        priority_level: priorityLevel,
        custom_field_responses: {
          hazardous_reagents: hasHazardousReagents ? 'yes' : 'no',
          special_accessories: customAccessories.trim(),
        },
      },
      user.id
    );

    setSubmitting(false);

    if ('error' in result) {
      setError(result.error);
    } else {
      setCreatedBooking(result);
      setStep(6);
    }
  };

  const STEPS = [
    { number: 1, label: '01 SCHEDULE' },
    { number: 2, label: '02 PURPOSE' },
    { number: 3, label: '03 ELIGIBILITY' },
    { number: 4, label: '04 SAFETY' },
    { number: 5, label: '05 REVIEW' },
    { number: 6, label: '06 CONFIRM' },
  ];

  return (
    <div className="max-w-3xl w-full max-w-full overflow-x-hidden mx-auto space-y-6 pb-16 font-mono text-xs">
      
      {/* ─── 01 / SPECIMEN CONTEXT BANNER ─── */}
      <div className="flex items-center justify-between border-b border-[#DCD9CF] pb-4">
        <button
          onClick={() => navigate(`/resources/${resource.id}`)}
          className="text-xs font-mono uppercase text-[#565950] hover:text-[#183D30] flex items-center gap-1 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>← BACK TO {resource.name}</span>
        </button>

        <span className="text-[11px] font-mono text-[#7E8276] uppercase">
          STEP {step} OF 6 // {STEPS[step - 1].label}
        </span>
      </div>

      {/* Resource Spec Header Strip */}
      <div className="p-4 bg-[#FCFBF7] border border-[#DCD9CF] flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 bg-[#252722] overflow-hidden shrink-0 border border-[#DCD9CF]">
            <img 
              src={resource.image_url} 
              alt={resource.name} 
              onError={handleImageError} 
              className="w-full h-full object-cover opacity-90" 
            />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-[#7E8276] uppercase block">
              CATALOGUED INSTRUMENT // LL-{resource.id.toUpperCase()}
            </span>
            <h2 className="text-sm font-display font-bold text-[#252722] truncate">{resource.name}</h2>
            <p className="text-[10px] text-[#565950] truncate">
              {resource.location_building}, Room {resource.location_room} • Max {resource.max_booking_hours}h
            </p>
          </div>
        </div>
        <StatusBadge status={resource.status} size="sm" />
      </div>

      {/* Horizontal Monospace Step Indicator */}
      <div className="bg-[#FCFBF7] border border-[#DCD9CF] p-2">
        <div className="grid grid-cols-6 gap-1">
          {STEPS.map((s) => {
            const isCompleted = step > s.number;
            const isCurrent = step === s.number;
            return (
              <div 
                key={s.number} 
                className={`py-2 px-1 text-center border transition-colors ${
                  isCurrent 
                    ? 'bg-[#183D30] text-[#D8FF3E] border-[#183D30] font-bold' 
                    : isCompleted 
                    ? 'bg-[#183D30]/10 text-[#183D30] border-[#183D30]/30 font-bold' 
                    : 'bg-[#F3F0E8] text-[#7E8276] border-[#DCD9CF]'
                }`}
              >
                <div className="text-[10px] tracking-wider truncate">
                  <span className="sm:hidden font-bold">{isCompleted ? '✓' : s.number}</span>
                  <span className="hidden sm:inline">{isCompleted ? `✓ ${s.label}` : s.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3 bg-[#EAE5D8] border border-[#DCD9CF] text-[#854D0E] flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-[#854D0E] shrink-0 mt-0.5" />
          <span className="leading-relaxed">{error}</span>
        </div>
      )}

      {/* Main Form Box */}
      <div className="bg-[#FCFBF7] border border-[#DCD9CF] p-6 sm:p-8 space-y-6">
        
        {/* ─── STEP 1: Date & Time ─── */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="border-b border-[#DCD9CF] pb-3">
              <span className="text-[10px] font-mono text-[#7E8276] uppercase">STAGE 01</span>
              <h3 className="font-display font-bold text-lg text-[#252722]">
                SELECT RESERVATION DATE & OPERATIONAL WINDOW
              </h3>
              <p className="text-xs font-sans text-[#565950] mt-0.5">
                Configure your equipment session. Maximum authorized continuous booking is {resource.max_booking_hours} hours.
              </p>
            </div>

            <div className="grid sm:grid-cols-3 gap-4 font-mono text-xs">
              <div className="sm:col-span-3">
                <label className="block uppercase text-[#7E8276] text-[10px] mb-1">
                  RESERVATION DATE:
                </label>
                <input
                  type="date"
                  value={date}
                  min={todayStr}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full p-2.5 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722] focus:outline-hidden focus:border-[#183D30]"
                />
              </div>

              <div>
                <label className="block uppercase text-[#7E8276] text-[10px] mb-1">
                  START TIME:
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full p-2.5 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722] focus:outline-hidden focus:border-[#183D30]"
                />
              </div>

              <div>
                <label className="block uppercase text-[#7E8276] text-[10px] mb-1">
                  END TIME:
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full p-2.5 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722] focus:outline-hidden focus:border-[#183D30]"
                />
              </div>

              <div>
                <label className="block uppercase text-[#7E8276] text-[10px] mb-1">
                  DURATION COMPUTED:
                </label>
                <div className={`p-2.5 border text-xs font-bold flex items-center justify-between ${
                  durationHours > resource.max_booking_hours 
                    ? 'bg-[#EAE5D8] border-[#DCD9CF] text-[#854D0E]' 
                    : durationHours > 0 
                    ? 'bg-[#183D30]/10 border-[#183D30]/30 text-[#183D30]' 
                    : 'bg-[#F3F0E8] border-[#DCD9CF] text-[#7E8276]'
                }`}>
                  <span>{durationHours > 0 ? `${durationHours.toFixed(1)} HRS` : 'INVALID'}</span>
                  <span className="text-[10px] font-normal">MAX: {resource.max_booking_hours}H</span>
                </div>
              </div>
            </div>

            {hasConflict && (
              <div className="p-3 bg-[#EAE5D8] border border-[#DCD9CF] text-xs font-mono text-[#854D0E] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-[#854D0E] shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">SCHEDULE CONFLICT DETECTED:</strong>
                  <span className="font-sans">This timeslot is already claimed or locked. Submitting will register you on the transparent waitlist queue.</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── STEP 2: Intended Use & Project ─── */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="border-b border-[#DCD9CF] pb-3">
              <span className="text-[10px] font-mono text-[#7E8276] uppercase">STAGE 02</span>
              <h3 className="font-display font-bold text-lg text-[#252722]">
                RESEARCH PURPOSE & PROJECT ATTRIBUTION
              </h3>
              <p className="text-xs font-sans text-[#565950] mt-0.5">
                Provide academic context for institutional resource allocation and custodian approval.
              </p>
            </div>

            <div className="space-y-4 font-mono text-xs">
              <div>
                <label className="block uppercase text-[#7E8276] text-[10px] mb-1">
                  COURSE, LAB OR PROJECT NAME:
                </label>
                <input
                  type="text"
                  value={projectCourseContext}
                  onChange={(e) => setProjectCourseContext(e.target.value)}
                  placeholder="e.g. EE401 Senior Capstone Design, Autonomous Robotics"
                  className="w-full p-2.5 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722] focus:outline-hidden focus:border-[#183D30]"
                />
              </div>

              <div>
                <label className="block uppercase text-[#7E8276] text-[10px] mb-1">
                  RESEARCH PURPOSE & TEST PLAN *:
                </label>
                <textarea
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  rows={3}
                  required
                  placeholder="State the experimental objective, sample types, or measurement criteria..."
                  className="w-full p-2.5 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722] focus:outline-hidden focus:border-[#183D30] resize-none"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block uppercase text-[#7E8276] text-[10px] mb-1">
                    ALLOCATION PRIORITY TIER:
                  </label>
                  <select
                    value={priorityLevel}
                    onChange={(e) => setPriorityLevel(e.target.value as BookingPriority)}
                    className="w-full p-2.5 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722] focus:outline-hidden focus:border-[#183D30]"
                  >
                    <option value="coursework">STANDARD COURSEWORK</option>
                    <option value="capstone">CAPSTONE / SENIOR DESIGN</option>
                    <option value="research">GRADUATE RESEARCH</option>
                    <option value="emergency">URGENT LAB DEADLINE</option>
                  </select>
                </div>

                <div>
                  <label className="block uppercase text-[#7E8276] text-[10px] mb-1">
                    ACCESSORY ATTACHMENT REQUESTS:
                  </label>
                  <input
                    type="text"
                    value={customAccessories}
                    onChange={(e) => setCustomAccessories(e.target.value)}
                    placeholder="e.g. Differential probe, calibration jig"
                    className="w-full p-2.5 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722] focus:outline-hidden focus:border-[#183D30]"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── STEP 3: Eligibility & Safety Qualifications ─── */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="border-b border-[#DCD9CF] pb-3">
              <span className="text-[10px] font-mono text-[#7E8276] uppercase">STAGE 03</span>
              <h3 className="font-display font-bold text-lg text-[#252722]">
                INSTITUTIONAL PREREQUISITE AUDIT
              </h3>
              <p className="text-xs font-sans text-[#565950] mt-0.5">
                Verification of borrower certification and institutional eligibility criteria.
              </p>
            </div>

            {eligibility && (
              <div className="space-y-3 font-mono text-xs">
                <div className="space-y-2">
                  {eligibility.requirements.map((req, i) => (
                    <div 
                      key={i} 
                      className={`p-3 border flex items-start justify-between gap-3 ${
                        req.satisfied 
                          ? 'bg-[#183D30]/5 border-[#183D30]/20' 
                          : 'bg-[#EAE5D8] border-[#DCD9CF]'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        {req.satisfied ? (
                          <ShieldCheck className="w-4 h-4 text-[#183D30] shrink-0 mt-0.5" />
                        ) : (
                          <ShieldAlert className="w-4 h-4 text-[#854D0E] shrink-0 mt-0.5" />
                        )}
                        <div>
                          <span className="font-bold text-[#252722] block">{req.label}</span>
                          <span className="text-[11px] font-sans text-[#565950] block mt-0.5">{req.details}</span>
                        </div>
                      </div>

                      <span className={`text-[10px] font-bold px-2 py-0.5 uppercase shrink-0 ${
                        req.satisfied 
                          ? 'bg-[#183D30] text-[#D8FF3E]' 
                          : 'bg-[#854D0E] text-white'
                      }`}>
                        {req.satisfied ? 'SATISFIED' : 'UNMET'}
                      </span>
                    </div>
                  ))}
                </div>

                {resource.requires_training && !user?.training_completed && (
                  <div className="p-3.5 bg-[#EAE5D8] border border-[#DCD9CF] space-y-2 text-xs">
                    <label className="block font-bold text-[#854D0E] uppercase text-[10px]">
                      SUBMIT EXTERNAL CERTIFICATION ID / URL FOR MANUAL STAFF OVERRIDE:
                    </label>
                    <input
                      type="text"
                      value={trainingEvidence}
                      onChange={(e) => setTrainingEvidence(e.target.value)}
                      placeholder="e.g. EHS-2024-LAB-CERT-8841 or faculty credential URL"
                      className="w-full p-2 bg-[#FCFBF7] border border-[#DCD9CF] text-[#252722]"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── STEP 4: Safety Rules & Operating Directives ─── */}
        {step === 4 && (
          <div className="space-y-5">
            <div className="border-b border-[#DCD9CF] pb-3">
              <span className="text-[10px] font-mono text-[#7E8276] uppercase">STAGE 04</span>
              <h3 className="font-display font-bold text-lg text-[#252722]">
                OPERATING RULES & SAFETY MANDATES
              </h3>
              <p className="text-xs font-sans text-[#565950] mt-0.5">
                Borrower maintains physical accountability during custody. Review all mandated directives.
              </p>
            </div>

            <div className="space-y-2 font-mono text-xs">
              {resource.operating_rules.map((rule, idx) => (
                <div key={idx} className="p-3 bg-[#F3F0E8] border-l-2 border-[#183D30] space-y-0.5">
                  <span className="font-bold text-[#183D30] uppercase text-[11px]">
                    RULE 0{idx + 1} // {rule.label}
                  </span>
                  <p className="text-xs font-sans text-[#565950] leading-relaxed">
                    {rule.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="p-4 bg-[#F3F0E8] border border-[#DCD9CF]">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptedRules}
                  onChange={(e) => setAcceptedRules(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded-none border-[#DCD9CF] text-[#183D30] focus:ring-0 cursor-pointer"
                />
                <div className="text-xs font-sans text-[#252722] leading-relaxed">
                  <strong className="block font-mono font-bold uppercase text-[#183D30]">
                    I ACCEPT ALL MANDATORY OPERATING DIRECTIVES
                  </strong>
                  I agree to complete digital check-in and check-out condition reports. Unreported physical defects, missing parts, or unauthorized transfers violate university governance.
                </div>
              </label>
            </div>
          </div>
        )}

        {/* ─── STEP 5: Review & Allocation Details ─── */}
        {step === 5 && (
          <div className="space-y-5">
            <div className="border-b border-[#DCD9CF] pb-3">
              <span className="text-[10px] font-mono text-[#7E8276] uppercase">STAGE 05</span>
              <h3 className="font-display font-bold text-lg text-[#252722]">
                PRE-SUBMISSION AUDIT & PARAMETERS
              </h3>
              <p className="text-xs font-sans text-[#565950] mt-0.5">
                Final verification of custody parameters before logging to institutional ledger.
              </p>
            </div>

            <div className="border border-[#DCD9CF] bg-[#F3F0E8] divide-y divide-[#DCD9CF] font-mono text-xs">
              <div className="p-2.5 flex items-center justify-between">
                <span className="text-[#7E8276]">RESOURCE:</span>
                <span className="font-bold text-[#252722]">{resource.name}</span>
              </div>
              <div className="p-2.5 flex items-center justify-between">
                <span className="text-[#7E8276]">DATE:</span>
                <span className="font-bold text-[#252722]">{date}</span>
              </div>
              <div className="p-2.5 flex items-center justify-between">
                <span className="text-[#7E8276]">TIME WINDOW:</span>
                <span className="font-bold text-[#252722]">{startTime} – {endTime} ({durationHours.toFixed(1)}H)</span>
              </div>
              <div className="p-2.5 flex items-center justify-between">
                <span className="text-[#7E8276]">PROJECT:</span>
                <span className="font-bold text-[#252722]">{projectCourseContext || 'General Research'}</span>
              </div>
              <div className="p-2.5 flex items-center justify-between">
                <span className="text-[#7E8276]">FEE:</span>
                <span className="font-bold text-[#183D30]">
                  {resource.cost_per_hour === 0 ? '$0 / ACADEMIC SUBSIDIZED' : `$${resource.cost_per_hour}/HR`}
                </span>
              </div>
            </div>

            {fairness && (
              <div className="p-3 bg-[#183D30]/5 border border-[#183D30]/20 flex items-center justify-between font-mono text-xs">
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-[#183D30] shrink-0" />
                  <span className="text-[#252722]">
                    QUOTA IMPACT: {fairness.activeBookingCount + 1} OF {fairness.maxActiveBookings} SLOTS
                  </span>
                </div>
                <span className="text-[10px] font-bold text-[#183D30] uppercase">
                  COMPLIANT
                </span>
              </div>
            )}
          </div>
        )}

        {/* ─── STEP 6: Confirmation ─── */}
        {step === 6 && createdBooking && (
          <div className="space-y-6 text-center py-4">
            <div className="w-12 h-12 bg-[#183D30] text-[#D8FF3E] flex items-center justify-center mx-auto">
              <Check className="w-6 h-6 stroke-[3]" />
            </div>

            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#183D30]">
                RESERVATION REGISTERED SUCCESSFULLY
              </span>
              <h3 className="text-2xl font-display font-bold text-[#252722] mt-1">
                REF #{createdBooking.id.slice(0, 8).toUpperCase()}
              </h3>
              <p className="text-xs font-sans text-[#565950] mt-1 max-w-md mx-auto">
                {createdBooking.status === 'approved' 
                  ? 'Your reservation is confirmed. Physical digital custody pass generated.'
                  : createdBooking.status === 'waitlisted'
                  ? `Position #${createdBooking.waitlist_position ?? 1} on transparent waitlist. Auto-notification active.`
                  : 'Forwarded to faculty custodian for review and verification.'}
              </p>
            </div>

            <div className="p-4 bg-[#F3F0E8] border border-[#DCD9CF] max-w-md mx-auto text-left font-mono text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[#7E8276]">STATUS:</span>
                <StatusBadge status={createdBooking.status} size="sm" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#7E8276]">TIME:</span>
                <span className="font-bold text-[#252722]">{formatDateTime(createdBooking.start_time)}</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => navigate('/my-bookings')}
                className="px-5 py-2.5 bg-[#183D30] text-[#D8FF3E] font-mono text-xs uppercase font-bold cursor-pointer"
              >
                GO TO MY BOOKINGS
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2.5 bg-[#FCFBF7] border border-[#DCD9CF] text-[#252722] font-mono text-xs uppercase font-bold hover:bg-[#F3F0E8] cursor-pointer"
              >
                EQUIPMENT CATALOGUE
              </button>
            </div>
          </div>
        )}

        {/* Step Navigation Controls (Steps 1 to 5) */}
        {step <= 5 && (
          <div className="pt-4 border-t border-[#DCD9CF] flex items-center justify-between font-mono text-xs">
            {step > 1 ? (
              <button
                type="button"
                onClick={handlePrevStep}
                className="px-4 py-2 border border-[#DCD9CF] bg-[#F3F0E8] hover:bg-[#DCD9CF] text-[#252722] uppercase font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>PREVIOUS</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSubmit(true)}
                className="px-3.5 py-2 border border-[#DCD9CF] bg-[#F3F0E8] text-[#565950] hover:text-[#252722] uppercase flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>SAVE DRAFT</span>
              </button>
            )}

            {step < 5 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="px-5 py-2 bg-[#183D30] text-[#D8FF3E] uppercase font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <span>CONTINUE</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSubmit(false)}
                className="px-6 py-2.5 bg-[#D8FF3E] text-[#183D30] border border-[#183D30] uppercase font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{isWaitlistIntent ? 'JOIN WAITLIST QUEUE' : 'SUBMIT RESERVATION'}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
