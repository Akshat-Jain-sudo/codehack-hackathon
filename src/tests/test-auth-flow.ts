class LocalStorageMock {
  private store: Record<string, string> = {};
  getItem(key: string): string | null {
    return this.store[key] ?? null;
  }
  setItem(key: string, value: string): void {
    this.store[key] = value;
  }
  removeItem(key: string): void {
    delete this.store[key];
  }
  clear(): void {
    this.store = {};
  }
}

if (typeof (globalThis as any).localStorage === 'undefined') {
  (globalThis as any).localStorage = new LocalStorageMock();
}

import { createUser, getUserByEmail, verifyUserEmail, setUserVerificationDetails } from '../data/store';
import { initializeStoreIfEmpty } from '../data/seed';
import handler from '../../api/auth/send-verification';

async function runAuthFlowVerification() {
  console.log('======================================================');
  console.log('Testing Resend Email Verification & Authentication Flow');
  console.log('======================================================\n');

  initializeStoreIfEmpty();

  // Test 1: User Registration creates user with email_verified: false
  console.log('Test 1: Register user with verification requirement...');
  const testEmail = `tester.${Date.now()}@apex.edu`;
  const initialCode = '482910';
  const initialToken = `token_${Date.now()}`;

  const newUser = createUser({
    email: testEmail,
    full_name: 'Dr. Test Subject',
    role: 'borrower',
    department: 'Electrical Engineering',
    student_id: 'TEST-EE-001',
    training_completed: false,
    is_active: true,
    email_verified: false,
    verification_code: initialCode,
    verification_token: initialToken,
    verification_sent_at: new Date().toISOString(),
    password_hash: 'Password123!',
  });

  if (newUser.email_verified !== false) {
    throw new Error('FAIL: New user must start with email_verified: false');
  }
  console.log('  ✓ PASS: New user registered with email_verified: false');

  // Test 2: Serverless Resend API endpoint contract
  console.log('\nTest 2: Serverless API endpoint validation (/api/auth/send-verification)...');
  
  // Test 2a: Missing email/code returns 400
  let statusCode: number = 0;
  let responseData: any = null;
  const mockRes = {
    setHeader: () => {},
    status: (code: number) => {
      statusCode = code;
      return {
        json: (data: any) => { responseData = data; },
        end: () => {},
      };
    },
  };

  await handler({ method: 'POST', body: {} }, mockRes);
  if (statusCode !== 400) {
    throw new Error(`FAIL: Expected 400 for empty body, got ${statusCode}`);
  }
  console.log('  ✓ PASS: Missing parameters accurately rejected with 400');

  // Test 2b: Valid payload returns fallback simulation when RESEND_API_KEY is not set
  statusCode = 0;
  await handler({
    method: 'POST',
    body: {
      email: testEmail,
      fullName: 'Dr. Test Subject',
      verificationCode: initialCode,
      verificationLink: `https://dura-loop.vercel.app/auth?mode=verify&email=${encodeURIComponent(testEmail)}&token=${initialToken}`,
    },
    headers: { host: 'dura-loop.vercel.app', 'x-forwarded-proto': 'https' },
  }, mockRes);

  if (statusCode !== 200) {
    throw new Error(`FAIL: Expected 200 for valid dispatch request, got ${statusCode}`);
  }
  console.log('  ✓ PASS: Serverless function correctly processed dispatch payload');
  console.log('  ✓ PASS: Response data received:', responseData);

  // Test 3: Incorrect OTP rejection
  console.log('\nTest 3: Reject incorrect verification code...');
  const badAttempt = verifyUserEmail(testEmail, '000000');
  if (badAttempt.success) {
    throw new Error('FAIL: Incorrect code must not succeed');
  }
  console.log('  ✓ PASS: Invalid OTP code accurately blocked:', badAttempt.error);

  // Test 4: Correct 6-digit OTP verification
  console.log('\nTest 4: Verify with correct 6-digit PIN...');
  const goodAttempt = verifyUserEmail(testEmail, initialCode);
  if (!goodAttempt.success || !goodAttempt.user?.email_verified) {
    throw new Error('FAIL: Correct code must mark user as verified');
  }
  console.log('  ✓ PASS: User verified successfully! email_verified is now true.');

  // Test 5: Verify via one-click email token link
  console.log('\nTest 5: Verify via one-click link token...');
  const testEmail2 = `link.test.${Date.now()}@apex.edu`;
  const token2 = `token_link_${Date.now()}`;
  const code2 = '938102';

  createUser({
    email: testEmail2,
    full_name: 'Link Tester',
    role: 'borrower',
    department: 'Computer Science',
    student_id: 'TEST-CS-002',
    training_completed: false,
    is_active: true,
    email_verified: false,
    verification_code: code2,
    verification_token: token2,
    verification_sent_at: new Date().toISOString(),
    password_hash: 'Password123!',
  });

  const linkAttempt = verifyUserEmail(testEmail2, token2);
  if (!linkAttempt.success || !linkAttempt.user?.email_verified) {
    throw new Error('FAIL: One-click token link must verify user');
  }
  console.log('  ✓ PASS: Email link verified successfully!');

  // Test 6: Resend code workflow
  console.log('\nTest 6: Resend fresh verification code...');
  const freshCode = '555777';
  const freshToken = `token_fresh_${Date.now()}`;
  setUserVerificationDetails(testEmail2, freshCode, freshToken);
  const reloaded = getUserByEmail(testEmail2);
  if (reloaded?.verification_code !== freshCode) {
    throw new Error('FAIL: Fresh code not saved to user record');
  }
  console.log('  ✓ PASS: Resend successfully generated and saved fresh pass code.');

  console.log('\n======================================================');
  console.log('All 6 Email Verification Tests Passed Successfully!');
  console.log('======================================================');
}

runAuthFlowVerification().catch((err) => {
  console.error('VERIFICATION ERROR:', err);
  process.exit(1);
});
