import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { checkAndUpdateOverdueBookings, triggerUpcomingBookingReminders } from '../data/store';

export const Layout: React.FC = () => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const location = useLocation();

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  // Periodic background scans for overdue bookings & custody reminders
  useEffect(() => {
    checkAndUpdateOverdueBookings();
    triggerUpcomingBookingReminders();

    const interval = setInterval(() => {
      checkAndUpdateOverdueBookings();
      triggerUpcomingBookingReminders();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Compute breadcrumbs
  const getBreadcrumbs = () => {
    const path = location.pathname;
    if (path === '/dashboard') return [{ label: 'Resource Discovery', path: '/dashboard' }];
    if (path.startsWith('/resources/')) {
      if (path.endsWith('/book')) {
        return [
          { label: 'Resources', path: '/dashboard' },
          { label: 'Equipment Detail', path: path.replace('/book', '') },
          { label: 'Booking Request' }
        ];
      }
      return [
        { label: 'Resources', path: '/dashboard' },
        { label: 'Equipment Detail' }
      ];
    }
    if (path === '/my-bookings') return [{ label: 'Reservations', path: '/my-bookings' }, { label: 'My Bookings' }];
    if (path === '/checkin') return [{ label: 'Digital Custody', path: '/checkin' }, { label: 'Check-In & Handover' }];
    if (path === '/owner') return [{ label: 'Faculty Portal', path: '/owner' }, { label: 'Owner Overview' }];
    if (path === '/owner/approvals') return [{ label: 'Faculty Portal', path: '/owner' }, { label: 'Approval Queue' }];
    if (path === '/manager') return [{ label: 'Administration', path: '/manager' }, { label: 'Institution Oversight' }];
    if (path === '/reports') return [{ label: 'Accountability', path: '/reports' }, { label: 'Incidents & Disputes' }];
    if (path === '/audit') return [{ label: 'Compliance', path: '/audit' }, { label: 'System Audit Trail' }];
    if (path === '/admin') return [{ label: 'Administration', path: '/admin' }, { label: 'User Directory & RBAC' }];
    return [{ label: 'Dashboard', path: '/dashboard' }];
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="min-h-screen flex flex-col bg-[#F3F0E8] text-[#252722] antialiased w-full max-w-full overflow-x-hidden">
      {/* Top Navigation */}
      <Navbar 
        onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
      />

      <div className="flex-1 flex w-full max-w-full pt-14 sm:pt-16">
        {/* Desktop & Mobile Adaptive Sidebar */}
        <Sidebar 
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
          collapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        {/* Main Content Area */}
        <div className={`flex-1 min-w-0 flex flex-col w-full max-w-full overflow-x-hidden transition-all duration-200 ${isSidebarCollapsed ? 'md:pl-16' : 'md:pl-60'}`}>
          {/* Subtle Contextual Breadcrumb Header */}
          <div className="px-3 sm:px-6 lg:px-8 pt-3 sm:pt-4 pb-2.5 flex items-center justify-between text-xs text-[#565950] border-b border-[#DCD9CF]">
            <nav className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap py-1">
              <Link 
                to="/dashboard" 
                className="hover:text-[#183D30] transition-colors p-1 rounded-xs hover:bg-[#EAE7DC]"
                aria-label="Home"
              >
                <Home className="w-3.5 h-3.5" />
              </Link>
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={idx}>
                  <span className="text-[#AAB6A1] font-mono">/</span>
                  {crumb.path && idx < breadcrumbs.length - 1 ? (
                    <Link 
                      to={crumb.path} 
                      className="font-mono text-[11px] uppercase tracking-wider hover:text-[#183D30] transition-colors"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="font-mono text-[11px] uppercase tracking-wider font-bold text-[#183D30]">
                      {crumb.label}
                    </span>
                  )}
                </React.Fragment>
              ))}
            </nav>

            <div className="hidden sm:flex items-center gap-2 text-[10px] text-[#565950] font-mono tracking-wider uppercase">
              <span className="w-1.5 h-1.5 rounded-none bg-[#183D30] inline-block" />
              <span>Network: 01-ONLINE</span>
            </div>
          </div>

          <main className="flex-1 px-3 sm:px-6 lg:px-8 pb-12 pt-3 sm:pt-4 overflow-y-auto max-w-full">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};
