import type {
  AppStore,
  User,
  Category,
  Resource,
  Booking,
  ConditionReport,
  ConditionRating,
  EvidenceFile,
  ReportCorrection,
  AuditLog,
  Notification,
  BookingStatus,
  ResourceStatus,
  IncidentStatus,
  EligibilityEvaluation,
  FairnessCheckResult,
  RequirementCheck,
  BookingPriority,
  UserRole,
  HandoverTimelineEvent,
  BlackoutPeriod,
  AccessException,
  InstitutionConfig,
} from '../types';
import { generateId } from '../utils/id';
import { seedDemoData, DEFAULT_INSTITUTION_CONFIG } from './seed';

export { generateId };

const STORAGE_KEY = 'labloop_store';

// ─── Persistence ─────────────────────────────────────────
function loadStore(): AppStore {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const store: AppStore = JSON.parse(raw);
        let updated = false;
        store.resources.forEach((r) => {
          if (r.image_url?.includes('photo-1631556097152-c39479cbfeab')) {
            r.image_url = 'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?auto=format&fit=crop&w=800&q=80';
            updated = true;
          }
          if (r.image_url?.includes('photo-1581092335397-9583fe92d232')) {
            r.image_url = 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=800&q=80';
            updated = true;
          }
        });
        if (updated) {
          saveStore(store);
        }
        return store;
      }
    }
  } catch {
    // corrupted — reset
  }
  const seed = seedDemoData();
  saveStore(seed);
  return seed;
}

function saveStore(store: AppStore): void {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch {
      // ignore storage quota errors
    }
  }
}

function getEmptyStore(): AppStore {
  return {
    users: [],
    categories: [],
    resources: [],
    bookings: [],
    condition_reports: [],
    audit_logs: [],
    notifications: [],
    institution_config: DEFAULT_INSTITUTION_CONFIG,
  };
}

// ─── Singleton store ─────────────────────────────────────
let _store: AppStore = loadStore();

function commit(): void {
  saveStore(_store);
}

export function getStore(): AppStore {
  return _store;
}

export function resetStore(): void {
  _store = getEmptyStore();
  commit();
}

// ─── Audit logger ────────────────────────────────────────
export function addAuditLog(
  userId: string,
  targetId: string,
  targetType: AuditLog['target_type'],
  action: string,
  oldValue: Record<string, unknown> | null = null,
  newValue: Record<string, unknown> | null = null,
  decisionReason: string | null = null
): void {
  const actor = _store.users.find((u) => u.id === userId);
  _store.audit_logs.push({
    id: generateId(),
    user_id: userId,
    actor_name: actor?.full_name || 'System / Automated Rule',
    actor_role: actor?.role || 'borrower',
    target_id: targetId,
    target_type: targetType,
    action,
    decision_reason: decisionReason,
    old_value: oldValue,
    new_value: newValue,
    created_at: new Date().toISOString(),
  });
  commit();
}

// ─── Notification helper ─────────────────────────────────
export function addNotification(
  userId: string,
  title: string,
  message: string,
  link?: string,
  category: 'booking' | 'waitlist' | 'incident' | 'system' | 'safety' = 'booking'
): void {
  _store.notifications.push({
    id: generateId(),
    user_id: userId,
    title,
    message,
    read: false,
    link,
    category,
    created_at: new Date().toISOString(),
  });
  commit();
}

export function deleteNotification(notifId: string): void {
  const idx = _store.notifications.findIndex((n) => n.id === notifId);
  if (idx !== -1) {
    _store.notifications.splice(idx, 1);
    commit();
  }
}

// ─── Users ───────────────────────────────────────────────
export function getUsers(): User[] {
  return _store.users;
}

export function getUserById(id: string): User | undefined {
  return _store.users.find((u) => u.id === id);
}

export function getUserByEmail(email: string): User | undefined {
  return _store.users.find((u) => u.email === email);
}

export function createUser(user: Omit<User, 'id' | 'created_at'>): User {
  const newUser: User = {
    ...user,
    id: generateId(),
    created_at: new Date().toISOString(),
    email_verified: user.email_verified ?? true,
  };
  _store.users.push(newUser);
  commit();
  return newUser;
}

export function setUserVerificationDetails(
  email: string,
  code: string,
  token: string
): { success: boolean; error?: string } {
  const user = _store.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) return { success: false, error: 'User not found' };
  user.verification_code = code;
  user.verification_token = token;
  user.verification_sent_at = new Date().toISOString();
  commit();
  return { success: true };
}

export function verifyUserEmail(
  email: string,
  codeOrToken: string
): { success: boolean; error?: string; user?: User } {
  const user = _store.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) return { success: false, error: 'User not found' };

  if (user.email_verified) {
    return { success: true, user };
  }

  const cleanedInput = codeOrToken.trim();
  const matchesCode = user.verification_code && user.verification_code === cleanedInput;
  const matchesToken = user.verification_token && user.verification_token === cleanedInput;

  if (!matchesCode && !matchesToken) {
    return { success: false, error: 'Invalid or expired verification pass code.' };
  }

  user.email_verified = true;
  user.verification_code = undefined;
  user.verification_token = undefined;
  commit();
  return { success: true, user };
}

export function updateUserRole(
  targetUserId: string,
  newRole: UserRole,
  actorId: string
): User | { error: string } {
  const actor = getUserById(actorId);
  if (!actor) return { error: 'Actor user not found.' };

  // Only administrator can change roles
  if (actor.role !== 'admin') {
    return { error: 'Unauthorized: Only system administrators can assign user roles.' };
  }

  // Prevent users from granting themselves privileges (self-role modification)
  if (actorId === targetUserId) {
    return { error: 'Security violation: Users are strictly prohibited from altering their own role privileges.' };
  }

  const targetIdx = _store.users.findIndex((u) => u.id === targetUserId);
  if (targetIdx === -1) return { error: 'Target user not found.' };

  const old = { ..._store.users[targetIdx] };
  _store.users[targetIdx] = {
    ..._store.users[targetIdx],
    role: newRole,
  };

  addAuditLog(actorId, targetUserId, 'user', 'user.role_change',
    { role: old.role } as Record<string, unknown>,
    { role: newRole } as Record<string, unknown>
  );

  commit();
  return _store.users[targetIdx];
}

export function updateUser(
  id: string,
  updates: Partial<User>,
  actorId?: string
): User | { error: string } | null {
  const idx = _store.users.findIndex((u) => u.id === id);
  if (idx === -1) return null;

  // If role is being modified, enforce role assignment rules
  if (updates.role !== undefined) {
    const actor = actorId ? getUserById(actorId) : null;
    if (actorId && actorId === id) {
      return { error: 'Security violation: Users are strictly prohibited from altering their own role privileges.' };
    }
    if (actor && actor.role !== 'admin') {
      return { error: 'Unauthorized: Only system administrators can assign user roles.' };
    }
  }

  const old = { ..._store.users[idx] };
  _store.users[idx] = { ..._store.users[idx], ...updates };
  addAuditLog(actorId || id, id, 'user', 'user.updated', old as unknown as Record<string, unknown>, _store.users[idx] as unknown as Record<string, unknown>);
  commit();
  return _store.users[idx];
}

// ─── Categories ──────────────────────────────────────────
export function getCategories(): Category[] {
  return _store.categories;
}

export function getCategoryById(id: string): Category | undefined {
  return _store.categories.find((c) => c.id === id);
}

export function createCategory(
  category: Omit<Category, 'id'>,
  actorId: string
): Category | { error: string } {
  const actor = getUserById(actorId);
  if (!actor || !['manager', 'admin'].includes(actor.role)) {
    return { error: 'Unauthorized: Only managers or administrators can create resource categories.' };
  }

  const existing = _store.categories.find(
    (c) => c.name.toLowerCase() === category.name.trim().toLowerCase()
  );
  if (existing) {
    return { error: `Category "${category.name}" already exists.` };
  }

  const newCat: Category = {
    ...category,
    id: `cat-${generateId().slice(0, 8)}`,
    name: category.name.trim(),
  };

  _store.categories.push(newCat);
  addAuditLog(actorId, newCat.id, 'category', 'category.created', null, newCat as unknown as Record<string, unknown>);
  commit();
  return newCat;
}

export function updateCategory(
  categoryId: string,
  updates: Partial<Omit<Category, 'id'>>,
  actorId: string
): Category | { error: string } {
  const actor = getUserById(actorId);
  if (!actor || !['manager', 'admin'].includes(actor.role)) {
    return { error: 'Unauthorized: Only managers or administrators can update categories.' };
  }

  const idx = _store.categories.findIndex((c) => c.id === categoryId);
  if (idx === -1) return { error: 'Category not found.' };

  const old = { ..._store.categories[idx] };
  _store.categories[idx] = { ..._store.categories[idx], ...updates };
  addAuditLog(actorId, categoryId, 'category', 'category.updated', old as unknown as Record<string, unknown>, _store.categories[idx] as unknown as Record<string, unknown>);
  commit();
  return _store.categories[idx];
}

export function deleteCategory(
  categoryId: string,
  actorId: string
): boolean | { error: string } {
  const actor = getUserById(actorId);
  if (!actor || actor.role !== 'admin') {
    return { error: 'Unauthorized: Only administrators can delete resource categories.' };
  }

  // Safety check: ensure no active resource is currently using this category
  const inUse = _store.resources.some((r) => r.category_id === categoryId);
  if (inUse) {
    return { error: 'Cannot delete category: Active equipment in inventory is currently assigned to this category.' };
  }

  const idx = _store.categories.findIndex((c) => c.id === categoryId);
  if (idx === -1) return { error: 'Category not found.' };

  const old = _store.categories[idx];
  _store.categories.splice(idx, 1);
  addAuditLog(actorId, categoryId, 'category', 'category.deleted', old as unknown as Record<string, unknown>, null);
  commit();
  return true;
}

