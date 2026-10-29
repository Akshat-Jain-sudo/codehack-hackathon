import type { Resource, User, ScoredResource, MatchExplanation, Category } from '../types';

/**
 * Goal & Intent Knowledge Map
 * Maps common university student & researcher project intents to technical capabilities and equipment concepts.
 * Deterministic and transparent matching without hallucination.
 */
const GOAL_INTENT_MAP: Record<string, string[]> = {
  // Electronics & Prototyping
  'electronics prototype': ['electronics prototype', 'soldering', 'oscilloscope', 'circuit', 'pcb', 'waveform', 'multimeter', 'voltage', 'current', 'probes'],
  'circuit prototype': ['oscilloscope', 'soldering', 'circuit', 'multimeter', 'pcb', 'power measurement'],
  'build an electronics prototype': ['oscilloscope', 'soldering', 'multimeter', 'circuit', 'pcb', 'electronics prototype'],
  'circuit debugging': ['oscilloscope', 'multimeter', 'analog signal', 'probes', 'debugging', 'continuity'],
  'pcb assembly': ['soldering', 'rework', 'flux', 'surface mount', 'electronics prototype'],
  'test circuit': ['oscilloscope', 'multimeter', 'probes', 'voltage', 'signal'],

  // 3D Fabrication & Enclosures
  '3d print enclosure': ['3d print enclosure', 'ultimaker', 'fdm', 'rapid prototyping', 'cad fabrication', 'pla', 'abs', 'nylon'],
  'rapid prototyping': ['3d print', 'ultimaker', 'soldering', 'prototyping', 'chassis'],
  'make an enclosure': ['3d print enclosure', 'ultimaker', 'fabrication', 'robotics chassis'],
  'fabricate parts': ['3d print', 'cad fabrication', 'fdm'],

  // Deep Learning & HPC
  'deep learning training': ['deep learning training', 'gpu', 'dgx', 'cuda', 'pytorch', 'tensorflow', 'machine learning model', 'hpc'],
  'train a deep learning model': ['machine learning model', 'deep learning training', 'gpu', 'dgx', 'cuda', 'pytorch'],
  'machine learning model': ['machine learning model', 'deep learning training', 'gpu', 'dgx', 'a100', 'hpc cluster compute'],
  'train ai': ['machine learning model', 'gpu', 'pytorch', 'tensorflow', 'cuda'],
  'gpu compute': ['gpu', 'dgx', 'hpc', 'cuda', 'a100'],

  // RF & EMC Testing
  'rf antenna test': ['rf antenna testing', 'emc compliance', 'anechoic', 'spectrum analyzer', 'shielding'],
  'emc compliance': ['emc testing chamber', 'anechoic', 'fcc pre-compliance', 'shielding', 'radiation pattern'],
  'electromagnetic test': ['emc compliance', 'anechoic', 'rf antenna testing'],

  // Imaging & Video
  'video recording': ['video recording', 'camera', 'canon', '8k video', 'lens', 'lighting'],
  'film interview': ['video recording', 'camera', 'lighting', 'tripod'],
  'macro imaging': ['camera', 'lens', 'macro imaging', 'specimen photography'],
  'photography': ['camera', 'canon', 'lens', 'tripod'],

  // Team & Collaboration Spaces
  'team meeting': ['collaborative project room', 'capstone team meeting', 'whiteboard collaboration', 'video conferencing'],
  'capstone team meeting': ['project room', 'whiteboard', 'video conferencing', 'sprint planning'],
  'group study': ['project room', 'thunderbolt', 'whiteboard collaboration'],
  'sprint planning': ['project room', 'display', 'whiteboard collaboration'],
};

/**
 * Normalizes text: trims, lowercases, removes punctuation
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculates a documented deterministic matching score (0 to 100) for a resource
 * against a search query, logged-in user profile, and category.
 */
