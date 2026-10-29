import React, { useState, useMemo } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  User, 
  Clock, 
  ChevronDown, 
  ChevronRight,
  ShieldCheck,
  Layers
} from 'lucide-react';
import { getAuditLogsForUser, getUserById } from '../data/store';
import { useAuth } from '../contexts/AuthContext';
import { formatDateTime, formatRelativeTime } from '../utils/formatters';
import type { AuditLog } from '../types';

export const AuditHistoryPage: React.FC = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [targetTypeFilter, setTargetTypeFilter] = useState<string>('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const logs = user ? getAuditLogsForUser(user.id) : [];

  const scopeLabel = 
    user?.role === 'admin' ? 'CAMPUS-WIDE MASTER LEDGER (ADMINISTRATOR)' :
    user?.role === 'manager' ? 'INSTITUTIONAL OVERSIGHT LEDGER (OPERATIONS)' :
    user?.role === 'owner' ? 'FACULTY INVENTORY LEDGER (OWNED ASSETS)' :
    'PERSONAL ACTIVITY LEDGER (SELF-SCOPED)';

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (targetTypeFilter !== 'all' && log.target_type !== targetTypeFilter) return false;
      if (!search) return true;

      const q = search.toLowerCase();
      const actor = getUserById(log.user_id);
      return (
        log.action.toLowerCase().includes(q) ||
        log.target_type.toLowerCase().includes(q) ||
        log.target_id.toLowerCase().includes(q) ||
        (log.decision_reason && log.decision_reason.toLowerCase().includes(q)) ||
        (actor?.full_name.toLowerCase().includes(q) ?? false)
      );
    });
  }, [logs, search, targetTypeFilter]);

  const toggleExpand = (id: string) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  return (
    <div className="space-y-8 w-full max-w-full overflow-x-hidden pb-16 font-mono text-xs">
      
      {/* ─── 01 / MASTHEAD ─── */}
      <section className="border-b border-[#DCD9CF] pb-6 pt-2">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#183D30] font-bold bg-[#183D30]/10 px-2.5 py-1 border border-[#183D30]/20">
              TRACEABILITY & COMPLIANCE / 07
            </span>
            <span className="text-[11px] font-mono text-[#7E8276] uppercase tracking-wider">
              {scopeLabel}
            </span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1 bg-[#FCFBF7] border border-[#DCD9CF] text-xs text-[#183D30] font-bold">
            <ShieldCheck className="w-4 h-4 text-[#183D30]" />
            <span>{logs.length} IMMUTABLE EVENTS RECORDED</span>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-[#252722] tracking-tight leading-tight">
              System Audit Trail & History
            </h1>
            <p className="mt-2 text-sm text-[#565950] font-sans leading-relaxed max-w-xl">
              Append-only, immutable event log recording actor, action, target record, timestamp, and formal decision reasons.
            </p>
          </div>
        </div>
      </section>

      {/* ─── 02 / FILTER TOOLBAR ─── */}
      <div className="bg-[#FCFBF7] p-4 border border-[#DCD9CF] flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7E8276]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search action, actor, or entity ID..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722] focus:outline-hidden focus:border-[#183D30]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-[#7E8276]" />
          <span className="text-[#7E8276] uppercase text-[10px] font-bold">ENTITY:</span>
          <select
            value={targetTypeFilter}
            onChange={(e) => setTargetTypeFilter(e.target.value)}
            className="bg-[#F3F0E8] border border-[#DCD9CF] px-3 py-1.5 text-xs text-[#252722] focus:outline-hidden uppercase"
          >
            <option value="all">ALL TARGETS</option>
            <option value="booking">BOOKINGS</option>
            <option value="resource">RESOURCES</option>
            <option value="report">CONDITION REPORTS</option>
            <option value="user">USERS</option>
          </select>
        </div>
      </div>

      {/* ─── 03 / LOG FEED ─── */}
      <div className="bg-[#FCFBF7] border border-[#DCD9CF] overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-[#7E8276] text-xs">
            No audit log entries match your criteria.
          </div>
        ) : (
          <div className="divide-y divide-[#DCD9CF]">
            {filteredLogs.map((log) => {
              const actor = getUserById(log.user_id);
              const isExpanded = expandedLogId === log.id;

              return (
                <div key={log.id} className="p-4 hover:bg-[#F3F0E8]/50 transition-colors text-xs">
                  <div
                    onClick={() => toggleExpand(log.id)}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                  >
                    <div className="flex items-start sm:items-center gap-3">
                      <button
                        type="button"
                        className="text-[#7E8276] hover:text-[#252722] mt-0.5 sm:mt-0"
                      >
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-bold text-[#183D30] bg-[#183D30]/10 px-2 py-0.5 border border-[#183D30]/20 uppercase">
                            {log.action}
                          </span>
                          <span className="text-[11px] text-[#565950] uppercase">
                            ON {log.target_type} (<span className="font-mono font-bold text-[#252722]">{log.target_id.slice(0, 8)}</span>)
                          </span>
                        </div>
                        <div className="text-[11px] text-[#565950] mt-1.5 flex flex-wrap items-center gap-3">
                          <span className="flex items-center gap-1.5">
                            <User className="w-3 h-3 text-[#7E8276]" />
                            <span>ACTOR: <strong>{log.actor_name || actor?.full_name || 'System'}</strong> ({log.actor_role || actor?.role || 'automated'})</span>
                          </span>
                          {log.decision_reason && (
                            <span className="px-2 py-0.5 bg-[#EAE5D8] border border-[#DCD9CF] text-[#854D0E] font-medium text-[10px]">
                              REASON: {log.decision_reason}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-left sm:text-right text-[#7E8276] text-[11px] shrink-0 font-mono">
                      <span className="font-bold text-[#252722]">{formatRelativeTime(log.created_at)}</span>
                      <span className="block text-[10px] text-[#7E8276]">
                        {formatDateTime(log.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Expanded JSON State Diff Viewer */}
                  {isExpanded && (
                    <div className="mt-4 pt-3 border-t border-[#DCD9CF] space-y-3">
                      <div className="grid md:grid-cols-2 gap-3 font-mono text-[11px]">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#7E8276] block mb-1">
                            PREVIOUS STATE (OLD VALUE)
                          </span>
                          <pre className="p-3 bg-[#0F2820] text-[#AAB6A1] border border-[#225141] overflow-x-auto max-h-48 text-[10px]">
                            {log.old_value ? JSON.stringify(log.old_value, null, 2) : 'null (initial record creation)'}
                          </pre>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#7E8276] block mb-1">
                            COMMITTED STATE (NEW VALUE)
                          </span>
                          <pre className="p-3 bg-[#0F2820] text-[#D8FF3E] border border-[#225141] overflow-x-auto max-h-48 text-[10px]">
                            {log.new_value ? JSON.stringify(log.new_value, null, 2) : 'null'}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