// ─── Resources ───────────────────────────────────────────
export function getResources(): Resource[] {
  return _store.resources;
}

export function getResourceById(id: string): Resource | undefined {
  return _store.resources.find((r) => r.id === id);
}

export function getResourcesByOwner(ownerId: string): Resource[] {
  return _store.resources.filter((r) => r.owner_id === ownerId);
}

export function createResource(resource: Omit<Resource, 'id' | 'created_at'>, actorId: string): Resource {
  const newResource: Resource = {
    ...resource,
    id: generateId(),
    created_at: new Date().toISOString(),
  };
  _store.resources.push(newResource);
  addAuditLog(actorId, newResource.id, 'resource', 'resource.created', null, newResource as unknown as Record<string, unknown>);
  commit();
  return newResource;
}

export function updateResource(
  id: string,
  updates: Partial<Resource>,
  actorId: string
): Resource | { error: string } {
  const idx = _store.resources.findIndex((r) => r.id === id);
  if (idx === -1) return { error: 'Resource not found.' };

  const actor = getUserById(actorId);
  if (!actor) return { error: 'Actor user not found.' };

  const resource = _store.resources[idx];
  const isOwner = resource.owner_id === actorId;
  const isManagerOrAdmin = actor.role === 'manager' || actor.role === 'admin';

  // Permission check: Owners must not be able to edit resources they do not own unless granted manager role
  if (actor.role === 'owner' && !isOwner && !isManagerOrAdmin) {
    return { error: 'Unauthorized: Resource owners cannot edit equipment they do not own unless explicitly granted management privileges.' };
  }

  // Borrowers cannot modify resource configurations (unless updating status during checkin/checkout/incident reporting)
  if (actor.role === 'borrower') {
    const keys = Object.keys(updates);
    const isOnlyStatusUpdate = keys.length === 1 && keys[0] === 'status';
    if (!isOnlyStatusUpdate) {
      return { error: 'Unauthorized: Borrowers cannot modify resource configurations.' };
    }
  }

  const old = { ..._store.resources[idx] };
  _store.resources[idx] = { ..._store.resources[idx], ...updates };
  addAuditLog(actorId, id, 'resource', 'resource.updated', old as unknown as Record<string, unknown>, _store.resources[idx] as unknown as Record<string, unknown>);
  commit();
  return _store.resources[idx];
}

// ─── Bookings ────────────────────────────────────────────
export function getBookings(): Booking[] {
  return _store.bookings;
}

export function getBookingById(id: string): Booking | undefined {
  return _store.bookings.find((b) => b.id === id);
}

export function getBookingsByBorrower(borrowerId: string): Booking[] {
  return _store.bookings.filter((b) => b.borrower_id === borrowerId);
}

export function getBookingsForResource(resourceId: string): Booking[] {
  return _store.bookings.filter((b) => b.resource_id === resourceId);
}

export function getPendingBookingsForOwner(ownerId: string): Booking[] {
  const ownerResources = getResourcesByOwner(ownerId).map((r) => r.id);
  return _store.bookings.filter(
    (b) => ownerResources.includes(b.resource_id) && ['pending', 'pending_approval', 'waitlisted'].includes(b.status)
  );
}

// ─── Eligibility & Fairness Engines ────────────────────────
export function evaluateUserEligibility(user: User, resource: Resource): EligibilityEvaluation {
  const requirements: RequirementCheck[] = [];
  const unmetRequirements: string[] = [];

  // Check 1: Mandatory lab safety training
  if (resource.requires_training) {
    const activeException = (_store.institution_config?.access_exceptions || []).find(
      (e) => e.user_id === user.id && (!e.resource_id || e.resource_id === resource.id) &&
      (e.exception_type === 'training_override' || e.exception_type === 'emergency_access') &&
      new Date(e.expires_at).getTime() > Date.now()
    );
    const isSatisfied = user.training_completed === true || Boolean(activeException);
    requirements.push({
      type: 'training',
      label: 'Verified Lab Safety Certification',
      expected: 'Completed & Certified',
      satisfied: isSatisfied,
      details: user.training_completed
        ? 'Verified institutional safety credential active in database.'
        : activeException
        ? `Granted via verified managerial exception: "${activeException.reason}".`
        : 'Missing prerequisite safety module. Cannot book without verified certification.',
    });
    if (!isSatisfied) {
      unmetRequirements.push('Verified Lab Safety Training Certification');
    }
  }

  // Check 2: Department requirement (if declared in eligibility_requirements)
  const deptReq = resource.eligibility_requirements?.find((r) => r.type === 'department');
  if (deptReq && deptReq.value) {
    const allowedDepts = deptReq.value.split(',').map((d) => d.trim().toLowerCase());
    const userDept = (user.department || '').trim().toLowerCase();
    const isSatisfied = allowedDepts.includes('any') || allowedDepts.includes(userDept) || allowedDepts.some(d => userDept.includes(d));
    requirements.push({
      type: 'department',
      label: deptReq.label || 'Academic Department Affiliation',
      expected: deptReq.value,
      satisfied: isSatisfied,
      details: isSatisfied
        ? `Department "${user.department}" satisfies prerequisite.`
        : `Resource designated for ${deptReq.value}. Current department: ${user.department}.`,
    });
    if (!isSatisfied) {
      unmetRequirements.push(`Department prerequisite (${deptReq.value})`);
    }
  }

  // Check 3: Active institutional account / membership
  const isMemberActive = user.is_active === true;
  requirements.push({
    type: 'membership',
    label: 'Active Institutional Status',
    expected: 'Active Student / Faculty / Staff Record',
    satisfied: isMemberActive,
    details: isMemberActive ? 'Good standing verified.' : 'Account inactive or suspended.',
  });
  if (!isMemberActive) {
    unmetRequirements.push('Active institutional status');
  }

  // Check 4: Faculty / Owner Approval (informative flag, does not block request submission)
  if (resource.requires_approval) {
    requirements.push({
      type: 'approval',
      label: 'Owner / Lab Supervisor Review',
      expected: 'Faculty sign-off required prior to physical handover',
      satisfied: true,
      details: 'Request will enter the approval queue for manual staff verification.',
    });
  }

  const canOverride = ['manager', 'admin'].includes(user.role);
  const isEligible = unmetRequirements.length === 0 || canOverride;

  return {
    isEligible,
    requirements,
    unmetRequirements,
    canOverride,
  };
}

export function getUserCancellationCount(userId: string, days = 14): number {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return _store.bookings.filter((b) => {
    if (b.borrower_id !== userId) return false;
    if (b.status !== 'cancelled') return false;
    const createdAt = new Date(b.created_at).getTime();
    return createdAt >= cutoff;
  }).length;
}

export function checkFairnessLimits(userId: string, requestedHours: number): FairnessCheckResult {
  const MAX_ACTIVE_BOOKINGS = 6;
  const MAX_HOURS_PER_WEEK = 30;
  const CANCELLATION_THRESHOLD = 3;

  // Active bookings include upcoming, in review, and active in-lab sessions
  const activeBookings = _store.bookings.filter(
    (b) =>
      b.borrower_id === userId &&
      ['pending', 'pending_approval', 'approved', 'checked_in', 'return_pending'].includes(b.status)
  );

  // Hours booked in the current 7-day window
  const weekCutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentBookings = _store.bookings.filter((b) => {
    if (b.borrower_id !== userId) return false;
    if (['rejected', 'cancelled'].includes(b.status)) return false;
    const start = new Date(b.start_time).getTime();
    return start >= weekCutoff;
  });

  const hoursBookedThisWeek = recentBookings.reduce((sum, b) => {
    const s = new Date(b.start_time).getTime();
    const e = new Date(b.end_time).getTime();
    return sum + Math.max(0, (e - s) / (1000 * 60 * 60));
  }, 0);

  const cancellationCount = getUserCancellationCount(userId, 14);
  const cancellationWarning = cancellationCount >= CANCELLATION_THRESHOLD;

  if (activeBookings.length >= MAX_ACTIVE_BOOKINGS) {
    return {
      allowed: false,
      activeBookingCount: activeBookings.length,
      maxActiveBookings: MAX_ACTIVE_BOOKINGS,
      hoursBookedThisWeek,
      maxHoursPerWeek: MAX_HOURS_PER_WEEK,
      recentCancellationCount: cancellationCount,
      cancellationWarning,
      explanation: `Allocation limit reached: You hold ${activeBookings.length}/${MAX_ACTIVE_BOOKINGS} active reservations. Complete or release an existing booking before requesting more equipment.`,
      error: `Booking quota reached: You already have ${activeBookings.length} active reservations (maximum allowed is ${MAX_ACTIVE_BOOKINGS}).`,
    };
  }

  if (hoursBookedThisWeek + requestedHours > MAX_HOURS_PER_WEEK) {
    return {
      allowed: false,
      activeBookingCount: activeBookings.length,
      maxActiveBookings: MAX_ACTIVE_BOOKINGS,
      hoursBookedThisWeek,
      maxHoursPerWeek: MAX_HOURS_PER_WEEK,
      recentCancellationCount: cancellationCount,
      cancellationWarning,
      explanation: `Weekly allocation cap: Requesting ${requestedHours}h would bring your weekly total to ${(hoursBookedThisWeek + requestedHours).toFixed(1)}h, exceeding the ${MAX_HOURS_PER_WEEK}h weekly fairness cap.`,
      error: `Weekly usage cap exceeded: ${(hoursBookedThisWeek + requestedHours).toFixed(1)}h requested vs ${MAX_HOURS_PER_WEEK}h institutional allowance.`,
    };
  }

  return {
    allowed: true,
    activeBookingCount: activeBookings.length,
    maxActiveBookings: MAX_ACTIVE_BOOKINGS,
    hoursBookedThisWeek,
    maxHoursPerWeek: MAX_HOURS_PER_WEEK,
    recentCancellationCount: cancellationCount,
    cancellationWarning,
    explanation: `Allocation approved: ${activeBookings.length + 1}/${MAX_ACTIVE_BOOKINGS} active slots, ${(hoursBookedThisWeek + requestedHours).toFixed(1)}/${MAX_HOURS_PER_WEEK} weekly hours used. ${
      cancellationWarning ? 'Note: High cancellation frequency detected (3+ in 14 days).' : 'Standard fair-use tier.'
    }`,
  };
}

