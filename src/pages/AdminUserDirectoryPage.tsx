import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Shield, 
  CheckCircle, 
  XCircle, 
  FolderPlus, 
  Edit2, 
  Trash2, 
  Sliders, 
  Search, 
  Building2, 
  Lock, 
  ChevronLeft, 
  ChevronRight, 
  Plus,
  AlertCircle,
  X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { 
  getUsers, 
  updateUser, 
  updateUserRole,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getResources,
  getInstitutionConfig,
  updateInstitutionConfig
} from '../data/store';
import type { UserRole, Category } from '../types';

export const AdminUserDirectoryPage: React.FC = () => {
  const { user: currentUser, refreshUser } = useAuth();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'users' | 'categories' | 'institution' | 'policies'>('users');

  // Feedback states
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Users Filter & Search
  const [users, setUsers] = useState(getUsers());
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [trainingFilter, setTrainingFilter] = useState<'all' | 'certified' | 'uncertified'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 6;

  // Categories State
  const [categories, setCategories] = useState(getCategories());
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catName, setCatName] = useState('');
  const [catDescription, setCatDescription] = useState('');
  const [catIcon, setCatIcon] = useState('Folder');

  // Institution Config Form State
  const config = getInstitutionConfig();
  const [institutionName, setInstitutionName] = useState(config.institution_name);
  const [campusName, setCampusName] = useState(config.campus_name);
  const [contactEmail, setContactEmail] = useState(config.contact_email);
  const [supportPhone, setSupportPhone] = useState(config.support_phone);
  const [institutionReason, setInstitutionReason] = useState('');

  // Access Policy Form State
  const [maxAdvanceDays, setMaxAdvanceDays] = useState(config.max_advance_booking_days);
  const [maxActiveBookings, setMaxActiveBookings] = useState(config.max_active_bookings_per_user);
  const [maxWeeklyHours, setMaxWeeklyHours] = useState(config.max_weekly_hours_per_user);
  const [cancelWindowHours, setCancelWindowHours] = useState(config.default_cancellation_window_hours);
  const [policyReason, setPolicyReason] = useState('');

  const resources = getResources();

  // Unique departments for filter
  const departments = useMemo(() => {
    return Array.from(new Set(users.map((u) => u.department))).filter(Boolean);
  }, [users]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch = 
        u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.student_id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      const matchesDept = deptFilter === 'all' || u.department === deptFilter;
      const matchesTraining = 
        trainingFilter === 'all' ||
        (trainingFilter === 'certified' && u.training_completed) ||
        (trainingFilter === 'uncertified' && !u.training_completed);

      return matchesSearch && matchesRole && matchesDept && matchesTraining;
    });
  }, [users, searchQuery, roleFilter, deptFilter, trainingFilter]);

  // Pagination slice
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage) || 1;
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * usersPerPage;
    return filteredUsers.slice(start, start + usersPerPage);
  }, [filteredUsers, currentPage]);

  // Handlers
  const handleToggleTraining = (targetUserId: string, currentStatus: boolean) => {
    updateUser(targetUserId, { training_completed: !currentStatus });
    setUsers([...getUsers()]);
    setSuccessMsg('Safety training credential updated.');
    refreshUser();
  };

  const handleRoleChange = (targetUserId: string, newRole: UserRole) => {
    if (!currentUser) return;
    setErrorMsg(null);

    const res = updateUserRole(targetUserId, newRole, currentUser.id);
    if ('error' in res) {
      setErrorMsg(res.error);
    } else {
      setSuccessMsg(`Role successfully updated to "${newRole}".`);
      setUsers([...getUsers()]);
      refreshUser();
    }
  };

  const handleToggleActive = (targetUserId: string, currentStatus: boolean) => {
    if (!currentUser) return;
    if (targetUserId === currentUser.id) {
      setErrorMsg('Self-deactivation is strictly forbidden.');
      return;
    }

    updateUser(targetUserId, { is_active: !currentStatus });
    setUsers([...getUsers()]);
    setSuccessMsg(`Account status changed to ${!currentStatus ? 'Active' : 'Deactivated'}.`);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim() || !currentUser) return;

    if (editingCategory) {
      const res = updateCategory(editingCategory.id, {
        name: catName.trim(),
        description: catDescription.trim(),
        icon: catIcon,
      }, currentUser.id);

      if ('error' in res) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg(`Category "${catName}" updated.`);
        setCategories([...getCategories()]);
        setIsCategoryModalOpen(false);
      }
    } else {
      const res = createCategory({
        name: catName.trim(),
        description: catDescription.trim(),
        icon: catIcon,
      }, currentUser.id);

      if ('error' in res) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg(`Category "${catName}" registered in taxonomy.`);
        setCategories([...getCategories()]);
        setIsCategoryModalOpen(false);
      }
    }
  };

  const handleDeleteCategory = (categoryId: string) => {
    if (!currentUser) return;
    const res = deleteCategory(categoryId, currentUser.id);
    if (typeof res === 'object' && 'error' in res) {
      setErrorMsg(res.error);
    } else {
      setSuccessMsg('Category deleted from institutional directory.');
      setCategories([...getCategories()]);
    }
  };

  const handleSaveInstitutionConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!institutionReason || institutionReason.trim().length < 8) {
      setErrorMsg('A valid administrative reason (minimum 8 characters) is required.');
      return;
    }

    const res = updateInstitutionConfig(
      {
        institution_name: institutionName.trim(),
        campus_name: campusName.trim(),
        contact_email: contactEmail.trim(),
        support_phone: supportPhone.trim(),
      },
      currentUser.id,
      institutionReason.trim()
    );

    if ('error' in res) {
      setErrorMsg(res.error);
    } else {
      setSuccessMsg('Institution details updated and logged to audit ledger.');
      setInstitutionReason('');
    }
  };

  const handleSavePolicies = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!policyReason || policyReason.trim().length < 8) {
      setErrorMsg('A formal justification reason (minimum 8 characters) is mandatory.');
      return;
    }

    const res = updateInstitutionConfig(
      {
        max_advance_booking_days: Number(maxAdvanceDays),
        max_active_bookings_per_user: Number(maxActiveBookings),
        max_weekly_hours_per_user: Number(maxWeeklyHours),
        default_cancellation_window_hours: Number(cancelWindowHours),
      },
      currentUser.id,
      policyReason.trim()
    );

    if ('error' in res) {
      setErrorMsg(res.error);
    } else {
      setSuccessMsg('Global access policies updated.');
      setPolicyReason('');
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 font-mono text-xs">
      
      {/* ─── 01 / MASTHEAD ─── */}
      <section className="border-b border-[#DCD9CF] pb-6 pt-2">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#183D30] font-bold bg-[#183D30]/10 px-2.5 py-1 border border-[#183D30]/20">
              CAMPUS DIRECTORY & RBAC / 08
            </span>
            <span className="text-[11px] font-mono text-[#7E8276] uppercase tracking-wider">
              ADMINISTRATIVE CONTROL PLANE
            </span>
          </div>

          <div className="flex items-center gap-2 p-2 bg-[#FCFBF7] border border-[#DCD9CF] text-[11px] text-[#565950]">
            <Lock className="w-3.5 h-3.5 text-[#183D30]" />
            <span className="font-bold text-[#183D30]">SELF-PRIVILEGE ESCALATION LOCK ACTIVE</span>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-[#252722] tracking-tight leading-tight">
              Directory & Access Control
            </h1>
            <p className="mt-2 text-sm text-[#565950] font-sans leading-relaxed max-w-xl">
              Role assignments, privilege boundary enforcement, taxonomy category definitions, and institutional parameters.
            </p>
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
          <button onClick={() => setSuccessMsg(null)} className="text-[#D8FF3E] hover:underline cursor-pointer uppercase">
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
          <button onClick={() => setErrorMsg(null)} className="text-[#854D0E] hover:underline cursor-pointer uppercase">
            DISMISS
          </button>
        </div>
      )}

      {/* ─── 02 / NAVIGATION TABS ─── */}
      <div className="flex border-b border-[#DCD9CF] gap-1 overflow-x-auto text-xs font-mono font-bold uppercase tracking-wider">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-3 border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap transition-colors ${
            activeTab === 'users' 
              ? 'border-[#183D30] text-[#183D30] bg-[#183D30]/5' 
              : 'border-transparent text-[#7E8276] hover:text-[#252722]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>USER ACCOUNTS ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          className={`px-4 py-3 border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap transition-colors ${
            activeTab === 'categories' 
              ? 'border-[#183D30] text-[#183D30] bg-[#183D30]/5' 
              : 'border-transparent text-[#7E8276] hover:text-[#252722]'
          }`}
        >
          <FolderPlus className="w-4 h-4" />
          <span>TAXONOMY CATEGORIES ({categories.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('institution')}
          className={`px-4 py-3 border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap transition-colors ${
            activeTab === 'institution' 
              ? 'border-[#183D30] text-[#183D30] bg-[#183D30]/5' 
              : 'border-transparent text-[#7E8276] hover:text-[#252722]'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>INSTITUTION CONFIG</span>
        </button>

        <button
          onClick={() => setActiveTab('policies')}
          className={`px-4 py-3 border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap transition-colors ${
            activeTab === 'policies' 
              ? 'border-[#183D30] text-[#183D30] bg-[#183D30]/5' 
              : 'border-transparent text-[#7E8276] hover:text-[#252722]'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>POLICY CONTROLS</span>
        </button>
      </div>

      {/* ─── TAB 1: User Accounts & RBAC ─── */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-[#FCFBF7] p-4 border border-[#DCD9CF] flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-[#7E8276] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search name, email, or student ID..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722] focus:outline-hidden focus:border-[#183D30]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="bg-[#F3F0E8] border border-[#DCD9CF] px-3 py-2 text-[#252722] uppercase focus:outline-hidden cursor-pointer"
              >
                <option value="all">ALL ROLES</option>
                <option value="borrower">BORROWERS</option>
                <option value="owner">RESOURCE OWNERS</option>
                <option value="manager">MANAGERS</option>
                <option value="admin">ADMINISTRATORS</option>
              </select>

              <select
                value={deptFilter}
                onChange={(e) => {
                  setDeptFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-[#F3F0E8] border border-[#DCD9CF] px-3 py-2 text-[#252722] uppercase focus:outline-hidden cursor-pointer"
              >
                <option value="all">ALL DEPARTMENTS</option>
                {departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              <select
                value={trainingFilter}
                onChange={(e) => {
                  setTrainingFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="bg-[#F3F0E8] border border-[#DCD9CF] px-3 py-2 text-[#252722] uppercase focus:outline-hidden cursor-pointer"
              >
                <option value="all">ALL CREDENTIALS</option>
                <option value="certified">CERTIFIED ONLY</option>
                <option value="uncertified">UNCERTIFIED</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-[#FCFBF7] border border-[#DCD9CF] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#F3F0E8] border-b border-[#DCD9CF] text-[#7E8276] uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-5 py-3 font-bold">USER IDENTITY</th>
                    <th className="px-5 py-3 font-bold">DEPARTMENT & ID</th>
                    <th className="px-5 py-3 font-bold">ROLE ASSIGNMENT</th>
                    <th className="px-5 py-3 font-bold">SAFETY TRAINING</th>
                    <th className="px-5 py-3 font-bold">ACCOUNT</th>
                    <th className="px-5 py-3 font-bold text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DCD9CF]">
                  {paginatedUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-[#7E8276]">
                        No matching user accounts found.
                      </td>
                    </tr>
                  ) : (
                    paginatedUsers.map((u) => {
                      const isSelf = u.id === currentUser?.id;
                      return (
                        <tr key={u.id} className="hover:bg-[#F3F0E8]/50 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-[#183D30] text-[#D8FF3E] font-bold flex items-center justify-center shrink-0">
                                {u.full_name.charAt(0)}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <strong className="text-[#252722] font-bold">{u.full_name}</strong>
                                  {isSelf && (
                                    <span className="text-[9px] bg-[#D8FF3E] text-[#183D30] px-1.5 py-0.2 font-bold uppercase">
                                      YOU
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-[#565950] font-mono">{u.email}</span>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="text-[#252722] font-bold">{u.department}</div>
                            <span className="text-[10px] text-[#7E8276]">{u.student_id}</span>
                          </td>

                          <td className="px-5 py-4">
                            {isSelf ? (
                              <div className="flex items-center gap-1.5 text-xs text-[#565950]">
                                <Lock className="w-3.5 h-3.5 text-[#183D30]" />
                                <span className="uppercase font-bold text-[#183D30]">{u.role}</span>
                                <span className="text-[10px] text-[#7E8276]">(LOCKED)</span>
                              </div>
                            ) : (
                              <select
                                value={u.role}
                                onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                                className="bg-[#F3F0E8] border border-[#DCD9CF] px-2.5 py-1 text-xs text-[#252722] uppercase focus:outline-hidden cursor-pointer"
                              >
                                <option value="borrower">Borrower</option>
                                <option value="owner">Resource Owner</option>
                                <option value="manager">Institution Manager</option>
                                <option value="admin">Administrator</option>
                              </select>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            {u.training_completed ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#183D30] bg-[#183D30]/10 px-2 py-0.5 border border-[#183D30]/20 uppercase">
                                <CheckCircle className="w-3 h-3 text-[#183D30]" />
                                CERTIFIED
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#854D0E] bg-[#EAE5D8] px-2 py-0.5 border border-[#DCD9CF] uppercase">
                                <XCircle className="w-3 h-3 text-[#854D0E]" />
                                UNCERTIFIED
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <button
                              type="button"
                              disabled={isSelf}
                              onClick={() => handleToggleActive(u.id, u.is_active)}
                              className={`text-[10px] font-bold px-2 py-0.5 uppercase cursor-pointer ${
                                u.is_active ? 'bg-[#183D30] text-[#D8FF3E]' : 'bg-[#DCD9CF] text-[#7E8276]'
                              } disabled:cursor-not-allowed`}
                            >
                              {u.is_active ? 'ACTIVE' : 'DEACTIVATED'}
                            </button>
                          </td>

                          <td className="px-5 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleToggleTraining(u.id, u.training_completed)}
                              className="px-2.5 py-1 text-[10px] font-bold uppercase text-[#183D30] bg-[#183D30]/10 hover:bg-[#183D30]/20 border border-[#183D30]/20 transition-colors cursor-pointer"
                            >
                              TOGGLE TRAINING
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-4 border-t border-[#DCD9CF] flex items-center justify-between text-xs font-mono text-[#565950]">
              <span>SHOWING {paginatedUsers.length} OF {filteredUsers.length} USERS</span>
              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="p-1 border border-[#DCD9CF] hover:bg-[#F3F0E8] disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-bold text-[#252722]">PAGE {currentPage} OF {totalPages}</span>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="p-1 border border-[#DCD9CF] hover:bg-[#F3F0E8] disabled:opacity-40 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: Resource Categories ─── */}
      {activeTab === 'categories' && (
        <div className="bg-[#FCFBF7] border border-[#DCD9CF] overflow-hidden">
          <div className="p-6 border-b border-[#DCD9CF] flex items-center justify-between">
            <div>
              <span className="text-[10px] text-[#7E8276] uppercase tracking-wider block">TAXONOMY CLASSIFICATION</span>
              <h2 className="font-display text-base font-bold text-[#252722] mt-0.5">
                Equipment & Space Categories ({categories.length})
              </h2>
              <p className="text-xs font-sans text-[#565950] mt-0.5">Add, edit, or safely retire catalog classification groups.</p>
            </div>
            <button
              onClick={() => {
                setEditingCategory(null);
                setCatName('');
                setCatDescription('');
                setCatIcon('Folder');
                setIsCategoryModalOpen(true);
              }}
              className="px-4 py-2 bg-[#183D30] hover:bg-[#204e3e] text-[#D8FF3E] font-bold uppercase text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ADD CATEGORY</span>
            </button>
          </div>

          <div className="divide-y divide-[#DCD9CF]">
            {categories.map((cat) => {
              const assignedCount = resources.filter((r) => r.category_id === cat.id).length;

              return (
                <div key={cat.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <strong className="text-sm font-display font-bold text-[#252722]">{cat.name}</strong>
                      <span className="text-[10px] px-2 py-0.5 bg-[#183D30]/10 border border-[#183D30]/20 text-[#183D30] font-bold uppercase">
                        {assignedCount} SPECIMEN(S) ASSIGNED
                      </span>
                    </div>
                    <p className="text-xs font-sans text-[#565950]">{cat.description}</p>
                    <span className="text-[10px] text-[#7E8276]">ID: {cat.id} • ICON: {cat.icon}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingCategory(cat);
                        setCatName(cat.name);
                        setCatDescription(cat.description);
                        setCatIcon(cat.icon);
                        setIsCategoryModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-[#F3F0E8] border border-[#DCD9CF] hover:bg-[#DCD9CF] text-[#252722] uppercase font-bold text-[11px] cursor-pointer flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>EDIT</span>
                    </button>

                    <button
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="px-3 py-1.5 bg-[#F3F0E8] border border-[#DCD9CF] hover:bg-[#EAE5D8] text-[#854D0E] uppercase font-bold text-[11px] cursor-pointer flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>DELETE</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── TAB 3: Institution Config ─── */}
      {activeTab === 'institution' && (
        <div className="bg-[#FCFBF7] border border-[#DCD9CF] p-6 space-y-6">
          <div className="border-b border-[#DCD9CF] pb-3">
            <span className="text-[10px] text-[#7E8276] uppercase tracking-wider block">ORGANIZATIONAL PROFILE</span>
            <h2 className="font-display text-base font-bold text-[#252722] mt-0.5">
              Campus Identity & Operating Entity
            </h2>
            <p className="text-xs font-sans text-[#565950] mt-0.5">Configure university affiliation, primary campus facility labels, and support communications.</p>
          </div>

          <form onSubmit={handleSaveInstitutionConfig} className="space-y-4 max-w-xl font-mono text-xs">
            <div>
              <label className="block text-[10px] uppercase text-[#7E8276] mb-1 font-bold">INSTITUTION NAME</label>
              <input
                type="text"
                required
                value={institutionName}
                onChange={(e) => setInstitutionName(e.target.value)}
                className="w-full p-2.5 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722] focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase text-[#7E8276] mb-1 font-bold">CAMPUS HUB NAME</label>
              <input
                type="text"
                required
                value={campusName}
                onChange={(e) => setCampusName(e.target.value)}
                className="w-full p-2.5 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722] focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase text-[#7E8276] mb-1 font-bold">CONTACT EMAIL</label>
                <input
                  type="email"
                  required
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full p-2.5 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-[#7E8276] mb-1 font-bold">SUPPORT PHONE</label>
                <input
                  type="text"
                  required
                  value={supportPhone}
                  onChange={(e) => setSupportPhone(e.target.value)}
                  className="w-full p-2.5 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722] focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase text-[#7E8276] mb-1 font-bold">
                ADMINISTRATIVE REASON FOR CHANGE <span className="text-[#854D0E]">*</span>
              </label>
              <textarea
                rows={2}
                required
                value={institutionReason}
                onChange={(e) => setInstitutionReason(e.target.value)}
                placeholder="Reason for adjusting campus contact parameters (logged in immutable audit ledger)..."
                className="w-full p-2.5 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722] focus:outline-hidden"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#183D30] hover:bg-[#204e3e] text-[#D8FF3E] font-bold uppercase cursor-pointer"
              >
                SAVE IDENTITY SETTINGS
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─── TAB 4: Policies ─── */}
      {activeTab === 'policies' && (
        <div className="bg-[#FCFBF7] border border-[#DCD9CF] p-6 space-y-6">
          <div className="border-b border-[#DCD9CF] pb-3">
            <span className="text-[10px] text-[#7E8276] uppercase tracking-wider block">BORROWER CONSTRAINTS</span>
            <h2 className="font-display text-base font-bold text-[#252722] mt-0.5">
              Campus Access Policy & Quota Controls
            </h2>
            <p className="text-xs font-sans text-[#565950] mt-0.5">Global limits applied across student accounts for equipment checkout.</p>
          </div>

          <form onSubmit={handleSavePolicies} className="space-y-4 max-w-xl font-mono text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase text-[#7E8276] mb-1 font-bold">MAX ADVANCE BOOKING (DAYS)</label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={maxAdvanceDays}
                  onChange={(e) => setMaxAdvanceDays(Number(e.target.value))}
                  className="w-full p-2.5 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-[#7E8276] mb-1 font-bold">MAX ACTIVE BOOKINGS</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={maxActiveBookings}
                  onChange={(e) => setMaxActiveBookings(Number(e.target.value))}
                  className="w-full p-2.5 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-[#7E8276] mb-1 font-bold">MAX WEEKLY HOURS</label>
                <input
                  type="number"
                  min="5"
                  max="80"
                  value={maxWeeklyHours}
                  onChange={(e) => setMaxWeeklyHours(Number(e.target.value))}
                  className="w-full p-2.5 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-[#7E8276] mb-1 font-bold">CANCELLATION WINDOW (HRS)</label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={cancelWindowHours}
                  onChange={(e) => setCancelWindowHours(Number(e.target.value))}
                  className="w-full p-2.5 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722] focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase text-[#7E8276] mb-1 font-bold">
                ADMINISTRATIVE DECISION RATIONALE <span className="text-[#854D0E]">*</span>
              </label>
              <textarea
                rows={2}
                required
                value={policyReason}
                onChange={(e) => setPolicyReason(e.target.value)}
                placeholder="Reason for modifying institutional access constraints..."
                className="w-full p-2.5 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722] focus:outline-hidden"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#183D30] hover:bg-[#204e3e] text-[#D8FF3E] font-bold uppercase cursor-pointer"
              >
                UPDATE ACCESS POLICIES
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─── Add / Edit Category Modal ─── */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#252722]/70 backdrop-blur-xs font-mono text-xs">
          <div className="bg-[#FCFBF7] border border-[#DCD9CF] max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#DCD9CF]">
              <div>
                <span className="text-[10px] text-[#7E8276] uppercase block">TAXONOMY CONFIGURATION</span>
                <h3 className="font-display text-base font-bold text-[#252722]">
                  {editingCategory ? 'Edit Taxonomy Category' : 'Create New Category'}
                </h3>
              </div>
              <button onClick={() => setIsCategoryModalOpen(false)} className="text-[#7E8276] hover:text-[#252722] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-3">
              <div>
                <label className="block text-[10px] uppercase text-[#7E8276] mb-1 font-bold">CATEGORY NAME</label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="e.g. Chemical Analysis & Spectrometry"
                  className="w-full p-2.5 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-[#7E8276] mb-1 font-bold">DESCRIPTION</label>
                <textarea
                  rows={2}
                  required
                  value={catDescription}
                  onChange={(e) => setCatDescription(e.target.value)}
                  placeholder="Equipment classification scope..."
                  className="w-full p-2.5 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-[#7E8276] mb-1 font-bold">ICON IDENTIFIER</label>
                <select
                  value={catIcon}
                  onChange={(e) => setCatIcon(e.target.value)}
                  className="w-full p-2.5 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722] focus:outline-hidden"
                >
                  <option value="Activity">Activity (Test & Measurement)</option>
                  <option value="Printer">Printer (3D Fabrication)</option>
                  <option value="Monitor">Monitor (Computing & GPU)</option>
                  <option value="Camera">Camera (Imaging & Optics)</option>
                  <option value="DoorOpen">DoorOpen (Rooms & Spaces)</option>
                  <option value="Cpu">Cpu (Prototyping & Circuits)</option>
                  <option value="Wrench">Wrench (Mechanical Tools)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-[#DCD9CF] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 bg-[#F3F0E8] border border-[#DCD9CF] hover:bg-[#DCD9CF] text-[#252722] uppercase font-bold cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#183D30] hover:bg-[#204e3e] text-[#D8FF3E] uppercase font-bold cursor-pointer"
                >
                  {editingCategory ? 'SAVE CHANGES' : 'CREATE CATEGORY'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
