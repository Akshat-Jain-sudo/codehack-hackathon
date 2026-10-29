import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  Database, 
  LogOut, 
  Check, 
  ChevronDown, 
  Layers, 
  Menu,
  Search,
  User as UserIcon,
  CheckCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { 
  getNotificationsForUser, 
  markNotificationRead, 
  markAllNotificationsRead, 
  getUnreadCount,
  getUsers,
} from '../data/store';
import { StatusBadge } from './StatusBadge';
import { SupabaseGuideModal } from './SupabaseGuideModal';
import { NotificationCenterModal } from './NotificationCenterModal';
import { formatRelativeTime } from '../utils/formatters';

interface NavbarProps {
  onOpenMobileSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenMobileSidebar }) => {
  const { user, logout, login } = useAuth();
  const navigate = useNavigate();
  const [showNotifs, setShowNotifs] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showSupabaseModal, setShowSupabaseModal] = useState(false);
  const [showNotifCenterModal, setShowNotifCenterModal] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  
  const notifRef = useRef<HTMLDivElement>(null);
  const roleRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifs(false);
      }
      if (roleRef.current && !roleRef.current.contains(event.target as Node)) {
        setShowRoleMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const notifications = getNotificationsForUser(user.id);
  const unreadCount = getUnreadCount(user.id);
  const allUsers = getUsers();

  const handleRoleSwitch = (targetEmail: string) => {
    login(targetEmail, 'demo123');
    setShowRoleMenu(false);
    navigate('/dashboard');
  };

  const handleGlobalSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (globalSearch.trim()) {
      navigate(`/dashboard?q=${encodeURIComponent(globalSearch.trim())}`);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#183D30] text-[#F3F0E8] border-b border-[#0F2820] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-3">
            
            {/* Left: Mobile Menu Toggle + Brand Logo */}
            <div className="flex items-center gap-2 sm:gap-3">
              {onOpenMobileSidebar && (
                <button
                  onClick={onOpenMobileSidebar}
                  className="md:hidden p-1.5 text-[#F3F0E8] hover:bg-[#225141] transition-colors"
                  aria-label="Open navigation menu"
                >
                  <Menu className="w-5 h-5" />
                </button>
              )}

              <button 
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2.5 text-left group cursor-pointer"
              >
                <div className="w-8 h-8 bg-[#D8FF3E] text-[#183D30] flex items-center justify-center font-bold text-xs shrink-0">
                  <Layers className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold text-base sm:text-lg text-[#F3F0E8] tracking-tight group-hover:text-[#D8FF3E] transition-colors">
                      LABLOOP
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 bg-[#D8FF3E] text-[#183D30] font-mono">
                      NET / 01
                    </span>
                  </div>
                  <span className="text-[9px] font-mono uppercase tracking-widest text-[#AAB6A1] -mt-0.5 hidden sm:block">
                    SHARED RESEARCH EQUIPMENT
                  </span>
                </div>
              </button>
            </div>

            {/* Center: Global Search Input */}
            <form 
              onSubmit={handleGlobalSearchSubmit}
              className="flex-1 max-w-md hidden lg:block mx-4"
            >
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#AAB6A1]" />
                <input
                  type="text"
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  placeholder="Catalogue search: equipment ID, room, or task..."
                  className="w-full pl-8 pr-12 py-1.5 text-xs font-mono bg-[#0F2820] text-[#F3F0E8] placeholder:text-[#AAB6A1]/70 border border-[#225141] focus:border-[#D8FF3E] focus:outline-hidden transition-all"
                />
                <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-[#AAB6A1] bg-[#183D30] border border-[#225141] px-1 font-mono">
                  RET ↵
                </kbd>
              </div>
            </form>

            {/* Right: Quick Demo Switcher & Global Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              
              {/* Architecture Blueprint Button */}
              <button
                onClick={() => setShowSupabaseModal(true)}
                className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-mono uppercase tracking-wider text-[#F3F0E8] hover:text-[#D8FF3E] hover:bg-[#225141] border border-[#225141] transition-colors cursor-pointer"
                title="View Supabase Schema, RLS policies, and Security Blueprint"
              >
                <Database className="w-3 h-3 text-[#D8FF3E]" />
                <span>SPEC / DB</span>
              </button>

              {/* Persona / Role Switcher Dropdown */}
              <div className="relative" ref={roleRef}>
                <button
                  onClick={() => setShowRoleMenu(!showRoleMenu)}
                  className="flex items-center gap-2 px-2.5 py-1.5 border border-[#225141] bg-[#0F2820] hover:bg-[#225141] text-xs font-medium text-[#F3F0E8] transition-colors cursor-pointer"
                >
                  <div className="w-5 h-5 bg-[#D8FF3E] text-[#183D30] font-mono font-bold flex items-center justify-center text-[10px]">
                    {user.full_name.charAt(0)}
                  </div>
                  <span className="max-w-[110px] truncate hidden sm:inline font-mono text-[11px] uppercase tracking-wide">
                    {user.full_name.split(' ')[0]}
                  </span>
                  <span className="px-1.5 py-0.2 bg-[#225141] text-[#D8FF3E] font-mono text-[10px] uppercase font-bold">
                    {user.role}
                  </span>
                  <ChevronDown className="w-3 h-3 text-[#AAB6A1]" />
                </button>

                {showRoleMenu && (
                  <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-[#FCFBF7] shadow-2xl border border-[#DCD9CF] py-2 z-50 text-[#252722]">
                    <div className="px-3.5 py-2 border-b border-[#DCD9CF] mb-1">
                      <p className="text-[10px] font-mono font-bold text-[#565950] uppercase tracking-widest">
                        PERSONA SELECTOR / TEST HARNESS
                      </p>
                      <p className="text-[11px] text-[#7E8276] mt-0.5">Toggle institutional roles & permissions</p>
                    </div>

                    <div className="max-h-72 overflow-y-auto py-1 divide-y divide-[#EBE8DF]">
                      {allUsers.map((u) => {
                        const isCurrent = u.id === user.id;
                        return (
                          <button
                            key={u.id}
                            onClick={() => handleRoleSwitch(u.email)}
                            className={`w-full text-left px-3.5 py-2 flex items-center justify-between text-xs hover:bg-[#F3F0E8] transition-colors ${
                              isCurrent ? 'bg-[#183D30]/10 border-l-2 border-[#183D30]' : ''
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-[#252722] truncate">{u.full_name}</span>
                                {isCurrent && <Check className="w-3.5 h-3.5 text-[#183D30] shrink-0" />}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-mono text-[#565950]">
                                <span className="truncate">{u.department}</span>
                                <span>•</span>
                                <span className="capitalize font-bold text-[#183D30]">{u.role}</span>
                                {u.role === 'borrower' && (
                                  <span className={`text-[9px] px-1 py-0.2 font-mono font-bold uppercase ${
                                    u.training_completed 
                                      ? 'bg-[#183D30] text-[#D8FF3E]' 
                                      : 'bg-[#DCD9CF] text-[#565950]'
                                  }`}>
                                    {u.training_completed ? 'Certified' : 'Untrained'}
                                  </span>
                                )}
                              </div>
                            </div>
                            <StatusBadge status={u.role} size="sm" showDot={false} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Notifications Dropdown & Center Trigger */}
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => setShowNotifs(!showNotifs)}
                  className="relative p-2 text-[#F3F0E8] hover:text-[#D8FF3E] hover:bg-[#225141] transition-colors cursor-pointer border border-[#225141]"
                  aria-label="Open notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 px-1 min-w-4 h-4 bg-[#D8FF3E] text-[#183D30] font-mono text-[9px] font-bold flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showNotifs && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#FCFBF7] shadow-2xl border border-[#DCD9CF] py-2 z-50 text-[#252722]">
                    <div className="px-4 py-2 border-b border-[#DCD9CF] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] uppercase tracking-wider font-bold text-[#183D30]">NOTIFICATIONS</span>
                        {unreadCount > 0 && (
                          <span className="px-1.5 py-0.2 bg-[#D8FF3E] text-[#183D30] font-mono text-[10px] font-bold">
                            {unreadCount} NEW
                          </span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={() => markAllNotificationsRead(user.id)}
                          className="font-mono text-[10px] uppercase tracking-wider text-[#183D30] hover:underline cursor-pointer"
                        >
                          Clear all
                        </button>
                      )}
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-[#EBE8DF]">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-[#7E8276] text-xs font-mono">
                          NO ACTIVE LOGS
                        </div>
                      ) : (
                        notifications.slice(0, 6).map((n) => (
                          <div
                            key={n.id}
                            onClick={() => {
                              markNotificationRead(n.id);
                              if (n.link) {
                                navigate(n.link);
                                setShowNotifs(false);
                              }
                            }}
                            className={`p-3 hover:bg-slate-50 transition-colors cursor-pointer text-left ${
                              !n.read ? 'bg-indigo-50/30' : ''
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-semibold text-xs text-slate-900">{n.title}</span>
                              <span className="text-[10px] text-slate-400 shrink-0">
                                {formatRelativeTime(n.created_at)}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 mt-0.5 line-clamp-2 leading-relaxed">{n.message}</p>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Dedicated Notification Center Trigger */}
                    <div className="p-2 border-t border-slate-100 bg-slate-50/70 text-center">
                      <button
                        onClick={() => {
                          setShowNotifs(false);
                          setShowNotifCenterModal(true);
                        }}
                        className="w-full py-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-900 hover:bg-indigo-100/50 rounded-lg transition-colors cursor-pointer"
                      >
                        Open Notification Center →
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Logout Button */}
              <button
                onClick={logout}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                title="Sign out"
              >
                <LogOut className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Supabase Architecture Blueprint Modal */}
      <SupabaseGuideModal
        isOpen={showSupabaseModal}
        onClose={() => setShowSupabaseModal(false)}
      />

      {/* Institutional Notification Center Modal */}
      <NotificationCenterModal
        isOpen={showNotifCenterModal}
        onClose={() => setShowNotifCenterModal(false)}
        userId={user.id}
      />
    </>
  );
};