export function hasOverlappingBooking(
  resourceId: string,
  startTime: string,
  endTime: string,
  excludeBookingId?: string
): boolean {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  const occupiedStatuses: BookingStatus[] = ['approved', 'checked_in', 'return_pending', 'overdue', 'incident_review'];
  const hasBookingCollision = _store.bookings.some((b) => {
    if (b.resource_id !== resourceId) return false;
    if (excludeBookingId && b.id === excludeBookingId) return false;
    if (!occupiedStatuses.includes(b.status)) return false;
    const bStart = new Date(b.start_time).getTime();
    const bEnd = new Date(b.end_time).getTime();
    return start < bEnd && end > bStart;
  });
  if (hasBookingCollision) return true;

  // Check blackout periods
  return (_store.institution_config?.blackout_periods || []).some((b) => {
    if (b.resource_id && b.resource_id !== resourceId) return false;
    const bStart = new Date(b.start_time).getTime();
    const bEnd = new Date(b.end_time).getTime();
    return start < bEnd && end > bStart;
  });
}

export function createBooking(
  bookingData: {
    resource_id: string;
    borrower_id: string;
    start_time: string;
    end_time: string;
    status?: BookingStatus;
    purpose: string;
    project_course_context?: string;
    training_evidence?: string;
    training_evidence_verified?: boolean;
    rules_acknowledged?: boolean;
    custom_field_responses?: Record<string, string>;
    priority_level?: BookingPriority;
    priority_reason?: string | null;
    allocation_explanation?: string | null;
    waitlist_position?: number | null;
    waitlist_reason?: string | null;
  },
  actorId: string
): Booking | { error: string } {
  const resource = getResourceById(bookingData.resource_id);
  if (!resource) return { error: 'Resource not found.' };

  if (resource.status === 'retired') {
    return { error: 'This resource has been retired from service and cannot be reserved.' };
  }
  if (resource.status === 'maintenance') {
    return { error: 'This resource is currently undergoing maintenance and calibration.' };
  }

  const borrower = getUserById(bookingData.borrower_id);
  if (!borrower) return { error: 'Borrower record not found.' };

  const startMs = new Date(bookingData.start_time).getTime();
  const endMs = new Date(bookingData.end_time).getTime();
  if (isNaN(startMs) || isNaN(endMs) || endMs <= startMs) {
    return { error: 'Invalid reservation timeframe: End time must be strictly after start time.' };
  }

  const durationHours = (endMs - startMs) / (1000 * 60 * 60);
  if (durationHours > resource.max_booking_hours) {
    return { error: `Duration exceeds maximum allowed limit of ${resource.max_booking_hours} hours.` };
  }

  const initialStatus: BookingStatus = bookingData.status || (resource.requires_approval ? 'pending_approval' : 'approved');

  // If drafting, allow saving incomplete state
  if (initialStatus !== 'draft') {
    // 1. Mandatory membership status check
    if (!borrower.is_active) {
      return { error: 'Ineligible booking request: Account is inactive or suspended.' };
    }

    // 2. Mandatory safety check: Direct approval blocked if uncertified
    if (initialStatus === 'approved' && resource.requires_training && !borrower.training_completed) {
      return { error: 'Ineligible booking request: Verified Lab Safety Certification is required for this equipment.' };
    }

    // 3. Rules acknowledgment check
    if (bookingData.rules_acknowledged === false) {
      return { error: 'You must acknowledge the resource operating and safety rules before submitting.' };
    }

    // 4. Fairness limits check
    const fairness = checkFairnessLimits(borrower.id, durationHours);
    if (!fairness.allowed && !['manager', 'admin'].includes(borrower.role)) {
      return { error: fairness.error ?? 'Fairness limit exceeded.' };
    }

    // 5. Overlap check for approved creation
    if (initialStatus === 'approved' && hasOverlappingBooking(resource.id, bookingData.start_time, bookingData.end_time)) {
      return { error: 'This time slot conflicts with an existing confirmed reservation.' };
    }
  }

  // Handle Waitlist calculation
  let waitlistPosition: number | null = null;
  let waitlistReason: string | null = null;
  if (initialStatus === 'waitlisted') {
    const existingWaitlist = _store.bookings.filter(
      (b) => b.resource_id === resource.id && b.status === 'waitlisted'
    );
    waitlistPosition = existingWaitlist.length + 1;
    waitlistReason = `Position #${waitlistPosition} on waitlist behind confirmed reservations for this window.`;
  }

  // Self-declared qualification evidence verification (never treat self-declared as verified)
  const isEvidenceVerified = borrower.training_completed === true
    ? true
    : Boolean(bookingData.training_evidence_verified);

  const newBooking: Booking = {
    id: generateId(),
    resource_id: resource.id,
    borrower_id: borrower.id,
    approved_by: initialStatus === 'approved' ? actorId : null,
    start_time: bookingData.start_time,
    end_time: bookingData.end_time,
    status: initialStatus,
    purpose: bookingData.purpose,
    project_course_context: bookingData.project_course_context || 'General Academic Research',
    training_evidence: bookingData.training_evidence || (borrower.training_completed ? 'Institutional Safety DB' : undefined),
    training_evidence_verified: isEvidenceVerified,
    rules_acknowledged: Boolean(bookingData.rules_acknowledged),
    custom_field_responses: bookingData.custom_field_responses || {},
    priority_level: bookingData.priority_level || 'normal',
    priority_reason: bookingData.priority_reason || null,
    allocation_explanation: bookingData.allocation_explanation || (initialStatus !== 'draft' ? checkFairnessLimits(borrower.id, durationHours).explanation : 'Draft reservation in progress.'),
    waitlist_position: waitlistPosition,
    waitlist_reason: waitlistReason,
    rejection_reason: null,
    checked_in_at: null,
    checked_out_at: null,
    created_at: new Date().toISOString(),
  };

  _store.bookings.push(newBooking);
  addAuditLog(actorId, newBooking.id, 'booking', `booking.${initialStatus}`, null, newBooking as unknown as Record<string, unknown>);

  // Notify resource owner and borrower
  if (initialStatus === 'pending_approval' || initialStatus === 'pending') {
    addNotification(
      resource.owner_id,
      'New Booking Request',
      `${borrower.full_name} (${borrower.department}) requested to book "${resource.name}".`,
      `/owner/approvals`,
      'booking'
    );
    addNotification(
      borrower.id,
      'Booking Request Submitted',
      `Your reservation request for "${resource.name}" has been submitted for faculty review. Purpose: ${bookingData.purpose}.`,
      `/my-bookings`,
      'booking'
    );
  } else if (initialStatus === 'waitlisted') {
    addNotification(
      borrower.id,
      'Waitlist Placement Confirmed',
      `You are Position #${waitlistPosition} on the waiting list for "${resource.name}". Allocation: FIFO with academic priority weighting.`,
      `/my-bookings`,
      'waitlist'
    );
  }

  commit();
  return newBooking;
}

export function validateCheckinWindow(
  booking: Booking,
  currentTimeMs: number = Date.now()
): { valid: boolean; error?: string } {
  const start = new Date(booking.start_time).getTime();
  const end = new Date(booking.end_time).getTime();
  const windowOpen = start - 2 * 3600 * 1000; // opens 2 hours before

  if (currentTimeMs < windowOpen) {
    return {
      valid: false,
      error: `Check-in window not open yet. Check-in opens 2 hours prior to scheduled start time (${new Date(windowOpen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}).`,
    };
  }
  if (currentTimeMs > end) {
    return {
      valid: false,
      error: 'Check-in window expired. Scheduled reservation period has already elapsed.',
    };
  }
  return { valid: true };
}

