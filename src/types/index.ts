// ─── Enums ───────────────────────────────────────────────
export type UserRole = 'borrower' | 'owner' | 'manager' | 'admin';

export type ResourceStatus = 'available' | 'in_use' | 'maintenance' | 'retired';

export type BookingStatus =
  | 'draft'
  | 'pending_approval'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'waitlisted'
  | 'checked_in'
  | 'return_pending'
  | 'completed'
  | 'checked_out'
  | 'cancelled'
  | 'overdue'
  | 'incident_hold'
  | 'incident_review';

export type BookingPriority = 'normal' | 'coursework' | 'capstone' | 'funded_research';
export type ExtensionStatus = 'none' | 'pending' | 'approved' | 'rejected';

export type ReportType = 'check_in' | 'check_out' | 'incident';

export type ConditionRating =
  | 'good'
  | 'minor_wear'
  | 'damaged'
  | 'missing_components'
  | 'other'
  | 'excellent'
  | 'fair';

export type IncidentStatus = 'open' | 'investigating' | 'resolved' | 'escalated';

export interface EvidenceFile {
  id: string;
  name: string;
  size: number;
  type: string;
  data_url?: string;
  uploaded_at: string;
}

export interface ReportCorrection {
  corrected_at: string;
  corrected_by: string;
  reason: string;
  previous_condition: ConditionRating;
  new_condition: ConditionRating;
  previous_notes: string;
  new_notes: string;
}

// ─── Models ──────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  department: string;
  student_id: string;
  training_completed: boolean;
  is_active: boolean;
  created_at: string;
  /** Only used in-memory for auth; never stored in plaintext in production */
  password_hash?: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface OperatingRule {
  label: string;
  description: string;
}

export interface EligibilityRequirement {
  type: 'training' | 'department' | 'membership' | 'approval';
  label: string;
  value: string;
}

export interface AvailabilitySlot {
  day: number; // 0=Sun, 1=Mon, ..., 6=Sat
  start: string; // "09:00"
  end: string; // "17:00"
}

export type ResourceType = 'equipment' | 'fabrication' | 'computing' | 'space' | 'imaging';

export interface Resource {
  id: string;
  owner_id: string;
  category_id: string;
  name: string;
  description: string;
  institution: string;
  location_building: string;
  location_room: string;
  campus_zone: string;
  walking_minutes: number;
  status: ResourceStatus;
  resource_type: ResourceType;
  cost_per_hour: number;
  deposit_amount: number;
  cancellation_policy: string;
  intended_uses: string[];
  operating_rules: OperatingRule[];
  eligibility_requirements: EligibilityRequirement[];
  availability_schedule: AvailabilitySlot[];
  image_url: string;
  requires_training: boolean;
  requires_approval: boolean;
  max_booking_hours: number;
  min_booking_hours?: number;
  safety_instructions?: string;
  blackout_periods?: BlackoutPeriod[];
  created_at: string;
}

export interface BlackoutPeriod {
  id: string;
  resource_id?: string;
  title: string;
  reason: string;
  start_time: string;
  end_time: string;
  created_by: string;
  created_at: string;
}

export interface AccessException {
  id: string;
  user_id: string;
  resource_id?: string;
  exception_type: 'training_override' | 'quota_override' | 'extended_hours' | 'emergency_access';
  reason: string;
  approved_by: string;
  expires_at: string;
  created_at: string;
}

export interface InstitutionConfig {
  institution_name: string;
  campus_name: string;
  contact_email: string;
  support_phone: string;
  max_advance_booking_days: number;
  max_active_bookings_per_user: number;
  max_weekly_hours_per_user: number;
  default_cancellation_window_hours: number;
  allow_self_checkin: boolean;
  require_supervisor_signoff_funded: boolean;
  blackout_periods: BlackoutPeriod[];
  access_exceptions: AccessException[];
}

export interface MatchExplanation {
  overallScore: number;
  matchReasons: string[];
  matchedKeywords: string[];
  availabilityScore: number;
  eligibilityScore: number;
  isRestricted: boolean;
  restrictionReason?: string;
  summaryExplanation: string;
}

export interface ScoredResource {
  resource: Resource;
  score: number;
  explanation: MatchExplanation;
}

// ─── Match & Explain AI Types ────────────────────────────
export interface ResourceAlternative {
  resource_id: string;
  name: string;
  reason: string;
}

export interface MatchedResourceItem {
  resource: Resource;
  matchScore: number;
  suitabilityReason: string;
  limitations: string[];
  isRestricted: boolean;
  restrictionReason?: string | null;
  recommendedAlternatives: ResourceAlternative[];
}