export function scoreResource(
  resource: Resource,
  query: string,
  user: User | null,
  categories: Category[]
): ScoredResource {
  const normQuery = normalizeText(query);
  const category = categories.find((c) => c.id === resource.category_id);
  const categoryName = category ? normalizeText(category.name) : '';

  const matchedKeywords: string[] = [];
  const matchReasons: string[] = [];

  let queryScore = 0;
  let availabilityScore = 0;
  let eligibilityScore = 0;
  let costScore = 0;

  // 1. QUERY & SEMANTIC MATCHING (0 to 45 pts)
  if (!normQuery) {
    // If no query entered, default baseline match
    queryScore = 20;
    matchedKeywords.push('General Catalog Asset');
  } else {
    const resourceNameNorm = normalizeText(resource.name);
    const descNorm = normalizeText(resource.description);
    const institutionNorm = normalizeText(resource.institution || '');
    const locationNorm = normalizeText(`${resource.location_building} ${resource.location_room} ${resource.campus_zone || ''}`);
    const intendedUsesNorm = (resource.intended_uses || []).map(normalizeText);

    // Check direct goal phrase from dictionary
    let matchedExpandedCapabilities: string[] = [];
    for (const [goalPhrase, capabilities] of Object.entries(GOAL_INTENT_MAP)) {
      if (normQuery.includes(goalPhrase) || goalPhrase.includes(normQuery)) {
        matchedExpandedCapabilities = [...matchedExpandedCapabilities, ...capabilities];
      }
    }

    // A. Title exact match or word match
    if (resourceNameNorm.includes(normQuery)) {
      queryScore += 15;
      matchedKeywords.push(`Title: "${resource.name}"`);
      matchReasons.push(`Exact title match on "${resource.name}" (+15 pts)`);
    } else {
      const queryTokens = normQuery.split(' ').filter((t) => t.length > 2);
      const nameTokensMatched = queryTokens.filter((t) => resourceNameNorm.includes(t));
      if (nameTokensMatched.length > 0) {
        queryScore += Math.min(10, nameTokensMatched.length * 4);
        matchedKeywords.push(...nameTokensMatched);
        matchReasons.push(`Title matches: ${nameTokensMatched.join(', ')}`);
      }
    }

    // B. Intended uses & capabilities match
    const queryWords = normQuery.split(' ');
    const tagMatches = (resource.intended_uses || []).filter((tag) => {
      const tagNorm = normalizeText(tag);
      return (
        normQuery.includes(tagNorm) ||
        tagNorm.includes(normQuery) ||
        queryWords.some((w) => w.length > 3 && tagNorm.includes(w)) ||
        matchedExpandedCapabilities.some((cap) => tagNorm.includes(cap) || cap.includes(tagNorm))
      );
    });

    if (tagMatches.length > 0) {
      const pts = Math.min(15, tagMatches.length * 6);
      queryScore += pts;
      matchedKeywords.push(...tagMatches);
      matchReasons.push(`Verified capabilities: ${tagMatches.join(', ')} (+${pts} pts)`);
    }

    // C. Description & technical specs match
    const descMatches = queryWords.filter((w) => w.length > 3 && descNorm.includes(w));
    if (descMatches.length > 0) {
      queryScore += Math.min(10, descMatches.length * 3);
      matchedKeywords.push(...descMatches);
    }

    // D. Category, Institution, or Location match
    if (categoryName && normQuery.includes(categoryName)) {
      queryScore += 5;
      matchedKeywords.push(`Category: ${category?.name}`);
      matchReasons.push(`Category alignment: ${category?.name} (+5 pts)`);
    }
    if (institutionNorm && normQuery.split(' ').some((w) => w.length > 4 && institutionNorm.includes(w))) {
      queryScore += 5;
      matchedKeywords.push(`Institution: ${resource.institution}`);
    }
    if (locationNorm && normQuery.split(' ').some((w) => w.length > 3 && locationNorm.includes(w))) {
      queryScore += 5;
      matchedKeywords.push(`Location: ${resource.location_building}`);
    }

    // Cap query score at 45
    queryScore = Math.min(45, queryScore);
  }

  // 2. AVAILABILITY SCORING (0 to 25 pts)
  if (resource.status === 'available') {
    availabilityScore = 25;
    matchReasons.push('Available immediately for reservation (+25 pts)');
  } else if (resource.status === 'in_use') {
    availabilityScore = 12;
    matchReasons.push('Currently in-use (available for scheduled slots / waitlist) (+12 pts)');
  } else if (resource.status === 'maintenance') {
    availabilityScore = 0;
    matchReasons.push('Offline: Currently undergoing maintenance (0 pts)');
  } else {
    availabilityScore = 0;
  }

  // 3. ELIGIBILITY & SAFETY CERTIFICATION SCORING (0 to 20 pts)
  let isRestricted = false;
  let restrictionReason: string | undefined = undefined;

  const trainingRequired = resource.requires_training;
  const userHasTraining = user?.training_completed ?? false;

  const deptReq = resource.eligibility_requirements.find((r) => r.type === 'department');
  const allowedDepts = deptReq?.value.split(',').map((d) => d.trim().toLowerCase()) ?? [];
  const userDept = user?.department.toLowerCase() ?? '';
  const deptAllowed = allowedDepts.length === 0 || (userDept && allowedDepts.includes(userDept));

  if (trainingRequired && !userHasTraining) {
    isRestricted = true;
    restrictionReason = 'Missing verified lab safety certification module';
    eligibilityScore = 0;
    matchReasons.push('Access restricted: Mandatory safety training not completed (0 pts)');
  } else if (!deptAllowed) {
    isRestricted = true;
    restrictionReason = `Department restricted to ${deptReq?.value}`;
    eligibilityScore = 5;
    matchReasons.push(`Department mismatch (restricted to ${deptReq?.value})`);
  } else {
    eligibilityScore = 20;
    matchReasons.push('User meets all safety certifications and department prerequisites (+20 pts)');
  }

  // 4. AFFORDABILITY & COST ALIGNMENT (0 to 10 pts)
  if (resource.cost_per_hour === 0 && resource.deposit_amount === 0) {
    costScore = 10;
    matchReasons.push('100% Free institutional resource for students (+10 pts)');
  } else if (resource.cost_per_hour === 0) {
    costScore = 8;
  } else if (resource.cost_per_hour < 20) {
    costScore = 5;
  } else {
    costScore = 2;
  }

  // Total Score (0 to 100)
  const totalScore = Math.min(100, Math.round(queryScore + availabilityScore + eligibilityScore + costScore));

  // Human-readable summary explanation
  let summaryExplanation = '';
  if (normQuery) {
    if (isRestricted) {
      summaryExplanation = `Matches intended capabilities for "${query}", but booking is currently restricted: ${restrictionReason}.`;
    } else if (resource.status === 'available') {
      summaryExplanation = `High match for "${query}" with verified capabilities, immediate availability, and verified safety credentials.`;
    } else if (resource.status === 'in_use') {
      summaryExplanation = `Strong capability match for "${query}". Currently in use, but bookable for upcoming time windows.`;
    } else {
      summaryExplanation = `Matches technical requirements for "${query}", but unit is currently under maintenance.`;
    }
  } else {
    summaryExplanation = `${resource.name} • ${resource.institution} • ${resource.status === 'available' ? 'Available now' : 'Scheduled access'}.`;
  }

  const explanation: MatchExplanation = {
    overallScore: totalScore,
    matchReasons,
    matchedKeywords: Array.from(new Set(matchedKeywords)),
    availabilityScore,
    eligibilityScore,
    isRestricted,
    restrictionReason,
    summaryExplanation,
  };

  return {
    resource,
    score: totalScore,
    explanation,
  };
}

