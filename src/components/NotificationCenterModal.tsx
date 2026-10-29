import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  Check, 
  Trash2, 
  ExternalLink, 
  X, 
  Calendar, 
  Clock, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Layers,
  Inbox
} from 'lucide-react';
import { 
  getNotificationsForUser, 
  markNotificationRead, 
  markAllNotificationsRead, 
  deleteNotification,
  getUnreadCount 
} from '../data/store';
import { formatDateTime, formatRelativeTime } from '../utils/formatters';
import type { Notification } from '../types';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  userId,
}) => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'unread' | 'booking' | 'waitlist' | 'incident' | 'safety'>('all');

  if (!isOpen) return null;

  const allNotifs = getNotificationsForUser(userId);
  const unreadCount = getUnreadCount(userId);

  const filteredNotifs = allNotifs.filter((n) => {
    if (filter === 'unread') return !n.read;
    if (filter === 'booking') return n.category === 'booking';
    if (filter === 'waitlist') return n.category === 'waitlist';
    if (filter === 'incident') return n.category === 'incident';
    if (filter === 'safety') return n.category === 'safety';
    return true;
  });

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'waitlist':
        return <Clock className="w-3.5 h-3.5 text-[#854D0E]" />;
      case 'incident':
        return <AlertTriangle className="w-3.5 h-3.5 text-[#854D0E]" />;
      case 'safety':
        return <ShieldAlert className="w-3.5 h-3.5 text-[#854D0E]" />;
      case 'system':
        return <Layers className="w-3.5 h-3.5 text-[#183D30]" />;
      case 'booking':
      default:
        return <Calendar className="w-3.5 h-3.5 text-[#183D30]" />;
    }
  };

  const handleOpenLink = (n: Notification) => {
    markNotificationRead(n.id);
    if (n.link) {
      navigate(n.link);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#252722]/70 backdrop-blur-xs font-mono text-xs">
      <div className="bg-[#FCFBF7] border border-[#DCD9CF] max-w-2xl w-full flex flex-col max-h-[85vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-5 bg-[#183D30] text-[#F3F0E8] border-b border-[#0F2820] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#D8FF3E] text-[#183D30] flex items-center justify-center font-bold">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-base text-[#F3F0E8]">
                  Operational Notification Terminal
                </h3>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.2 bg-[#D8FF3E] text-[#183D30] font-bold text-[9px] uppercase">
                    {unreadCount} NEW
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#AAB6A1] font-sans">
                Live alerts, waitlist positions, and handover notices
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={() => markAllNotificationsRead(userId)}
                className="px-2.5 py-1 text-[10px] uppercase font-bold text-[#D8FF3E] hover:underline cursor-pointer"
              >
                MARK ALL READ
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 text-[#AAB6A1] hover:text-[#F3F0E8] cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Navigation Chips */}
        <div className="px-5 py-2.5 border-b border-[#DCD9CF] bg-[#F3F0E8] flex flex-wrap items-center gap-2 text-xs">
          {[
            { id: 'all', label: `ALL (${allNotifs.length})` },
            { id: 'unread', label: `UNREAD (${unreadCount})` },
            { id: 'booking', label: 'BOOKINGS' },
            { id: 'waitlist', label: 'WAITLIST' },
            { id: 'incident', label: 'INCIDENTS' },
            { id: 'safety', label: 'SAFETY' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`px-2.5 py-1 text-[10px] uppercase font-bold transition-all cursor-pointer ${
                filter === tab.id
                  ? 'bg-[#183D30] text-[#D8FF3E]'
                  : 'text-[#565950] hover:text-[#252722] hover:bg-[#DCD9CF]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Notifications Scrollable Stream */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#DCD9CF] p-4">
          {filteredNotifs.length === 0 ? (
            <div className="py-16 text-center text-[#7E8276] space-y-2">
              <Inbox className="w-8 h-8 mx-auto text-[#AAB6A1]" />
              <p className="text-xs font-bold uppercase text-[#252722]">NO NOTIFICATIONS MATCHING FILTER</p>
              <p className="text-[11px] font-sans text-[#7E8276]">You are completely caught up with campus equipment alerts.</p>
            </div>
          ) : (
            filteredNotifs.map((n) => (
              <div
                key={n.id}
                className={`p-3.5 border transition-all mb-2 ${
                  !n.read 
                    ? 'bg-[#FCFBF7] border-[#183D30]/40' 
                    : 'bg-[#F3F0E8] border-[#DCD9CF]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 bg-[#FCFBF7] border border-[#DCD9CF] flex items-center justify-center shrink-0 mt-0.5">
                      {getCategoryIcon(n.category)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-[#252722] uppercase">{n.title}</h4>
                        {!n.read && (
                          <span className="w-1.5 h-1.5 bg-[#183D30] shrink-0" />
                        )}
                        {n.category && (
                          <span className="text-[9px] uppercase font-bold tracking-wider px-1 bg-[#183D30]/10 text-[#183D30] border border-[#183D30]/20">
                            {n.category}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-sans text-[#565950] mt-1 leading-relaxed">{n.message}</p>
                      <div className="flex items-center gap-2 mt-2 text-[10px] text-[#7E8276] font-mono">
                        <span>{formatRelativeTime(n.created_at)}</span>
                        <span>•</span>
                        <span>{formatDateTime(n.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {!n.read && (
                      <button
                        onClick={() => markNotificationRead(n.id)}
                        className="p-1 text-[#7E8276] hover:text-[#183D30] cursor-pointer"
                        title="Mark as read"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                    {n.link && (
                      <button
                        onClick={() => handleOpenLink(n)}
                        className="px-2 py-0.5 text-[10px] font-bold uppercase text-[#183D30] bg-[#183D30]/10 hover:bg-[#183D30]/20 border border-[#183D30]/20 flex items-center gap-1 cursor-pointer"
                      >
                        <span>VIEW</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(n.id)}
                      className="p-1 text-[#7E8276] hover:text-[#854D0E] cursor-pointer"
                      title="Delete notification"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-[#DCD9CF] bg-[#F3F0E8] flex items-center justify-between text-xs text-[#565950]">
          <span className="flex items-center gap-1.5 text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#183D30]" />
            <span>COMMUNICATION PIPELINE SYNCHRONIZED</span>
          </span>
          <button
            onClick={onClose}
            className="px-3.5 py-1 text-xs font-bold uppercase text-[#252722] bg-[#FCFBF7] border border-[#DCD9CF] hover:bg-[#DCD9CF] cursor-pointer"
          >
            CLOSE
          </button>
        </div>

      </div>
    </div>
  );
};
