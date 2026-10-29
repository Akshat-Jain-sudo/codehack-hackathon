import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Layers, 
  ArrowRight, 
  UserCheck, 
  AlertCircle, 
  Mail, 
  CheckCircle2, 
  RotateCw, 
  KeyRound, 
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { DEMO_ACCOUNTS } from '../data/seed';
import type { UserRole } from '../types';

export const AuthPage: React.FC = () => {
  const { login, register, verifyEmail, resendVerification, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [isRegister, setIsRegister] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyEmailAddress, setVerifyEmailAddress] = useState('');
  const [verificationCodeInput, setVerificationCodeInput] = useState('');
  
  // Registration & Login Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('borrower');
  const [department, setDepartment] = useState('Electrical Engineering');
  const [studentId, setStudentId] = useState('');

  // Async & UI Feedback State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Auto-redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // Handle URL token verification (e.g. from clicking email link)
  useEffect(() => {
    const mode = searchParams.get('mode');
    const emailParam = searchParams.get('email');
    const tokenParam = searchParams.get('token');

    if (mode === 'verify' && emailParam && tokenParam) {
      setVerifyEmailAddress(emailParam);
      setIsVerifying(true);
      const res = verifyEmail(emailParam, tokenParam);
      if (res.success) {
        setStatusMessage('Identity confirmed via verification link! Entering portal...');
        setTimeout(() => navigate('/dashboard'), 1200);
      } else {
        setError(res.error || 'The verification link has expired or is invalid.');
      }
    }
  }, [searchParams, verifyEmail, navigate]);

  // Handle Resend cooldown counter
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatusMessage(null);
    setIsSubmitting(true);

    try {
      if (isRegister) {
        if (!email || !password || !fullName || !studentId) {
          setError('Please complete all required fields.');
          setIsSubmitting(false);
          return;
        }

        const res = await register({
          email,
          password,
          full_name: fullName,
          role,
          department,
          student_id: studentId,
        });

        if (res.requireVerification) {
          setVerifyEmailAddress(email);
          setIsVerifying(true);
          setResendCooldown(30);

          if (res.error) {
            setError(res.error);
          } else {
            setStatusMessage(`Verification pass code dispatched to ${email}. Check your inbox!`);
          }
        } else if (res.success) {
          navigate('/dashboard');
        } else {
          setError(res.error || 'Registration failed.');
        }
      } else {
        if (!email || !password) {
          setError('Please enter your email and password.');
          setIsSubmitting(false);
          return;
        }

        const res = login(email, password);
        if (res.requireVerification) {
          setVerifyEmailAddress(email);
          setIsVerifying(true);
          setError(res.error || 'Passport activation pending: Please verify your email.');
        } else if (res.success) {
          navigate('/dashboard');
        } else {
          setError(res.error || 'Login failed.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatusMessage(null);

    if (!verificationCodeInput.trim()) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    const res = verifyEmail(verifyEmailAddress, verificationCodeInput.trim());
    if (res.success) {
      setStatusMessage('Identity verified! Redirecting to research portal...');
      setTimeout(() => navigate('/dashboard'), 1000);
    } else {
      setError(res.error || 'Invalid code. Please double-check the code sent to your email.');
    }
  };

  const handleResendEmail = async () => {
    if (resendCooldown > 0 || isResending) return;
    setError(null);
    setStatusMessage(null);
    setIsResending(true);

    try {
      const res = await resendVerification(verifyEmailAddress);
      if (res.success) {
        setResendCooldown(60);
        if (res.error) {
          setError(res.error);
        } else {
          setStatusMessage(`A fresh verification pass code has been dispatched to ${verifyEmailAddress}! Check your inbox.`);
        }
      } else {
        setError(res.error || 'Failed to resend email.');
      }
    } catch (err: any) {
      setError(err.message || 'Unable to communicate with Resend service.');
    } finally {
      setIsResending(false);
    }
  };

  const handleQuickLogin = (demoEmail: string) => {
    setError(null);
    setStatusMessage(null);
    setIsVerifying(false);
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
    <div className="min-h-screen bg-[#F3F0E8] text-[#252722] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      
      {/* Top Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3">
        <div className="inline-flex items-center gap-2.5 p-2 bg-[#183D30] text-[#D8FF3E]">
          <Layers className="w-5 h-5 stroke-[2.5]" />
          <span className="font-display font-bold text-sm tracking-widest uppercase">LABLOOP // ACCESS GATE 00</span>
        </div>
        
        <div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-[#252722] tracking-tight">
            {isVerifying ? 'Email Verification' : 'Institutional Access'}
          </h1>
          <p className="mt-1 text-xs font-mono uppercase tracking-wider text-[#7E8276]">
            {typeof window !== 'undefined' ? window.location.host : 'dura-loop.vercel.app'} • Shared Research Equipment Network
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-[#FCFBF7] border border-[#DCD9CF] shadow-xs overflow-hidden font-mono text-xs">
          
          {/* Quick Demo Switcher Strip (Only shown when not verifying) */}
          {!isVerifying && (
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
          )}

          <div className="p-6 sm:p-8 space-y-5">
            {/* Feedback Notifications */}
            {error && (
              <div className="p-3 bg-[#F2DEDE] border border-[#E8B4B8] flex items-start gap-2.5 text-xs text-[#842029]">
                <AlertCircle className="w-4 h-4 text-[#842029] shrink-0 mt-0.5" />
                <span className="font-mono">{error}</span>
              </div>
            )}

            {statusMessage && (
              <div className="p-3 bg-[#183D30]/10 border border-[#183D30]/30 flex items-start gap-2.5 text-xs text-[#183D30] font-bold">
                <CheckCircle2 className="w-4 h-4 text-[#183D30] shrink-0 mt-0.5" />
                <span className="font-mono">{statusMessage}</span>
              </div>
            )}

            {/* ─── SCENARIO A: RESEND EMAIL VERIFICATION STEP ─── */}
            {isVerifying ? (
              <form onSubmit={handleVerifySubmit} className="space-y-4 font-mono text-xs">
                <div className="p-3.5 bg-[#F3F0E8] border border-[#DCD9CF] space-y-2">
                  <div className="flex items-center gap-2 text-[#183D30] font-bold uppercase tracking-wide">
                    <Mail className="w-4 h-4 text-[#183D30]" />
                    <span>VERIFICATION EMAIL DISPATCHED</span>
                  </div>
                  <p className="text-xs text-[#565950] leading-relaxed">
                    A secure 6-digit access pass code has been routed to:
                  </p>
                  <p className="text-xs font-bold text-[#252722] bg-[#FCFBF7] p-2 border border-[#DCD9CF] truncate">
                    {verifyEmailAddress}
                  </p>
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-[#7E8276] mb-1 font-bold">
                    ENTER 6-DIGIT PASS CODE
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-[#7E8276] absolute left-3 top-3" />
                    <input
                      type="text"
                      maxLength={6}
                      autoFocus
                      value={verificationCodeInput}
                      onChange={(e) => setVerificationCodeInput(e.target.value.replace(/[^0-9]/g, ''))}
                      required
                      placeholder="123456"
                      className="w-full pl-9 pr-3 py-2.5 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722] font-mono text-lg font-bold tracking-widest text-center focus:outline-hidden focus:border-[#183D30]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-[#183D30] hover:bg-[#204e3e] text-[#D8FF3E] font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>CONFIRM CODE & ACTIVATE PASSPORT</span>
                </button>

                <div className="flex items-center justify-between pt-3 border-t border-[#DCD9CF] text-[11px]">
                  <button
                    type="button"
                    onClick={handleResendEmail}
                    disabled={resendCooldown > 0 || isResending}
                    className="text-[#183D30] font-bold uppercase flex items-center gap-1 hover:underline disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <RotateCw className={`w-3 h-3 ${isResending ? 'animate-spin' : ''}`} />
                    <span>
                      {resendCooldown > 0 ? `Resend Code (${resendCooldown}s)` : 'Resend Code'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsVerifying(false);
                      setError(null);
                      setStatusMessage(null);
                    }}
                    className="text-[#7E8276] hover:text-[#252722] uppercase underline cursor-pointer"
                  >
                    Change Email / Sign In
                  </button>
                </div>
              </form>
            ) : (
              /* ─── SCENARIO B: LOGIN / REGISTRATION FORM ─── */
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
                    placeholder="e.g. yourname@university.edu"
                    className="w-full p-2.5 bg-[#F3F0E8] border border-[#DCD9CF] text-[#252722] focus:outline-hidden focus:border-[#183D30]"
                  />
                  {isRegister && (
                    <span className="text-[10px] text-[#7E8276] mt-0.5 block">
                      A real verification code will be sent to this address via Resend.
                    </span>
                  )}
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
                  disabled={isSubmitting}
                  className="w-full py-3 bg-[#183D30] hover:bg-[#204e3e] text-[#D8FF3E] font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin" />
                      <span>{isRegister ? 'DISPATCHING RESEND VERIFICATION...' : 'AUTHENTICATING...'}</span>
                    </>
                  ) : (
                    <>
                      <span>{isRegister ? 'REGISTER & SEND VERIFICATION EMAIL' : 'AUTHENTICATE ACCESS PASS'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Toggle Between Login & Register */}
            {!isVerifying && (
              <div className="pt-4 border-t border-[#DCD9CF] flex items-center justify-between text-[11px] text-[#565950]">
                <span>
                  {isRegister ? 'Already registered on campus?' : 'New student or researcher?'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(!isRegister);
                    setError(null);
                    setStatusMessage(null);
                  }}
                  className="text-[#183D30] font-bold uppercase hover:underline cursor-pointer"
                >
                  {isRegister ? '← RETURN TO LOGIN' : 'REGISTER PROFILE →'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 text-center text-[10px] font-mono text-[#7E8276] uppercase tracking-widest space-y-1">
        <div>APEX RESEARCH NETWORK • VERIFIED IMMUTABLE ACCESS LEDGER</div>
        <div className="text-[9px] text-[#AAB6A1]">POWERED BY RESEND EMAIL INFRASTRUCTURE • SECURED ACCESS GATEWAY</div>
      </div>
    </div>
  );
};
