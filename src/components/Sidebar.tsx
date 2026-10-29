import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Compass, 
  CalendarClock, 
  QrCode, 
  Layers, 
  Inbox, 
  BarChart3, 
  AlertTriangle, 
  History, 
  Users,
  ShieldCheck,
  CheckCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  X,
  Scale
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getPendingBookingsForOwner, getConditionReports, getBookingsByBorrower } from '../data/store';

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  mobileOpen = false,
  onCloseMobile,
  collapsed = false,
  onToggleCollapse,
}) => {
  const { user } = useAuth();
  if (!user) return null;

  // Real-time badge telemetry
  const pendingApprovalsCount = (user.role === 'owner' || user.role === 'admin') 
    ? getPendingBookingsForOwner(user.id).length 
    : 0;

  const openIncidentsCount = getConditionReports().filter(
    (r) => r.type === 'incident' && (r.incident_status === 'open' || r.incident_status === 'investigating')
  ).length;

  const myActiveBookingsCount = getBookingsByBorrower(user.id).filter(
    (b) => b.status === 'approved' || b.status === 'checked_in' || b.status === 'pending_approval' || b.status === 'pending'
  ).length;

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `group flex items-center ${collapsed ? 'justify-center px-2' : 'justify-between px-3'} py-2 text-xs font-mono transition-all border-l-2 ${
      isActive
        ? 'bg-[#183D30] text-[#D8FF3E] border-[#D8FF3E] font-bold'
        : 'text-[#565950] hover:text-[#183D30] hover:bg-[#F3F0E8] border-transparent font-medium'
    }`;

  const renderNavContent = () => (
    <div className="flex-1 flex flex-col justify-between py-3">
      <div className="space-y-5">
        {/* User Persona Compact Card */}
        <div className={`mx-3 p-3 bg-[#F3F0E8] border border-[#DCD9CF] ${collapsed ? 'text-center' : ''}`}>
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-2.5'}`}>
            <div className="w-8 h-8 bg-[#183D30] text-[#D8FF3E] font-display font-bold flex items-center justify-center text-xs shrink-0">
              {user.full_name.charAt(0)}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-[#252722] truncate">{user.full_name}</div>
                <div className="text-[10px] font-mono text-[#7E8276] truncate uppercase">{user.department}</div>
                <div className="mt-1 flex items-center gap-1.5">
                  {user.role === 'borrower' && (
                    user.training_completed ? (
                      <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold uppercase text-[#183D30] bg-[#183D30]/10 px-1.5 py-0.2 border border-[#183D30]/20">
                        <CheckCircle className="w-2.5 h-2.5 text-[#183D30]" /> CERTIFIED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold uppercase text-[#854D0E] bg-[#EAE5D8] px-1.5 py-0.2 border border-[#D5CBB5]">
                        <Clock className="w-2.5 h-2.5" /> UNTRAINED
                      </span>
                    )
                  )}
                  {user.role !== 'borrower' && (
                    <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-[#183D30] bg-[#183D30]/10 border border-[#183D30]/20 px-1.5 py-0.2">
                      {user.role}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Links adapted to authenticated user role */}
        <nav className="space-y-5 px-3">
          {/* General Discovery (Available to all users) */}
          <div>
            {!collapsed && (
              <div className="px-3 mb-2 text-[10px] font-mono uppercase tracking-widest text-[#7E8276] flex items-center justify-between">
                <span>01 / DISCOVERY</span>
              </div>
            )}
            <div className="space-y-1">
              <NavLink 
                to="/dashboard" 
                className={linkClass}
                title={collapsed ? "Browse Equipment & AI Match" : undefined}
              >
                <div className="flex items-center gap-2.5">
                  <Compass className="w-3.5 h-3.5 shrink-0" />
                  {!collapsed && <span>Equipment Directory</span>}
                </div>
              </NavLink>
            </div>
          </div>

          {/* Borrower Experience Navigation */}
          {user.role === 'borrower' && (
            <div>
              {!collapsed && (
                <div className="px-3 mb-2 text-[10px] font-mono uppercase tracking-widest text-[#7E8276] flex items-center justify-between">
                  <span>02 / BORROWER</span>
                </div>
              )}
              <div className="space-y-1">
                <NavLink 
                  to="/my-bookings" 
                  className={linkClass}
                  title={collapsed ? "My Bookings & Waitlist" : undefined}
                >
                  <div className="flex items-center gap-2.5">
                    <CalendarClock className="w-3.5 h-3.5 shrink-0" />
                    {!collapsed && <span>Active Bookings</span>}
                  </div>
                  {!collapsed && myActiveBookingsCount > 0 && (
                    <span className="px-1.5 py-0.2 text-[9px] font-mono font-bold bg-[#183D30] text-[#D8FF3E]">
                      {myActiveBookingsCount}
                    </span>
                  )}
                </NavLink>

                <NavLink 
                  to="/checkin" 
                  className={linkClass}
                  title={collapsed ? "Digital Custody & Check-In" : undefined}
                >
                  <div className="flex items-center gap-2.5">
                    <QrCode className="w-3.5 h-3.5 shrink-0" />
                    {!collapsed && <span>Check-In & Custody</span>}
                  </div>
                </NavLink>

                <NavLink 
                  to="/reports" 
                  className={linkClass}
                  title={collapsed ? "Issue & Damage Reports" : undefined}
                >
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    {!collapsed && <span>Incident Reports</span>}
                  </div>
                </NavLink>
              </div>
            </div>
          )}

          {/* Resource Owner Navigation */}
          {(user.role === 'owner' || user.role === 'admin') && (
            <div>
              {!collapsed && (
                <div className="px-3 mb-2 text-[10px] font-mono uppercase tracking-widest text-[#7E8276] flex items-center justify-between">
                  <span>03 / CUSTODIAN</span>
                </div>
              )}
              <div className="space-y-1">
                <NavLink 
                  to="/owner" 
                  end 
                  className={linkClass}
                  title={collapsed ? "Owner Overview & Inventory" : undefined}
                >
                  <div className="flex items-center gap-2.5">
                    <Layers className="w-3.5 h-3.5 shrink-0" />
                    {!collapsed && <span>Inventory Registry</span>}
                  </div>
                </NavLink>

                <NavLink 
                  to="/owner/approvals" 
                  className={linkClass}
                  title={collapsed ? "Booking Request Queue" : undefined}
                >
                  <div className="flex items-center gap-2.5">
                    <Inbox className="w-3.5 h-3.5 shrink-0" />
                    {!collapsed && <span>Approval Queue</span>}
                  </div>
                  {pendingApprovalsCount > 0 && (
                    <span className="px-1.5 py-0.2 text-[9px] font-mono font-bold bg-[#D8FF3E] text-[#183D30]">
                      {pendingApprovalsCount}
                    </span>
                  )}
                </NavLink>

                <NavLink 
                  to="/checkin" 
                  className={linkClass}
                  title={collapsed ? "Handover Inspection" : undefined}
                >
                  <div className="flex items-center gap-2.5">
                    <QrCode className="w-3.5 h-3.5 shrink-0" />
                    {!collapsed && <span>Handover Terminal</span>}
                  </div>
                </NavLink>
              </div>
            </div>
          )}

          {/* Institutional Management & Compliance Navigation */}
          {(user.role === 'manager' || user.role === 'admin') && (
            <div>
              {!collapsed && (
                <div className="px-3 mb-2 text-[10px] font-mono uppercase tracking-widest text-[#7E8276] flex items-center justify-between">
                  <span>04 / GOVERNANCE</span>
                </div>
              )}
              <div className="space-y-1">
                <NavLink 
                  to="/manager" 
                  className={linkClass}
                  title={collapsed ? "Fair Allocation & Utilization" : undefined}
                >
                  <div className="flex items-center gap-2.5">
                    <Scale className="w-3.5 h-3.5 shrink-0" />
                    {!collapsed && <span>Allocation & Demand</span>}
                  </div>
                </NavLink>

                <NavLink 
                  to="/reports" 
                  className={linkClass}
                  title={collapsed ? "Incident Review & Disputes" : undefined}
                >
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    {!collapsed && <span>Disputes & Incidents</span>}
                  </div>
                  {openIncidentsCount > 0 && (
                    <span className="px-1.5 py-0.2 text-[9px] font-mono font-bold bg-[#E11D48] text-white">
                      {openIncidentsCount}
                    </span>
                  )}
                </NavLink>

                <NavLink 
                  to="/audit" 
                  className={linkClass}
                  title={collapsed ? "System Audit Trail" : undefined}
                >
                  <div className="flex items-center gap-2.5">
                    <History className="w-3.5 h-3.5 shrink-0" />
                    {!collapsed && <span>Audit Trail</span>}
                  </div>
                </NavLink>
              </div>
            </div>
          )}

          {/* Administrator RBAC Directory */}
          {user.role === 'admin' && (
            <div>
              {!collapsed && (
                <div className="px-3 mb-2 text-[10px] font-mono uppercase tracking-widest text-[#7E8276] flex items-center justify-between">
                  <span>05 / ADMIN</span>
                </div>
              )}
              <div className="space-y-1">
                <NavLink 
                  to="/admin" 
                  className={linkClass}
                  title={collapsed ? "User Directory & Roles" : undefined}
                >
                  <div className="flex items-center gap-2.5">
                    <Users className="w-3.5 h-3.5 shrink-0" />
                    {!collapsed && <span>User Directory</span>}
                  </div>
                </NavLink>
              </div>
            </div>
          )}
        </nav>
      </div>

      {/* Footer Section: Trust policy & desktop collapse toggle */}
      <div className="px-3 pt-3 space-y-2">
        {!collapsed && (
          <div className="p-3 bg-[#F3F0E8] border border-[#DCD9CF]">
            <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-[#183D30]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#183D30] shrink-0" />
              <span>Chain of Custody</span>
            </div>
            <p className="text-[10px] font-mono text-[#565950] mt-1 leading-normal">
              Timestamped inspection & verification logged to immutable ledger.
            </p>
          </div>
        )}

        {/* Desktop Collapse Toggle Button */}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="hidden md:flex items-center justify-center w-full py-1.5 text-[#7E8276] hover:text-[#183D30] hover:bg-[#F3F0E8] border border-transparent hover:border-[#DCD9CF] text-xs font-mono transition-colors"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider">
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Collapse</span>
              </div>
            )}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside 
        className={`hidden md:flex flex-col bg-[#FCFBF7] border-r border-[#DCD9CF] min-h-[calc(100vh-3.5rem)] transition-all duration-200 shrink-0 ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        {renderNavContent()}
      </aside>

      {/* Mobile Slide-Over Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-[#252722]/50 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          {/* Drawer content */}
          <div className="relative w-72 max-w-[85vw] bg-[#FCFBF7] h-full shadow-2xl flex flex-col z-10 border-r border-[#DCD9CF]">
            <div className="p-4 border-b border-[#DCD9CF] flex items-center justify-between bg-[#183D30] text-[#F3F0E8]">
              <span className="font-display font-bold text-xs uppercase tracking-widest text-[#D8FF3E]">LABLOOP SYSTEM</span>
              <button 
                onClick={onCloseMobile}
                className="p-1 text-[#F3F0E8] hover:text-[#D8FF3E]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto" onClick={onCloseMobile}>
              {renderNavContent()}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