export function updateBookingStatus(
  bookingId: string,
  newStatus: BookingStatus,
  actorId: string,
  extra: {
    rejection_reason?: string;
    approved_by?: string;
    cancellation_reason?: string;
    incident_hold_reason?: string;
    notes?: string;
    enforceCheckinWindow?: boolean;
    currentTimeMs?: number;
    confirmed_by_reporter?: boolean;
    initial_report_id?: string;
    final_report_id?: string;
  } = {}
): Booking | { error: string } {
  const idx = _store.bookings.findIndex((b) => b.id === bookingId);
  if (idx === -1) return { error: 'Booking not found.' };

  const booking = _store.bookings[idx];
  const oldStatus = booking.status;
  const resource = getResourceById(booking.resource_id);
  const actor = getUserById(actorId);
  if (!actor) return { error: 'Actor user not found.' };

  // Status transitions table
  const validTransitions: Record<BookingStatus, BookingStatus[]> = {
    draft: ['pending_approval', 'pending', 'cancelled'],
    pending: ['approved', 'rejected', 'waitlisted', 'cancelled'],
    pending_approval: ['approved', 'rejected', 'waitlisted', 'cancelled'],
    waitlisted: ['pending_approval', 'pending', 'approved', 'rejected', 'cancelled'],
    approved: ['checked_in', 'cancelled', 'overdue'],
    checked_in: ['return_pending', 'completed', 'checked_out', 'overdue', 'incident_hold', 'incident_review'],
    return_pending: ['completed', 'checked_out', 'incident_hold', 'incident_review'],
    completed: [],
    checked_out: [],
    rejected: [],
    cancelled: [],
    overdue: ['return_pending', 'completed', 'checked_out', 'incident_hold', 'incident_review'],
    incident_hold: ['completed', 'checked_out', 'rejected'],
    incident_review: ['completed', 'checked_out', 'rejected'],
  };

  if (!validTransitions[oldStatus]?.includes(newStatus)) {
    return { error: `Cannot transition from "${oldStatus}" to "${newStatus}".` };
  }

  // Authorization checks based on target status
  const isOwner = resource ? resource.owner_id === actorId : false;
  const isBorrower = booking.borrower_id === actorId;
  const isStaff = ['manager', 'admin'].includes(actor.role);

  if (newStatus === 'approved') {
    if (!isOwner && !isStaff) {
      return { error: 'Unauthorized: Only the resource owner or an administrator can approve reservations.' };
    }
    // CRITICAL: Recheck availability during approval to prevent simultaneous double-booking
    if (hasOverlappingBooking(booking.resource_id, booking.start_time, booking.end_time, bookingId)) {
      return { error: 'Cannot approve: This time slot conflicts with an existing confirmed reservation.' };
    }
  }

  if (newStatus === 'rejected') {
    if (!isOwner && !isStaff) {
      return { error: 'Unauthorized: Only the resource owner or an administrator can reject reservations.' };
    }
  }

  if (newStatus === 'cancelled') {
    if (!isBorrower && !isOwner && !isStaff) {
      return { error: 'Unauthorized: Only the borrower, resource owner, or administrator can cancel this reservation.' };
    }
  }

  if (newStatus === 'checked_in') {
    // Only the borrower associated with an approved booking (or assisting staff) can initiate check-in
    if (!isBorrower && !isStaff) {
      return { error: 'Unauthorized: Only the assigned borrower can initiate check-in for this reservation.' };
    }
    if (oldStatus !== 'approved') {
      return { error: 'Invalid state: Only approved bookings can be checked in.' };
    }
    // Validate permitted check-in window if enforcement is requested
    if (extra.enforceCheckinWindow) {
      const windowRes = validateCheckinWindow(booking, extra.currentTimeMs);
      if (!windowRes.valid) {
        return { error: windowRes.error! };
      }
    }
    // Require confirmation of the report
    if (extra.confirmed_by_reporter === false) {
      return { error: 'Confirmation required: Inspection report must be confirmed before check-in can be completed.' };
    }
  }

  if (newStatus === 'return_pending') {
    if (!isBorrower && !isOwner && !isStaff) {
      return { error: 'Unauthorized: Only the borrower or lab staff can initiate a return.' };
    }
  }

  if (newStatus === 'completed' || newStatus === 'checked_out') {
    // A borrower must not be able to mark a disputed return as resolved unilaterally!
    if (['return_pending', 'incident_hold', 'incident_review'].includes(oldStatus)) {
      if (!isOwner && !isStaff) {
        return { error: 'Unauthorized: Borrowers cannot unilaterally sign off returns or resolve disputed returns. Authorized owner or staff inspection is required.' };
      }
    } else if (!isBorrower && !isOwner && !isStaff) {
      return { error: 'Unauthorized: Not authorized to complete this return.' };
    }
  }

  if (newStatus === 'incident_hold' || newStatus === 'incident_review') {
    if (!isBorrower && !isOwner && !isStaff) {
      return { error: 'Unauthorized: Not authorized to place an incident hold.' };
    }
  }

  // Calculate overdue minutes if returned past end_time
  let calculatedOverdueMinutes: number | null = null;
  if (newStatus === 'return_pending' || newStatus === 'completed' || newStatus === 'checked_out') {
    const now = new Date().getTime();
    const scheduledEnd = new Date(booking.end_time).getTime();
    if (now > scheduledEnd) {
      calculatedOverdueMinutes = Math.round((now - scheduledEnd) / (60 * 1000));
    }
  }

  const old = { ...booking };
  const updatedBooking: Booking = {
    ...booking,
    status: newStatus,
    ...(newStatus === 'rejected' ? { rejection_reason: extra.rejection_reason ?? 'Declined by owner.' } : {}),
    ...(newStatus === 'approved' ? { approved_by: extra.approved_by ?? actorId, waitlist_position: null, waitlist_reason: null } : {}),
    ...(newStatus === 'checked_in' ? { 
      checked_in_at: new Date().toISOString(),
      initial_report_id: extra.initial_report_id ?? booking.initial_report_id
    } : {}),
    ...(newStatus === 'return_pending' ? { 
      return_initiated_at: new Date().toISOString(),
      final_report_id: extra.final_report_id ?? booking.final_report_id,
      overdue_minutes: calculatedOverdueMinutes ?? booking.overdue_minutes
    } : {}),
    ...(newStatus === 'completed' || newStatus === 'checked_out' ? {
      checked_out_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      final_report_id: extra.final_report_id ?? booking.final_report_id,
      overdue_minutes: calculatedOverdueMinutes ?? booking.overdue_minutes
    } : {}),
    ...(newStatus === 'cancelled' ? { cancellation_reason: extra.cancellation_reason ?? 'Cancelled by user.' } : {}),
    ...(newStatus === 'incident_hold' || newStatus === 'incident_review' ? { 
      incident_hold_reason: extra.incident_hold_reason ?? 'Equipment condition flagged for inspection.' 
    } : {}),
  };

  _store.bookings[idx] = updatedBooking;

  addAuditLog(actorId, bookingId, 'booking', `booking.${newStatus}`,
    { status: old.status } as Record<string, unknown>,
    { status: newStatus, overdue_minutes: calculatedOverdueMinutes } as Record<string, unknown>
  );

  // If delayed, notify owner and borrower of overdue return
  if (calculatedOverdueMinutes && calculatedOverdueMinutes > 0 && resource) {
    addNotification(
      resource.owner_id,
      'Overdue Equipment Return',
      `"${resource.name}" was returned ${calculatedOverdueMinutes} minutes past the scheduled deadline by ${booking.borrower_id}.`,
      `/owner/approvals`
    );
  }

  // If a booking is cancelled or rejected, notify waitlisted users
  if (['cancelled', 'rejected'].includes(newStatus)) {
    const nextWaitlisted = _store.bookings.find(
      (b) => b.resource_id === booking.resource_id && b.status === 'waitlisted'
    );
    if (nextWaitlisted) {
      addNotification(
        nextWaitlisted.borrower_id,
        'Waitlist Slot Available',
        `A slot has opened up for "${resource?.name}". Your reservation can now be reviewed for approval.`,
        `/my-bookings`,
        'waitlist'
      );
    }
  }

  // Notify owner if borrower cancelled
  if (newStatus === 'cancelled' && resource && actorId === booking.borrower_id) {
    addNotification(
      resource.owner_id,
      'Booking Cancelled by Borrower',
      `Reservation for "${resource.name}" was cancelled by borrower. Reason: ${extra.cancellation_reason || 'Not specified'}.`,
      `/owner/approvals`,
      'booking'
    );
  }

  // Notify borrower of status updates
  const statusMessages: Record<string, string> = {
    approved: `Your booking for "${resource?.name}" has been approved! Ready for physical check-in.`,
    rejected: `Your booking for "${resource?.name}" was rejected. Reason: ${extra.rejection_reason ?? 'Not specified'}`,
    cancelled: `Your booking for "${resource?.name}" has been cancelled.`,
    waitlisted: `Your booking for "${resource?.name}" has been placed on the waitlist.`,
    checked_in: `Session active: You have checked in to "${resource?.name}".`,
    return_pending: `Return initiated for "${resource?.name}". Awaiting final condition sign-off.`,
    completed: `Return verified: Handover for "${resource?.name}" is complete. Thank you!`,
    checked_out: `Return verified: Handover for "${resource?.name}" is complete. Thank you!`,
    overdue: `ATTENTION: Your reservation for "${resource?.name}" is overdue. Please return the equipment immediately.`,
    incident_hold: `SAFETY NOTICE: "${resource?.name}" has been placed on incident hold pending inspection.`,
  };

  if (statusMessages[newStatus]) {
    const formattedTitle = `Booking ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1).replace(/_/g, ' ')}`;
    const category: 'booking' | 'waitlist' | 'incident' | 'safety' = 
      newStatus === 'waitlisted' ? 'waitlist' :
      newStatus === 'incident_hold' ? 'incident' :
      newStatus === 'overdue' ? 'safety' : 'booking';

    addNotification(
      booking.borrower_id,
      formattedTitle,
      statusMessages[newStatus],
      `/my-bookings`,
      category
    );
  }

  commit();
  return updatedBooking;
}

// ─── Extensions, Overdue & Evidence Verification ───────────
export function requestBookingExtension(
  bookingId: string,
  requestedEndTime: string,
  actorId: string,
  reason?: string
): Booking | { error: string } {
  const booking = getBookingById(bookingId);
  if (!booking) return { error: 'Booking not found.' };

  if (booking.status !== 'checked_in') {
    return { error: 'Only active checked-in sessions can request a time extension.' };
  }

  if (booking.borrower_id !== actorId) {
    return { error: 'Unauthorized: Only the active borrower can request a session extension.' };
  }

  const currentEnd = new Date(booking.end_time).getTime();
  const requestedEnd = new Date(requestedEndTime).getTime();
  if (requestedEnd <= currentEnd) {
    return { error: 'Requested extension end time must be after the current scheduled end time.' };
  }

  // Conflict check with subsequent bookings
  if (hasOverlappingBooking(booking.resource_id, booking.end_time, requestedEndTime, bookingId)) {
    return { error: 'Extension unavailable: Time window conflicts with an upcoming scheduled reservation.' };
  }

  const idx = _store.bookings.findIndex((b) => b.id === bookingId);
  _store.bookings[idx] = {
    ...booking,
    extension_requested_end_time: requestedEndTime,
    extension_status: 'pending',
  };

  addAuditLog(actorId, bookingId, 'booking', 'booking.extension_requested',
    { end_time: booking.end_time } as Record<string, unknown>,
    { requested_end_time: requestedEndTime, reason } as Record<string, unknown>
  );

  const resource = getResourceById(booking.resource_id);
  if (resource) {
    addNotification(
      resource.owner_id,
      'Extension Request',
      `Borrower requested extension until ${new Date(requestedEndTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} for "${resource.name}".${reason ? ` Note: ${reason}` : ''}`,
      `/owner/approvals`
    );
  }

  commit();
  return _store.bookings[idx];
}

