import React, { useState } from 'react';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Plus, 
  FileText, 
  Check, 
  X, 
  User, 
  Wrench
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { 
  getConditionReports, 
  getResourceById, 
  getUserById, 
  getUsers,
  updateIncidentStatus, 
  createConditionReport, 
  updateResourceStatus,
  getResources
} from '../data/store';
import { StatusBadge } from '../components/StatusBadge';
import { formatDateTime } from '../utils/formatters';
import type { ConditionReport, IncidentStatus, ConditionRating, User as UserRecord } from '../types';

export const IncidentManagementPage: React.FC = () => {
  const { user } = useAuth();
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved' | 'checkin_out'>('all');
  
  // File incident modal
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedResourceId, setSelectedResourceId] = useState('');
  const [condition, setCondition] = useState<ConditionRating>('damaged');
  const [incidentNotes, setIncidentNotes] = useState('');

  // Resolution modal
  const [resolvingReport, setResolvingReport] = useState<ConditionReport | null>(null);
  const [resolutionStatus, setResolutionStatus] = useState<IncidentStatus>('resolved');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [assignedToUser, setAssignedToUser] = useState<string>('');
  const [markEquipmentAvailable, setMarkEquipmentAvailable] = useState(true);

  if (!user) return null;

  const allReports = getConditionReports();
  const allResources = getResources();
  const allUsers = getUsers();
  const staffUsers = allUsers.filter((u: UserRecord) => ['owner', 'manager', 'admin'].includes(u.role));

  const isPrivileged = user.role === 'manager' || user.role === 'admin' || user.role === 'owner';

  const displayedReports = allReports.filter((r) => {
    if (filter === 'open') {
      return r.type === 'incident' && (r.incident_status === 'open' || r.incident_status === 'investigating');
    }
    if (filter === 'resolved') {
      return r.type === 'incident' && r.incident_status === 'resolved';
    }
    if (filter === 'checkin_out') {
      return r.type === 'check_in' || r.type === 'check_out';
    }
    return true;
  });

  const handleCreateIncident = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResourceId || !incidentNotes) return;

    createConditionReport(
      {
        resource_id: selectedResourceId,
        booking_id: null,
        reporter_id: user.id,
        type: 'incident',
        condition,
        notes: incidentNotes.trim(),
        incident_status: 'open',
      },
      user.id
    );

    // Place resource in maintenance if damaged
    if (condition === 'damaged') {
      updateResourceStatus(selectedResourceId, 'maintenance', user.id);
    }

    setIsReportModalOpen(false);
    setSelectedResourceId('');
    setIncidentNotes('');
  };

  const handleResolveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingReport) return;

    updateIncidentStatus(
      resolvingReport.id,
      resolutionStatus,
      user.id,
      resolutionNotes.trim(),
      assignedToUser || resolvingReport.assigned_to
    );

    if (resolutionStatus === 'resolved' && markEquipmentAvailable) {
      updateResourceStatus(resolvingReport.resource_id, 'available', user.id);
    }

    setResolvingReport(null);
    setResolutionNotes('');
    setAssignedToUser('');
  };

  return (
    <div className="space-y-8 w-full max-w-full overflow-x-hidden pb-16 font-mono text-xs">
      
      {/* ─── 01 / MASTHEAD ─── */}
      <section className="border-b border-[#DCD9CF] pb-6 pt-2">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#183D30] font-bold bg-[#183D30]/10 px-2.5 py-1 border border-[#183D30]/20">
              SAFETY & INTEGRITY / 06
            </span>
            <span className="text-[11px] font-mono text-[#7E8276] uppercase tracking-wider">
              EQUIPMENT MAINTENANCE & INCIDENT LOGS
            </span>
          </div>

          <button
            onClick={() => {
              if (allResources.length > 0) setSelectedResourceId(allResources[0].id);
              setIsReportModalOpen(true);
            }}
            className="px-4 py-2 bg-[#854D0E] hover:bg-[#6b3e0b] text-[#FCFBF7] uppercase font-bold text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>REPORT SAFETY INCIDENT</span>
          </button>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-[#252722] tracking-tight leading-tight">
              Condition Reports & Incidents
            </h1>
            <p className="mt-2 text-sm text-[#565950] font-sans leading-relaxed max-w-xl">
              Track physical equipment wear, document malfunctions, assign reviewers, and manage technical resolution workflows.
            </p>
          </div>

          {/* Operational Metrics Matrix Strip */}
          <div className="flex items-stretch gap-px bg-[#DCD9CF] border border-[#DCD9CF] shrink-0 font-mono">
            <div className="bg-[#FCFBF7] p-3 sm:px-4">
              <span className="text-[10px] uppercase text-[#7E8276] block">All Reports</span>
              <span className="text-xl font-bold text-[#252722] mt-0.5 block">{allReports.length}</span>
            </div>
            <div className="bg-[#FCFBF7] p-3 sm:px-4">
              <span className="text-[10px] uppercase text-[#7E8276] block">Open Incidents</span>
              <span className={`text-xl font-bold mt-0.5 block ${
                allReports.filter((r) => r.type === 'incident' && (r.incident_status === 'open' || r.incident_status === 'investigating')).length > 0 
                  ? 'text-[#854D0E]' 
                  : 'text-[#183D30]'
              }`}>
                {allReports.filter((r) => r.type === 'incident' && (r.incident_status === 'open' || r.incident_status === 'investigating')).length}
              </span>
            </div>
            <div className="bg-[#FCFBF7] p-3 sm:px-4">
              <span className="text-[10px] uppercase text-[#7E8276] block">Resolved</span>
              <span className="text-xl font-bold text-[#183D30] mt-0.5 block">
                {allReports.filter((r) => r.type === 'incident' && r.incident_status === 'resolved').length}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 02 / FILTER TABS ─── */}
      <div className="flex border-b border-[#DCD9CF] gap-1 overflow-x-auto text-xs font-mono font-bold uppercase tracking-wider">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-4 py-3 border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap transition-colors ${
            filter === 'all' 
              ? 'border-[#183D30] text-[#183D30] bg-[#183D30]/5' 
              : 'border-transparent text-[#7E8276] hover:text-[#252722]'
          }`}
        >
          <span>ALL ACTIVITY ({allReports.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setFilter('open')}
          className={`px-4 py-3 border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap transition-colors ${
            filter === 'open' 
              ? 'border-[#183D30] text-[#183D30] bg-[#183D30]/5' 
              : 'border-transparent text-[#7E8276] hover:text-[#252722]'
          }`}
        >
          <span>OPEN INCIDENTS</span>
          <span className="px-1.5 py-0.2 bg-[#854D0E] text-[#FCFBF7] text-[9px] font-bold">
            {allReports.filter((r) => r.type === 'incident' && (r.incident_status === 'open' || r.incident_status === 'investigating')).length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilter('resolved')}
          className={`px-4 py-3 border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap transition-colors ${
            filter === 'resolved' 
              ? 'border-[#183D30] text-[#183D30] bg-[#183D30]/5' 
              : 'border-transparent text-[#7E8276] hover:text-[#252722]'
          }`}
        >
          <span>RESOLVED ({allReports.filter((r) => r.type === 'incident' && r.incident_status === 'resolved').length})</span>
        </button>

        <button
          type="button"
          onClick={() => setFilter('checkin_out')}
          className={`px-4 py-3 border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap transition-colors ${
            filter === 'checkin_out' 
              ? 'border-[#183D30] text-[#183D30] bg-[#183D30]/5' 
              : 'border-transparent text-[#7E8276] hover:text-[#252722]'
          }`}
        >
          <span>HANDOVER LOGS ({allReports.filter((r) => r.type === 'check_in' || r.type === 'check_out').length})</span>
        </button>
      </div>

      {/* ─── 03 / REPORTS LIST ─── */}
      {displayedReports.length === 0 ? (
        <div className="bg-[#FCFBF7] border border-[#DCD9CF] p-12 text-center text-[#7E8276] text-xs">
          <FileText className="w-10 h-10 text-[#AAB6A1] mx-auto mb-2" />
          <h3 className="font-display font-bold text-sm text-[#252722] uppercase tracking-wide">NO CONDITION REPORTS FOUND</h3>
          <p className="text-xs font-sans text-[#565950] mt-1">There are no records matching your active filter.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedReports.map((rpt) => {
            const resource = getResourceById(rpt.resource_id);
            const reporter = getUserById(rpt.reporter_id);
            const resolver = rpt.resolved_by ? getUserById(rpt.resolved_by) : null;

            return (
              <div
                key={rpt.id}
                className={`bg-[#FCFBF7] border p-6 space-y-4 transition-all ${
                  rpt.type === 'incident' && rpt.incident_status !== 'resolved'
                    ? 'border-[#854D0E] bg-[#FCFBF7]'
                    : 'border-[#DCD9CF]'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#DCD9CF] pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      rpt.type === 'incident' ? 'bg-[#854D0E] text-[#FCFBF7]' : 'bg-[#183D30]/10 text-[#183D30]'
                    }`}>
                      {rpt.type.replace('_', ' ')}
                    </span>
                    <StatusBadge status={rpt.condition} size="sm" />
                    {rpt.incident_status && (
                      <StatusBadge status={rpt.incident_status} size="sm" />
                    )}
                  </div>

                  <span className="text-[11px] font-mono text-[#7E8276]">
                    {formatDateTime(rpt.created_at)}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-display font-bold text-[#252722]">{resource?.name}</h3>
                  <p className="text-[11px] text-[#565950]">
                    Location: {resource?.location_building}, Room {resource?.location_room} • Reported by: <strong>{reporter?.full_name}</strong> ({reporter?.department})
                  </p>
                </div>

                <div className="p-3 bg-[#F3F0E8] border border-[#DCD9CF] text-xs font-sans text-[#252722] leading-relaxed">
                  <strong className="text-[10px] font-mono uppercase text-[#7E8276] block mb-0.5">OBSERVATION / INCIDENT DETAIL:</strong>
                  {rpt.notes}
                </div>

                {rpt.assigned_reviewer_name && (
                  <div className="flex items-center gap-2 text-xs text-[#183D30] bg-[#183D30]/5 border border-[#183D30]/20 px-3 py-1.5 w-fit font-mono">
                    <User className="w-3.5 h-3.5 text-[#183D30]" />
                    <span>ASSIGNED REVIEWER: <strong>{rpt.assigned_reviewer_name}</strong></span>
                  </div>
                )}

                {rpt.resolution_notes && (
                  <div className="p-3.5 bg-[#183D30]/10 border border-[#183D30]/20 text-xs font-mono text-[#183D30] space-y-1">
                    <div className="flex items-center justify-between font-bold">
                      <div className="flex items-center gap-1.5">
                        <Wrench className="w-3.5 h-3.5 text-[#183D30]" />
                        <span>RESOLUTION STAMPED BY {resolver?.full_name?.toUpperCase() ?? 'STAFF'}</span>
                      </div>
                      {rpt.resolved_at && (
                        <span className="text-[10px] text-[#183D30]">
                          {formatDateTime(rpt.resolved_at)}
                        </span>
                      )}
                    </div>
                    <p className="text-[#252722] font-sans text-xs">{rpt.resolution_notes}</p>
                  </div>
                )}

                {/* Manager / Admin / Owner Resolution Action */}
                {isPrivileged && rpt.type === 'incident' && rpt.incident_status !== 'resolved' && (
                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => {
                        setResolvingReport(rpt);
                        setResolutionStatus('resolved');
                        setResolutionNotes('');
                      }}
                      className="px-4 py-2 bg-[#183D30] hover:bg-[#204e3e] text-[#D8FF3E] uppercase font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      <span>INVESTIGATE / RESOLVE INCIDENT</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Incident Filing Modal ─── */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#252722]/70 backdrop-blur-xs font-mono text-xs">
          <div className="bg-[#FCFBF7] border border-[#DCD9CF] max-w-lg w-full p-6 space-y-4">
            <div className="flex items-start justify-between border-b border-[#DCD9CF] pb-3">
              <div>
                <span className="text-[10px] text-[#7E8276] uppercase block">FORMAL DISPATCH</span>
                <h3 className="font-display text-base font-bold text-[#252722]">Report Equipment Incident</h3>
              </div>
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="text-[#7E8276] hover:text-[#252722] p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateIncident} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase text-[#7E8276] mb-1 font-bold">AFFECTED SPECIMEN</label>
                <select
                  value={selectedResourceId}
                  onChange={(e) => setSelectedResourceId(e.target.value)}
                  required
                  className="w-full p-2.5 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722] focus:outline-hidden"
                >
                  {allResources.map((r) => (
                    <option key={r.id} value={r.id}>{r.name} ({r.location_building})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase text-[#7E8276] mb-1 font-bold">SEVERITY / CONDITION</label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as ConditionRating)}
                  className="w-full p-2.5 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722] focus:outline-hidden"
                >
                  <option value="damaged">Damaged / Non-functional (Requires Maintenance)</option>
                  <option value="fair">Fair (Degraded accuracy / missing accessory)</option>
                  <option value="good">Good (Minor cosmetic wear)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase text-[#7E8276] mb-1 font-bold">
                  INCIDENT DESCRIPTION <span className="text-[#854D0E]">*</span>
                </label>
                <textarea
                  rows={3}
                  value={incidentNotes}
                  onChange={(e) => setIncidentNotes(e.target.value)}
                  required
                  placeholder="Detail symptoms, error codes displayed, unusual noise/odor, or missing components..."
                  className="w-full p-2.5 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722] focus:outline-hidden"
                />
              </div>

              <div className="pt-2 border-t border-[#DCD9CF] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="px-4 py-2 bg-[#F3F0E8] border border-[#DCD9CF] hover:bg-[#DCD9CF] text-[#252722] uppercase font-bold cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#854D0E] hover:bg-[#6b3e0b] text-[#FCFBF7] uppercase font-bold cursor-pointer"
                >
                  SUBMIT REPORT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Incident Resolution Modal ─── */}
      {resolvingReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#252722]/70 backdrop-blur-xs font-mono text-xs">
          <div className="bg-[#FCFBF7] border border-[#DCD9CF] max-w-lg w-full p-6 space-y-4">
            <div className="flex items-start justify-between border-b border-[#DCD9CF] pb-3">
              <div>
                <span className="text-[10px] text-[#7E8276] uppercase block">RESOLUTION PROTOCOL</span>
                <h3 className="font-display text-base font-bold text-[#252722]">Update Incident Status</h3>
              </div>
              <button
                onClick={() => setResolvingReport(null)}
                className="text-[#7E8276] hover:text-[#252722] p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResolveSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase text-[#7E8276] mb-1 font-bold">ASSIGN RESPONSIBLE REVIEWER</label>
                <select
                  value={assignedToUser}
                  onChange={(e) => setAssignedToUser(e.target.value)}
                  className="w-full p-2.5 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722] focus:outline-hidden"
                >
                  <option value="">Assign to Reviewer (Optional)</option>
                  {staffUsers.map((su) => (
                    <option key={su.id} value={su.id}>
                      {su.full_name} ({su.role} • {su.department})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase text-[#7E8276] mb-1 font-bold">STATUS TRANSITION</label>
                <select
                  value={resolutionStatus}
                  onChange={(e) => setResolutionStatus(e.target.value as IncidentStatus)}
                  className="w-full p-2.5 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722] focus:outline-hidden"
                >
                  <option value="investigating">Investigating (Technician dispatched)</option>
                  <option value="resolved">Resolved (Repairs confirmed & calibrated)</option>
                  <option value="escalated">Escalated (Sent to external vendor / RMA)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase text-[#7E8276] mb-1 font-bold">RESOLUTION & REPAIR NOTES</label>
                <textarea
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  required
                  placeholder="Detail what parts were replaced, calibration readings verified, or safety checks executed..."
                  className="w-full p-2.5 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722] focus:outline-hidden"
                />
              </div>

              {resolutionStatus === 'resolved' && (
                <label className="flex items-center gap-2 p-3 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={markEquipmentAvailable}
                    onChange={(e) => setMarkEquipmentAvailable(e.target.checked)}
                    className="w-4 h-4 accent-[#183D30]"
                  />
                  <span className="text-xs uppercase">MARK RESOURCE OPERATIONAL AND RELEASE TO AVAILABLE STATUS</span>
                </label>
              )}

              <div className="pt-2 border-t border-[#DCD9CF] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResolvingReport(null)}
                  className="px-4 py-2 bg-[#F3F0E8] border border-[#DCD9CF] hover:bg-[#DCD9CF] text-[#252722] uppercase font-bold cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#183D30] hover:bg-[#204e3e] text-[#D8FF3E] uppercase font-bold cursor-pointer"
                >
                  SAVE RESOLUTION
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
