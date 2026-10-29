import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  MapPin, 
  Clock, 
  ShieldCheck, 
  ArrowLeft, 
  FileText, 
  Calendar, 
  ChevronRight, 
  ShieldAlert, 
  Tag, 
  Check, 
  CalendarClock,
  ArrowRight,
  Shield
} from 'lucide-react';
import { 
  getResourceById, 
  getUserById, 
  getCategoryById, 
  getReportsForResource,
  getBookingsByBorrower,
  evaluateUserEligibility
} from '../data/store';
import { useAuth } from '../contexts/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import { formatDateTime, handleImageError } from '../utils/formatters';

export const ResourceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const resource = id ? getResourceById(id) : undefined;

  if (!resource) {
    return (
      <div className="bg-[#FCFBF7] border border-[#DCD9CF] p-12 text-center max-w-xl mx-auto my-12">
        <h2 className="font-display text-lg font-bold text-[#252722]">SPECIMEN NOT CATALOGUED</h2>
        <p className="text-xs font-mono text-[#7E8276] mt-1">The requested equipment or space ID could not be located in institutional records.</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="mt-4 px-4 py-2 bg-[#183D30] text-[#D8FF3E] font-mono text-xs uppercase font-bold cursor-pointer"
        >
          RETURN TO DIRECTORY
        </button>
      </div>
    );
  }

  const owner = getUserById(resource.owner_id);
  const category = getCategoryById(resource.category_id);
  const reports = getReportsForResource(resource.id);
  const myBookings = user ? getBookingsByBorrower(user.id) : [];

  // Active user reservations for this resource
  const userPendingBooking = myBookings.find((b) => b.resource_id === resource.id && b.status === 'pending_approval');
  const userActiveBooking = myBookings.find((b) => b.resource_id === resource.id && (b.status === 'approved' || b.status === 'checked_in'));

  // Detailed Eligibility Evaluation against database
  const eligibility = user ? evaluateUserEligibility(user, resource) : null;
  const isEligible = eligibility?.isEligible ?? false;

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Curated editorial quote based on instrument class
  const getEditorialMotto = (name: string, cat?: string) => {
    const lower = (name + ' ' + (cat || '')).toLowerCase();
    if (lower.includes('oscilloscope') || lower.includes('signal') || lower.includes('analyzer')) {
      return 'Read the signal. Understand the system.';
    }
    if (lower.includes('3d') || lower.includes('print') || lower.includes('fabricat')) {
      return 'Translate mathematics into tangible form.';
    }
    if (lower.includes('gpu') || lower.includes('compute') || lower.includes('server')) {
      return 'Compute at scale. Accelerate convergence.';
    }
    if (lower.includes('chamber') || lower.includes('anechoic') || lower.includes('rf')) {
      return 'Silence the reflection. Isolate the wave.';
    }
    if (lower.includes('microscope') || lower.includes('imaging') || lower.includes('optics')) {
      return 'Probe the microscale. Illuminate physical truth.';
    }
    return 'Precision apparatus engineered for empirical research.';
  };

  const specimenNumber = resource.id.replace('res-', '').padStart(4, '0');

  return (
    <div className="space-y-8 w-full max-w-full overflow-x-hidden pb-16">
      
      {/* ─── 01 / SPECIMEN METADATA HEADER ─── */}
      <section className="border-b border-[#DCD9CF] pb-6 pt-2">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-[#565950] hover:text-[#183D30] cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>← RETURN TO CATALOGUE</span>
          </button>
          <div className="flex items-center gap-2 text-xs font-mono text-[#7E8276]">
            <span>REGISTRY: CENTRAL</span>
            <span>/</span>
            <span className="text-[#183D30] font-bold">LL-{resource.id.toUpperCase()}</span>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-2 text-xs font-mono text-[#7E8276] uppercase tracking-widest">
              <span className="font-bold text-[#183D30]">{category?.name ?? 'EQUIPMENT'}</span>
              <span>/</span>
              <span>INSTRUMENT {specimenNumber}</span>
              <span>/</span>
              <span>{resource.institution}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-[#252722] tracking-tight leading-tight">
              {resource.name}
            </h1>

            <p className="text-lg sm:text-xl font-display italic text-[#183D30] pt-1">
              "{getEditorialMotto(resource.name, category?.name)}"
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <StatusBadge status={resource.status} size="lg" />
            {userPendingBooking && (
              <span className="px-2.5 py-1 text-xs font-mono font-bold bg-[#183D30] text-[#D8FF3E]">
                REQUEST PENDING
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ─── 02 / TWO-COLUMN EDITORIAL OBJECT LAYOUT ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Photograph, Technical Matrix, Operating Rules (7 cols) */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* Main Large Photograph Treatment */}
          <div className="border border-[#DCD9CF] bg-[#FCFBF7] p-2">
            <div className="relative h-80 sm:h-96 w-full bg-[#252722] overflow-hidden group">
              <img
                src={resource.image_url}
                alt={resource.name}
                onError={handleImageError}
                className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500 opacity-90"
              />
              <div className="absolute top-3 left-3 px-2 py-0.5 bg-[#252722]/90 text-[10px] font-mono text-[#F3F0E8] uppercase tracking-wider">
                PHOTOGRAPHIC RECORD // SPEC-{specimenNumber}
              </div>
              <div className="absolute bottom-3 right-3 px-2.5 py-1 bg-[#183D30] text-[#D8FF3E] font-mono text-xs font-bold uppercase">
                {resource.status.toUpperCase()}
              </div>
            </div>
            
            <div className="p-3 bg-[#F3F0E8] border-t border-[#DCD9CF] flex items-center justify-between text-[11px] font-mono text-[#565950]">
              <span>LOCATION: {resource.location_building}, ROOM {resource.location_room}</span>
              <span>ZONE: {resource.campus_zone} ({resource.walking_minutes} MIN WALK)</span>
            </div>
          </div>

          {/* Technical Specifications Matrix */}
          <div className="border border-[#DCD9CF] bg-[#FCFBF7] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#DCD9CF] pb-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#183D30]">
                01 / TECHNICAL PROFILE & SPECIFICATIONS
              </span>
              <span className="text-xs font-mono text-[#7E8276]">
                TYPE: {(resource.resource_type || 'EQUIPMENT').toUpperCase()}
              </span>
            </div>

            <p className="text-sm text-[#565950] font-sans leading-relaxed">
              {resource.description}
            </p>

            {/* Spec Matrix Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-[#DCD9CF] border border-[#DCD9CF] pt-2">
              <div className="bg-[#FCFBF7] p-3">
                <span className="text-[10px] font-mono uppercase text-[#7E8276] block">Hourly Rate</span>
                <span className="text-sm font-mono font-bold text-[#183D30] mt-0.5 block">
                  {resource.cost_per_hour === 0 ? 'FREE / $0' : `$${resource.cost_per_hour}/HR`}
                </span>
              </div>
              <div className="bg-[#FCFBF7] p-3">
                <span className="text-[10px] font-mono uppercase text-[#7E8276] block">Max Booking</span>
                <span className="text-sm font-mono font-bold text-[#252722] mt-0.5 block">
                  {resource.max_booking_hours} HOURS
                </span>
              </div>
              <div className="bg-[#FCFBF7] p-3">
                <span className="text-[10px] font-mono uppercase text-[#7E8276] block">Approval Mode</span>
                <span className="text-sm font-mono font-bold text-[#252722] mt-0.5 block">
                  {resource.requires_approval ? 'STAFF REVIEW' : 'AUTO-APPROVE'}
                </span>
              </div>
              <div className="bg-[#FCFBF7] p-3">
                <span className="text-[10px] font-mono uppercase text-[#7E8276] block">Safety Check</span>
                <span className="text-sm font-mono font-bold text-[#252722] mt-0.5 block">
                  {resource.requires_training ? 'TRAINING REQ' : 'STANDARD'}
                </span>
              </div>
            </div>

            {/* Capabilities / Intended Uses */}
            {resource.intended_uses && resource.intended_uses.length > 0 && (
              <div className="pt-3 space-y-2">
                <span className="text-xs font-mono text-[#7E8276] uppercase block">
                  VERIFIED RESEARCH CAPABILITIES:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {resource.intended_uses.map((use) => (
                    <span
                      key={use}
                      className="text-xs font-mono px-2 py-1 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722]"
                    >
                      #{use}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Operating Rules & Safety Protocols */}
          <div className="border border-[#DCD9CF] bg-[#FCFBF7] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#DCD9CF] pb-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#183D30]">
                02 / OPERATING DIRECTIVES & SAFETY PROTOCOL
              </span>
              <span className="text-xs font-mono text-[#7E8276]">
                COMPLIANCE MANDATORY
              </span>
            </div>

            <div className="space-y-3">
              {resource.operating_rules.map((rule, idx) => (
                <div key={idx} className="p-3 bg-[#F3F0E8] border-l-2 border-[#183D30] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-[#183D30] uppercase">
                      RULE 0{idx + 1} // {rule.label}
                    </span>
                  </div>
                  <p className="text-xs text-[#565950] font-sans leading-relaxed">
                    {rule.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Weekly Operational Hours */}
          <div className="border border-[#DCD9CF] bg-[#FCFBF7] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#DCD9CF] pb-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#183D30]">
                03 / AUTHORIZED OPERATIONAL WINDOWS
              </span>
              <span className="text-xs font-mono text-[#7E8276]">
                SCHEDULE ACTIVE
              </span>
            </div>

            <div className="grid sm:grid-cols-2 gap-2 text-xs font-mono">
              {resource.availability_schedule.map((slot, idx) => (
                <div key={idx} className="p-2.5 bg-[#F3F0E8] border border-[#DCD9CF] flex items-center justify-between">
                  <span className="font-bold text-[#252722] uppercase">{dayNames[slot.day]}</span>
                  <span className="bg-[#FCFBF7] px-2 py-0.5 border border-[#DCD9CF] text-[#183D30]">
                    {slot.start} – {slot.end}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Historical Condition Log */}
          {reports.length > 0 && (
            <div className="border border-[#DCD9CF] bg-[#FCFBF7] p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#DCD9CF] pb-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#183D30]">
                  04 / VERIFIED CONDITION INSPECTION LOG ({reports.length})
                </span>
                <span className="text-xs font-mono text-[#7E8276]">
                  CHAIN OF CUSTODY
                </span>
              </div>

              <div className="space-y-2 text-xs font-mono">
                {reports.slice(0, 3).map((r) => (
                  <div key={r.id} className="p-3 bg-[#F3F0E8] border border-[#DCD9CF] flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#252722] uppercase">{r.type.replace('_', ' ')}</span>
                        <span className="text-[10px] text-[#7E8276]">{formatDateTime(r.created_at)}</span>
                      </div>
                      <p className="text-xs font-sans text-[#565950] mt-1">{r.notes}</p>
                    </div>
                    <StatusBadge status={r.condition} size="sm" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Forest Green Reservation Terminal (5 cols) */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-20">
          
          {/* ─── Forest Green Reservation Panel ─── */}
          <div className="bg-[#183D30] text-[#F3F0E8] p-6 sm:p-7 border-2 border-[#183D30] space-y-6">
            <div className="flex items-center justify-between border-b border-[#254f40] pb-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#AAB6A1] block">
                  RESERVATION TERMINAL
                </span>
                <span className="text-2xl font-display font-bold text-[#FCFBF7] mt-0.5 block">
                  {resource.cost_per_hour === 0 ? 'Academic Free ($0)' : `$${resource.cost_per_hour}/hr`}
                </span>
              </div>
              <span className="text-[10px] font-mono text-[#D8FF3E] border border-[#D8FF3E]/40 px-2 py-0.5">
                SLOT: MAX {resource.max_booking_hours}H
              </span>
            </div>

            <p className="text-xs font-sans text-[#DCD9CF] leading-relaxed">
              Guaranteed institutional physical custody. Pre-session condition inspection and verified checklist required at handover.
            </p>

            {/* Eligibility & Training Gate Check */}
            <div className="p-4 bg-[#20493a] border border-[#2d5c4b] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase text-[#FCFBF7] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#D8FF3E]" />
                  <span>PREREQUISITE VERIFICATION</span>
                </span>
                <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 ${
                  isEligible ? 'bg-[#D8FF3E] text-[#183D30]' : 'bg-[#EAE5D8] text-[#854D0E]'
                }`}>
                  {isEligible ? 'ELIGIBLE' : 'RESTRICTED'}
                </span>
              </div>

              {eligibility && (
                <div className="space-y-1.5 text-xs font-mono">
                  {eligibility.requirements.map((req, i) => (
                    <div key={i} className="flex items-start gap-2">
                      {req.satisfied ? (
                        <Check className="w-3.5 h-3.5 text-[#D8FF3E] shrink-0 mt-0.5" />
                      ) : (
                        <ShieldAlert className="w-3.5 h-3.5 text-[#FBBF24] shrink-0 mt-0.5" />
                      )}
                      <span className={`text-[11px] leading-tight ${req.satisfied ? 'text-[#DCD9CF]' : 'text-[#FDE68A] font-bold'}`}>
                        {req.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {!isEligible && (
                <div className="p-2.5 bg-[#2a5a48] border border-[#FBBF24]/30 text-[10px] font-mono text-[#FDE68A] space-y-0.5">
                  <strong className="block">SAFETY PREREQUISITE UNMET:</strong>
                  <p className="font-sans">Complete mandatory safety certification or obtain faculty authorization to proceed.</p>
                </div>
              )}
            </div>

            {/* Acid Lime Action Button */}
            <div>
              {userActiveBooking ? (
                <button
                  onClick={() => navigate(`/checkin?bookingId=${userActiveBooking.id}`)}
                  className="w-full py-3 bg-[#D8FF3E] hover:bg-[#c9ef30] text-[#183D30] font-mono text-xs uppercase font-bold flex items-center justify-center gap-2 border border-[#D8FF3E] transition-colors cursor-pointer"
                >
                  <CalendarClock className="w-4 h-4 text-[#183D30]" />
                  <span>ACCESS DIGITAL CUSTODY PASS</span>
                </button>
              ) : (
                <button
                  onClick={() => navigate(`/resources/${resource.id}/book`)}
                  className="w-full py-3.5 bg-[#D8FF3E] hover:bg-[#c9ef30] text-[#183D30] font-mono text-xs uppercase font-bold flex items-center justify-center gap-2 border border-[#D8FF3E] transition-colors cursor-pointer shadow-sm"
                >
                  <span>REQUEST RESERVATION</span>
                  <ArrowRight className="w-4 h-4 text-[#183D30]" />
                </button>
              )}

              <p className="text-[10px] font-mono text-[#AAB6A1] text-center mt-2.5">
                NO IMMEDIATE PAYMENT • UNIVERSITY SSO VERIFIED • LEDGER LOGGED
              </p>
            </div>
          </div>

          {/* Faculty Custodian Information Box */}
          <div className="border border-[#DCD9CF] bg-[#FCFBF7] p-5 space-y-3">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#7E8276] block">
              FACULTY LAB CUSTODIAN
            </span>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#183D30] text-[#D8FF3E] font-display font-bold flex items-center justify-center text-sm shrink-0">
                {owner?.full_name.charAt(0) ?? 'F'}
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-[#252722] block truncate">{owner?.full_name ?? 'Faculty Supervisor'}</span>
                <span className="text-[11px] font-mono text-[#565950] block truncate uppercase">{owner?.department}</span>
                <span className="text-[10px] font-mono text-[#7E8276] block truncate">{owner?.email}</span>
              </div>
            </div>
          </div>

          {/* Institutional Allocation Policy */}
          <div className="border border-[#DCD9CF] bg-[#F3F0E8] p-4 text-xs font-mono space-y-1.5">
            <span className="font-bold text-[#183D30] block uppercase">
              FAIR ALLOCATION & CUSTODY DIRECTIVE
            </span>
            <p className="text-[11px] text-[#565950] font-sans leading-relaxed">
              Cancellations submitted at least 2 hours prior to scheduled window restore quota instantly. Unattended reservations trigger a 48h scheduling lock to ensure high asset utilization.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};