export function resolveBookingExtension(
  bookingId: string,
  decision: 'approved' | 'rejected',
  actorId: string,
  reason?: string
): Booking | { error: string } {
  const idx = _store.bookings.findIndex((b) => b.id === bookingId);
  if (idx === -1) return { error: 'Booking not found.' };

  const booking = _store.bookings[idx];
  const resource = getResourceById(booking.resource_id);
  const actor = getUserById(actorId);
  if (!actor) return { error: 'Actor user not found.' };

  const isOwner = resource ? resource.owner_id === actorId : false;
  const isStaff = ['manager', 'admin'].includes(actor.role);
  if (!isOwner && !isStaff) {
    return { error: 'Unauthorized: Only the resource owner or an administrator can resolve extensions.' };
  }

  if (decision === 'approved' && booking.extension_requested_end_time) {
    if (hasOverlappingBooking(booking.resource_id, booking.end_time, booking.extension_requested_end_time, bookingId)) {
      return { error: 'Cannot approve extension: Conflicting booking was confirmed in the interim.' };
    }

    const oldEnd = booking.end_time;
    _store.bookings[idx] = {
      ...booking,
      end_time: booking.extension_requested_end_time,
      extension_status: 'approved',
      extension_requested_end_time: null,
    };

    addAuditLog(actorId, bookingId, 'booking', 'booking.extension_approved',
      { end_time: oldEnd } as Record<string, unknown>,
      { end_time: _store.bookings[idx].end_time } as Record<string, unknown>
    );

    addNotification(
      booking.borrower_id,
      'Extension Approved',
      `Your reservation extension for "${resource?.name}" has been approved! New end time: ${new Date(_store.bookings[idx].end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
      `/my-bookings`
    );
  } else {
    _store.bookings[idx] = {
      ...booking,
      extension_status: 'rejected',
      extension_requested_end_time: null,
    };

    addAuditLog(actorId, bookingId, 'booking', 'booking.extension_rejected', null, { reason: reason ?? 'Schedule conflict.' });

    addNotification(
      booking.borrower_id,
      'Extension Declined',
      `Your extension request for "${resource?.name}" could not be accommodated. Please return by scheduled time.`,
      `/my-bookings`
    );
  }

  commit();
  return _store.bookings[idx];
}

export function verifyBookingTrainingEvidence(
  bookingId: string,
  verified: boolean,
  staffId: string
): Booking | { error: string } {
  const idx = _store.bookings.findIndex((b) => b.id === bookingId);
  if (idx === -1) return { error: 'Booking not found.' };

  const booking = _store.bookings[idx];
  const staff = getUserById(staffId);
  if (!staff || !['owner', 'manager', 'admin'].includes(staff.role)) {
    return { error: 'Unauthorized: Only lab owners or managers can verify qualification evidence.' };
  }

  _store.bookings[idx] = {
    ...booking,
    training_evidence_verified: verified,
  };

  addAuditLog(staffId, bookingId, 'booking', 'booking.evidence_verified',
    { verified: booking.training_evidence_verified } as Record<string, unknown>,
    { verified } as Record<string, unknown>
  );

  commit();
  return _store.bookings[idx];
}

export function checkAndUpdateOverdueBookings(): Booking[] {
  const nowMs = Date.now();
  const overdueUpdated: Booking[] = [];

  _store.bookings.forEach((b, idx) => {
    if (b.status === 'checked_in') {
      const endMs = new Date(b.end_time).getTime();
      if (endMs < nowMs) {
        _store.bookings[idx] = {
          ...b,
          status: 'overdue',
        };
        overdueUpdated.push(_store.bookings[idx]);
        addAuditLog('system', b.id, 'booking', 'booking.overdue', { status: 'checked_in' } as Record<string, unknown>, { status: 'overdue' } as Record<string, unknown>);
        
        const res = getResourceById(b.resource_id);
        addNotification(
          b.borrower_id,
          'Equipment Overdue Warning',
          `Your session for "${res?.name}" expired at ${new Date(b.end_time).toLocaleTimeString()}. Return immediately to avoid penalty points.`,
          `/my-bookings`
        );
      }
    }
  });

  if (overdueUpdated.length > 0) {
    commit();
  }
  return overdueUpdated;
}

// ─── Condition Reports ───────────────────────────────────
export function getConditionReports(): ConditionReport[] {
  return _store.condition_reports;
}

export function getReportsForResource(resourceId: string): ConditionReport[] {
  return _store.condition_reports.filter((r) => r.resource_id === resourceId);
}

export function getReportsForBooking(bookingId: string): ConditionReport[] {
  return _store.condition_reports.filter((r) => r.booking_id === bookingId);
}

export function validateEvidenceFile(file: { name: string; size: number; type: string }): { valid: boolean; error?: string } {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const maxSizeBytes = 5 * 1024 * 1024; // 5 MB

  if (!allowedMimeTypes.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      error: `Unsupported file type "${file.type}". Allowed formats: JPEG, PNG, WebP.`,
    };
  }

  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds 5 MB limit.`,
    };
  }

  return { valid: true };
}

export function createConditionReport(
  report: Omit<ConditionReport, 'id' | 'created_at' | 'resolved_by' | 'resolution_notes' | 'resolved_at' | 'corrections'>,
  actorId: string
): ConditionReport {
  const newReport: ConditionReport = {
    ...report,
    id: generateId(),
    evidence_files: report.evidence_files || [],
    accessories_returned: report.accessories_returned || [],
    confirmed_by_reporter: Boolean(report.confirmed_by_reporter),
    resolved_by: null,
    resolution_notes: null,
    resolved_at: null,
    corrections: [],
    created_at: new Date().toISOString(),
  };
  _store.condition_reports.push(newReport);
  addAuditLog(actorId, newReport.id, 'report', `report.${report.type}.created`, null, newReport as unknown as Record<string, unknown>);

  // If incident or damaged or missing components, notify managers and owner
  if (report.type === 'incident' || report.condition === 'damaged' || report.condition === 'missing_components') {
    const managers = _store.users.filter((u) => u.role === 'manager' || u.role === 'admin');
    const resource = getResourceById(report.resource_id);
    managers.forEach((m) => {
      addNotification(
        m.id,
        'Equipment Condition Incident',
        `An incident has been reported for "${resource?.name ?? 'Unknown'}": [${report.condition}] ${report.notes.slice(0, 100)}`,
        `/reports`
      );
    });
    if (resource && resource.owner_id) {
      addNotification(
        resource.owner_id,
        'Equipment Condition Incident',
        `An issue was flagged during handover for "${resource.name}": [${report.condition}] ${report.notes.slice(0, 100)}`,
        `/owner/approvals`
      );
    }
  }

  commit();
  return newReport;
}

export function correctConditionReport(
  reportId: string,
  newCondition: ConditionRating,
  newNotes: string,
  actorId: string,
  reason: string
): ConditionReport | { error: string } {
  const idx = _store.condition_reports.findIndex((r) => r.id === reportId);
  if (idx === -1) return { error: 'Report not found' };

  const actor = getUserById(actorId);
  if (!actor) return { error: 'Actor user not found' };

  // Only authorized staff or report author can make corrections
  const isAuthor = _store.condition_reports[idx].reporter_id === actorId;
  const isStaff = ['owner', 'manager', 'admin'].includes(actor.role);
  if (!isAuthor && !isStaff) {
    return { error: 'Unauthorized: Only the original author or lab staff can submit report corrections.' };
  }

  const old = { ..._store.condition_reports[idx] };
  const correction: ReportCorrection = {
    corrected_at: new Date().toISOString(),
    corrected_by: actorId,
    reason: reason.trim() || 'Technical re-inspection note',
    previous_condition: old.condition,
    new_condition: newCondition,
    previous_notes: old.notes,
    new_notes: newNotes,
  };

  const correctionsList = [...(old.corrections || []), correction];

  _store.condition_reports[idx] = {
    ..._store.condition_reports[idx],
    condition: newCondition,
    notes: newNotes,
    corrections: correctionsList,
  };

  addAuditLog(actorId, reportId, 'report', 'report.corrected',
    { condition: old.condition, notes: old.notes } as Record<string, unknown>,
    { condition: newCondition, notes: newNotes, reason } as Record<string, unknown>
  );

  commit();
  return _store.condition_reports[idx];
}

export interface HandoverComparison {
  initialReport: ConditionReport | null;
  finalReport: ConditionReport | null;
  conditionChanged: boolean;
  degraded: boolean;
  missingAccessoriesCount: number;
  missingAccessories: string[];
  summary: string;
}

