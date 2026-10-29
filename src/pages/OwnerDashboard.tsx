import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Layers, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Settings, 
  MapPin, 
  Inbox,
  ArrowRight, 
  ShieldCheck, 
  X,
  Calendar,
  AlertCircle,
  Edit3,
  Bell,
  Wrench,
  Search,
  Filter,
  CheckSquare,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { 
  getResourcesByOwner, 
  getCategories, 
  createResource, 
  updateResource,
  updateResourceStatus,
  getUserById,
  updateBookingStatus,
  createBlackoutPeriod,
  deleteBlackoutPeriod,
  getInstitutionConfig,
  getOwnerDashboardMetrics,
  addNotification
} from '../data/store';
import { StatusBadge } from '../components/StatusBadge';
import { formatDateTime } from '../utils/formatters';
import type { Resource, ResourceStatus, Booking } from '../types';

export const OwnerDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Tab Navigation
  const [activeTab, setActiveTab] = useState<'inventory' | 'pending' | 'handovers' | 'overdue' | 'incidents' | 'blackouts'>('inventory');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ResourceStatus>('all');

  // Feedback states
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Add Resource Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('cat-1');
  const [building, setBuilding] = useState('Engineering Block A');
  const [room, setRoom] = useState('Lab 305');
  const [campusZone, setCampusZone] = useState('North Engineering Quad');
  const [walkingMinutes, setWalkingMinutes] = useState(3);
  const [requiresTraining, setRequiresTraining] = useState(true);
  const [requiresApproval, setRequiresApproval] = useState(true);
  const [maxHours, setMaxHours] = useState(4);
  const [minHours, setMinHours] = useState(1);
  const [costPerHour, setCostPerHour] = useState(0);
  const [safetyInstructions, setSafetyInstructions] = useState('Ensure proper ESD grounding and inspect high-voltage terminals before power-on.');
  const [operatingRule1, setOperatingRule1] = useState('Sign laboratory physical logbook before activating instrument.');
  const [operatingRule2, setOperatingRule2] = useState('Perform visual check and verify annual calibration sticker is current.');

  // Edit Resource Modal State
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editBuilding, setEditBuilding] = useState('');
  const [editRoom, setEditRoom] = useState('');
  const [editMaxHours, setEditMaxHours] = useState(4);
  const [editMinHours, setEditMinHours] = useState(1);
  const [editCostPerHour, setEditCostPerHour] = useState(0);
  const [editRequiresTraining, setEditRequiresTraining] = useState(true);
  const [editRequiresApproval, setEditRequiresApproval] = useState(true);
  const [editSafetyInstructions, setEditSafetyInstructions] = useState('');
  const [editStatus, setEditStatus] = useState<ResourceStatus>('available');

  // Blackout Scheduling Modal State
  const [isBlackoutModalOpen, setIsBlackoutModalOpen] = useState(false);
  const [blackoutTargetResourceId, setBlackoutTargetResourceId] = useState<string>('');
  const [blackoutTitle, setBlackoutTitle] = useState('');
  const [blackoutReason, setBlackoutReason] = useState('');
  const [blackoutStart, setBlackoutStart] = useState('');
  const [blackoutEnd, setBlackoutEnd] = useState('');

  // Quick Rejection Modal
  const [rejectingBookingId, setRejectingBookingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  if (!user) return null;

  const categories = getCategories();
  const metrics = getOwnerDashboardMetrics(user.id);
  const myResources = getResourcesByOwner(user.id);
  const allBlackouts = (getInstitutionConfig().blackout_periods || []).filter(
    (b) => !b.resource_id || myResources.some((r) => r.id === b.resource_id)
  );

  // Filtered resources
  const filteredResources = useMemo(() => {
    return myResources.filter((r) => {
      const matchesSearch = 
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.location_building.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.location_room.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [myResources, searchQuery, statusFilter]);

  // Handlers
  const handleOpenEditModal = (res: Resource) => {
    setEditingResource(res);
    setEditName(res.name);
    setEditDescription(res.description);
    setEditCategoryId(res.category_id);
    setEditBuilding(res.location_building);
    setEditRoom(res.location_room);
    setEditMaxHours(res.max_booking_hours);
    setEditMinHours(res.min_booking_hours || 1);
    setEditCostPerHour(res.cost_per_hour);
    setEditRequiresTraining(res.requires_training);
    setEditRequiresApproval(res.requires_approval);
    setEditSafetyInstructions(res.safety_instructions || '');
    setEditStatus(res.status);
  };

  const handleSaveResourceEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingResource) return;

    const res = updateResource(
      editingResource.id,
      {
        name: editName.trim(),
        description: editDescription.trim(),
        category_id: editCategoryId,
        location_building: editBuilding.trim(),
        location_room: editRoom.trim(),
        max_booking_hours: Number(editMaxHours),
        min_booking_hours: Number(editMinHours),
        cost_per_hour: Number(editCostPerHour),
        requires_training: editRequiresTraining,
        requires_approval: editRequiresApproval,
        safety_instructions: editSafetyInstructions.trim(),
        status: editStatus,
      },
      user.id
    );

    if ('error' in res) {
      setErrorMsg(res.error);
    } else {
      setSuccessMsg(`Resource "${editName}" updated successfully.`);
      setEditingResource(null);
    }
  };

  const handleQuickStatusChange = (resourceId: string, newStatus: ResourceStatus) => {
    const res = updateResourceStatus(resourceId, newStatus, user.id);
    if (typeof res === 'object' && 'error' in res) {
      setErrorMsg(res.error);
    } else {
      setSuccessMsg(`Resource status updated to ${newStatus}.`);
    }
  };

  const handleCreateResource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const created = createResource(
      {
        name: name.trim(),
        description: description.trim() || 'Laboratory specialist equipment.',
        category_id: categoryId,
        owner_id: user.id,
        institution: 'Apex Institute of Technology',
        location_building: building.trim(),
        location_room: room.trim(),
        campus_zone: campusZone,
        walking_minutes: Number(walkingMinutes) || 3,
        requires_training: requiresTraining,
        requires_approval: requiresApproval,
        max_booking_hours: Number(maxHours) || 4,
        min_booking_hours: Number(minHours) || 1,
        cost_per_hour: Number(costPerHour) || 0,
        status: 'available',
        deposit_amount: 0,
        cancellation_policy: 'Standard: Free cancellation up to 2 hours before scheduled slot.',
        intended_uses: ['Specialist Fabrication', 'Laboratory Analysis', 'Academic Prototyping'],
        eligibility_requirements: requiresTraining
          ? [{ type: 'training', label: 'Safety Induction Level 1', value: 'safety_l1' }]
          : [],
        image_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80',
        safety_instructions: safetyInstructions.trim(),
        operating_rules: [
          { label: 'Operating Procedure', description: operatingRule1.trim() },
          { label: 'Safety Precaution', description: operatingRule2.trim() },
        ],
        availability_schedule: [
          { day: 1, start: '09:00', end: '18:00' },
          { day: 2, start: '09:00', end: '18:00' },
          { day: 3, start: '09:00', end: '18:00' },
          { day: 4, start: '09:00', end: '18:00' },
          { day: 5, start: '09:00', end: '17:00' },
        ],
        resource_type: 'equipment',
      },
      user.id
    );

    if (!created) {
      setErrorMsg('Failed to create resource.');
    } else {
      setSuccessMsg(`Resource "${name}" registered into department catalogue.`);
      setIsAddModalOpen(false);
      setName('');
      setDescription('');
    }
  };

  const handleApproveBooking = (bookingId: string) => {
    const res = updateBookingStatus(bookingId, 'approved', user.id, {
      confirmed_by_reporter: true,
    });
    if ('error' in res) {
      setErrorMsg(res.error);
    } else {
      setSuccessMsg('Reservation approved. Custody check-in pass unlocked for borrower.');
    }
  };

  const handleConfirmReject = () => {
    if (!rejectingBookingId) return;
    const res = updateBookingStatus(rejectingBookingId, 'rejected', user.id, {
      rejection_reason: rejectionReason.trim() || 'Declined by laboratory faculty owner.',
    });
    if ('error' in res) {
      setErrorMsg(res.error);
    } else {
      setSuccessMsg('Reservation rejected. Borrower provided with constructive feedback.');
    }
    setRejectingBookingId(null);
    setRejectionReason('');
  };

  const handleCreateBlackout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!blackoutTitle || !blackoutStart || !blackoutEnd) return;

    const res = createBlackoutPeriod(
      {
        resource_id: blackoutTargetResourceId || undefined,
        title: blackoutTitle.trim(),
        reason: blackoutReason.trim() || 'Scheduled maintenance and calibration',
        start_time: new Date(blackoutStart).toISOString(),
        end_time: new Date(blackoutEnd).toISOString(),
        created_by: user.id,
      },
      user.id
    );

    if ('error' in res) {
      setErrorMsg(res.error);
    } else {
      setSuccessMsg(`Blackout schedule "${blackoutTitle}" posted. Automated booking conflict protection active.`);
      setIsBlackoutModalOpen(false);
      setBlackoutTitle('');
      setBlackoutReason('');
      setBlackoutStart('');
      setBlackoutEnd('');
    }
  };

  const handleDeleteBlackout = (periodId: string) => {
    const res = deleteBlackoutPeriod(periodId, user.id);
    if (typeof res === 'object' && 'error' in res) {
      setErrorMsg(res.error);
    } else {
      setSuccessMsg('Blackout window cancelled. Calendar reopened for reservations.');
    }
  };

  const handlePingOverdueBorrower = (booking: Booking) => {
    addNotification(
      booking.borrower_id,
      'URGENT: Equipment Return Overdue',
      `Your reservation for "${myResources.find((r) => r.id === booking.resource_id)?.name}" is past its scheduled return time. Please proceed immediately to the return station to avoid academic account hold.`,
      '/checkin'
    );
    setSuccessMsg('Urgent return reminder sent to borrower.');
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 font-mono text-xs">
      
      {/* ─── 01 / CUSTODIAN MASTHEAD ─── */}
      <section className="border-b border-[#DCD9CF] pb-6 pt-2">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#183D30] font-bold bg-[#183D30]/10 px-2.5 py-1 border border-[#183D30]/20">
              FACULTY CUSTODIAN / 04
            </span>
            <span className="text-[11px] font-mono text-[#7E8276] uppercase tracking-wider">
              DEPARTMENT COMMAND // {user.department}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setBlackoutTargetResourceId(myResources[0]?.id || '');
                setIsBlackoutModalOpen(true);
              }}
              className="px-3.5 py-2 bg-[#F3F0E8] hover:bg-[#DCD9CF] border border-[#DCD9CF] text-[#252722] uppercase font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>BLACKOUT</span>
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 bg-[#183D30] hover:bg-[#204e3e] text-[#D8FF3E] uppercase font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>NEW ASSET</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-[#252722] tracking-tight leading-tight">
              Laboratory Custody Command
            </h1>
            <p className="mt-2 text-sm text-[#565950] font-sans leading-relaxed max-w-xl">
              Supervise departmental equipment, evaluate pending borrower access, schedule maintenance blackouts, and enforce physical accountability.
            </p>
          </div>

          {/* Operational Metrics Matrix Strip */}
          <div className="flex items-stretch gap-px bg-[#DCD9CF] border border-[#DCD9CF] shrink-0 font-mono">
            <div className="bg-[#FCFBF7] p-3 sm:px-4">
              <span className="text-[10px] uppercase text-[#7E8276] block">Assets</span>
              <span className="text-xl font-bold text-[#252722] mt-0.5 block">{metrics.totalResources}</span>
            </div>
            <div className="bg-[#FCFBF7] p-3 sm:px-4">
              <span className="text-[10px] uppercase text-[#7E8276] block">Queue</span>
              <span className={`text-xl font-bold mt-0.5 block ${metrics.pendingRequests.length > 0 ? 'text-[#854D0E]' : 'text-[#183D30]'}`}>
                {metrics.pendingRequests.length}
              </span>
            </div>
            <div className="bg-[#FCFBF7] p-3 sm:px-4">
              <span className="text-[10px] uppercase text-[#7E8276] block">Utilization</span>
              <span className="text-xl font-bold text-[#183D30] mt-0.5 block">{metrics.utilizationRate}%</span>
            </div>
            <div className="bg-[#FCFBF7] p-3 sm:px-4">
              <span className="text-[10px] uppercase text-[#7E8276] block">Overdue</span>
              <span className={`text-xl font-bold mt-0.5 block ${metrics.overdueBookings.length > 0 ? 'text-[#E11D48]' : 'text-[#252722]'}`}>
                {metrics.overdueBookings.length}
              </span>
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
          <button onClick={() => setSuccessMsg(null)} className="text-[#D8FF3E] hover:underline cursor-pointer">
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
          <button onClick={() => setErrorMsg(null)} className="text-[#854D0E] hover:underline cursor-pointer">
            DISMISS
          </button>
        </div>
      )}

      {/* ─── 02 / PROMINENT PENDING REQUESTS OPERATIONAL CALLOUT ─── */}
      {metrics.pendingRequests.length > 0 && (
        <div className="border-2 border-[#183D30] bg-[#FCFBF7] p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#DCD9CF] pb-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#183D30] flex items-center gap-2">
              <Inbox className="w-4 h-4 text-[#183D30]" />
              <span>ACTION REQUIRED // {metrics.pendingRequests.length} PENDING BORROWER ACCESS REQUESTS</span>
            </span>
            <button
              onClick={() => navigate('/owner/approvals')}
              className="text-xs font-mono text-[#183D30] hover:underline font-bold uppercase flex items-center gap-1 cursor-pointer"
            >
              <span>APPROVAL TERMINAL</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-[#DCD9CF]">
            {metrics.pendingRequests.slice(0, 3).map((b) => {
              const borrower = getUserById(b.borrower_id);
              const res = myResources.find((r) => r.id === b.resource_id);

              return (
                <div key={b.id} className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <strong className="text-[#252722] uppercase">{res?.name}</strong>
                      <span className="px-1.5 py-0.2 bg-[#183D30] text-[#D8FF3E] text-[9px] font-bold">
                        {b.priority_level?.toUpperCase() || 'COURSEWORK'}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#565950]">
                      REQUESTER: {borrower?.full_name} ({borrower?.department}) • {formatDateTime(b.start_time)} → {formatDateTime(b.end_time)}
                    </p>
                    <p className="text-[11px] font-sans text-[#7E8276]">
                      Purpose: {b.purpose}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        setRejectingBookingId(b.id);
                        setRejectionReason('');
                      }}
                      className="px-3 py-1.5 bg-[#F3F0E8] border border-[#DCD9CF] hover:bg-[#EAE5D8] text-[#854D0E] uppercase font-bold cursor-pointer"
                    >
                      DECLINE
                    </button>
                    <button
                      onClick={() => handleApproveBooking(b.id)}
                      className="px-4 py-1.5 bg-[#183D30] text-[#D8FF3E] uppercase font-bold cursor-pointer"
                    >
                      AUTHORIZE
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── 03 / OPERATIONAL NAVIGATION TABS ─── */}
      <div className="flex bg-[#F3F0E8] p-1 border border-[#DCD9CF] gap-1 overflow-x-auto font-mono text-xs">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-3.5 py-2 uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'inventory' 
              ? 'bg-[#183D30] text-[#D8FF3E] font-bold' 
              : 'text-[#565950] hover:text-[#183D30]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>INVENTORY REGISTRY ({myResources.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('pending')}
          className={`px-3.5 py-2 uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'pending' 
              ? 'bg-[#183D30] text-[#D8FF3E] font-bold' 
              : 'text-[#565950] hover:text-[#183D30]'
          }`}
        >
          <Inbox className="w-3.5 h-3.5" />
          <span>PENDING QUEUE</span>
          {metrics.pendingRequests.length > 0 && (
            <span className="px-1.5 py-0.2 bg-[#D8FF3E] text-[#183D30] font-bold text-[9px]">
              {metrics.pendingRequests.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('handovers')}
          className={`px-3.5 py-2 uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'handovers' 
              ? 'bg-[#183D30] text-[#D8FF3E] font-bold' 
              : 'text-[#565950] hover:text-[#183D30]'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>HANDOVERS & RETURNS ({metrics.upcomingHandovers.length + metrics.upcomingReturns.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('overdue')}
          className={`px-3.5 py-2 uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'overdue' 
              ? 'bg-[#183D30] text-[#D8FF3E] font-bold' 
              : 'text-[#565950] hover:text-[#183D30]'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>OVERDUE ASSETS</span>
          {metrics.overdueBookings.length > 0 && (
            <span className="px-1.5 py-0.2 bg-[#E11D48] text-white font-bold text-[9px]">
              {metrics.overdueBookings.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('incidents')}
          className={`px-3.5 py-2 uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'incidents' 
              ? 'bg-[#183D30] text-[#D8FF3E] font-bold' 
              : 'text-[#565950] hover:text-[#183D30]'
          }`}
        >
          <Wrench className="w-3.5 h-3.5" />
          <span>INCIDENTS ({metrics.activeIncidents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('blackouts')}
          className={`px-3.5 py-2 uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'blackouts' 
              ? 'bg-[#183D30] text-[#D8FF3E] font-bold' 
              : 'text-[#565950] hover:text-[#183D30]'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>BLACKOUT SCHEDULES ({allBlackouts.length})</span>
        </button>
      </div>

      {/* ─── TAB 1: INVENTORY REGISTRY ─── */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          <div className="p-3 bg-[#FCFBF7] border border-[#DCD9CF] flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full sm:w-auto">
              <Search className="w-3.5 h-3.5 text-[#7E8276] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search inventory records..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722] focus:border-[#183D30]"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="text-xs bg-[#F3F0E8] border border-[#DCD9CF] px-2.5 py-1.5 text-[#252722] focus:border-[#183D30] cursor-pointer"
              >
                <option value="all">ALL STATUSES</option>
                <option value="available">AVAILABLE</option>
                <option value="in_use">IN USE</option>
                <option value="maintenance">MAINTENANCE</option>
                <option value="retired">RETIRED</option>
              </select>
            </div>
          </div>

          <div className="border border-[#DCD9CF] bg-[#FCFBF7] divide-y divide-[#DCD9CF]">
            {filteredResources.length === 0 ? (
              <div className="p-10 text-center text-[#7E8276] uppercase">
                No matching equipment records located.
              </div>
            ) : (
              filteredResources.map((res) => {
                const category = categories.find((c) => c.id === res.category_id);
                const pendingForThis = metrics.pendingRequests.filter((b) => b.resource_id === res.id);

                return (
                  <div key={res.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#F3F0E8]/50 transition-colors">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] uppercase text-[#7E8276]">
                          {category?.name} // LL-{res.id.toUpperCase()}
                        </span>
                        <StatusBadge status={res.status} size="sm" />
                        {pendingForThis.length > 0 && (
                          <span className="px-1.5 py-0.2 bg-[#D8FF3E] text-[#183D30] font-bold text-[9px]">
                            {pendingForThis.length} PENDING
                          </span>
                        )}
                        {res.requires_training && (
                          <span className="px-1.5 py-0.2 bg-[#183D30]/10 text-[#183D30] border border-[#183D30]/20 text-[9px]">
                            SAFETY TRAINING REQ
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-display font-bold text-[#252722]">{res.name}</h3>
                      <p className="text-xs font-sans text-[#565950] line-clamp-1">{res.description}</p>
                      
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#7E8276]">
                        <span>{res.location_building}, Room {res.location_room}</span>
                        <span>•</span>
                        <span>Limits: {res.min_booking_hours || 1}–{res.max_booking_hours}h</span>
                        <span>•</span>
                        <span>Cost: {res.cost_per_hour === 0 ? 'FREE' : `$${res.cost_per_hour}/HR`}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={res.status}
                        onChange={(e) => handleQuickStatusChange(res.id, e.target.value as ResourceStatus)}
                        className="bg-[#F3F0E8] border border-[#DCD9CF] px-2 py-1.5 text-xs text-[#252722] cursor-pointer"
                      >
                        <option value="available">AVAILABLE</option>
                        <option value="in_use">IN USE</option>
                        <option value="maintenance">MAINTENANCE</option>
                        <option value="retired">RETIRED</option>
                      </select>

                      <button
                        onClick={() => handleOpenEditModal(res)}
                        className="px-3 py-1.5 bg-[#F3F0E8] hover:bg-[#DCD9CF] border border-[#DCD9CF] text-[#252722] uppercase font-bold cursor-pointer"
                      >
                        CONFIGURE
                      </button>

                      <button
                        onClick={() => navigate(`/resources/${res.id}`)}
                        className="px-3 py-1.5 bg-[#183D30] text-[#D8FF3E] uppercase font-bold cursor-pointer"
                      >
                        VIEW
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 2: PENDING APPROVALS ─── */}
      {activeTab === 'pending' && (
        <div className="border border-[#DCD9CF] bg-[#FCFBF7] divide-y divide-[#DCD9CF]">
          <div className="p-4 bg-[#F3F0E8] flex items-center justify-between">
            <span className="font-bold text-[#183D30] uppercase">
              PENDING BORROWER ACCESS REQUESTS ({metrics.pendingRequests.length})
            </span>
            <button
              onClick={() => navigate('/owner/approvals')}
              className="text-xs text-[#183D30] hover:underline font-bold uppercase flex items-center gap-1 cursor-pointer"
            >
              <span>EXPANDED QUEUE</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          {metrics.pendingRequests.length === 0 ? (
            <div className="p-12 text-center text-[#7E8276] uppercase">
              Zero pending requests require custodian review.
            </div>
          ) : (
            metrics.pendingRequests.map((b) => {
              const borrower = getUserById(b.borrower_id);
              const res = myResources.find((r) => r.id === b.resource_id);

              return (
                <div key={b.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <strong className="text-sm font-display font-bold text-[#252722]">{res?.name}</strong>
                      <span className="px-1.5 py-0.2 bg-[#D8FF3E] text-[#183D30] font-bold text-[9px] uppercase">
                        {b.status}
                      </span>
                    </div>
                    <p className="text-[#565950]">
                      REQUESTER: {borrower?.full_name} ({borrower?.department}) • {formatDateTime(b.start_time)} → {formatDateTime(b.end_time)}
                    </p>
                    <p className="text-[#7E8276] font-sans">
                      Purpose: {b.purpose} {b.project_course_context && `• Context: ${b.project_course_context}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        setRejectingBookingId(b.id);
                        setRejectionReason('');
                      }}
                      className="px-3.5 py-1.5 bg-[#F3F0E8] border border-[#DCD9CF] text-[#854D0E] font-bold uppercase cursor-pointer"
                    >
                      DECLINE
                    </button>
                    <button
                      onClick={() => handleApproveBooking(b.id)}
                      className="px-4 py-1.5 bg-[#183D30] text-[#D8FF3E] font-bold uppercase cursor-pointer"
                    >
                      APPROVE
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ─── TAB 3: HANDOVERS & RETURNS ─── */}
      {activeTab === 'handovers' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="border border-[#DCD9CF] bg-[#FCFBF7] p-5 space-y-4">
            <span className="text-xs font-mono font-bold uppercase text-[#183D30] block">
              UPCOMING PICKUPS ({metrics.upcomingHandovers.length})
            </span>
            {metrics.upcomingHandovers.length === 0 ? (
              <div className="p-8 text-center text-[#7E8276] uppercase">No check-ins in next 48h.</div>
            ) : (
              <div className="space-y-2">
                {metrics.upcomingHandovers.map((b) => {
                  const res = myResources.find((r) => r.id === b.resource_id);
                  const borrower = getUserById(b.borrower_id);
                  return (
                    <div key={b.id} className="p-3 bg-[#F3F0E8] border border-[#DCD9CF] flex items-center justify-between">
                      <div>
                        <strong className="text-[#252722] block">{res?.name}</strong>
                        <span className="text-[10px] text-[#7E8276]">{borrower?.full_name} • {formatDateTime(b.start_time)}</span>
                      </div>
                      <button
                        onClick={() => navigate('/checkin')}
                        className="px-2.5 py-1 bg-[#183D30] text-[#D8FF3E] font-bold uppercase"
                      >
                        STATION
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border border-[#DCD9CF] bg-[#FCFBF7] p-5 space-y-4">
            <span className="text-xs font-mono font-bold uppercase text-[#183D30] block">
              RETURNS DUE ({metrics.upcomingReturns.length})
            </span>
            {metrics.upcomingReturns.length === 0 ? (
              <div className="p-8 text-center text-[#7E8276] uppercase">No active loans due right now.</div>
            ) : (
              <div className="space-y-2">
                {metrics.upcomingReturns.map((b) => {
                  const res = myResources.find((r) => r.id === b.resource_id);
                  const borrower = getUserById(b.borrower_id);
                  return (
                    <div key={b.id} className="p-3 bg-[#F3F0E8] border border-[#DCD9CF] flex items-center justify-between">
                      <div>
                        <strong className="text-[#252722] block">{res?.name}</strong>
                        <span className="text-[10px] text-[#7E8276]">{borrower?.full_name} • Due: {formatDateTime(b.end_time)}</span>
                      </div>
                      <button
                        onClick={() => navigate('/checkin')}
                        className="px-2.5 py-1 bg-[#D8FF3E] text-[#183D30] font-bold uppercase border border-[#183D30]"
                      >
                        SIGN OFF
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 4: OVERDUE ASSETS ─── */}
      {activeTab === 'overdue' && (
        <div className="border border-[#DCD9CF] bg-[#FCFBF7] divide-y divide-[#DCD9CF]">
          <div className="p-4 bg-[#F3F0E8] flex items-center justify-between">
            <span className="font-bold text-[#E11D48] uppercase">
              OVERDUE PHYSICAL ASSETS ({metrics.overdueBookings.length})
            </span>
          </div>

          {metrics.overdueBookings.length === 0 ? (
            <div className="p-12 text-center text-[#183D30] font-bold uppercase">
              ✓ All equipment returned on schedule. Zero active overdues.
            </div>
          ) : (
            metrics.overdueBookings.map((b) => {
              const res = myResources.find((r) => r.id === b.resource_id);
              const borrower = getUserById(b.borrower_id);

              return (
                <div key={b.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#EAE5D8]/40">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <strong className="text-[#252722] uppercase">{res?.name}</strong>
                      <span className="px-1.5 py-0.2 bg-[#E11D48] text-white text-[9px] font-bold">
                        OVERDUE
                      </span>
                    </div>
                    <p className="text-[#854D0E]">
                      BORROWER: {borrower?.full_name} ({borrower?.department}) • {borrower?.email}
                    </p>
                    <p className="text-[#7E8276]">
                      SCHEDULED DEADLINE: {formatDateTime(b.end_time)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePingOverdueBorrower(b)}
                      className="px-3.5 py-1.5 bg-[#EAE5D8] border border-[#DCD9CF] text-[#854D0E] uppercase font-bold cursor-pointer"
                    >
                      SEND ALERT
                    </button>
                    <button
                      onClick={() => navigate('/checkin')}
                      className="px-3.5 py-1.5 bg-[#183D30] text-[#D8FF3E] uppercase font-bold cursor-pointer"
                    >
                      INSPECT
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ─── TAB 5: INCIDENTS ─── */}
      {activeTab === 'incidents' && (
        <div className="border border-[#DCD9CF] bg-[#FCFBF7] divide-y divide-[#DCD9CF]">
          <div className="p-4 bg-[#F3F0E8]">
            <span className="font-bold text-[#854D0E] uppercase">
              ACTIVE CONDITION INCIDENTS & DISPUTES ({metrics.activeIncidents.length})
            </span>
          </div>

          {metrics.activeIncidents.length === 0 ? (
            <div className="p-12 text-center text-[#7E8276] uppercase">
              No active equipment incidents reported on department assets.
            </div>
          ) : (
            metrics.activeIncidents.map((rep) => {
              const res = myResources.find((r) => r.id === rep.resource_id);
              const reporter = getUserById(rep.reporter_id);

              return (
                <div key={rep.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <strong className="text-[#252722] uppercase">{res?.name}</strong>
                      <span className="px-1.5 py-0.2 bg-[#854D0E] text-white text-[9px] font-bold uppercase">
                        {rep.condition}
                      </span>
                    </div>
                    <p className="text-[#7E8276]">
                      Reported by: {reporter?.full_name} on {formatDateTime(rep.created_at)}
                    </p>
                    <p className="text-[#565950] font-sans bg-[#F3F0E8] p-2.5 border border-[#DCD9CF]">
                      Notes: {rep.notes}
                    </p>
                  </div>

                  <button
                    onClick={() => navigate('/checkin')}
                    className="px-4 py-2 bg-[#183D30] text-[#D8FF3E] uppercase font-bold cursor-pointer shrink-0"
                  >
                    RESOLVE
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ─── TAB 6: BLACKOUT SCHEDULES ─── */}
      {activeTab === 'blackouts' && (
        <div className="border border-[#DCD9CF] bg-[#FCFBF7] divide-y divide-[#DCD9CF]">
          <div className="p-4 bg-[#F3F0E8] flex items-center justify-between">
            <span className="font-bold text-[#183D30] uppercase">
              SCHEDULED BLACKOUTS & CALIBRATION DOWNTIME ({allBlackouts.length})
            </span>
            <button
              onClick={() => {
                setBlackoutTargetResourceId(myResources[0]?.id || '');
                setIsBlackoutModalOpen(true);
              }}
              className="px-3 py-1 bg-[#183D30] text-[#D8FF3E] font-bold uppercase cursor-pointer"
            >
              + ADD BLACKOUT
            </button>
          </div>

          {allBlackouts.length === 0 ? (
            <div className="p-12 text-center text-[#7E8276] uppercase">
              Zero scheduled blackouts. Standard operating hours active.
            </div>
          ) : (
            allBlackouts.map((blk) => {
              const targetRes = blk.resource_id ? myResources.find((r) => r.id === blk.resource_id) : null;

              return (
                <div key={blk.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <strong className="text-[#252722] uppercase block">{blk.title}</strong>
                    <span className="text-[#7E8276]">
                      {targetRes ? `Specific: ${targetRes.name}` : 'Campus-Wide Downtime'}
                    </span>
                    <p className="text-[#565950] font-sans">{blk.reason}</p>
                    <p className="text-[10px] text-[#7E8276]">
                      {formatDateTime(blk.start_time)} → {formatDateTime(blk.end_time)}
                    </p>
                  </div>

                  <button
                    onClick={() => handleDeleteBlackout(blk.id)}
                    className="px-3 py-1.5 bg-[#EAE5D8] border border-[#DCD9CF] text-[#854D0E] uppercase font-bold cursor-pointer"
                  >
                    CANCEL
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Edit Modal */}
      {editingResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#252722]/60 backdrop-blur-xs">
          <div className="bg-[#FCFBF7] border-2 border-[#183D30] max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#DCD9CF] pb-3">
              <h3 className="font-display font-bold text-base text-[#252722]">
                CONFIGURE POLICIES // {editingResource.name}
              </h3>
              <button onClick={() => setEditingResource(null)} className="text-[#7E8276] hover:text-[#252722]">✕</button>
            </div>

            <form onSubmit={handleSaveResourceEdit} className="space-y-4 font-mono text-xs">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block uppercase text-[10px] text-[#7E8276] mb-1">EQUIPMENT NAME:</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    className="w-full p-2 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722]"
                  />
                </div>
                <div>
                  <label className="block uppercase text-[10px] text-[#7E8276] mb-1">CATEGORY:</label>
                  <select
                    value={editCategoryId}
                    onChange={(e) => setEditCategoryId(e.target.value)}
                    className="w-full p-2 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722]"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block uppercase text-[10px] text-[#7E8276] mb-1">DESCRIPTION:</label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  required
                  className="w-full p-2 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722] resize-none"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block uppercase text-[10px] text-[#7E8276] mb-1">BUILDING:</label>
                  <input
                    type="text"
                    value={editBuilding}
                    onChange={(e) => setEditBuilding(e.target.value)}
                    required
                    className="w-full p-2 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722]"
                  />
                </div>
                <div>
                  <label className="block uppercase text-[10px] text-[#7E8276] mb-1">ROOM:</label>
                  <input
                    type="text"
                    value={editRoom}
                    onChange={(e) => setEditRoom(e.target.value)}
                    required
                    className="w-full p-2 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722]"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="block uppercase text-[10px] text-[#7E8276] mb-1">MAX HOURS:</label>
                  <input
                    type="number"
                    value={editMaxHours}
                    onChange={(e) => setEditMaxHours(Number(e.target.value))}
                    min={1}
                    className="w-full p-2 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722]"
                  />
                </div>
                <div>
                  <label className="block uppercase text-[10px] text-[#7E8276] mb-1">COST/HR ($):</label>
                  <input
                    type="number"
                    value={editCostPerHour}
                    onChange={(e) => setEditCostPerHour(Number(e.target.value))}
                    min={0}
                    className="w-full p-2 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722]"
                  />
                </div>
                <div>
                  <label className="block uppercase text-[10px] text-[#7E8276] mb-1">OPERATIONAL STATUS:</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as ResourceStatus)}
                    className="w-full p-2 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722]"
                  >
                    <option value="available">AVAILABLE</option>
                    <option value="in_use">IN USE</option>
                    <option value="maintenance">MAINTENANCE</option>
                    <option value="retired">RETIRED</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#DCD9CF]">
                <button
                  type="button"
                  onClick={() => setEditingResource(null)}
                  className="px-4 py-2 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722]"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#183D30] text-[#D8FF3E] font-bold uppercase"
                >
                  SAVE POLICIES
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Resource Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#252722]/60 backdrop-blur-xs">
          <div className="bg-[#FCFBF7] border-2 border-[#183D30] max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[#DCD9CF] pb-3">
              <h3 className="font-display font-bold text-base text-[#252722]">
                CATALOGUE NEW DEPARTMENT ASSET
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-[#7E8276] hover:text-[#252722]">✕</button>
            </div>

            <form onSubmit={handleCreateResource} className="space-y-4">
              <div>
                <label className="block uppercase text-[10px] text-[#7E8276] mb-1">EQUIPMENT MODEL & NAME *:</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rohde & Schwarz Spectrum Analyzer"
                  className="w-full p-2 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722]"
                />
              </div>

              <div>
                <label className="block uppercase text-[10px] text-[#7E8276] mb-1">CATEGORY:</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full p-2 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722]"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block uppercase text-[10px] text-[#7E8276] mb-1">BUILDING:</label>
                  <input
                    type="text"
                    value={building}
                    onChange={(e) => setBuilding(e.target.value)}
                    className="w-full p-2 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722]"
                  />
                </div>
                <div>
                  <label className="block uppercase text-[10px] text-[#7E8276] mb-1">ROOM:</label>
                  <input
                    type="text"
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    className="w-full p-2 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722]"
                  />
                </div>
              </div>

              <div>
                <label className="block uppercase text-[10px] text-[#7E8276] mb-1">DESCRIPTION & CAPABILITIES:</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#DCD9CF]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722]"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#183D30] text-[#D8FF3E] font-bold uppercase"
                >
                  CATALOGUE ASSET
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Blackout Modal */}
      {isBlackoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#252722]/60 backdrop-blur-xs font-mono text-xs">
          <div className="bg-[#FCFBF7] border-2 border-[#183D30] max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#DCD9CF] pb-3">
              <h3 className="font-display font-bold text-base text-[#252722]">SCHEDULE MAINTENANCE BLACKOUT</h3>
              <button onClick={() => setIsBlackoutModalOpen(false)} className="text-[#7E8276] hover:text-[#252722]">✕</button>
            </div>

            <form onSubmit={handleCreateBlackout} className="space-y-4">
              <div>
                <label className="block uppercase text-[10px] text-[#7E8276] mb-1">TARGET RESOURCE:</label>
                <select
                  value={blackoutTargetResourceId}
                  onChange={(e) => setBlackoutTargetResourceId(e.target.value)}
                  className="w-full p-2 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722]"
                >
                  <option value="">ALL DEPARTMENT RESOURCES</option>
                  {myResources.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block uppercase text-[10px] text-[#7E8276] mb-1">TITLE:</label>
                <input
                  type="text"
                  required
                  value={blackoutTitle}
                  onChange={(e) => setBlackoutTitle(e.target.value)}
                  placeholder="e.g. Annual NIST Traceable Recalibration"
                  className="w-full p-2 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722]"
                />
              </div>

              <div>
                <label className="block uppercase text-[10px] text-[#7E8276] mb-1">REASON:</label>
                <textarea
                  rows={2}
                  required
                  value={blackoutReason}
                  onChange={(e) => setBlackoutReason(e.target.value)}
                  className="w-full p-2 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722] resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block uppercase text-[10px] text-[#7E8276] mb-1">START DATE/TIME:</label>
                  <input
                    type="datetime-local"
                    required
                    value={blackoutStart}
                    onChange={(e) => setBlackoutStart(e.target.value)}
                    className="w-full p-2 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722]"
                  />
                </div>
                <div>
                  <label className="block uppercase text-[10px] text-[#7E8276] mb-1">END DATE/TIME:</label>
                  <input
                    type="datetime-local"
                    required
                    value={blackoutEnd}
                    onChange={(e) => setBlackoutEnd(e.target.value)}
                    className="w-full p-2 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#DCD9CF]">
                <button
                  type="button"
                  onClick={() => setIsBlackoutModalOpen(false)}
                  className="px-3 py-1.5 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722]"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#183D30] text-[#D8FF3E] font-bold uppercase"
                >
                  SCHEDULE
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Decline Modal */}
      {rejectingBookingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#252722]/60 backdrop-blur-xs font-mono text-xs">
          <div className="bg-[#FCFBF7] border-2 border-[#183D30] max-w-md w-full p-6 space-y-4">
            <h3 className="font-display font-bold text-base text-[#252722]">DECLINE RESERVATION</h3>
            <p className="text-[#7E8276]">Provide formal rationale for audit logs and borrower notification.</p>

            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Bench reserved for departmental senior project evaluations..."
              className="w-full p-2.5 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722] resize-none"
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#DCD9CF]">
              <button
                onClick={() => setRejectingBookingId(null)}
                className="px-3 py-1.5 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722]"
              >
                CANCEL
              </button>
              <button
                onClick={handleConfirmReject}
                className="px-4 py-1.5 bg-[#854D0E] text-white font-bold uppercase"
              >
                CONFIRM DECLINE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
