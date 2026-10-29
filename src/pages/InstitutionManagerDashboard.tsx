import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart3, 
  Users, 
  Clock, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle, 
  PieChart, 
  Building2, 
  Layers,
  ArrowRight,
  Wrench,
  AlertCircle,
  X,
  Key,
  Shield,
  Sliders,
  Sparkles,
  RefreshCw,
  TrendingDown,
  Lightbulb,
  Calendar
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { 
  getResources, 
  getUsers, 
  getUserById, 
  getManagerDashboardMetrics, 
  resolveManagerDispute, 
  grantAccessException, 
  revokeAccessException, 
  getInstitutionConfig, 
  updateInstitutionConfig 
} from '../data/store';
import { generateStaffDemandInsights } from '../utils/aiMatchExplain';
import { formatDateTime } from '../utils/formatters';
import type { AccessException, StaffDemandInsights } from '../types';

export const InstitutionManagerDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'escalations' | 'capacity' | 'demand_ai' | 'waitlists' | 'fairness' | 'exceptions' | 'policies'>('escalations');

  // AI Demand Insights State
  const [demandInsights, setDemandInsights] = useState<StaffDemandInsights | null>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);

  const handleFetchDemandInsights = async () => {
    setIsLoadingInsights(true);
    try {
      const data = await generateStaffDemandInsights();
      setDemandInsights(data);
    } catch (err) {
      console.error('Failed to generate staff demand insights:', err);
    } finally {
      setIsLoadingInsights(false);
    }
  };

  // Feedback states
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Dispute Resolution Modal State
  const [resolvingReportId, setResolvingReportId] = useState<string | null>(null);
  const [disputeNotes, setDisputeNotes] = useState('');
  const [equipmentAction, setEquipmentAction] = useState<'restore_available' | 'keep_maintenance'>('restore_available');
  const [disputeDecisionReason, setDisputeDecisionReason] = useState('');

  // Grant Access Exception Modal State
  const [isExceptionModalOpen, setIsExceptionModalOpen] = useState(false);
  const [targetUserId, setTargetUserId] = useState('');
  const [exceptionType, setExceptionType] = useState<AccessException['exception_type']>('training_override');
  const [exceptionResourceId, setExceptionResourceId] = useState<string>('');
  const [exceptionExpiresAt, setExceptionExpiresAt] = useState('');
  const [exceptionReason, setExceptionReason] = useState('');

  // Revoke Exception Prompt State
  const [revokingExceptionId, setRevokingExceptionId] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState('');

  // Policy Settings Form State
  const config = getInstitutionConfig();
  const [maxAdvanceDays, setMaxAdvanceDays] = useState(config.max_advance_booking_days);
  const [maxActiveBookings, setMaxActiveBookings] = useState(config.max_active_bookings_per_user);
  const [maxWeeklyHours, setMaxWeeklyHours] = useState(config.max_weekly_hours_per_user);
  const [cancelWindowHours, setCancelWindowHours] = useState(config.default_cancellation_window_hours);
  const [allowSelfCheckin, setAllowSelfCheckin] = useState(config.allow_self_checkin);
  const [policyReason, setPolicyReason] = useState('');

  if (!user) return null;

  const metrics = getManagerDashboardMetrics();
  const resources = getResources();
  const users = getUsers();

  // Handlers
  const handleResolveDispute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingReportId) return;

    if (!disputeDecisionReason || disputeDecisionReason.trim().length < 8) {
      setErrorMsg('A valid administrative decision rationale (minimum 8 characters) is mandatory.');
      return;
    }

    const res = resolveManagerDispute(
      resolvingReportId,
      user.id,
      disputeNotes.trim() || 'Reviewed and adjudicated by campus facilities administration.',
      equipmentAction,
      disputeDecisionReason.trim()
    );

    if ('error' in res) {
      setErrorMsg(res.error);
    } else {
      setSuccessMsg('Dispute and incident successfully resolved. Equipment and custody states updated.');
      setResolvingReportId(null);
      setDisputeNotes('');
      setDisputeDecisionReason('');
    }
  };

  const handleGrantException = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserId || !exceptionExpiresAt) return;

    if (!exceptionReason || exceptionReason.trim().length < 8) {
      setErrorMsg('An administrative justification rationale (minimum 8 characters) is required.');
      return;
    }

    const res = grantAccessException(
      {
        user_id: targetUserId,
        resource_id: exceptionResourceId || undefined,
        exception_type: exceptionType,
        reason: exceptionReason.trim(),
        approved_by: user.id,
        expires_at: new Date(exceptionExpiresAt).toISOString(),
      },
      user.id,
      exceptionReason.trim()
    );

    if ('error' in res) {
      setErrorMsg(res.error);
    } else {
      setSuccessMsg('Access exception granted and recorded to the campus compliance ledger.');
      setIsExceptionModalOpen(false);
      setTargetUserId('');
      setExceptionReason('');
    }
  };

  const handleRevokeException = () => {
    if (!revokingExceptionId) return;

    if (!revokeReason || revokeReason.trim().length < 5) {
      setErrorMsg('A valid reason for revoking the access exception is required.');
      return;
    }

    const res = revokeAccessException(revokingExceptionId, user.id, revokeReason.trim());
    if (typeof res === 'object' && 'error' in res) {
      setErrorMsg(res.error);
    } else {
      setSuccessMsg('Access exception revoked. Standard qualification enforcement restored.');
      setRevokingExceptionId(null);
      setRevokeReason('');
    }
  };

  const handleSavePolicies = (e: React.FormEvent) => {
    e.preventDefault();

    if (!policyReason || policyReason.trim().length < 8) {
      setErrorMsg('Administrative justification rationale (minimum 8 characters) is required to adjust campus quotas.');
      return;
    }

    const res = updateInstitutionConfig(
      {
        max_advance_booking_days: Number(maxAdvanceDays),
        max_active_bookings_per_user: Number(maxActiveBookings),
        max_weekly_hours_per_user: Number(maxWeeklyHours),
        default_cancellation_window_hours: Number(cancelWindowHours),
        allow_self_checkin: allowSelfCheckin,
      },
      user.id,
      policyReason.trim()
    );

    if ('error' in res) {
      setErrorMsg(res.error);
    } else {
      setSuccessMsg('Campus access policies successfully updated and logged to audit trail.');
      setPolicyReason('');
    }
  };

  return (
    <div className="space-y-8 w-full max-w-full overflow-x-hidden pb-16 font-mono text-xs">
      
      {/* ─── 01 / MASTHEAD ─── */}
      <section className="border-b border-[#DCD9CF] pb-6 pt-2">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#183D30] font-bold bg-[#183D30]/10 px-2.5 py-1 border border-[#183D30]/20">
              CAMPUS GOVERNANCE / 05
            </span>
            <span className="text-[11px] font-mono text-[#7E8276] uppercase tracking-wider">
              FACILITIES OVERSIGHT & FAIR ALLOCATION
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExceptionModalOpen(true)}
              className="px-3.5 py-2 bg-[#F3F0E8] hover:bg-[#DCD9CF] border border-[#DCD9CF] text-[#252722] uppercase font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#183D30]" />
              <span>GRANT EXCEPTION</span>
            </button>

            <button
              onClick={() => navigate('/audit')}
              className="px-4 py-2 bg-[#183D30] hover:bg-[#204e3e] text-[#D8FF3E] uppercase font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <span>AUDIT LEDGER</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-[#252722] tracking-tight leading-tight">
              Institutional Oversight & Governance
            </h1>
            <p className="mt-2 text-sm text-[#565950] font-sans leading-relaxed max-w-xl">
              Campus-wide asset utilization, real-time idle capacity telemetry, formal dispute adjudication, and cross-departmental fairness enforcement.
            </p>
          </div>

          {/* Operational Metrics Matrix Strip */}
          <div className="flex items-stretch gap-px bg-[#DCD9CF] border border-[#DCD9CF] shrink-0 font-mono">
            <div className="bg-[#FCFBF7] p-3 sm:px-4">
              <span className="text-[10px] uppercase text-[#7E8276] block">Catalog</span>
              <span className="text-xl font-bold text-[#252722] mt-0.5 block">{metrics.totalCatalog}</span>
            </div>
            <div className="bg-[#FCFBF7] p-3 sm:px-4">
              <span className="text-[10px] uppercase text-[#7E8276] block">Utilization</span>
              <span className="text-xl font-bold text-[#183D30] mt-0.5 block">{metrics.utilizationPercent}%</span>
            </div>
            <div className="bg-[#FCFBF7] p-3 sm:px-4">
              <span className="text-[10px] uppercase text-[#7E8276] block">Idle Cap</span>
              <span className="text-xl font-bold text-[#565950] mt-0.5 block">{metrics.idlePercent}%</span>
            </div>
            <div className="bg-[#FCFBF7] p-3 sm:px-4">
              <span className="text-[10px] uppercase text-[#7E8276] block">Disputes</span>
              <span className={`text-xl font-bold mt-0.5 block ${metrics.openIncidents.length > 0 ? 'text-[#854D0E]' : 'text-[#183D30]'}`}>
                {metrics.openIncidents.length}
              </span>
            </div>
            <div className="bg-[#FCFBF7] p-3 sm:px-4">
              <span className="text-[10px] uppercase text-[#7E8276] block">Waitlists</span>
              <span className="text-xl font-bold text-[#252722] mt-0.5 block">{metrics.waitlistedBookings.length}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3 bg-[#183D30] text-[#D8FF3E] font-mono text-xs flex items-center justify-between border border-[#183D30]">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-[#D8FF3E]" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-[#D8FF3E] hover:underline cursor-pointer uppercase">
            DISMISS
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-[#EAE5D8] border border-[#DCD9CF] text-[#854D0E] font-mono text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#854D0E]" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-[#854D0E] hover:underline cursor-pointer uppercase">
            DISMISS
          </button>
        </div>
      )}

      {/* ─── 02 / MAIN TABS NAVIGATION ─── */}
      <div className="flex border-b border-[#DCD9CF] gap-1 overflow-x-auto text-xs font-mono font-bold uppercase tracking-wider">
        <button
          onClick={() => setActiveTab('escalations')}
          className={`px-4 py-3 border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap transition-colors ${
            activeTab === 'escalations' 
              ? 'border-[#183D30] text-[#183D30] bg-[#183D30]/5' 
              : 'border-transparent text-[#7E8276] hover:text-[#252722]'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>ESCALATIONS ({metrics.openIncidents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('capacity')}
          className={`px-4 py-3 border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap transition-colors ${
            activeTab === 'capacity' 
              ? 'border-[#183D30] text-[#183D30] bg-[#183D30]/5' 
              : 'border-transparent text-[#7E8276] hover:text-[#252722]'
          }`}
        >
          <PieChart className="w-4 h-4" />
          <span>CAPACITY & UTILIZATION</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('demand_ai');
            if (!demandInsights && !isLoadingInsights) {
              handleFetchDemandInsights();
            }
          }}
          className={`px-4 py-3 border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap transition-colors ${
            activeTab === 'demand_ai' 
              ? 'border-[#183D30] text-[#183D30] bg-[#183D30]/5' 
              : 'border-transparent text-[#7E8276] hover:text-[#252722]'
          }`}
        >
          <Sparkles className="w-4 h-4 text-[#183D30]" />
          <span>DEMAND & AI SYNTHESIS</span>
        </button>

        <button
          onClick={() => setActiveTab('waitlists')}
          className={`px-4 py-3 border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap transition-colors ${
            activeTab === 'waitlists' 
              ? 'border-[#183D30] text-[#183D30] bg-[#183D30]/5' 
              : 'border-transparent text-[#7E8276] hover:text-[#252722]'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>WAITLISTS ({metrics.waitlistedBookings.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('fairness')}
          className={`px-4 py-3 border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap transition-colors ${
            activeTab === 'fairness' 
              ? 'border-[#183D30] text-[#183D30] bg-[#183D30]/5' 
              : 'border-transparent text-[#7E8276] hover:text-[#252722]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>FAIRNESS & HOARDING</span>
        </button>

        <button
          onClick={() => setActiveTab('exceptions')}
          className={`px-4 py-3 border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap transition-colors ${
            activeTab === 'exceptions' 
              ? 'border-[#183D30] text-[#183D30] bg-[#183D30]/5' 
              : 'border-transparent text-[#7E8276] hover:text-[#252722]'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>EXCEPTIONS ({metrics.accessExceptions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('policies')}
          className={`px-4 py-3 border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap transition-colors ${
            activeTab === 'policies' 
              ? 'border-[#183D30] text-[#183D30] bg-[#183D30]/5' 
              : 'border-transparent text-[#7E8276] hover:text-[#252722]'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>POLICIES</span>
        </button>
      </div>

      {/* ─── TAB 1: Escalations & Disputes ─── */}
      {activeTab === 'escalations' && (
        <div className="bg-[#FCFBF7] border border-[#DCD9CF] space-y-4">
          <div className="p-5 border-b border-[#DCD9CF] flex items-center justify-between">
            <div>
              <span className="text-[10px] text-[#7E8276] uppercase tracking-wider block">DISPUTED RETURNS & EQUIPMENT HOLDS</span>
              <h2 className="font-display text-base font-bold text-[#252722] mt-0.5">
                Pending Incident Reviews & Adjudication ({metrics.openIncidents.length})
              </h2>
              <p className="text-xs font-sans text-[#565950] mt-0.5">Formal managerial review channel for damage reports, equipment holds, and unresolved handovers.</p>
            </div>
          </div>

          {metrics.openIncidents.length === 0 ? (
            <div className="p-12 text-center text-[#7E8276] text-xs">
              Zero open incidents or escalated disputes across all university laboratories.
            </div>
          ) : (
            <div className="divide-y divide-[#DCD9CF]">
              {metrics.openIncidents.map((rep) => {
                const res = resources.find((r) => r.id === rep.resource_id);
                const reporter = getUserById(rep.reporter_id);

                return (
                  <div key={rep.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono text-xs">
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="text-sm font-display font-bold text-[#252722]">{res?.name}</strong>
                        <span className="px-2 py-0.5 bg-[#EAE5D8] border border-[#DCD9CF] text-[#854D0E] text-[10px] uppercase font-bold">
                          CONDITION: {rep.condition}
                        </span>
                        <span className="px-2 py-0.5 bg-[#183D30]/10 border border-[#183D30]/20 text-[#183D30] text-[10px] font-bold">
                          STATUS: {rep.incident_status || 'Open'}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#565950]">
                        SUBMITTED BY: <strong>{reporter?.full_name}</strong> ({reporter?.department}) • DATE: {formatDateTime(rep.created_at)}
                      </p>
                      <div className="p-3 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722] text-[11px] font-sans">
                        <strong className="font-mono text-[10px] uppercase block text-[#7E8276]">Evidence Notes:</strong>
                        <p className="mt-0.5">{rep.notes}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          setResolvingReportId(rep.id);
                          setDisputeNotes('');
                          setDisputeDecisionReason('');
                          setEquipmentAction('restore_available');
                        }}
                        className="px-4 py-2 bg-[#183D30] hover:bg-[#204e3e] text-[#D8FF3E] font-bold uppercase cursor-pointer"
                      >
                        REVIEW & ADJUDICATE
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: Capacity & Utilization ─── */}
      {activeTab === 'capacity' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Department Allocation Breakdown */}
          <div className="bg-[#FCFBF7] border border-[#DCD9CF] p-6 space-y-4">
            <div className="border-b border-[#DCD9CF] pb-3">
              <span className="text-[10px] text-[#7E8276] uppercase tracking-wider block">EQUITY ALLOCATION</span>
              <h2 className="font-display text-base font-bold text-[#252722] mt-0.5">
                Department Allocation Hours
              </h2>
              <p className="text-xs font-sans text-[#565950] mt-0.5">Total equipment operating hours consumed per academic unit from recorded sessions.</p>
            </div>

            <div className="space-y-4 pt-2">
              {Object.entries(metrics.departmentHours).map(([dept, hours]) => {
                const totalCampusHours = Object.values(metrics.departmentHours).reduce((a, b) => a + b, 0) || 1;
                const percentage = Math.round((hours / totalCampusHours) * 100);

                return (
                  <div key={dept} className="space-y-1.5 font-mono text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#252722] uppercase">{dept}</span>
                      <span className="text-[#565950]">{hours} HRS ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-[#EAE7DC] h-2 border border-[#DCD9CF]">
                      <div
                        className={`h-full ${percentage > 40 ? 'bg-[#854D0E]' : 'bg-[#183D30]'}`}
                        style={{ width: `${Math.max(percentage, 4)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Catalog Status Distribution */}
          <div className="bg-[#FCFBF7] border border-[#DCD9CF] p-6 space-y-4">
            <div className="border-b border-[#DCD9CF] pb-3">
              <span className="text-[10px] text-[#7E8276] uppercase tracking-wider block">FACILITY BREAKDOWN</span>
              <h2 className="font-display text-base font-bold text-[#252722] mt-0.5">
                Campus Asset Availability Distribution
              </h2>
              <p className="text-xs font-sans text-[#565950] mt-0.5">Live operational status across all shared research equipment.</p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 font-mono">
              <div className="p-4 bg-[#F3F0E8] border border-[#DCD9CF]">
                <span className="text-[10px] uppercase text-[#7E8276] block">AVAILABLE CIRCULATION</span>
                <p className="text-2xl font-bold text-[#183D30] mt-1">{metrics.availableCount}</p>
                <span className="text-[10px] text-[#565950]">Ready for booking</span>
              </div>

              <div className="p-4 bg-[#F3F0E8] border border-[#DCD9CF]">
                <span className="text-[10px] uppercase text-[#7E8276] block">ACTIVE IN LABORATORY</span>
                <p className="text-2xl font-bold text-[#252722] mt-1">{metrics.inUseCount}</p>
                <span className="text-[10px] text-[#565950]">Currently checked out</span>
              </div>

              <div className="p-4 bg-[#F3F0E8] border border-[#DCD9CF]">
                <span className="text-[10px] uppercase text-[#7E8276] block">UNDER MAINTENANCE</span>
                <p className="text-2xl font-bold text-[#854D0E] mt-1">{metrics.inMaintenanceCount}</p>
                <span className="text-[10px] text-[#565950]">Calibration / Repair</span>
              </div>

              <div className="p-4 bg-[#F3F0E8] border border-[#DCD9CF]">
                <span className="text-[10px] uppercase text-[#7E8276] block">ARCHIVED / RETIRED</span>
                <p className="text-2xl font-bold text-[#7E8276] mt-1">{metrics.retiredCount}</p>
                <span className="text-[10px] text-[#7E8276]">Historical inventory</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 3: Demand & AI Synthesis ─── */}
      {activeTab === 'demand_ai' && (
        <div className="space-y-6">
          {/* Masthead Banner */}
          <div className="bg-[#183D30] text-[#F3F0E8] p-6 border border-[#0F2820] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-mono px-2 py-0.5 uppercase tracking-wider bg-[#D8FF3E] text-[#183D30] font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#183D30]" />
                  <span>DEMAND INTELLIGENCE</span>
                </span>
                {demandInsights && (
                  <span className="text-[10px] font-mono px-2 py-0.5 uppercase tracking-wider border border-[#AAB6A1] text-[#AAB6A1]">
                    {demandInsights.engineMode === 'gemini_ai' ? 'GEMINI 3.8 FLASH' : 'DETERMINISTIC TELEMETRY'}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-display font-bold">Institutional Demand Summary & AI Synthesis</h2>
              <p className="text-xs font-sans text-[#AAB6A1] mt-0.5">
                Evaluates reservation logs and waiting-list records to identify peak periods, capacity bottlenecks, and underutilized equipment.
              </p>
            </div>

            <button
              type="button"
              disabled={isLoadingInsights}
              onClick={handleFetchDemandInsights}
              className="px-4 py-2 bg-[#D8FF3E] hover:bg-[#c5ea2b] disabled:opacity-50 text-[#183D30] font-mono uppercase text-xs font-bold flex items-center gap-2 cursor-pointer shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingInsights ? 'animate-spin' : ''}`} />
              <span>{isLoadingInsights ? 'SYNTHESIZING...' : 'RE-ANALYZE TELEMETRY'}</span>
            </button>
          </div>

          {/* Operational Safeguard Banner */}
          <div className="p-4 bg-[#EAE5D8] border border-[#DCD9CF] text-xs font-mono text-[#854D0E] flex items-start gap-3">
            <Shield className="w-4 h-4 text-[#854D0E] shrink-0 mt-0.5" />
            <div>
              <strong className="block uppercase text-[10px] font-bold">OPERATIONAL SAFEGUARD NOTICE: CONSEQUENTIAL DECISIONS REQUIRE HUMAN SIGN-OFF</strong>
              <p className="text-[11px] font-sans text-[#252722] mt-0.5 leading-relaxed">
                All AI-generated interpretations, scheduling recommendations, and reallocation suggestions are advisory only. Operational decisions—including asset deactivation, department quota alterations, and approval policy adjustments—require formal staff justification and immutable audit logging.
              </p>
            </div>
          </div>

          {isLoadingInsights && !demandInsights ? (
            <div className="bg-[#FCFBF7] border border-[#DCD9CF] p-12 text-center text-[#7E8276] text-xs space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#183D30]" />
              <p className="font-bold text-[#252722]">Evaluating reservation logs, waitlists, and physical custody reports...</p>
            </div>
          ) : demandInsights ? (
            <div className="space-y-6">
              {/* Telemetry Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-[#DCD9CF] pb-2">
                  <span className="w-2 h-2 bg-[#183D30]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#252722]">
                    MEASURED DATABASE TELEMETRY (GROUND TRUTH FACTS)
                  </h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                  <div className="p-4 bg-[#FCFBF7] border border-[#DCD9CF]">
                    <span className="text-[10px] uppercase text-[#7E8276] block">BOOKINGS EVALUATED</span>
                    <span className="text-2xl font-bold text-[#252722] mt-1 block">
                      {demandInsights.telemetry.totalBookingsEvaluated}
                    </span>
                    <span className="text-[10px] text-[#7E8276]">Recorded events</span>
                  </div>

                  <div className="p-4 bg-[#FCFBF7] border border-[#DCD9CF]">
                    <span className="text-[10px] uppercase text-[#7E8276] block">ACTIVE IN CUSTODY</span>
                    <span className="text-2xl font-bold text-[#183D30] mt-1 block">
                      {demandInsights.telemetry.activeLoanCount}
                    </span>
                    <span className="text-[10px] text-[#7E8276]">Currently loaned</span>
                  </div>

                  <div className="p-4 bg-[#FCFBF7] border border-[#DCD9CF]">
                    <span className="text-[10px] uppercase text-[#7E8276] block">WAITLIST BACKLOG</span>
                    <span className="text-2xl font-bold text-[#854D0E] mt-1 block">
                      {demandInsights.telemetry.waitlistCount}
                    </span>
                    <span className="text-[10px] text-[#7E8276]">Queued requests</span>
                  </div>

                  <div className="p-4 bg-[#FCFBF7] border border-[#DCD9CF]">
                    <span className="text-[10px] uppercase text-[#7E8276] block">IDLE HEADROOM</span>
                    <span className="text-2xl font-bold text-[#565950] mt-1 block">
                      {demandInsights.telemetry.campusIdlePercentage}%
                    </span>
                    <span className="text-[10px] text-[#7E8276]">Campus idle capacity</span>
                  </div>
                </div>

                {/* Top Requested Hardware Table */}
                <div className="bg-[#FCFBF7] border border-[#DCD9CF] overflow-hidden">
                  <div className="p-4 border-b border-[#DCD9CF] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-[#7E8276] uppercase tracking-wider block">CAMPUS EQUIPMENT RANKING</span>
                      <h4 className="text-xs font-bold text-[#252722] uppercase tracking-wider mt-0.5">
                        Highest-Demand Research Hardware
                      </h4>
                    </div>
                  </div>

                  <div className="overflow-x-auto font-mono text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-[#F3F0E8] text-[10px] text-[#7E8276] uppercase tracking-wider border-b border-[#DCD9CF]">
                        <tr>
                          <th className="p-3">Asset Name</th>
                          <th className="p-3">Category</th>
                          <th className="p-3 text-center">Bookings</th>
                          <th className="p-3 text-center">Waitlist</th>
                          <th className="p-3 text-center">Total Hours</th>
                          <th className="p-3 text-center">Utilization</th>
                          <th className="p-3 text-right">Idle %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#DCD9CF]">
                        {demandInsights.telemetry.topRequestedAssets.slice(0, 5).map((asset) => (
                          <tr key={asset.resource_id} className="hover:bg-[#F3F0E8]/50">
                            <td className="p-3 font-bold text-[#252722]">{asset.name}</td>
                            <td className="p-3 text-[#565950]">{asset.category_name}</td>
                            <td className="p-3 text-center font-bold text-[#252722]">{asset.booking_count}</td>
                            <td className="p-3 text-center font-bold text-[#854D0E]">
                              {asset.waitlist_count > 0 ? `+${asset.waitlist_count}` : '0'}
                            </td>
                            <td className="p-3 text-center text-[#565950]">{asset.total_hours}h</td>
                            <td className="p-3 text-center">
                              <span className="px-2 py-0.5 bg-[#183D30]/10 border border-[#183D30]/20 text-[#183D30] font-bold text-[10px]">
                                {asset.utilization_rate}%
                              </span>
                            </td>
                            <td className="p-3 text-right text-[#7E8276]">{asset.idle_percentage}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* AI-Generated Synthesis */}
              <div className="space-y-4 pt-4 border-t border-[#DCD9CF]">
                <div className="flex items-center gap-2 border-b border-[#DCD9CF] pb-2">
                  <span className="w-2 h-2 bg-[#D8FF3E]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#252722]">
                    AI-GENERATED SYNTHESIS & OPERATIONAL INTERPRETATIONS
                  </h3>
                </div>

                <div className="p-5 bg-[#FCFBF7] border border-[#DCD9CF] space-y-2">
                  <span className="text-[10px] text-[#7E8276] uppercase block font-bold">EXECUTIVE OPERATIONAL SYNTHESIS</span>
                  <p className="text-xs font-sans text-[#252722] leading-relaxed">
                    {demandInsights.synthesis.executiveSummary}
                  </p>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-4 bg-[#FCFBF7] border border-[#DCD9CF] space-y-2">
                    <span className="text-[10px] text-[#183D30] font-bold uppercase block">SCHEDULING ADVICE</span>
                    <ul className="space-y-1.5 text-[11px] font-sans text-[#565950]">
                      {demandInsights.synthesis.schedulingRecommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-[#183D30] font-bold">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 bg-[#FCFBF7] border border-[#DCD9CF] space-y-2">
                    <span className="text-[10px] text-[#854D0E] font-bold uppercase block">PREVENTATIVE MAINTENANCE</span>
                    <ul className="space-y-1.5 text-[11px] font-sans text-[#565950]">
                      {demandInsights.synthesis.preventativeMaintenanceAdvice.map((adv, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-[#854D0E] font-bold">•</span>
                          <span>{adv}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 bg-[#FCFBF7] border border-[#DCD9CF] space-y-2">
                    <span className="text-[10px] text-[#252722] font-bold uppercase block">CAPACITY REALLOCATIONS</span>
                    <ul className="space-y-1.5 text-[11px] font-sans text-[#565950]">
                      {demandInsights.synthesis.capacityReallocationSuggestions.map((sug, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-[#252722] font-bold">•</span>
                          <span>{sug}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#FCFBF7] border border-[#DCD9CF] p-8 text-center text-xs text-[#7E8276]">
              Click "RE-ANALYZE TELEMETRY" to synthesize operational demand insights from stored database records.
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 4: Waitlists ─── */}
      {activeTab === 'waitlists' && (
        <div className="bg-[#FCFBF7] border border-[#DCD9CF] overflow-hidden">
          <div className="p-5 border-b border-[#DCD9CF] flex items-center justify-between">
            <div>
              <span className="text-[10px] text-[#7E8276] uppercase tracking-wider block">QUEUE OVERSIGHT</span>
              <h2 className="font-display text-base font-bold text-[#252722] mt-0.5">
                Waitlisted Reservation Requests ({metrics.waitlistedBookings.length})
              </h2>
              <p className="text-xs font-sans text-[#565950] mt-0.5">Unfulfilled demand waiting for slot cancellations or equipment turnover.</p>
            </div>
          </div>

          {metrics.waitlistedBookings.length === 0 ? (
            <div className="p-12 text-center text-[#7E8276] text-xs">
              No waitlisted reservations. Campus capacity currently accommodates requested slots.
            </div>
          ) : (
            <div className="divide-y divide-[#DCD9CF]">
              {metrics.waitlistedBookings.map((b) => {
                const res = resources.find((r) => r.id === b.resource_id);
                const borrower = getUserById(b.borrower_id);

                return (
                  <div key={b.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <strong className="text-sm font-display font-bold text-[#252722]">{res?.name}</strong>
                        <span className="px-2 py-0.5 bg-[#183D30] text-[#D8FF3E] text-[10px] font-bold uppercase">
                          POSITION #{b.waitlist_position || 1}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#565950]">
                        BORROWER: <strong>{borrower?.full_name}</strong> ({borrower?.department}) • WINDOW: {formatDateTime(b.start_time)}
                      </p>
                      <p className="text-[11px] font-sans text-[#7E8276]">
                        Waitlist note: {b.waitlist_reason || 'Requested slot occupied by approved reservation.'}
                      </p>
                    </div>

                    <button
                      onClick={() => navigate('/dashboard')}
                      className="px-3.5 py-1.5 bg-[#F3F0E8] border border-[#DCD9CF] hover:bg-[#DCD9CF] text-[#252722] uppercase font-bold text-[11px] cursor-pointer"
                    >
                      FIND ALTERNATE ASSET
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 5: Fairness & Hoarding ─── */}
      {activeTab === 'fairness' && (
        <div className="space-y-6">
          <div className="p-6 bg-[#183D30] text-[#F3F0E8] border border-[#0F2820] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 bg-[#D8FF3E] text-[#183D30] font-bold">
                INSTITUTIONAL FAIR ALLOCATION POLICY
              </span>
              <span className="text-[11px] font-mono text-[#AAB6A1]">
                AUDITED • ZERO OPAQUE PENALTIES
              </span>
            </div>
            <p className="text-xs font-sans text-[#F3F0E8] leading-relaxed max-w-3xl">
              Dura-Loop enforces transparent, auditable rules for university equipment distribution. No opaque AI score is ever used as the sole basis for denying access or imposing penalties. Every allocation decision cites verifiable database criteria:
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 font-mono text-xs">
              <div className="p-3 bg-[#0F2820] border border-[#225141] space-y-1">
                <strong className="text-[#D8FF3E] block text-[10px] uppercase">RULE 1: FIFO BASELINE</strong>
                <p className="text-[11px] text-[#AAB6A1] font-sans">Unallocated slots reserved first-come, first-served.</p>
              </div>
              <div className="p-3 bg-[#0F2820] border border-[#225141] space-y-1">
                <strong className="text-[#D8FF3E] block text-[10px] uppercase">RULE 2: CAPSTONE PRIORITY</strong>
                <p className="text-[11px] text-[#AAB6A1] font-sans">Senior capstones receive priority over casual coursework.</p>
              </div>
              <div className="p-3 bg-[#0F2820] border border-[#225141] space-y-1">
                <strong className="text-[#D8FF3E] block text-[10px] uppercase">RULE 3: ANTI-HOARDING CAP</strong>
                <p className="text-[11px] text-[#AAB6A1] font-sans">Max 6 active bookings and 30h/week per borrower.</p>
              </div>
              <div className="p-3 bg-[#0F2820] border border-[#225141] space-y-1">
                <strong className="text-[#D8FF3E] block text-[10px] uppercase">RULE 4: COOL-OFF PERIOD</strong>
                <p className="text-[11px] text-[#AAB6A1] font-sans">3+ cancellations in 14 days triggers cooldown.</p>
              </div>
            </div>
          </div>

          {/* Repeat Usage Telemetry */}
          <div className="bg-[#FCFBF7] border border-[#DCD9CF] overflow-hidden">
            <div className="p-5 border-b border-[#DCD9CF] flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#7E8276] uppercase tracking-wider block">BORROWER TELEMETRY</span>
                <h3 className="font-display text-base font-bold text-[#252722] mt-0.5">
                  Repeat Usage & High-Frequency Telemetry
                </h3>
                <p className="text-xs font-sans text-[#565950] mt-0.5">Monitors high-frequency borrowers, hoarding warnings, and repeated cancellations.</p>
              </div>
              <span className="text-xs font-mono text-[#7E8276]">CAP: 30H/WEEK</span>
            </div>

            {metrics.repeatedBookers.length === 0 ? (
              <div className="p-12 text-center text-[#7E8276] text-xs">
                No hoarding alerts detected. All student activity falls within balanced allocation guidelines.
              </div>
            ) : (
              <div className="divide-y divide-[#DCD9CF]">
                {metrics.repeatedBookers.map(({ user: usr, bookingCount, totalHours, cancellations, isHoardingWarning }) => (
                  <div key={usr?.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <strong className="text-sm font-bold text-[#252722]">{usr?.full_name}</strong>
                        <span className="text-xs text-[#565950]">({usr?.department})</span>
                        {isHoardingWarning && (
                          <span className="px-2 py-0.5 bg-[#EAE5D8] border border-[#DCD9CF] text-[#854D0E] text-[10px] font-bold uppercase">
                            HIGH UTILIZATION ALERT
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#565950]">
                        Past 7 days: <strong>{bookingCount} sessions</strong> • Cumulative: <strong>{totalHours} hrs</strong>
                      </p>
                      {cancellations > 0 && (
                        <p className="text-[11px] text-[#854D0E]">
                          {cancellations} reservation cancellation(s) recorded recently.
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => navigate('/audit')}
                      className="px-3.5 py-1.5 bg-[#F3F0E8] border border-[#DCD9CF] hover:bg-[#DCD9CF] text-[#252722] uppercase font-bold text-[11px] cursor-pointer"
                    >
                      INSPECT AUDIT LOG
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 6: Exceptions ─── */}
      {activeTab === 'exceptions' && (
        <div className="bg-[#FCFBF7] border border-[#DCD9CF] overflow-hidden">
          <div className="p-5 border-b border-[#DCD9CF] flex items-center justify-between">
            <div>
              <span className="text-[10px] text-[#7E8276] uppercase tracking-wider block">COMPLIANCE WAIVERS</span>
              <h2 className="font-display text-base font-bold text-[#252722] mt-0.5">
                Authorized Institutional Access Exceptions ({metrics.accessExceptions.length})
              </h2>
              <p className="text-xs font-sans text-[#565950] mt-0.5">Formal waivers for research deadlines, supervised training overrides, and quota extensions.</p>
            </div>
            <button
              onClick={() => setIsExceptionModalOpen(true)}
              className="px-3.5 py-2 bg-[#183D30] hover:bg-[#204e3e] text-[#D8FF3E] uppercase font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Key className="w-3.5 h-3.5" />
              <span>GRANT EXCEPTION</span>
            </button>
          </div>

          {metrics.accessExceptions.length === 0 ? (
            <div className="p-12 text-center text-[#7E8276] text-xs">
              No active managerial exceptions. Standard safety and quota gates apply to all users.
            </div>
          ) : (
            <div className="divide-y divide-[#DCD9CF]">
              {metrics.accessExceptions.map((exc) => {
                const targetU = users.find((u) => u.id === exc.user_id);
                const targetR = exc.resource_id ? resources.find((r) => r.id === exc.resource_id) : null;
                const approver = users.find((u) => u.id === exc.approved_by);

                return (
                  <div key={exc.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <strong className="text-sm font-bold text-[#252722]">{targetU?.full_name}</strong>
                        <span className="px-2 py-0.5 bg-[#183D30]/10 border border-[#183D30]/20 text-[#183D30] text-[10px] font-bold uppercase">
                          {exc.exception_type.replace('_', ' ')}
                        </span>
                        <span className="px-2 py-0.5 bg-[#F3F0E8] border border-[#DCD9CF] text-[#565950] text-[10px] font-bold uppercase">
                          {targetR ? targetR.name : 'ALL FACILITIES'}
                        </span>
                      </div>
                      <p className="text-xs font-sans text-[#252722] p-2 bg-[#F3F0E8] border border-[#DCD9CF]">
                        <strong>Justification:</strong> {exc.reason}
                      </p>
                      <p className="text-[11px] text-[#7E8276]">
                        APPROVED BY: {approver?.full_name} • EXPIRES: {formatDateTime(exc.expires_at)}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setRevokingExceptionId(exc.id);
                        setRevokeReason('');
                      }}
                      className="px-3 py-1.5 bg-[#F3F0E8] border border-[#DCD9CF] hover:bg-[#EAE5D8] text-[#854D0E] uppercase font-bold text-[11px] cursor-pointer"
                    >
                      REVOKE EXCEPTION
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 7: Policies ─── */}
      {activeTab === 'policies' && (
        <div className="bg-[#FCFBF7] border border-[#DCD9CF] p-6 space-y-6">
          <div className="border-b border-[#DCD9CF] pb-3">
            <span className="text-[10px] text-[#7E8276] uppercase tracking-wider block">SYSTEM RULES</span>
            <h2 className="font-display text-base font-bold text-[#252722] mt-0.5">
              Campus Policy Settings & Quota Administration
            </h2>
            <p className="text-xs font-sans text-[#565950] mt-0.5">Configure global limits for student reservations. All changes require an administrative rationale for the audit record.</p>
          </div>

          <form onSubmit={handleSavePolicies} className="space-y-4 max-w-2xl font-mono text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase text-[#7E8276] mb-1 font-bold">MAX ADVANCE BOOKING (DAYS)</label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={maxAdvanceDays}
                  onChange={(e) => setMaxAdvanceDays(Number(e.target.value))}
                  required
                  className="w-full p-2.5 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722] focus:outline-hidden focus:border-[#183D30]"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-[#7E8276] mb-1 font-bold">MAX ACTIVE BOOKINGS</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={maxActiveBookings}
                  onChange={(e) => setMaxActiveBookings(Number(e.target.value))}
                  required
                  className="w-full p-2.5 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722] focus:outline-hidden focus:border-[#183D30]"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-[#7E8276] mb-1 font-bold">MAX WEEKLY HOURS / STUDENT</label>
                <input
                  type="number"
                  min="5"
                  max="80"
                  value={maxWeeklyHours}
                  onChange={(e) => setMaxWeeklyHours(Number(e.target.value))}
                  required
                  className="w-full p-2.5 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722] focus:outline-hidden focus:border-[#183D30]"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-[#7E8276] mb-1 font-bold">CANCELLATION NOTICE WINDOW (HOURS)</label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={cancelWindowHours}
                  onChange={(e) => setCancelWindowHours(Number(e.target.value))}
                  required
                  className="w-full p-2.5 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722] focus:outline-hidden focus:border-[#183D30]"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 p-3 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722] cursor-pointer">
              <input
                type="checkbox"
                checked={allowSelfCheckin}
                onChange={(e) => setAllowSelfCheckin(e.target.checked)}
                className="w-4 h-4 accent-[#183D30]"
              />
              <span className="text-xs uppercase">ALLOW BORROWER DIGITAL SELF-CHECKIN DURING 2-HOUR PRE-SESSION WINDOW</span>
            </label>

            <div className="pt-2">
              <label className="block text-[10px] uppercase text-[#7E8276] mb-1 font-bold">
                MANDATORY POLICY CHANGE RATIONALE <span className="text-[#854D0E]">*</span>
              </label>
              <textarea
                rows={2}
                required
                value={policyReason}
                onChange={(e) => setPolicyReason(e.target.value)}
                placeholder="Reason for modifying campus access parameters (e.g. Midterm exam demand surge, campus council policy revision)..."
                className="w-full p-2.5 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722] focus:outline-hidden focus:border-[#183D30]"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#183D30] hover:bg-[#204e3e] text-[#D8FF3E] font-mono text-xs uppercase font-bold cursor-pointer"
              >
                SAVE INSTITUTIONAL POLICIES
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─── Dispute Resolution Modal ─── */}
      {resolvingReportId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#252722]/70 backdrop-blur-xs font-mono text-xs">
          <div className="bg-[#FCFBF7] border border-[#DCD9CF] max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#DCD9CF]">
              <div>
                <span className="text-[10px] text-[#7E8276] uppercase block">FORMAL ADJUDICATION</span>
                <h3 className="font-display text-base font-bold text-[#252722]">Adjudicate Incident & Resolve Dispute</h3>
              </div>
              <button onClick={() => setResolvingReportId(null)} className="text-[#7E8276] hover:text-[#252722] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResolveDispute} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase text-[#7E8276] mb-1 font-bold">EQUIPMENT POST-RESOLUTION STATUS</label>
                <select
                  value={equipmentAction}
                  onChange={(e) => setEquipmentAction(e.target.value as any)}
                  className="w-full p-2.5 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722] focus:outline-hidden"
                >
                  <option value="restore_available">Restore Equipment to Available Circulation</option>
                  <option value="keep_maintenance">Keep in Maintenance (Awaiting external repair)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase text-[#7E8276] mb-1 font-bold">REPAIR / RESOLUTION NOTES</label>
                <textarea
                  rows={2}
                  required
                  value={disputeNotes}
                  onChange={(e) => setDisputeNotes(e.target.value)}
                  placeholder="Action taken (e.g. Probe replaced from lab stock; multimeter recertified with precision shunt)"
                  className="w-full p-2.5 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-[#7E8276] mb-1 font-bold">
                  MANAGERIAL DECISION RATIONALE <span className="text-[#854D0E]">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={disputeDecisionReason}
                  onChange={(e) => setDisputeDecisionReason(e.target.value)}
                  placeholder="Mandatory administrative rationale justifying resolution and closing dispute..."
                  className="w-full p-2.5 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722] focus:outline-hidden"
                />
              </div>

              <div className="pt-3 border-t border-[#DCD9CF] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResolvingReportId(null)}
                  className="px-4 py-2 bg-[#F3F0E8] border border-[#DCD9CF] hover:bg-[#DCD9CF] text-[#252722] uppercase font-bold cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#183D30] hover:bg-[#204e3e] text-[#D8FF3E] uppercase font-bold cursor-pointer"
                >
                  FINALIZE ADJUDICATION
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Grant Access Exception Modal ─── */}
      {isExceptionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#252722]/70 backdrop-blur-xs font-mono text-xs">
          <div className="bg-[#FCFBF7] border border-[#DCD9CF] max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#DCD9CF]">
              <div>
                <span className="text-[10px] text-[#7E8276] uppercase block">PRIVILEGE OVERRIDE</span>
                <h3 className="font-display text-base font-bold text-[#252722]">Grant Administrative Access Exception</h3>
              </div>
              <button onClick={() => setIsExceptionModalOpen(false)} className="text-[#7E8276] hover:text-[#252722] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGrantException} className="space-y-3">
              <div>
                <label className="block text-[10px] uppercase text-[#7E8276] mb-1 font-bold">TARGET BORROWER</label>
                <select
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  required
                  className="w-full p-2 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722] focus:outline-hidden"
                >
                  <option value="">Select Student or Researcher...</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} ({u.department}) - {u.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase text-[#7E8276] mb-1 font-bold">EXCEPTION SCOPE</label>
                  <select
                    value={exceptionType}
                    onChange={(e) => setExceptionType(e.target.value as any)}
                    className="w-full p-2 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722] focus:outline-hidden"
                  >
                    <option value="training_override">Training Prerequisite Waiver</option>
                    <option value="emergency_access">Emergency Capstone/Grant Access</option>
                    <option value="quota_override">Weekly Hours Quota Extension</option>
                    <option value="extended_hours">Extended Session Duration</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-[#7E8276] mb-1 font-bold">SPECIFIC EQUIPMENT</label>
                  <select
                    value={exceptionResourceId}
                    onChange={(e) => setExceptionResourceId(e.target.value)}
                    className="w-full p-2 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722] focus:outline-hidden"
                  >
                    <option value="">All Institutional Facilities</option>
                    {resources.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase text-[#7E8276] mb-1 font-bold">EXPIRATION DATE & TIME</label>
                <input
                  type="datetime-local"
                  required
                  value={exceptionExpiresAt}
                  onChange={(e) => setExceptionExpiresAt(e.target.value)}
                  className="w-full p-2 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-[#7E8276] mb-1 font-bold">
                  ADMINISTRATIVE JUSTIFICATION RATIONALE <span className="text-[#854D0E]">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={exceptionReason}
                  onChange={(e) => setExceptionReason(e.target.value)}
                  placeholder="Official justification for waiver (e.g. Senior capstone sponsored project; faculty advisor supervised session)..."
                  className="w-full p-2 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722] focus:outline-hidden"
                />
              </div>

              <div className="pt-3 border-t border-[#DCD9CF] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsExceptionModalOpen(false)}
                  className="px-4 py-2 bg-[#F3F0E8] border border-[#DCD9CF] hover:bg-[#DCD9CF] text-[#252722] uppercase font-bold cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#183D30] hover:bg-[#204e3e] text-[#D8FF3E] uppercase font-bold cursor-pointer"
                >
                  CONFIRM EXCEPTION
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Revoke Exception Modal ─── */}
      {revokingExceptionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#252722]/70 backdrop-blur-xs font-mono text-xs">
          <div className="bg-[#FCFBF7] border border-[#DCD9CF] max-w-md w-full p-6 space-y-4">
            <div className="border-b border-[#DCD9CF] pb-2">
              <span className="text-[10px] text-[#7E8276] uppercase block">REVOCATION ACTION</span>
              <h3 className="font-display text-base font-bold text-[#252722]">Revoke Access Exception</h3>
            </div>
            <p className="text-xs font-sans text-[#565950]">Provide an administrative rationale for early termination of this access exception.</p>

            <textarea
              rows={3}
              required
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              placeholder="e.g. Capstone deadline passed; student completed certified safety course; or policy rescinded."
              className="w-full p-2.5 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722] focus:outline-hidden"
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#DCD9CF]">
              <button
                onClick={() => setRevokingExceptionId(null)}
                className="px-4 py-2 bg-[#F3F0E8] border border-[#DCD9CF] hover:bg-[#DCD9CF] text-[#252722] uppercase font-bold cursor-pointer"
              >
                CANCEL
              </button>
              <button
                onClick={handleRevokeException}
                className="px-4 py-2 bg-[#854D0E] hover:bg-[#6b3e0b] text-[#FCFBF7] uppercase font-bold cursor-pointer"
              >
                CONFIRM REVOCATION
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