export function compareHandoverReports(
  initialReportId?: string | null,
  finalReportId?: string | null
): HandoverComparison {
  const initial = initialReportId ? _store.condition_reports.find((r) => r.id === initialReportId) ?? null : null;
  const final = finalReportId ? _store.condition_reports.find((r) => r.id === finalReportId) ?? null : null;

  if (!initial || !final) {
    return {
      initialReport: initial,
      finalReport: final,
      conditionChanged: false,
      degraded: false,
      missingAccessoriesCount: 0,
      missingAccessories: [],
      summary: !initial && !final ? 'No inspection records available' : !initial ? 'Initial check-in report missing' : 'Return check-out report pending',
    };
  }

  const conditionSeverity: Record<ConditionRating, number> = {
    excellent: 1,
    good: 2,
    minor_wear: 3,
    fair: 4,
    other: 5,
    missing_components: 6,
    damaged: 7,
  };

  const initialSev = conditionSeverity[initial.condition] ?? 2;
  const finalSev = conditionSeverity[final.condition] ?? 2;
  const degraded = finalSev > initialSev;
  const conditionChanged = initial.condition !== final.condition;

  const missingAccessories = (final.accessories_returned || [])
    .filter((a) => !a.returned)
    .map((a) => a.name);

  let summary = 'Condition maintained: Equipment verified intact without degradation.';
  if (degraded) {
    summary = `Condition degraded from "${initial.condition}" to "${final.condition}". Inspection required.`;
  }
  if (missingAccessories.length > 0) {
    summary += ` Missing accessories detected: ${missingAccessories.join(', ')}.`;
  }

  return {
    initialReport: initial,
    finalReport: final,
    conditionChanged,
    degraded,
    missingAccessoriesCount: missingAccessories.length,
    missingAccessories,
    summary,
  };
}

export function resolveIncidentAndCompleteBooking(
  bookingId: string,
  actorId: string,
  resolutionNotes: string
): Booking | { error: string } {
  const actor = getUserById(actorId);
  if (!actor) return { error: 'Actor user not found' };

  const isStaff = ['owner', 'manager', 'admin'].includes(actor.role);
  if (!isStaff) {
    return { error: 'Unauthorized: Borrowers cannot resolve disputed returns or incidents unilaterally. Only lab owners or managers can finalize resolution.' };
  }

  const booking = getBookingById(bookingId);
  if (!booking) return { error: 'Booking not found' };

  // Resolve condition report incident
  const report = _store.condition_reports.find(
    (r) => r.booking_id === bookingId && r.incident_status === 'open'
  );
  if (report) {
    updateIncidentStatus(report.id, 'resolved', actorId, resolutionNotes);
  }

  // Restore resource to available
  updateResourceStatus(booking.resource_id, 'available', actorId);

  // Transition booking to completed
  return updateBookingStatus(bookingId, 'completed', actorId, {
    notes: resolutionNotes,
  });
}

