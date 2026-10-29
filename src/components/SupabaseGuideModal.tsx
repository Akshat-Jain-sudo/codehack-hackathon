import React from 'react';
import { Database, ShieldCheck, Key, Server, X, CheckCircle2, Code2 } from 'lucide-react';

interface SupabaseGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseGuideModal: React.FC<SupabaseGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#252722]/70 backdrop-blur-xs font-mono text-xs">
      <div className="bg-[#FCFBF7] border border-[#DCD9CF] max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="sticky top-0 bg-[#183D30] text-[#F3F0E8] border-b border-[#0F2820] p-5 sm:p-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#D8FF3E] text-[#183D30] flex items-center justify-center font-bold">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-widest text-[#D8FF3E] block font-bold">DATA ARCHITECTURE SPECIFICATION</span>
              <h2 className="text-base sm:text-lg font-display font-bold text-[#F3F0E8]">Production Schema & Security Blueprint</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#AAB6A1] hover:text-[#F3F0E8] cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Architecture Banner */}
          <div className="p-4 bg-[#F3F0E8] border border-[#DCD9CF] space-y-2">
            <div className="font-bold text-[#183D30] flex items-center gap-2 uppercase text-xs">
              <ShieldCheck className="w-4 h-4 text-[#183D30]" />
              <span>POSTGRESQL RELATIONAL INTEGRITY & RLS SAFEGUARDS</span>
            </div>
            <p className="text-xs font-sans text-[#565950] leading-relaxed">
              Dura-Loop ships with a complete PostgreSQL schema migration at <code className="bg-[#FCFBF7] px-1.5 py-0.5 border border-[#DCD9CF] text-[#183D30] font-mono text-[11px]">supabase/schema.sql</code>. 
              The application runtime uses an in-browser persistent data layer mirroring Supabase's tables, constraints, and relational integrity.
            </p>
          </div>

          {/* 3 Core Security Pillars */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 border border-[#DCD9CF] bg-[#F3F0E8] space-y-2">
              <div className="w-7 h-7 bg-[#183D30] text-[#D8FF3E] flex items-center justify-center font-bold mb-2">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-xs uppercase text-[#252722]">ROW LEVEL SECURITY (RLS)</h4>
              <p className="text-[11px] font-sans text-[#565950] leading-relaxed">
                Granular policies prevent borrowers from viewing unapproved bookings or mutating other users' reservations.
              </p>
            </div>

            <div className="p-4 border border-[#DCD9CF] bg-[#F3F0E8] space-y-2">
              <div className="w-7 h-7 bg-[#183D30] text-[#D8FF3E] flex items-center justify-center font-bold mb-2">
                <Server className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-xs uppercase text-[#252722]">NO DOUBLE-BOOKING TRIGGER</h4>
              <p className="text-[11px] font-sans text-[#565950] leading-relaxed">
                Server-side PostgreSQL trigger <code className="text-[#183D30] font-mono font-bold text-[10px]">check_booking_overlap()</code> enforces transactional collision checks.
              </p>
            </div>

            <div className="p-4 border border-[#DCD9CF] bg-[#F3F0E8] space-y-2">
              <div className="w-7 h-7 bg-[#183D30] text-[#D8FF3E] flex items-center justify-center font-bold mb-2">
                <Key className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-xs uppercase text-[#252722]">ZERO SECRET LEAKAGE</h4>
              <p className="text-[11px] font-sans text-[#565950] leading-relaxed">
                Frontend only holds anon-level client configurations. Privileged operations are handled by edge functions or backend services.
              </p>
            </div>
          </div>

          {/* Schema Checklist */}
          <div>
            <h4 className="text-xs font-bold text-[#252722] uppercase tracking-wider mb-3 flex items-center gap-2">
              <Code2 className="w-4 h-4 text-[#183D30]" />
              <span>DATABASE ENTITIES & PRODUCTION MAPPING</span>
            </h4>
            <div className="grid sm:grid-cols-2 gap-2 text-xs">
              {[
                { name: 'public.users', desc: 'Auth, role enum, department, student ID, training badge' },
                { name: 'public.resources', desc: 'Equipment catalog, location, rules JSONB, max hours' },
                { name: 'public.bookings', desc: 'Reservations with temporal collision checks' },
                { name: 'public.condition_reports', desc: 'Check-in/out and incident reports with resolutions' },
                { name: 'public.audit_logs', desc: 'Immutable append-only trail of all mutations' },
                { name: 'public.notifications', desc: 'Real-time alert dispatch to borrower and owners' },
              ].map((item) => (
                <div key={item.name} className="p-2.5 bg-[#F3F0E8] border border-[#DCD9CF] flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#183D30] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-mono font-bold text-[#252722]">{item.name}</span>
                    <p className="text-[11px] font-sans text-[#565950] mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Setup Code snippet */}
          <div>
            <h4 className="text-xs font-bold text-[#252722] uppercase tracking-wider mb-2">CONNECTING TO LIVE SUPABASE</h4>
            <pre className="p-4 bg-[#0F2820] text-[#D8FF3E] border border-[#225141] text-[11px] font-mono overflow-x-auto leading-relaxed">
{`# 1. Run migrations in your Supabase dashboard SQL editor:
supabase/schema.sql

# 2. Add your environment variables to .env:
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...`}
            </pre>
          </div>
        </div>

        <div className="p-4 bg-[#F3F0E8] border-t border-[#DCD9CF] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#183D30] hover:bg-[#204e3e] text-[#D8FF3E] font-bold uppercase text-xs cursor-pointer"
          >
            CLOSE BLUEPRINT
          </button>
        </div>
      </div>
    </div>
  );
};
