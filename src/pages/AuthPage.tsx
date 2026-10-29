import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, ArrowRight, UserCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { DEMO_ACCOUNTS } from '../data/seed';
import type { UserRole } from '../types';

export const AuthPage: React.FC = () => {
  const { login, register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('demo123');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('borrower');
  const [department, setDepartment] = useState('Electrical Engineering');
  const [studentId, setStudentId] = useState('');
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isRegister) {
      if (!email || !password || !fullName || !studentId) {
        setError('Please complete all required fields.');
        return;
      }
      const res = register({
        email,
        password,
        full_name: fullName,
        role,
        department,
        student_id: studentId,
      });
      if (res.success) {
        navigate('/dashboard');
      } else {
        setError(res.error || 'Registration failed.');
      }
    } else {
      if (!email || !password) {
        setError('Please enter your email and password.');
        return;
      }
      const res = login(email, password);
      if (res.success) {
        navigate('/dashboard');
      } else {
        setError(res.error || 'Login failed.');
      }
    }
  };

  const handleQuickLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('demo123');
    const res = login(demoEmail, 'demo123');
    if (res.success) {
      navigate('/dashboard');
    } else {
      setError(res.error || 'Login failed.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F0E8] text-[#252722] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-[#D8FF3E] selection:text-[#183D30]">
      
      {/* Top Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3">
        <div className="inline-flex items-center gap-2.5 p-2 bg-[#183D30] text-[#D8FF3E]">
          <Layers className="w-5 h-5 stroke-[2.5]" />
          <span className="font-display font-bold text-sm tracking-widest uppercase">LABLOOP // ACCESS GATE 00</span>
        </div>
        
        <div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-[#252722] tracking-tight">
            Institutional Access
          </h1>
          <p className="mt-1 text-xs font-mono uppercase tracking-wider text-[#7E8276]">
            Shared Research Equipment Network
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-[#FCFBF7] border border-[#DCD9CF] shadow-xs overflow-hidden font-mono text-xs">
          
          {/* Quick Demo Switcher Strip */}
          <div className="bg-[#F3F0E8] border-b border-[#DCD9CF] p-4 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-[#565950] uppercase font-bold tracking-wider">
              <span className="flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-[#183D30]" />
                <span>INSTANT DEMO PROFILES (1-CLICK ACCESS):</span>
              </span>
              <span className="text-[10px] text-[#7E8276]">DEV / TEST</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleQuickLogin(acc.email)}
                  className="p-2 text-left bg-[#FCFBF7] border border-[#DCD9CF] hover:border-[#183D30] hover:bg-[#183D30] hover:text-[#D8FF3E] transition-all text-xs group cursor-pointer"
                >
                  <span className="font-bold block truncate">
                    {acc.email.split('@')[0].replace('.', ' ')}
                  </span>
                  <span className="text-[10px] text-[#7E8276] group-hover:text-[#AAB6A1] block truncate uppercase">
                    {acc.role}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-5">
            {error && (
              <div className="p-3 bg-[#EAE5D8] border border-[#DCD9CF] flex items-start gap-2.5 text-xs text-[#854D0E]">
                <AlertCircle className="w-4 h-4 text-[#854D0E] shrink-0 mt-0.5" />
                <span className="font-mono">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
              {isRegister && (
                <>
                  <div>
                    <label className="block text-[10px] uppercase text-[#7E8276] mb-1 font-bold">
                      FULL NAME
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      placeholder="e.g. Maya Patel"
                      className="w-full p-2.5 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722] focus:outline-hidden focus:border-[#183D30]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase text-[#7E8276] mb-1 font-bold">
                        CAMPUS ROLE
                      </label>
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value as UserRole)}
                        className="w-full p-2.5 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722] uppercase focus:outline-hidden"
                      >
                        <option value="borrower">Borrower (Student / Postdoc)</option>
                        <option value="owner">Equipment Owner (Lab Staff)</option>
                        <option value="manager">Campus Manager (Facilities)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase text-[#7E8276] mb-1 font-bold">
                        INSTITUTIONAL ID
                      </label>
                      <input
                        type="text"
                        value={studentId}
                        onChange={(e) => setStudentId(e.target.value)}
                        required
                        placeholder="e.g. STU-98441"
                        className="w-full p-2.5 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722] focus:outline-hidden focus:border-[#183D30]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase text-[#7E8276] mb-1 font-bold">
                      ACADEMIC DEPARTMENT
                    </label>
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full p-2.5 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722] focus:outline-hidden"
                    >
                      <option value="Electrical Engineering">Electrical Engineering</option>
                      <option value="Mechanical & Mechatronics">Mechanical & Mechatronics</option>
                      <option value="Computer Science & AI">Computer Science & AI</option>
                      <option value="Physics & Materials Science">Physics & Materials Science</option>
                      <option value="Bioengineering & Chemistry">Bioengineering & Chemistry</option>
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="block text-[10px] uppercase text-[#7E8276] mb-1 font-bold">
                  CAMPUS EMAIL ADDRESS
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="e.g. alex.chen@apex.edu"
                  className="w-full p-2.5 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722] focus:outline-hidden focus:border-[#183D30]"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-[#7E8276] mb-1 font-bold">
                  PASSWORD
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full p-2.5 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722] focus:outline-hidden focus:border-[#183D30]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#183D30] hover:bg-[#204e3e] text-[#D8FF3E] font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <span>{isRegister ? 'CREATE INSTITUTIONAL PASSPORT' : 'AUTHENTICATE ACCESS PASS'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="pt-4 border-t border-[#DCD9CF] flex items-center justify-between text-[11px] text-[#565950]">
              <span>
                {isRegister ? 'Already registered on campus?' : 'New student or researcher?'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsRegister(!isRegister);
                  setError(null);
                }}
                className="text-[#183D30] font-bold uppercase hover:underline cursor-pointer"
              >
                {isRegister ? '← RETURN TO LOGIN' : 'REGISTER PROFILE →'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center text-[10px] font-mono text-[#7E8276] uppercase tracking-widest">
        APEX RESEARCH NETWORK • VERIFIED IMMUTABLE ACCESS LEDGER
      </div>
    </div>
  );
};