export function getHandoverTimeline(bookingId: string): HandoverTimelineEvent[] {
  const booking = getBookingById(bookingId);
  if (!booking) return [];

  const timeline: HandoverTimelineEvent[] = [];
  const borrower = getUserById(booking.borrower_id);
  const resource = getResourceById(booking.resource_id);

  // 1. Creation
  timeline.push({
    id: `tl-create-${booking.id}`,
    timestamp: booking.created_at,
    title: 'Reservation Initiated',
    description: `Booking requested by ${borrower?.full_name || 'Borrower'} for "${booking.purpose}".`,
    actor_name: borrower?.full_name || 'Borrower',
    actor_role: borrower?.role || 'borrower',
    type: 'created',
  });

  // 2. Approval
  if (booking.approved_by) {
    const approver = getUserById(booking.approved_by);
    timeline.push({
      id: `tl-appr-${booking.id}`,
      timestamp: booking.created_at,
      title: 'Reservation Approved',
      description: `Approved by ${approver?.full_name || 'Faculty Owner'}. Access granted for requested slot.`,
      actor_name: approver?.full_name || 'Staff',
      actor_role: approver?.role || 'owner',
      type: 'approved',
    });
  }

  // 3. Initial Check-in Report
  const checkinReport = _store.condition_reports.find(
    (r) => r.booking_id === booking.id && r.type === 'check_in'
  );
  if (booking.checked_in_at || checkinReport) {
    const reporter = checkinReport ? getUserById(checkinReport.reporter_id) : borrower;
    timeline.push({
      id: `tl-checkin-${booking.id}`,
      timestamp: booking.checked_in_at || checkinReport?.created_at || booking.created_at,
      title: 'Physical Check-In & Initial Inspection',
      description: `Initial condition rated "${checkinReport?.condition || 'good'}". Operating safety rules acknowledged.`,
      actor_name: reporter?.full_name || 'Borrower',
      actor_role: reporter?.role || 'borrower',
      type: 'check_in',
      details: {
        condition: checkinReport?.condition,
        notes: checkinReport?.notes,
        evidence_count: checkinReport?.evidence_files?.length || 0,
      },
    });
  }

  // 4. Return initiated
  const returnReport = _store.condition_reports.find(
    (r) => r.booking_id === booking.id && (r.type === 'check_out' || r.type === 'incident')
  );
  if (booking.return_initiated_at || returnReport) {
    const reporter = returnReport ? getUserById(returnReport.reporter_id) : borrower;
    timeline.push({
      id: `tl-return-${booking.id}`,
      timestamp: booking.return_initiated_at || returnReport?.created_at || booking.end_time,
      title: 'Return Drop-Off Submitted',
      description: `Turnover inspection submitted: Condition "${returnReport?.condition || 'good'}".${booking.overdue_minutes ? ` (Overdue by ${booking.overdue_minutes}m)` : ''}`,
      actor_name: reporter?.full_name || 'Borrower',
      actor_role: reporter?.role || 'borrower',
      type: 'return_pending',
      details: {
        condition: returnReport?.condition,
        notes: returnReport?.notes,
        accessories: returnReport?.accessories_returned,
        overdue_minutes: booking.overdue_minutes,
      },
    });
  }

  // 5. Incident review if any
  if (booking.status === 'incident_review' || booking.status === 'incident_hold' || returnReport?.type === 'incident') {
    timeline.push({
      id: `tl-inc-${booking.id}`,
      timestamp: returnReport?.created_at || booking.return_initiated_at || new Date().toISOString(),
      title: 'Incident Review Open',
      description: `Equipment flagged for maintenance review: ${booking.incident_hold_reason || returnReport?.notes || 'Damage reported'}`,
      actor_name: 'Safety & Facilities Staff',
      actor_role: 'manager',
      type: 'incident',
    });
  }

  // 6. Custody Completed
  if (booking.completed_at || booking.status === 'completed' || booking.status === 'checked_out') {
    timeline.push({
      id: `tl-complete-${booking.id}`,
      timestamp: booking.completed_at || booking.checked_out_at || new Date().toISOString(),
      title: 'Custody Handover Completed',
      description: `Lab staff signed off custody. Asset restored to campus circulation.`,
      actor_name: 'Lab Staff',
      actor_role: 'owner',
      type: 'sign_off',
    });
  }

  return timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

export function updateIncidentStatus(
  reportId: string,
  status: IncidentStatus,
  actorId: string,
  resolutionNotes?: string,
  assignedTo?: string | null
): ConditionReport | null {
  const idx = _store.condition_reports.findIndex((r) => r.id === reportId);
  if (idx === -1) return null;
  const old = { ..._store.condition_reports[idx] };
  const assignedUser = assignedTo ? _store.users.find((u) => u.id === assignedTo) : null;
  const actor = _store.users.find((u) => u.id === actorId);

  _store.condition_reports[idx] = {
    ..._store.condition_reports[idx],
    incident_status: status,
    ...(assignedTo !== undefined ? { 
      assigned_to: assignedTo, 
      assigned_reviewer_name: assignedUser?.full_name ?? null 
    } : {}),
    ...(status === 'resolved' ? { 
      resolved_by: actorId, 
      resolution_notes: resolutionNotes ?? null,
      resolved_at: new Date().toISOString()
    } : {}),
  };

  addAuditLog(
    actorId, 
    reportId, 
    'report', 
    `report.incident.${status}`, 
    { incident_status: old.incident_status, assigned_to: old.assigned_to } as Record<string, unknown>,
    { incident_status: status, assigned_to: assignedTo, resolution_notes: resolutionNotes } as Record<string, unknown>,
    resolutionNotes || `Incident status updated to ${status}`
  );

  const resource = getResourceById(_store.condition_reports[idx].resource_id);
  const reporterId = _store.condition_reports[idx].reporter_id;

  // If newly assigned, notify the assigned reviewer
  if (assignedTo && assignedTo !== old.assigned_to) {
    addNotification(
      assignedTo,
      'Incident Assigned for Review',
      `You have been assigned to review the condition issue on "${resource?.name}".`,
      '/reports',
      'incident'
    );
  }

  // If status resolved, notify the original reporter and resource owner
  if (status === 'resolved') {
    if (reporterId) {
      addNotification(
        reporterId,
        'Incident Resolved',
        `The reported issue on "${resource?.name}" has been resolved by ${actor?.full_name || 'Staff'}. Resolution: ${resolutionNotes || 'Signed off.'}`,
        '/reports',
        'incident'
      );
    }
    if (resource && resource.owner_id && resource.owner_id !== actorId) {
      addNotification(
        resource.owner_id,
        'Incident Resolved',
        `Incident review for "${resource.name}" has been completed and signed off.`,
        '/owner/approvals',
        'incident'
      );
    }
  }

  commit();
  return _store.condition_reports[idx];
}

// ─── Notifications ───────────────────────────────────────
export function getNotificationsForUser(userId: string): Notification[] {
  return _store.notifications
    .filter((n) => n.user_id === userId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function markNotificationRead(notifId: string): void {
  const n = _store.notifications.find((n) => n.id === notifId);
  if (n) n.read = true;
  commit();
}

export function markAllNotificationsRead(userId: string): void {
  _store.notifications
    .filter((n) => n.user_id === userId)
    .forEach((n) => (n.read = true));
  commit();
}

export function getUnreadCount(userId: string): number {
  return _store.notifications.filter((n) => n.user_id === userId && !n.read).length;
}

// ─── Audit Logs (read) ──────────────────────────────────
export function getAuditLogs(): AuditLog[] {
  return _store.audit_logs.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

/**
 * Role-Based Audit Visibility:
 * - Admin/Manager: Full institutional audit visibility
 * - Owner: Logs related to their owned resources, handovers, and their own actions
 * - Borrower: Only logs where they are the actor or targeting their own reservations/reports
 */
export function getAuditLogsForUser(actorId: string): AuditLog[] {
  const actor = _store.users.find((u) => u.id === actorId);
  if (!actor) return [];

  const allLogs = getAuditLogs();

  if (['admin', 'manager'].includes(actor.role)) {
    return allLogs;
  }

  if (actor.role === 'owner') {
    const ownedResourceIds = new Set(_store.resources.filter((r) => r.owner_id === actorId).map((r) => r.id));
    const ownedBookingIds = new Set(_store.bookings.filter((b) => ownedResourceIds.has(b.resource_id)).map((b) => b.id));
    const ownedReportIds = new Set(_store.condition_reports.filter((r) => ownedResourceIds.has(r.resource_id)).map((r) => r.id));

    return allLogs.filter((log) => {
      if (log.user_id === actorId) return true;
      if (log.target_type === 'resource' && ownedResourceIds.has(log.target_id)) return true;
      if (log.target_type === 'booking' && ownedBookingIds.has(log.target_id)) return true;
      if (log.target_type === 'report' && ownedReportIds.has(log.target_id)) return true;
      return false;
    });
  }

  // Borrower visibility
  const myBookingIds = new Set(_store.bookings.filter((b) => b.borrower_id === actorId).map((b) => b.id));
  const myReportIds = new Set(_store.condition_reports.filter((r) => r.reporter_id === actorId).map((r) => r.id));

  return allLogs.filter((log) => {
    if (log.user_id === actorId) return true;
    if (log.target_type === 'booking' && myBookingIds.has(log.target_id)) return true;
    if (log.target_type === 'report' && myReportIds.has(log.target_id)) return true;
    if (log.target_type === 'user' && log.target_id === actorId) return true;
    return false;
  });
}

/**
 * Scans approved reservations and issues reminder notifications
 * for sessions starting within 2 hours or within 24 hours.
 */
export function triggerUpcomingBookingReminders(): number {
  const now = Date.now();
  const window2Hours = now + 2 * 3600 * 1000;
  const window24Hours = now + 24 * 3600 * 1000;
  let sentCount = 0;

  for (const b of _store.bookings) {
    if (b.status !== 'approved') continue;
    const start = new Date(b.start_time).getTime();
    if (start > now && start <= window24Hours) {
      const resource = getResourceById(b.resource_id);
      const isWithin2Hours = start <= window2Hours;
      const title = isWithin2Hours ? 'Upcoming Reservation (Check-in Ready)' : 'Upcoming Reservation Reminder';

      const alreadySent = _store.notifications.some(
        (n) => n.user_id === b.borrower_id && n.title === title && n.message.includes(resource?.name || '')
      );

      if (!alreadySent) {
        addNotification(
          b.borrower_id,
          title,
          isWithin2Hours
            ? `Your session for "${resource?.name}" starts within 2 hours (${new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}). Check-in window is open.`
            : `Reminder: Your reservation for "${resource?.name}" is scheduled for tomorrow at ${new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
          `/checkin?bookingId=${b.id}`,
          'booking'
        );
        sentCount++;
      }
    }
  }
  return sentCount;
}

// ─── Resource status update helper ──────────────────────
export function updateResourceStatus(
  resourceId: string,
  status: ResourceStatus,
  actorId: string
): Resource | { error: string } {
  return updateResource(resourceId, { status }, actorId);
}

// ─── Institution Configuration & Access Policies ──────────
export function getInstitutionConfig(): InstitutionConfig {
  if (!_store.institution_config) {
    _store.institution_config = { ...DEFAULT_INSTITUTION_CONFIG };
    commit();
  }
  return _store.institution_config;
}

export function updateInstitutionConfig(
  updates: Partial<Omit<InstitutionConfig, 'blackout_periods' | 'access_exceptions'>>,
  actorId: string,
  reason: string
): InstitutionConfig | { error: string } {
  const actor = getUserById(actorId);
  if (!actor || !['manager', 'admin'].includes(actor.role)) {
    return { error: 'Unauthorized: Only managers or administrators can configure institutional access policies.' };
  }

  if (!reason || reason.trim().length < 8) {
    return { error: 'A valid rationale (minimum 8 characters) is required for sensitive institutional policy adjustments.' };
  }

  const current = getInstitutionConfig();
  const old = { ...current };
  _store.institution_config = {
    ...current,
    ...updates,
  };

  addAuditLog(actorId, 'institution_config', 'institution_config', 'policy.updated',
    old as unknown as Record<string, unknown>,
    { updates, reason: reason.trim() } as Record<string, unknown>
  );

  commit();
  return _store.institution_config;
}

export function createBlackoutPeriod(
  period: Omit<BlackoutPeriod, 'id' | 'created_at'>,
  actorId: string
): BlackoutPeriod | { error: string } {
  const actor = getUserById(actorId);
  if (!actor || !['owner', 'manager', 'admin'].includes(actor.role)) {
    return { error: 'Unauthorized: Only equipment owners, managers, or administrators can schedule blackout periods.' };
  }

  if (period.resource_id) {
    const res = getResourceById(period.resource_id);
    if (!res) return { error: 'Target resource not found.' };
    if (actor.role === 'owner' && res.owner_id !== actorId) {
      return { error: 'Unauthorized: Owners can only schedule blackout periods for their own resources.' };
    }
  }

  const startMs = new Date(period.start_time).getTime();
  const endMs = new Date(period.end_time).getTime();
  if (isNaN(startMs) || isNaN(endMs) || endMs <= startMs) {
    return { error: 'Invalid blackout window: End time must be after start time.' };
  }

  const config = getInstitutionConfig();
  const newPeriod: BlackoutPeriod = {
    ...period,
    id: `blk-${generateId().slice(0, 8)}`,
    created_at: new Date().toISOString(),
  };

  config.blackout_periods.push(newPeriod);
  addAuditLog(actorId, newPeriod.id, 'blackout_period', 'blackout.created', null, newPeriod as unknown as Record<string, unknown>);
  commit();
  return newPeriod;
}

export function deleteBlackoutPeriod(
  periodId: string,
  actorId: string
): boolean | { error: string } {
  const actor = getUserById(actorId);
  if (!actor || !['owner', 'manager', 'admin'].includes(actor.role)) {
    return { error: 'Unauthorized: Insufficient permissions to cancel blackout period.' };
  }

  const config = getInstitutionConfig();
  const idx = config.blackout_periods.findIndex((b) => b.id === periodId);
  if (idx === -1) return { error: 'Blackout period not found.' };

  const period = config.blackout_periods[idx];
  if (period.resource_id && actor.role === 'owner') {
    const res = getResourceById(period.resource_id);
    if (res && res.owner_id !== actorId) {
      return { error: 'Unauthorized: Owners cannot remove blackout periods for equipment they do not own.' };
    }
  }

  config.blackout_periods.splice(idx, 1);
  addAuditLog(actorId, periodId, 'blackout_period', 'blackout.deleted', period as unknown as Record<string, unknown>, null);
  commit();
  return true;
}

export function grantAccessException(
  exception: Omit<AccessException, 'id' | 'created_at'>,
  actorId: string,
  reason: string
): AccessException | { error: string } {
  const actor = getUserById(actorId);
  if (!actor || !['manager', 'admin'].includes(actor.role)) {
    return { error: 'Unauthorized: Only institution managers or administrators can grant access exceptions.' };
  }

  if (!reason || reason.trim().length < 8) {
    return { error: 'A formal justification reason (minimum 8 characters) is required to grant an access exception.' };
  }

  const targetUser = getUserById(exception.user_id);
  if (!targetUser) return { error: 'Target user not found.' };

  const config = getInstitutionConfig();
  const newException: AccessException = {
    ...exception,
    id: `exc-${generateId().slice(0, 8)}`,
    reason: reason.trim(),
    created_at: new Date().toISOString(),
  };

  config.access_exceptions.push(newException);
  addAuditLog(actorId, newException.id, 'access_exception', 'exception.granted', null, newException as unknown as Record<string, unknown>);

  addNotification(
    exception.user_id,
    'Institutional Access Exception Granted',
    `You have been granted a "${exception.exception_type.replace('_', ' ')}" exception: ${reason}.`,
    '/my-bookings'
  );

  commit();
  return newException;
}

export function revokeAccessException(
  exceptionId: string,
  actorId: string,
  reason: string
): boolean | { error: string } {
  const actor = getUserById(actorId);
  if (!actor || !['manager', 'admin'].includes(actor.role)) {
    return { error: 'Unauthorized: Only institution managers or administrators can revoke access exceptions.' };
  }

  if (!reason || reason.trim().length < 8) {
    return { error: 'A valid reason is required to revoke an access exception.' };
  }

  const config = getInstitutionConfig();
  const idx = config.access_exceptions.findIndex((e) => e.id === exceptionId);
  if (idx === -1) return { error: 'Access exception not found.' };

  const exc = config.access_exceptions[idx];
  config.access_exceptions.splice(idx, 1);

  addAuditLog(actorId, exceptionId, 'access_exception', 'exception.revoked',
    exc as unknown as Record<string, unknown>,
    { reason: reason.trim() } as Record<string, unknown>
  );

  commit();
  return true;
}

// ─── Manager Review Workflow for Incidents & Disputes ───────
export function resolveManagerDispute(
  reportId: string,
  actorId: string,
  resolutionNotes: string,
  equipmentAction: 'restore_available' | 'keep_maintenance',
  sensitiveDecisionReason: string
): ConditionReport | { error: string } {
  const actor = getUserById(actorId);
  if (!actor || !['manager', 'admin'].includes(actor.role)) {
    return { error: 'Unauthorized: Only institutional managers or administrators can resolve escalations and disputes.' };
  }

  if (!sensitiveDecisionReason || sensitiveDecisionReason.trim().length < 8) {
    return { error: 'A formal decision rationale (minimum 8 characters) is required for institutional dispute resolution.' };
  }

  const idx = _store.condition_reports.findIndex((r) => r.id === reportId);
  if (idx === -1) return { error: 'Report not found.' };

  const report = _store.condition_reports[idx];
  const old = { ...report };
  const updatedReport: ConditionReport = {
    ...report,
    incident_status: 'resolved',
    resolved_by: actorId,
    resolved_at: new Date().toISOString(),
    resolution_notes: `${resolutionNotes} [Manager Decision Rationale: ${sensitiveDecisionReason.trim()}]`,
  };
  _store.condition_reports[idx] = updatedReport;

  // Update resource status according to manager decision
  if (report.resource_id) {
    const targetStatus: ResourceStatus = equipmentAction === 'restore_available' ? 'available' : 'maintenance';
    updateResource(report.resource_id, { status: targetStatus }, actorId);
  }

  // If there is an associated booking in incident_review or incident_hold, transition to completed
  if (report.booking_id) {
    const booking = getBookingById(report.booking_id);
    if (booking && ['incident_review', 'incident_hold', 'return_pending'].includes(booking.status)) {
      updateBookingStatus(report.booking_id, 'completed', actorId, {
        notes: `Manager resolved dispute: ${sensitiveDecisionReason.trim()}`,
      });
    }
  }

  addAuditLog(actorId, reportId, 'report', 'dispute.resolved_by_manager',
    old as unknown as Record<string, unknown>,
    {
      decision_reason: sensitiveDecisionReason.trim(),
      resolution_notes: resolutionNotes,
      equipment_action: equipmentAction,
    } as Record<string, unknown>
  );

  commit();
  return updatedReport;
}

// ─── Dashboard Metrics Calculated From Actual Records ───────
export function getOwnerDashboardMetrics(ownerId: string) {
  const allResources = getResources();
  const ownerResources = allResources.filter((r) => r.owner_id === ownerId);
  const ownerResourceIds = ownerResources.map((r) => r.id);
  const allBookings = getBookings();
  const allReports = getConditionReports();
  const now = Date.now();

  const availableCount = ownerResources.filter((r) => r.status === 'available').length;
  const inUseCount = ownerResources.filter((r) => r.status === 'in_use').length;
  const maintenanceCount = ownerResources.filter((r) => r.status === 'maintenance').length;
  const retiredCount = ownerResources.filter((r) => r.status === 'retired').length;

  const pendingRequests = allBookings.filter(
    (b) => ownerResourceIds.includes(b.resource_id) && ['pending', 'pending_approval', 'waitlisted'].includes(b.status)
  );

  const activeLoans = allBookings.filter(
    (b) => ownerResourceIds.includes(b.resource_id) && (b.status === 'checked_in' || b.status === 'approved')
  );

  // Upcoming handovers (approved, starting within 48h)
  const upcomingHandovers = allBookings.filter((b) => {
    if (!ownerResourceIds.includes(b.resource_id) || b.status !== 'approved') return false;
    const start = new Date(b.start_time).getTime();
    return start >= now - 2 * 3600 * 1000 && start <= now + 48 * 3600 * 1000;
  });

  // Upcoming returns (checked_in, ending within 48h)
  const upcomingReturns = allBookings.filter((b) => {
    if (!ownerResourceIds.includes(b.resource_id) || b.status !== 'checked_in') return false;
    const end = new Date(b.end_time).getTime();
    return end <= now + 48 * 3600 * 1000;
  });

  // Overdue resources (checked_in past end_time or status === 'overdue')
  const overdueBookings = allBookings.filter((b) => {
    if (!ownerResourceIds.includes(b.resource_id)) return false;
    if (b.status === 'overdue') return true;
    if (b.status === 'checked_in' && new Date(b.end_time).getTime() < now) return true;
    return false;
  });

  // Active incidents & unresolved disputes
  const activeIncidents = allReports.filter((r) => {
    if (!ownerResourceIds.includes(r.resource_id)) return false;
    return r.type === 'incident' || ['open', 'investigating', 'escalated'].includes(r.incident_status || '') || r.condition === 'damaged' || r.condition === 'missing_components';
  });

  // Calculate actual utilization rate: total hours booked for owned resources in confirmed/completed/active states vs total potential hours
  let totalBookedHours = 0;
  const relevantBookings = allBookings.filter(
    (b) => ownerResourceIds.includes(b.resource_id) && ['approved', 'checked_in', 'return_pending', 'completed', 'checked_out'].includes(b.status)
  );
  relevantBookings.forEach((b) => {
    const s = new Date(b.start_time).getTime();
    const e = new Date(b.end_time).getTime();
    const hrs = Math.max(0.5, (e - s) / (1000 * 60 * 60));
    totalBookedHours += hrs;
  });

  const utilizationRate = ownerResources.length > 0 
    ? Math.min(100, Math.round((inUseCount / ownerResources.length) * 100))
    : 0;

  return {
    totalResources: ownerResources.length,
    availableCount,
    inUseCount,
    maintenanceCount,
    retiredCount,
    pendingRequests,
    activeLoans,
    upcomingHandovers,
    upcomingReturns,
    overdueBookings,
    activeIncidents,
    totalBookedHours: Math.round(totalBookedHours * 10) / 10,
    utilizationRate,
  };
}

export function getManagerDashboardMetrics() {
  const allResources = getResources();
  const allBookings = getBookings();
  const allReports = getConditionReports();
  const allUsers = getUsers();
  const now = Date.now();

  const totalCatalog = allResources.length;
  const availableCount = allResources.filter((r) => r.status === 'available').length;
  const inUseCount = allResources.filter((r) => r.status === 'in_use').length;
  const inMaintenanceCount = allResources.filter((r) => r.status === 'maintenance').length;
  const retiredCount = allResources.filter((r) => r.status === 'retired').length;

  const activeLoans = allBookings.filter((b) => b.status === 'checked_in');
  const utilizationPercent = totalCatalog > 0 ? Math.round((inUseCount / totalCatalog) * 100) : 0;
  const idlePercent = 100 - utilizationPercent;

  const openIncidents = allReports.filter(
    (r) => r.type === 'incident' || ['open', 'investigating', 'escalated'].includes(r.incident_status || '') || r.condition === 'damaged' || r.condition === 'missing_components'
  );

  const waitlistedBookings = allBookings.filter((b) => b.status === 'waitlisted');

  // Fairness indicators: Repeated bookings in rolling 7 days
  const sevenDaysAgo = now - 7 * 24 * 3600 * 1000;
  const userBookingsLastWeek: Record<string, { count: number; hours: number; cancellations: number }> = {};

  allBookings.forEach((b) => {
    const createdMs = new Date(b.created_at).getTime();
    if (createdMs >= sevenDaysAgo) {
      if (!userBookingsLastWeek[b.borrower_id]) {
        userBookingsLastWeek[b.borrower_id] = { count: 0, hours: 0, cancellations: 0 };
      }
      userBookingsLastWeek[b.borrower_id].count++;
      const s = new Date(b.start_time).getTime();
      const e = new Date(b.end_time).getTime();
      userBookingsLastWeek[b.borrower_id].hours += Math.max(0.5, (e - s) / (1000 * 3600));
      if (b.status === 'cancelled') {
        userBookingsLastWeek[b.borrower_id].cancellations++;
      }
    }
  });

  const repeatedBookers = Object.entries(userBookingsLastWeek)
    .filter(([_, data]) => data.count >= 2 || data.hours >= 8)
    .map(([userId, data]) => {
      const u = allUsers.find((usr) => usr.id === userId);
      return {
        user: u,
        bookingCount: data.count,
        totalHours: Math.round(data.hours * 10) / 10,
        cancellations: data.cancellations,
        isHoardingWarning: data.count >= 4 || data.hours >= 16,
      };
    })
    .sort((a, b) => b.totalHours - a.totalHours);

  // Department Allocation breakdown
  const departmentHours: Record<string, number> = {
    'Electrical Engineering': 0,
    'Computer Science': 0,
    'Mechanical Engineering': 0,
    'Campus Operations': 0,
    'Physics / Material Science': 0,
  };

  allBookings.forEach((b) => {
    const borrower = allUsers.find((u) => u.id === b.borrower_id);
    const dept = borrower?.department || 'Other';
    const s = new Date(b.start_time).getTime();
    const e = new Date(b.end_time).getTime();
    const hrs = Math.max(1, Math.round((e - s) / (1000 * 3600)));
    if (!departmentHours[dept]) departmentHours[dept] = 0;
    departmentHours[dept] += hrs;
  });

  const config = getInstitutionConfig();

  return {
    totalCatalog,
    availableCount,
    inUseCount,
    inMaintenanceCount,
    retiredCount,
    utilizationPercent,
    idlePercent,
    activeLoansCount: activeLoans.length,
    openIncidents,
    waitlistedBookings,
    repeatedBookers,
    departmentHours,
    accessExceptions: config.access_exceptions,
    blackoutPeriods: config.blackout_periods,
  };
}