/**
 * Filter criteria interface
 */
export interface FilterCriteria {
  searchQuery: string;
  category: string;
  resourceType: string;
  availability: 'all' | 'available' | 'in_use' | 'maintenance';
  costType: 'all' | 'free' | 'paid';
  trainingFilter: 'all' | 'required' | 'not_required' | 'eligible_only';
  departmentFilter: string;
  campusZone: string;
  maxWalkingMinutes: number; // 0 = any
  selectedDate?: string;
  sortBy: 'relevance' | 'earliest_availability' | 'lowest_cost' | 'shortest_distance';
}

/**
 * Multi-criteria filter, scorer, and sorter for the catalog
 */
export function searchAndRankResources(
  resources: Resource[],
  criteria: FilterCriteria,
  user: User | null,
  categories: Category[]
): ScoredResource[] {
  // 1. Score all resources
  const scored = resources.map((res) => scoreResource(res, criteria.searchQuery, user, categories));

  // 2. Apply strict filters
  const filtered = scored.filter(({ resource, explanation }) => {
    // Category filter
    if (criteria.category !== 'all' && resource.category_id !== criteria.category) {
      return false;
    }

    // Resource Type filter
    if (criteria.resourceType !== 'all' && resource.resource_type !== criteria.resourceType) {
      return false;
    }

    // Availability filter
    if (criteria.availability !== 'all' && resource.status !== criteria.availability) {
      return false;
    }

    // Cost filter
    if (criteria.costType === 'free' && resource.cost_per_hour > 0) {
      return false;
    }
    if (criteria.costType === 'paid' && resource.cost_per_hour === 0) {
      return false;
    }

    // Training / Eligibility filter
    if (criteria.trainingFilter === 'required' && !resource.requires_training) {
      return false;
    }
    if (criteria.trainingFilter === 'not_required' && resource.requires_training) {
      return false;
    }
    if (criteria.trainingFilter === 'eligible_only' && explanation.isRestricted) {
      return false;
    }

    // Department filter
    if (criteria.departmentFilter !== 'all') {
      const deptReq = resource.eligibility_requirements.find((r) => r.type === 'department');
      if (deptReq) {
        const allowed = deptReq.value.split(',').map((d) => d.trim().toLowerCase());
        if (!allowed.includes(criteria.departmentFilter.toLowerCase())) {
          return false;
        }
      }
    }

    // Campus Zone
    if (criteria.campusZone !== 'all' && resource.campus_zone !== criteria.campusZone) {
      return false;
    }

    // Walking distance
    if (criteria.maxWalkingMinutes > 0 && resource.walking_minutes > criteria.maxWalkingMinutes) {
      return false;
    }

    // Date availability filter: check if resource operates on selected day
    if (criteria.selectedDate) {
      const dateObj = new Date(criteria.selectedDate);
      if (!isNaN(dateObj.getTime())) {
        const dayOfWeek = dateObj.getDay();
        const operatesOnDay = resource.availability_schedule.some((slot) => slot.day === dayOfWeek);
        if (!operatesOnDay) return false;
      }
    }

    return true;
  });

  // 3. Sort according to requested criteria
  filtered.sort((a, b) => {
    switch (criteria.sortBy) {
      case 'earliest_availability': {
        const statusOrder: Record<string, number> = { available: 0, in_use: 1, maintenance: 2, retired: 3 };
        const orderA = statusOrder[a.resource.status] ?? 99;
        const orderB = statusOrder[b.resource.status] ?? 99;
        if (orderA !== orderB) return orderA - orderB;
        return b.score - a.score;
      }
      case 'lowest_cost': {
        if (a.resource.cost_per_hour !== b.resource.cost_per_hour) {
          return a.resource.cost_per_hour - b.resource.cost_per_hour;
        }
        return a.resource.deposit_amount - b.resource.deposit_amount;
      }
      case 'shortest_distance': {
        return (a.resource.walking_minutes || 0) - (b.resource.walking_minutes || 0);
      }
      case 'relevance':
      default: {
        return b.score - a.score;
      }
    }
  });

  return filtered;
}
