import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Search, 
  MapPin, 
  Clock, 
  ShieldAlert, 
  CheckCircle, 
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X,
  Compass,
  ArrowUpDown,
  SlidersHorizontal,
  HelpCircle,
  AlertTriangle,
  Lightbulb,
  RefreshCw,
  Cpu,
  Shield,
  ArrowRight,
  Sliders,
  Check,
  CornerDownRight
} from 'lucide-react';
import { getResources, getCategories, getUserById, getBookingsByBorrower } from '../data/store';
import { useAuth } from '../contexts/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import { searchAndRankResources, type FilterCriteria } from '../utils/matchingEngine';
import { runMatchAndExplain } from '../utils/aiMatchExplain';
import type { MatchExplainResult } from '../types';

export const DiscoveryDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Search & Intent state
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');

  useEffect(() => {
    const q = searchParams.get('q');
    if (q !== null) {
      setSearchQuery(q);
    }
  }, [searchParams]);

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedResourceType, setSelectedResourceType] = useState<string>('all');
  const [selectedAvailability, setSelectedAvailability] = useState<'all' | 'available' | 'in_use' | 'maintenance'>('all');
  const [costType, setCostType] = useState<'all' | 'free' | 'paid'>('all');
  const [trainingFilter, setTrainingFilter] = useState<'all' | 'required' | 'not_required' | 'eligible_only'>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [campusZone, setCampusZone] = useState<string>('all');
  const [maxWalkingMinutes, setMaxWalkingMinutes] = useState<number>(0);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [sortBy, setSortBy] = useState<'relevance' | 'earliest_availability' | 'lowest_cost' | 'shortest_distance'>('relevance');

  // Filter drawer toggle on mobile
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [expandedExplanationId, setExpandedExplanationId] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  // ─── LabLoop Match & Explain State ─────────────────────────
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [aiGoalQuery, setAiGoalQuery] = useState('');
  const [isAnalyzingAi, setIsAnalyzingAi] = useState(false);
  const [aiResult, setAiResult] = useState<MatchExplainResult | null>(null);
  const [showExplainerModal, setShowExplainerModal] = useState(false);

  const categories = getCategories();
  const allResources = getResources();
  const myBookings = user ? getBookingsByBorrower(user.id) : [];

  // Goal Presets
  const GOAL_PRESETS = [
    { label: 'Prototype sensor circuit & measure voltage', query: 'I need to prototype a sensor circuit and measure voltage signals for a college project.' },
    { label: '3D print robotics enclosure by Friday', query: '3D print an enclosure for my robotics chassis by Friday' },
    { label: 'Train deep learning vision model', query: 'Train a deep learning convolutional vision model with CUDA' },
    { label: 'Test RF antenna in anechoic chamber', query: 'Measure electromagnetic emissions and RF antenna radiation in anechoic chamber' },
    { label: 'Incomplete Goal (Test Clarification)', query: 'I need lab tools for my project' },
    { label: 'Irrelevant Query (Test Safety)', query: 'Best authentic Italian pizza recipe' },
  ];

  // Campus Zones extracted from data
  const campusZones = useMemo(() => {
    const zones = new Set<string>();
    allResources.forEach((r) => {
      if (r.campus_zone) zones.add(r.campus_zone);
    });
    return Array.from(zones);
  }, [allResources]);

  // Execute matching & ranking engine (standard catalog search)
  const filterCriteria: FilterCriteria = useMemo(() => ({
    searchQuery,
    category: selectedCategory,
    resourceType: selectedResourceType,
    availability: selectedAvailability,
    costType,
    trainingFilter,
    departmentFilter,
    campusZone,
    maxWalkingMinutes,
    selectedDate: selectedDate || undefined,
    sortBy,
  }), [
    searchQuery,
    selectedCategory,
    selectedResourceType,
    selectedAvailability,
    costType,
    trainingFilter,
    departmentFilter,
    campusZone,
    maxWalkingMinutes,
    selectedDate,
    sortBy,
  ]);

  const scoredResources = useMemo(() => {
    return searchAndRankResources(allResources, filterCriteria, user ?? null, categories);
  }, [allResources, filterCriteria, user, categories]);

  // Run Match & Explain AI engine
  const handleRunMatchAndExplain = async (queryToRun?: string) => {
    const goal = queryToRun || aiGoalQuery;
    if (!goal.trim()) return;

    setIsAnalyzingAi(true);
    try {
      const result = await runMatchAndExplain(goal, user ?? null);
      setAiResult(result);
      setCurrentPage(1);
    } catch (err) {
      console.error('Error running Match & Explain:', err);
    } finally {
      setIsAnalyzingAi(false);
    }
  };

  const clearAiResults = () => {
    setAiResult(null);
    setAiGoalQuery('');
    setSearchQuery('');
  };

  // Pagination slicing
  const displayedCount = aiResult ? aiResult.matches.length : scoredResources.length;
  const totalPages = Math.max(1, Math.ceil(displayedCount / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);

  const paginatedStandardResources = useMemo(() => {
    const start = (validCurrentPage - 1) * pageSize;
    return scoredResources.slice(start, start + pageSize);
  }, [scoredResources, validCurrentPage, pageSize]);

  const paginatedAiMatches = useMemo(() => {
    if (!aiResult) return [];
    const start = (validCurrentPage - 1) * pageSize;
    return aiResult.matches.slice(start, start + pageSize);
  }, [aiResult, validCurrentPage, pageSize]);

  // Reset page when filters change
  const handleFilterChange = (updater: () => void) => {
    updater();
    setCurrentPage(1);
  };

  const resetAllFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedResourceType('all');
    setSelectedAvailability('all');
    setCostType('all');
    setTrainingFilter('all');
    setDepartmentFilter('all');
    setCampusZone('all');
    setMaxWalkingMinutes(0);
    setSelectedDate('');
    setSortBy('relevance');
    setCurrentPage(1);
    setAiResult(null);
  };

  const activeFilterCount = [
    selectedCategory !== 'all',
    selectedResourceType !== 'all',
    selectedAvailability !== 'all',
    costType !== 'all',
    trainingFilter !== 'all',
    departmentFilter !== 'all',
    campusZone !== 'all',
    maxWalkingMinutes > 0,
    Boolean(selectedDate),
  ].filter(Boolean).length;

  // Decide if we should render the featured specimen
  const isDefaultView = validCurrentPage === 1 && !aiResult && searchQuery === '' && selectedCategory === 'all' && activeFilterCount === 0;
  const featuredItem = isDefaultView && paginatedStandardResources.length > 0 ? paginatedStandardResources[0] : null;
  const gridItems = isDefaultView ? paginatedStandardResources.slice(1) : paginatedStandardResources;

  return (
    <div className="space-y-8 pb-12">
      
      {/* ─── 01 / EDITORIAL MASTHEAD ─── */}
      <section className="border-b border-[#DCD9CF] pb-8 pt-2">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#183D30] font-bold bg-[#183D30]/10 px-2.5 py-1 border border-[#183D30]/20">
              THE SHARED RESOURCE NETWORK / 01
            </span>
            <span className="text-[11px] font-mono text-[#7E8276] uppercase tracking-wider hidden sm:inline">
              EQUIPMENT & SPACE DIRECTORY
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowExplainerModal(true)}
              className="text-[11px] font-mono text-[#565950] hover:text-[#183D30] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-[#183D30]" />
              <span>Matching Methodology</span>
            </button>
          </div>
        </div>
        
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold tracking-tight text-[#252722] leading-[1.05]">
              Good equipment shouldn't sit idle.
            </h1>
            <p className="mt-4 text-base sm:text-lg text-[#565950] font-sans leading-relaxed max-w-2xl">
              Discover and responsibly access underused laboratory equipment, specialist fabrication apparatus, and research spaces across departments.
            </p>
          </div>

          {/* Precision Inventory Counter Strip */}
          <div className="flex items-stretch gap-px bg-[#DCD9CF] border border-[#DCD9CF] shrink-0">
            <div className="bg-[#FCFBF7] p-3 sm:px-4">
              <div className="text-[10px] font-mono uppercase tracking-widest text-[#7E8276]">Cataloged</div>
              <div className="text-xl font-display font-bold text-[#252722]">{allResources.length}</div>
            </div>
            <div className="bg-[#FCFBF7] p-3 sm:px-4">
              <div className="text-[10px] font-mono uppercase tracking-widest text-[#7E8276]">Available</div>
              <div className="text-xl font-display font-bold text-[#183D30]">
                {allResources.filter(r => r.status === 'available').length}
              </div>
            </div>
            <div className="bg-[#FCFBF7] p-3 sm:px-4">
              <div className="text-[10px] font-mono uppercase tracking-widest text-[#7E8276]">Certified</div>
              <div className="text-xs font-mono font-bold text-[#183D30] mt-1 flex items-center gap-1">
                {user?.training_completed ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#183D30]" />
                    <span>YES</span>
                  </>
                ) : (
                  <span className="text-[#854D0E]">PENDING</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 02 / NATURAL LANGUAGE SEARCH & QUERY TERMINAL ─── */}
      <section className="bg-[#FCFBF7] border border-[#DCD9CF] p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-[#7E8276]">
              <Search className="w-4 h-4" />
              <span className="text-[11px] font-mono uppercase">FIND:</span>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleFilterChange(() => setSearchQuery(e.target.value))}
              placeholder="Search by instrument name, manufacturer, specification, or room..."
              className="w-full pl-20 pr-10 py-3 text-sm font-sans bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722] placeholder-[#7E8276] focus:outline-hidden focus:border-[#183D30] focus:bg-[#FCFBF7] transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => handleFilterChange(() => setSearchQuery(''))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7E8276] hover:text-[#252722] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* High-Contrast Action Button: Acid Lime */}
          <button
            type="button"
            onClick={() => {
              setIsAiPanelOpen(!isAiPanelOpen);
              if (!aiGoalQuery) {
                setAiGoalQuery('I need to prototype a sensor circuit and measure voltage signals for a college project.');
              }
            }}
            className="px-5 py-3 bg-[#D8FF3E] hover:bg-[#c9ef30] text-[#183D30] font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 border border-[#183D30] transition-colors cursor-pointer shrink-0 shadow-xs"
          >
            <Sparkles className="w-4 h-4 text-[#183D30]" />
            <span>{isAiPanelOpen ? 'Close AI Match' : 'AI Goal Matcher'}</span>
          </button>
        </div>

        {/* Categories Bar */}
        <div className="pt-2 border-t border-[#DCD9CF]">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#7E8276] mr-2 shrink-0">
              FILTER /
            </span>
            <button
              type="button"
              onClick={() => handleFilterChange(() => setSelectedCategory('all'))}
              className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider shrink-0 transition-colors border cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-[#183D30] text-[#D8FF3E] border-[#183D30] font-bold'
                  : 'bg-[#F3F0E8] text-[#565950] border-[#DCD9CF] hover:border-[#183D30] hover:text-[#183D30]'
              }`}
            >
              ALL ({allResources.length})
            </button>
            {categories.map((c) => {
              const count = allResources.filter((r) => r.category_id === c.id).length;
              const isSelected = selectedCategory === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleFilterChange(() => setSelectedCategory(c.id))}
                  className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider shrink-0 transition-colors flex items-center gap-1.5 border cursor-pointer ${
                    isSelected
                      ? 'bg-[#183D30] text-[#D8FF3E] border-[#183D30] font-bold'
                      : 'bg-[#F3F0E8] text-[#565950] border-[#DCD9CF] hover:border-[#183D30] hover:text-[#183D30]'
                  }`}
                >
                  <span>{c.name}</span>
                  <span className={`text-[10px] px-1 py-0.2 ${isSelected ? 'bg-[#D8FF3E]/20 text-[#D8FF3E]' : 'bg-[#DCD9CF] text-[#565950]'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Secondary Parameters Bar */}
        <div className="pt-3 border-t border-[#DCD9CF] flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            {/* Availability */}
            <select
              value={selectedAvailability}
              onChange={(e) => handleFilterChange(() => setSelectedAvailability(e.target.value as any))}
              className="bg-[#F3F0E8] border border-[#DCD9CF] px-2.5 py-1.5 text-xs text-[#252722] focus:border-[#183D30] cursor-pointer"
            >
              <option value="all">ALL AVAILABILITY</option>
              <option value="available">AVAILABLE NOW</option>
              <option value="in_use">IN USE / WAITLIST</option>
              <option value="maintenance">MAINTENANCE</option>
            </select>

            {/* Resource Type */}
            <select
              value={selectedResourceType}
              onChange={(e) => handleFilterChange(() => setSelectedResourceType(e.target.value))}
              className="bg-[#F3F0E8] border border-[#DCD9CF] px-2.5 py-1.5 text-xs text-[#252722] focus:border-[#183D30] cursor-pointer"
            >
              <option value="all">ALL TYPES</option>
              <option value="equipment">INSTRUMENTS & GEAR</option>
              <option value="fabrication">FABRICATION & 3D</option>
              <option value="computing">GPU / WORKSTATIONS</option>
              <option value="space">ROOMS & CHAMBERS</option>
              <option value="imaging">CAMERAS & OPTICS</option>
            </select>

            {/* Cost Filter */}
            <select
              value={costType}
              onChange={(e) => handleFilterChange(() => setCostType(e.target.value as any))}
              className="bg-[#F3F0E8] border border-[#DCD9CF] px-2.5 py-1.5 text-xs text-[#252722] focus:border-[#183D30] cursor-pointer"
            >
              <option value="all">ALL PRICING</option>
              <option value="free">100% FREE ($0/HR)</option>
              <option value="paid">SUBSIDIZED / FEE</option>
            </select>

            {/* Training Gate */}
            <select
              value={trainingFilter}
              onChange={(e) => handleFilterChange(() => setTrainingFilter(e.target.value as any))}
              className="bg-[#F3F0E8] border border-[#DCD9CF] px-2.5 py-1.5 text-xs text-[#252722] focus:border-[#183D30] cursor-pointer"
            >
              <option value="all">ALL PREREQUISITES</option>
              <option value="eligible_only">MY ELIGIBILITY ONLY</option>
              <option value="not_required">NO TRAINING REQ.</option>
              <option value="required">TRAINING REQ.</option>
            </select>

            {/* Campus Zone */}
            <select
              value={campusZone}
              onChange={(e) => handleFilterChange(() => setCampusZone(e.target.value))}
              className="bg-[#F3F0E8] border border-[#DCD9CF] px-2.5 py-1.5 text-xs text-[#252722] focus:border-[#183D30] cursor-pointer"
            >
              <option value="all">CAMPUS ZONE: ALL</option>
              {campusZones.map((zone) => (
                <option key={zone} value={zone}>{zone.toUpperCase()}</option>
              ))}
            </select>
          </div>

          {/* Sort Selector & Result count */}
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono uppercase text-[#7E8276]">
              [{displayedCount} RESULTS]
            </span>
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#7E8276]" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-[#F3F0E8] border border-[#DCD9CF] px-2.5 py-1.5 text-xs text-[#252722] font-mono focus:border-[#183D30] cursor-pointer"
              >
                <option value="relevance">SORT: RELEVANCE</option>
                <option value="earliest_availability">SORT: EARLIEST DATE</option>
                <option value="lowest_cost">SORT: LOWEST COST</option>
                <option value="shortest_distance">SORT: DISTANCE</option>
              </select>
            </div>
            {activeFilterCount > 0 && (
              <button
                onClick={resetAllFilters}
                className="text-xs font-mono uppercase text-[#854D0E] hover:underline cursor-pointer"
              >
                CLEAR
              </button>
            )}
          </div>
        </div>

        {/* ─── LabLoop Match & Explain Interactive Terminal ─── */}
        {isAiPanelOpen && (
          <div className="pt-4 border-t border-[#DCD9CF] bg-[#F3F0E8] p-4 sm:p-5 border border-[#183D30]/20 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-[#D8FF3E] border border-[#183D30] inline-block"></span>
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#183D30]">
                  AI INTENT PARSER & GROUNDING ENGINE
                </span>
              </div>
              <span className="text-[10px] font-mono text-[#7E8276] uppercase">
                GEMINI 3.8 FLASH × DETERMINISTIC VERIFICATION
              </span>
            </div>

            <div className="relative">
              <textarea
                rows={2}
                value={aiGoalQuery}
                onChange={(e) => setAiGoalQuery(e.target.value)}
                placeholder="State your objective, e.g. 'I need to prototype a sensor circuit and measure voltage signals for a college project.'"
                className="w-full p-3 pr-32 text-xs font-mono bg-[#FCFBF7] border border-[#DCD9CF] focus:outline-hidden focus:border-[#183D30] text-[#252722] resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleRunMatchAndExplain();
                  }
                }}
              />
              <button
                type="button"
                disabled={isAnalyzingAi || !aiGoalQuery.trim()}
                onClick={() => handleRunMatchAndExplain()}
                className="absolute right-2 bottom-3 px-3 py-1.5 bg-[#183D30] hover:bg-[#204e3e] disabled:opacity-50 text-[#D8FF3E] text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer"
              >
                {isAnalyzingAi ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>PARSING...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>SYNTHESIZE</span>
                  </>
                )}
              </button>
            </div>

            {/* Presets */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] font-mono uppercase text-[#7E8276] mr-1">PRESET GOALS:</span>
              {GOAL_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setAiGoalQuery(preset.query);
                    handleRunMatchAndExplain(preset.query);
                  }}
                  className="text-[10px] font-mono px-2 py-1 bg-[#FCFBF7] hover:bg-[#183D30] hover:text-[#D8FF3E] border border-[#DCD9CF] text-[#565950] transition-colors cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* AI Result Synthesis Header */}
            {aiResult && (
              <div className="p-4 bg-[#FCFBF7] border border-[#DCD9CF] space-y-3 font-mono text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#DCD9CF] pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[#7E8276] uppercase">SYNTHESIS:</span>
                    <strong className="text-[#183D30]">{aiResult.intent.intendedTask}</strong>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 bg-[#183D30] text-[#D8FF3E] uppercase font-bold">
                      {aiResult.engineMode === 'gemini_ai' ? 'GEMINI 3.8 AI' : 'DETERMINISTIC FALLBACK'}
                    </span>
                    <button onClick={clearAiResults} className="text-[#7E8276] hover:text-[#252722]">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-[#7E8276] block uppercase">EXTRACTED CONSTRAINTS:</span>
                    <span className="text-[#252722]">
                      {aiResult.intent.extractedConstraints.length > 0
                        ? aiResult.intent.extractedConstraints.join(', ')
                        : 'Standard laboratory operating hours apply.'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#7E8276] block uppercase">TIME HORIZON:</span>
                    <span className="text-[#252722]">
                      {aiResult.intent.requestedTimeWindow || 'Flexible / Advance reservation'}
                    </span>
                  </div>
                </div>

                {aiResult.intent.clarifyingQuestion && (
                  <div className="p-3 bg-[#EAE5D8] border border-[#DCD9CF] space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-[#183D30]">
                      <Lightbulb className="w-3.5 h-3.5" />
                      <span>CLARIFICATION REQUIRED:</span>
                    </div>
                    <p className="text-[11px] text-[#565950] font-sans">
                      {aiResult.intent.clarifyingQuestion}
                    </p>
                    {aiResult.intent.clarifyingOptions && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {aiResult.intent.clarifyingOptions.map((opt, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              const refined = `${aiGoalQuery} - specifically: ${opt}`;
                              setAiGoalQuery(refined);
                              handleRunMatchAndExplain(refined);
                            }}
                            className="text-[10px] font-mono px-2 py-0.5 bg-[#FCFBF7] hover:bg-[#183D30] hover:text-[#D8FF3E] border border-[#DCD9CF] cursor-pointer"
                          >
                            + {opt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* ─── 03 / ASYMMETRIC CATALOGUE & FEATURED SPECIMEN ─── */}
      {aiResult && aiResult.matches.length > 0 ? (
        /* Ranked AI Match Grid */
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#DCD9CF] pb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#183D30]">
                02 / RANKED RECOMMENDATIONS ({aiResult.matches.length})
              </span>
            </div>
            <span className="text-xs font-mono text-[#7E8276]">
              SCORED VIA {aiResult.explanationMethod.toUpperCase()}
            </span>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedAiMatches.map(({ resource, matchScore, suitabilityReason, limitations, isRestricted, restrictionReason, recommendedAlternatives }) => {
              const owner = getUserById(resource.owner_id);
              const category = categories.find((c) => c.id === resource.category_id);
              const hasPendingRequest = myBookings.some((b) => b.resource_id === resource.id && b.status === 'pending');

              return (
                <div 
                  key={resource.id}
                  className="bg-[#FCFBF7] border border-[#DCD9CF] hover:border-[#183D30] transition-colors flex flex-col justify-between"
                >
                  <div>
                    {/* Image Specimen */}
                    <div className="relative h-48 bg-[#252722] overflow-hidden group">
                      <img
                        src={resource.image_url}
                        alt={resource.name}
                        className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300 opacity-90"
                      />
                      <div className="absolute top-2 left-2 flex items-center gap-1.5">
                        <StatusBadge status={resource.status} size="sm" />
                        {hasPendingRequest && (
                          <span className="px-1.5 py-0.2 text-[9px] font-mono font-bold bg-[#183D30] text-[#D8FF3E]">
                            REQUEST PENDING
                          </span>
                        )}
                      </div>
                      <div className="absolute top-2 right-2 px-2 py-0.5 bg-[#183D30] text-[#D8FF3E] font-mono font-bold text-xs">
                        {matchScore}% MATCH
                      </div>
                      <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-[#252722]/80 backdrop-blur-xs text-[10px] font-mono text-[#F3F0E8] uppercase">
                        SPEC: {resource.id.toUpperCase()}
                      </div>
                    </div>

                    {/* Metadata & Editorial Body */}
                    <div className="p-4 space-y-3">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-widest text-[#7E8276]">
                          {category?.name ?? 'EQUIPMENT'} / {resource.institution}
                        </span>
                        <h3 className="text-lg font-display font-bold text-[#252722] mt-0.5 leading-snug">
                          {resource.name}
                        </h3>
                      </div>

                      {/* AI Suitability */}
                      <div className="p-3 bg-[#F3F0E8] border-l-2 border-[#183D30] space-y-1">
                        <div className="text-[10px] font-mono uppercase font-bold text-[#183D30] flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-[#183D30]" />
                          <span>Suitability Assessment:</span>
                        </div>
                        <p className="text-xs text-[#565950] font-sans leading-relaxed">
                          {suitabilityReason}
                        </p>
                      </div>

                      {/* Physical Limitations */}
                      <div className="text-xs space-y-1">
                        <span className="text-[10px] font-mono uppercase text-[#7E8276] block">
                          Constraints & Limitations:
                        </span>
                        <ul className="space-y-0.5 text-[11px] text-[#565950]">
                          {limitations.map((lim, i) => (
                            <li key={i} className="flex items-start gap-1.5 font-mono">
                              <span className="text-[#183D30] font-bold">›</span>
                              <span>{lim}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Safety Qualification */}
                      {isRestricted ? (
                        <div className="p-2 bg-[#EAE5D8] border border-[#DCD9CF] text-[10px] font-mono text-[#854D0E] flex items-center gap-1.5">
                          <ShieldAlert className="w-3.5 h-3.5 text-[#854D0E] shrink-0" />
                          <span>RESTRICTED: {restrictionReason}</span>
                        </div>
                      ) : (
                        <div className="p-1.5 bg-[#183D30]/5 text-[10px] font-mono text-[#183D30] flex items-center gap-1.5 border border-[#183D30]/15">
                          <CheckCircle className="w-3.5 h-3.5 text-[#183D30] shrink-0" />
                          <span>OPERATIONAL PREREQUISITES SATISFIED</span>
                        </div>
                      )}

                      {/* Alternatives if restricted */}
                      {(isRestricted || resource.status !== 'available') && recommendedAlternatives.length > 0 && (
                        <div className="p-2.5 bg-[#F3F0E8] border border-[#DCD9CF] space-y-1 text-xs">
                          <span className="text-[10px] font-mono uppercase font-bold text-[#183D30] block">
                            Recommended Alternatives:
                          </span>
                          {recommendedAlternatives.map((alt) => (
                            <div key={alt.resource_id} className="text-[11px] flex items-center justify-between gap-2 pt-1 border-t border-[#DCD9CF]">
                              <span className="text-[#252722] font-medium truncate">{alt.name}</span>
                              <button
                                onClick={() => navigate(`/resources/${alt.resource_id}`)}
                                className="text-[10px] font-mono text-[#183D30] underline font-bold shrink-0"
                              >
                                INSPECT
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Specs Row */}
                      <div className="pt-2 border-t border-[#DCD9CF] grid grid-cols-2 gap-2 text-[11px] font-mono text-[#565950]">
                        <div className="flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3 text-[#7E8276] shrink-0" />
                          <span className="truncate">{resource.location_building}</span>
                        </div>
                        <div className="flex items-center gap-1 truncate">
                          <Clock className="w-3 h-3 text-[#7E8276] shrink-0" />
                          <span>{resource.walking_minutes}m walk</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Action */}
                  <div className="p-3 bg-[#F3F0E8] border-t border-[#DCD9CF] flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase text-[#7E8276]">
                      {resource.cost_per_hour === 0 ? 'FREE / $0' : `$${resource.cost_per_hour}/HR`}
                    </span>
                    <button
                      onClick={() => navigate(`/resources/${resource.id}`)}
                      className="px-3 py-1.5 bg-[#183D30] hover:bg-[#204e3e] text-[#F3F0E8] hover:text-[#D8FF3E] font-mono text-xs uppercase font-bold transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <span>INSPECT</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : paginatedStandardResources.length === 0 ? (
        /* Empty State */
        <div className="border border-[#DCD9CF] bg-[#FCFBF7] p-12 text-center space-y-3">
          <div className="w-12 h-12 bg-[#F3F0E8] border border-[#DCD9CF] flex items-center justify-center mx-auto text-[#7E8276]">
            <Search className="w-5 h-5" />
          </div>
          <h3 className="font-display font-bold text-lg text-[#252722]">
            No equipment matches current specifications
          </h3>
          <p className="text-xs font-mono text-[#7E8276] max-w-md mx-auto">
            Try adjusting location, safety prerequisites, or launch the natural language AI assistant.
          </p>
          <button
            onClick={resetAllFilters}
            className="mt-2 px-4 py-2 bg-[#183D30] text-[#D8FF3E] font-mono text-xs uppercase font-bold cursor-pointer"
          >
            RESET CATALOG FILTERS
          </button>
        </div>
      ) : (
        /* Standard Catalog Layout */
        <section className="space-y-6">
          
          {/* Featured Large Resource Specimen (Visible on Page 1 unfiltered) */}
          {featuredItem && (
            <div className="border-2 border-[#183D30] bg-[#FCFBF7] overflow-hidden">
              <div className="grid lg:grid-cols-12 gap-0">
                {/* Large Photography */}
                <div className="lg:col-span-7 relative h-72 lg:h-auto min-h-[340px] bg-[#252722] overflow-hidden group">
                  <img
                    src={featuredItem.resource.image_url}
                    alt={featuredItem.resource.name}
                    className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500 opacity-90"
                  />
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-[#D8FF3E] text-[#183D30] font-mono font-bold text-[10px] uppercase">
                      FEATURED SPECIMEN / 01
                    </span>
                    <StatusBadge status={featuredItem.resource.status} size="sm" />
                  </div>
                  <div className="absolute bottom-3 left-3 px-2.5 py-1 bg-[#252722]/90 backdrop-blur-xs text-[11px] font-mono text-[#F3F0E8]">
                    SERIAL: LL-{featuredItem.resource.id.toUpperCase()}-INST
                  </div>
                </div>

                {/* Technical Specifications & Editorial Description */}
                <div className="lg:col-span-5 p-6 lg:p-8 flex flex-col justify-between space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-[#DCD9CF] pb-2">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-[#7E8276]">
                        {featuredItem.resource.institution}
                      </span>
                      <span className="text-xs font-mono font-bold text-[#183D30]">
                        {featuredItem.resource.cost_per_hour === 0 ? 'ACADEMIC SUBSIDIZED ($0/HR)' : `$${featuredItem.resource.cost_per_hour}/HR`}
                      </span>
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-display font-bold text-[#252722] leading-tight">
                      {featuredItem.resource.name}
                    </h2>

                    <p className="text-xs sm:text-sm text-[#565950] font-sans leading-relaxed">
                      {featuredItem.resource.description}
                    </p>

                    {/* Technical Metadata Matrix */}
                    <div className="grid grid-cols-2 gap-2 p-3 bg-[#F3F0E8] border border-[#DCD9CF] text-[11px] font-mono text-[#565950]">
                      <div>
                        <span className="text-[9px] uppercase text-[#7E8276] block">Facility:</span>
                        <span className="text-[#252722] font-bold">{featuredItem.resource.location_building}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase text-[#7E8276] block">Room:</span>
                        <span className="text-[#252722] font-bold">{featuredItem.resource.location_room}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase text-[#7E8276] block">Max Slot:</span>
                        <span className="text-[#252722] font-bold">{featuredItem.resource.max_booking_hours} Hours</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase text-[#7E8276] block">Proximity:</span>
                        <span className="text-[#252722] font-bold">{featuredItem.resource.walking_minutes} min walk</span>
                      </div>
                    </div>

                    {/* Eligibility Badge */}
                    <div className="flex items-center gap-2">
                      {featuredItem.resource.requires_training ? (
                        <span className="text-[10px] font-mono text-[#854D0E] bg-[#EAE5D8] px-2 py-1 border border-[#DCD9CF] uppercase">
                          MANDATORY SAFETY TRAINING REQUIRED
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-[#183D30] bg-[#183D30]/10 px-2 py-1 border border-[#183D30]/20 uppercase font-bold">
                          OPEN TO ALL CERTIFIED STUDENTS & FACULTY
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#DCD9CF] flex items-center justify-between">
                    <span className="text-xs font-mono text-[#7E8276]">
                      CUSTODIAN: <strong className="text-[#252722]">{getUserById(featuredItem.resource.owner_id)?.full_name ?? 'FACULTY STAFF'}</strong>
                    </span>
                    <button
                      onClick={() => navigate(`/resources/${featuredItem.resource.id}`)}
                      className="px-5 py-2.5 bg-[#183D30] hover:bg-[#204e3e] text-[#D8FF3E] font-mono text-xs uppercase font-bold flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <span>RESERVE SPECIMEN</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section Divider */}
          <div className="flex items-center justify-between border-b border-[#DCD9CF] pb-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#183D30]">
              {isDefaultView ? '02 / CATALOGUED INVENTORY LIST' : 'FILTERED RESULTS'} ({gridItems.length})
            </span>
            <span className="text-xs font-mono text-[#7E8276]">
              ORDERED BY SYSTEM RELEVANCE
            </span>
          </div>

          {/* Clean Grid of Catalogued Physical Objects */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {gridItems.map(({ resource, score, explanation }, index) => {
              const owner = getUserById(resource.owner_id);
              const category = categories.find((c) => c.id === resource.category_id);
              const hasPendingRequest = myBookings.some((b) => b.resource_id === resource.id && b.status === 'pending');
              const isExplanationExpanded = expandedExplanationId === resource.id;

              return (
                <div
                  key={resource.id}
                  className="bg-[#FCFBF7] border border-[#DCD9CF] hover:border-[#183D30] transition-colors flex flex-col justify-between"
                >
                  <div>
                    {/* Header Spec Strip */}
                    <div className="px-3 py-1.5 bg-[#F3F0E8] border-b border-[#DCD9CF] flex items-center justify-between text-[10px] font-mono text-[#7E8276]">
                      <span>INV: LL-{resource.id.toUpperCase()}</span>
                      <span className="text-[#183D30] font-bold">{score}% RELEVANCE</span>
                    </div>

                    {/* Rectangular Image Treatment */}
                    <div className="relative h-44 bg-[#252722] overflow-hidden group">
                      <img
                        src={resource.image_url}
                        alt={resource.name}
                        className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300 opacity-90"
                      />
                      <div className="absolute top-2 left-2 flex items-center gap-1.5">
                        <StatusBadge status={resource.status} size="sm" />
                        {hasPendingRequest && (
                          <span className="px-1.5 py-0.2 text-[9px] font-mono font-bold bg-[#183D30] text-[#D8FF3E]">
                            REQUESTED
                          </span>
                        )}
                      </div>
                      <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-[#252722]/85 text-[10px] font-mono text-[#F3F0E8] uppercase">
                        {category?.name ?? 'INSTRUMENT'}
                      </div>
                    </div>

                    {/* Body */}
                    <div className="p-4 space-y-3">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-widest text-[#7E8276]">
                          {resource.institution}
                        </span>
                        <h3 className="text-base font-display font-bold text-[#252722] leading-snug line-clamp-1 mt-0.5">
                          {resource.name}
                        </h3>
                      </div>

                      <p className="text-xs text-[#565950] font-sans line-clamp-2 leading-relaxed">
                        {resource.description}
                      </p>

                      {/* Technical Specs Strip */}
                      <div className="grid grid-cols-2 gap-2 py-2 border-y border-[#DCD9CF] text-[11px] font-mono text-[#565950]">
                        <div className="flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3 text-[#7E8276] shrink-0" />
                          <span className="truncate">{resource.location_building}, {resource.location_room}</span>
                        </div>
                        <div className="flex items-center gap-1 truncate">
                          <Compass className="w-3 h-3 text-[#7E8276] shrink-0" />
                          <span>{resource.walking_minutes}m walk</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#7E8276] shrink-0" />
                          <span>Max {resource.max_booking_hours}h</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[#183D30] font-bold">
                            {resource.cost_per_hour === 0 ? '$0 / FREE' : `$${resource.cost_per_hour}/HR`}
                          </span>
                        </div>
                      </div>

                      {/* Training / Eligibility */}
                      <div>
                        {explanation.isRestricted ? (
                          <div className="p-1.5 bg-[#EAE5D8] border border-[#DCD9CF] text-[10px] font-mono text-[#854D0E] flex items-center gap-1.5">
                            <ShieldAlert className="w-3.5 h-3.5 text-[#854D0E] shrink-0" />
                            <span>ACCESS RESTRICTED: TRAINING REQUIRED</span>
                          </div>
                        ) : (
                          <div className="p-1.5 bg-[#183D30]/5 text-[10px] font-mono text-[#183D30] flex items-center gap-1.5 border border-[#183D30]/15">
                            <CheckCircle className="w-3.5 h-3.5 text-[#183D30] shrink-0" />
                            <span>ELIGIBLE FOR IMMEDIATE USE</span>
                          </div>
                        )}
                      </div>

                      {/* Match explanation toggle */}
                      <div>
                        <button
                          type="button"
                          onClick={() => setExpandedExplanationId(isExplanationExpanded ? null : resource.id)}
                          className="text-[10px] font-mono text-[#183D30] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <span>{isExplanationExpanded ? '[-] HIDE SPEC MATCH' : '[+] VIEW MATCH BREAKDOWN'}</span>
                        </button>
                        {isExplanationExpanded && (
                          <div className="mt-2 p-2.5 bg-[#F3F0E8] border border-[#DCD9CF] text-[10px] font-mono space-y-1.5">
                            <p className="text-[#565950] italic">"{explanation.summaryExplanation}"</p>
                            <div className="space-y-0.5 pt-1 border-t border-[#DCD9CF]">
                              {explanation.matchReasons.map((r, idx) => (
                                <div key={idx} className="text-[#565950] flex items-start gap-1">
                                  <span className="text-[#183D30] font-bold">›</span>
                                  <span>{r}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="p-3 bg-[#F3F0E8] border-t border-[#DCD9CF] flex items-center justify-between">
                    <span className="text-[10px] font-mono text-[#7E8276] truncate max-w-[140px]">
                      {owner?.full_name ?? 'FACULTY'}
                    </span>
                    <button
                      onClick={() => navigate(`/resources/${resource.id}`)}
                      className="px-3 py-1.5 bg-[#183D30] hover:bg-[#204e3e] text-[#F3F0E8] hover:text-[#D8FF3E] font-mono text-xs uppercase font-bold transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <span>INSPECT</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ─── 04 / PAGINATION ─── */}
      {totalPages > 1 && (
        <div className="border border-[#DCD9CF] bg-[#FCFBF7] p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono">
          <div className="text-[#7E8276]">
            SHOWING RECORD <strong className="text-[#252722]">{(validCurrentPage - 1) * pageSize + 1}</strong> TO{' '}
            <strong className="text-[#252722]">{Math.min(validCurrentPage * pageSize, displayedCount)}</strong> OF{' '}
            <strong className="text-[#252722]">{displayedCount}</strong>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={validCurrentPage === 1}
              className="px-2.5 py-1.5 border border-[#DCD9CF] bg-[#F3F0E8] hover:bg-[#DCD9CF] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              PREV
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-7 h-7 text-xs font-mono font-bold transition-colors cursor-pointer border ${
                  validCurrentPage === page
                    ? 'bg-[#183D30] text-[#D8FF3E] border-[#183D30]'
                    : 'bg-[#F3F0E8] hover:bg-[#DCD9CF] text-[#252722] border-[#DCD9CF]'
                }`}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={validCurrentPage === totalPages}
              className="px-2.5 py-1.5 border border-[#DCD9CF] bg-[#F3F0E8] hover:bg-[#DCD9CF] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              NEXT
            </button>
          </div>
        </div>
      )}

      {/* ─── 05 / METHODOLOGY MODAL ─── */}
      {showExplainerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#252722]/60 backdrop-blur-xs">
          <div className="bg-[#FCFBF7] border-2 border-[#183D30] max-w-xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#DCD9CF] pb-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-[#D8FF3E] border border-[#183D30] inline-block"></span>
                <h3 className="font-display font-bold text-base text-[#252722]">
                  LABLOOP MATCHING ARCHITECTURE
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowExplainerModal(false)}
                className="text-[#7E8276] hover:text-[#252722] p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono text-[#565950] leading-relaxed max-h-[60vh] overflow-y-auto pr-1">
              <div className="p-3 bg-[#F3F0E8] border border-[#DCD9CF]">
                <strong className="block text-[#183D30] font-bold mb-1">
                  01 / DETERMINISTIC HARDWARE GROUNDING
                </strong>
                <p>
                  Recommendations are strictly anchored to verified database records registered by certified faculty custodians. Hallucinated or non-existent equipment is structurally excluded.
                </p>
              </div>

              <div className="p-3 bg-[#F3F0E8] border border-[#DCD9CF]">
                <strong className="block text-[#183D30] font-bold mb-1">
                  02 / MANDATORY SAFETY GATING
                </strong>
                <p>
                  High match scores never bypass institutional safety prerequisites. Uncertified users must complete required training modules before reservation checkout can be finalized.
                </p>
              </div>

              <div className="p-3 bg-[#F3F0E8] border border-[#DCD9CF]">
                <strong className="block text-[#183D30] font-bold mb-1">
                  03 / WEIGHTED SCORING CRITERIA
                </strong>
                <p>
                  • Task alignment & technical specs (50%)<br/>
                  • Availability & schedule feasibility (25%)<br/>
                  • Safety compliance & certification (25%)
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-[#DCD9CF] flex justify-end">
              <button
                type="button"
                onClick={() => setShowExplainerModal(false)}
                className="px-4 py-2 bg-[#183D30] text-[#D8FF3E] font-mono text-xs uppercase font-bold cursor-pointer"
              >
                DISMISS SPECIFICATION
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