export interface ExtractedQueryIntent {
  intendedTask: string;
  relevantCategories: string[];
  extractedConstraints: string[];
  requestedTimeWindow?: string | null;
  clarifyingQuestion?: string | null;
  clarifyingOptions?: string[];
  isIrrelevant: boolean;
  irrelevantMessage?: string | null;
}

export interface MatchExplainResult {
  query: string;
  intent: ExtractedQueryIntent;
  matches: MatchedResourceItem[];
  engineMode: 'gemini_ai' | 'deterministic_rules';
  explanationMethod: string;
  processingTimeMs: number;
}

// ─── Staff Demand Insights Types ────────────────────────
export interface TelemetryAssetDemand {
  resource_id: string;
  name: string;
  category_name: string;
  booking_count: number;
  waitlist_count: number;
  total_hours: number;
  utilization_rate: number;
  idle_percentage: number;
}

export interface PeakPeriodStat {
  period_label: string;
  booking_count: number;
  percentage_of_total: number;
  description: string;
}

export interface StaffDemandInsights {
  telemetry: {
    totalBookingsEvaluated: number;
    activeLoanCount: number;
    waitlistCount: number;
    topRequestedAssets: TelemetryAssetDemand[];
    underutilizedAssets: TelemetryAssetDemand[];
    peakUsagePeriods: PeakPeriodStat[];
    unmetWaitlistBacklog: { resource_id: string; name: string; waitlist_count: number; avg_wait_days: number }[];
    campusIdlePercentage: number;
  };
  synthesis: {
    executiveSummary: string;
    recurringPeakObservations: string[];
    underutilizationInsights: string[];
    schedulingRecommendations: string[];
    preventativeMaintenanceAdvice: string[];
    capacityReallocationSuggestions: string[];
    humanReviewNotice: string;
  };
  engineMode: 'gemini_ai' | 'deterministic_rules';
  generatedAt: string;
}

export interface Booking {
  id: string;
  resource_id: string;
  borrower_id: string;
  approved_by: string | null;
  start_time: string;
  end_time: string;
  status: BookingStatus;
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
  extension_requested_end_time?: string | null;
  extension_status?: ExtensionStatus;
  incident_hold_reason?: string | null;
  rejection_reason?: string | null;
  cancellation_reason?: string | null;
  checked_in_at?: string | null;
  return_initiated_at?: string | null;
  checked_out_at?: string | null;
  completed_at?: string | null;
  overdue_minutes?: number | null;
  initial_report_id?: string | null;
  final_report_id?: string | null;
  created_at: string;
}

export interface RequirementCheck {
  type: 'training' | 'department' | 'membership' | 'approval';
  label: string;
  expected: string;
  satisfied: boolean;
  details: string;
}

export interface EligibilityEvaluation {
  isEligible: boolean;
  requirements: RequirementCheck[];
  unmetRequirements: string[];
  canOverride: boolean;
}

export interface FairnessCheckResult {
  allowed: boolean;
  activeBookingCount: number;
  maxActiveBookings: number;
  hoursBookedThisWeek: number;
  maxHoursPerWeek: number;
  recentCancellationCount: number;
  cancellationWarning: boolean;
  explanation: string;
  error?: string;
}

export interface ConditionReport {
  id: string;
  resource_id: string;
  booking_id: string | null;
  reporter_id: string;
  type: ReportType;
  condition: ConditionRating;
  notes: string;
  evidence_files?: EvidenceFile[];
  accessories_returned?: { name: string; returned: boolean }[];
  confirmed_by_reporter?: boolean;
  incident_status: IncidentStatus | null;
  assigned_to?: string | null;
  assigned_reviewer_name?: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  resolved_at?: string | null;
  corrections?: ReportCorrection[];
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  actor_name?: string;
  actor_role?: UserRole;
  target_id: string;
  target_type: 'booking' | 'resource' | 'user' | 'report' | 'category' | 'institution_config' | 'access_exception' | 'blackout_period';
  action: string;
  decision_reason?: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  read: boolean;
  link?: string;
  category?: 'booking' | 'waitlist' | 'incident' | 'system' | 'safety';
  created_at: string;
}

export interface HandoverTimelineEvent {
  id: string;
  timestamp: string;
  title: string;
  description: string;
  actor_name: string;
  actor_role: string;
  type: 'created' | 'approved' | 'check_in' | 'extension' | 'return_pending' | 'sign_off' | 'incident' | 'resolved';
  badge_color?: string;
  details?: Record<string, unknown>;
}

// ─── Store shape ─────────────────────────────────────────
export interface AppStore {
  users: User[];
  categories: Category[];
  resources: Resource[];
  bookings: Booking[];
  condition_reports: ConditionReport[];
  audit_logs: AuditLog[];
  notifications: Notification[];
  institution_config?: InstitutionConfig;
}
