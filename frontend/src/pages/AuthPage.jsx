import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { CyberCanvas3D } from '../components/CyberCanvas3D';
import { DeviceOnboardingModal } from '../components/DeviceOnboardingModal';
import { LegalView } from '../components/LegalView';
import { ContactView } from '../components/ContactView';
import {
  Shield,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Mail,
  RefreshCw,
  Smartphone,
  FileText,
  Sun,
  Moon
} from 'lucide-react';

export default function AuthPage({ initialMode = 'login' }) {
  const { user, login, register, loginWithGoogle, verifyEmail, resendCode } = useAuth();
  const { showToast } = useToast();
  const { toggleTheme, isDayMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [isRegister, setIsRegister] = useState(() => {
    if (initialMode === 'register') return true;
    if (location.pathname.includes('register')) return true;
    return false;
  });

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [authError, setAuthError] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Email verification state
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(() => {
    return location.pathname.includes('verify') || false;
  });
  const [verificationCode, setVerificationCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Modals state
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [legalInitialTab, setLegalInitialTab] = useState('terms');
  const [showContactModal, setShowContactModal] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/overview', { replace: true });
    }
  }, [user, navigate]);

  // Capture PWA Install Prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleTriggerInstall = async () => {
    if (!installPrompt) return;
    try {
      installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        showToast({
          type: 'success',
          title: 'SecureCloud Installed',
          message: 'Web App successfully installed to your device!'
        });
      }
    } catch (err) {
      console.warn('Install prompt error:', err);
    }
    setInstallPrompt(null);
  };

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '593769489522-jkbfd18upg9e4cha237sueeasf94j02k.apps.googleusercontent.com';

  const handleGoogleCredential = useCallback(async (response) => {
    if (!response?.credential) return;
    setAuthLoading(true);
    setAuthError(null);
    try {
      await loginWithGoogle(response.credential);
      showToast({
        type: 'success',
        title: 'Authenticated via Google',
        message: 'Zero-knowledge session decrypted and authorized.'
      });
      navigate('/overview');
    } catch (err) {
      setAuthError(err.message);
      showToast({
        type: 'error',
        title: 'Google Login Failed',
        message: err.message
      });
    } finally {
      setAuthLoading(false);
    }
  }, [loginWithGoogle, showToast, navigate]);

  useEffect(() => {
    if (user) return;
    const initGsi = () => {
      if (window.google?.accounts?.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: handleGoogleCredential,
            auto_select: false
          });
          const btnEl = document.getElementById('googleSignInBtnContainer');
          if (btnEl) {
            btnEl.innerHTML = '';
            window.google.accounts.id.renderButton(btnEl, {
              theme: 'filled_black',
              size: 'large',
              width: 320,
              text: isRegister ? 'signup_with' : 'signin_with',
              shape: 'pill'
            });
          }
        } catch (e) {
          console.warn('Google GSI note:', e);
        }
      }
    };

    if (window.google?.accounts?.id) {
      initGsi();
    } else {
      const timer = setTimeout(initGsi, 800);
      return () => clearTimeout(timer);
    }
  }, [user, isRegister, googleClientId, handleGoogleCredential]);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    try {
      if (isRegister) {
        await register(email, username, password, fullName);
        setIsVerifyingEmail(true);
        setVerificationCode('');
        showToast({
          type: 'info',
          title: 'Verification Code Dispatched',
          message: `A 6-digit confirmation code was sent to ${email}. Enter the code below to complete registration.`
        });
        setResendCooldown(60);
        const interval = setInterval(() => {
          setResendCooldown((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        return;
      } else {
        await login(email, password);
        showToast({
          type: 'success',
          title: 'Welcome Back',
          message: 'Zero-knowledge session authenticated.'
        });
        navigate('/overview');
      }
    } catch (err) {
      if (err.isUnverified || (err.message && err.message.toLowerCase().includes('verification'))) {
        setIsVerifyingEmail(true);
        setVerificationCode('');
        showToast({
          type: 'warning',
          title: 'Email Verification Required',
          message: 'Please enter the code sent to your email to complete registration.'
        });
      } else {
        setAuthError(err.message);
        showToast({
          type: 'error',
          title: isRegister ? 'Registration Failed' : 'Login Failed',
          message: err.message
        });
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyEmailSubmit = async (e) => {
    e.preventDefault();
    if (!verificationCode || verificationCode.length !== 6) {
      setAuthError('Please enter the 6-digit verification code.');
      return;
    }
    setAuthError(null);
    setAuthLoading(true);

    try {
      await verifyEmail(email, verificationCode);
      showToast({
        type: 'success',
        title: 'Email Verified',
        message: 'Your cryptographic account has been activated!'
      });
      setIsVerifyingEmail(false);
      navigate('/overview');
    } catch (err) {
      setAuthError(err.message);
      showToast({
        type: 'error',
        title: 'Verification Failed',
        message: err.message
      });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    try {
      await resendCode(email);
      setVerificationCode('');
      showToast({
        type: 'info',
        title: 'Verification Code Sent',
        message: `Fresh verification code dispatched to ${email}. Check your email inbox.`
      });
      setResendCooldown(60);
      const interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Resend Failed',
        message: err.message
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#050811] flex items-center justify-center p-4 lg:p-12 relative overflow-hidden text-gray-100">
      {/* Top-Right Theme Toggle on Landing Screen (Icon Only) */}
      <div className="absolute top-5 right-5 z-30">
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="p-2.5 rounded-xl border border-slate-800/80 bg-slate-900/70 hover:bg-slate-800 text-gray-300 hover:text-cyan-300 transition-all backdrop-blur-md shadow-lg flex items-center justify-center"
        >
          {isDayMode ? (
            <Sun className="w-5 h-5 text-amber-500 animate-spin-slow" />
          ) : (
            <Moon className="w-5 h-5 text-cyan-400" />
          )}
        </button>
      </div>

      {/* Background Ambient Glow Lights */}
      <div className="absolute top-1/4 left-1/4 w-[650px] h-[650px] bg-cyan-500/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[550px] h-[550px] bg-indigo-600/12 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-600/5 rounded-full blur-[180px] pointer-events-none" />

      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
        {/* Left Column: 3D Interactive Cyber Canvas & Features */}
        <div className="space-y-6 text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-cyan-500/15 to-indigo-500/15 border border-cyan-500/35 text-cyan-300 text-xs font-mono font-semibold shadow-lg shadow-cyan-500/10">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            RSA-2048 PKI + AES-256-GCM Cryptographic Framework
          </div>

          <h1 className="text-4xl lg:text-5xl font-black font-heading tracking-tight leading-tight">
            Zero-Knowledge <span className="gradient-text">Encrypted Storage</span> & Shared Data Vault
          </h1>

          <p className="text-sm text-gray-400 leading-relaxed max-w-lg font-medium">
            Enterprise-grade hybrid cryptography combining asymmetric 2048-bit RSA key distribution with hardware-accelerated AES-256-GCM authenticated payload ciphers.
          </p>

          {/* Interactive 3D Earth Globe Canvas */}
          <div className="glass-panel p-2 h-72 border-cyan-500/25 relative flex items-center justify-center shadow-2xl overflow-hidden group">
            <CyberCanvas3D />
            <div className="absolute bottom-3 left-4 text-[10px] font-mono text-cyan-300 flex items-center gap-2 pointer-events-none bg-slate-950/80 px-3 py-1 rounded-lg border border-cyan-500/30 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>Interactive 3D Cryptographic Earth • Click & Drag to Rotate</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-gray-300">
            <div className="flex items-center gap-2.5 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Zero-Knowledge Architecture</span>
            </div>
            <div className="flex items-center gap-2.5 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>SHA-256 Stream Integrity</span>
            </div>
            <div className="flex items-center gap-2.5 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Expirable Password Links</span>
            </div>
            <div className="flex items-center gap-2.5 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Real-Time Audit Trail</span>
            </div>
          </div>
        </div>

        {/* Right Column: Glassmorphic Auth Form */}
        <div className="glass-panel p-8 space-y-6 border-slate-800/80 shadow-2xl relative">
          {isVerifyingEmail ? (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/15 border border-cyan-500/40 text-cyan-400 flex items-center justify-center mx-auto shadow-xl shadow-cyan-500/20">
                  <Mail className="w-7 h-7 drop-shadow-md" />
                </div>
                <h2 className="text-2xl font-black font-heading text-gray-100">
                  Verify Your Email
                </h2>
                <p className="text-xs text-gray-400">
                  Enter the 6-digit confirmation code dispatched to:
                </p>
                <p className="text-xs font-mono font-bold text-cyan-400">
                  {email}
                </p>
                <p className="text-[11px] text-gray-400/80">
                  (Check your inbox or Spam/Junk folder if not visible)
                </p>
              </div>

              <form onSubmit={handleVerifyEmailSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5 text-center">
                    6-Digit Security Code
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    autoFocus
                    placeholder="• • • • • •"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, ''))}
                    className="input-field text-center font-mono text-2xl tracking-[0.5em] py-3.5 bg-slate-950/90 border-cyan-500/40 text-cyan-300 focus:border-cyan-400"
                  />
                </div>

                {authError && (
                  <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center gap-2">
                    <span>{authError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={authLoading}
                  className="btn-primary w-full justify-center text-xs py-3 shadow-lg shadow-cyan-500/25"
                >
                  {authLoading ? 'Verifying Security Code...' : 'Verify & Activate Vault'}{' '}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setIsVerifyingEmail(false);
                    setAuthError(null);
                  }}
                  className="text-gray-400 hover:text-gray-200 transition-colors"
                >
                  {isRegister ? '← Edit Registration Details' : '← Back to Login'}
                </button>
                <button
                  type="button"
                  disabled={resendCooldown > 0}
                  onClick={handleResendCode}
                  className="text-cyan-400 hover:text-cyan-300 font-mono font-semibold disabled:text-gray-600 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${resendCooldown > 0 ? 'animate-spin' : ''}`} />
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-400 via-indigo-500 to-purple-600 flex items-center justify-center mx-auto shadow-xl shadow-cyan-500/30">
                  <Shield className="w-7 h-7 text-white drop-shadow-md" />
                </div>
                <h2 className="text-2xl font-black font-heading text-gray-100">
                  {isRegister ? 'Initialize Secure Vault' : 'Authenticate Session'}
                </h2>
                <p className="text-xs text-gray-400 font-mono">
                  {isRegister ? 'Generates RSA-2048 PKI keypair on registration' : 'Sign in to decrypt stored files and secrets'}
                </p>
              </div>

              <form onSubmit={handleAuthSubmit} className="space-y-4">
                {isRegister && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1.5">Unique Username</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. alex_sec"
                        value={username}
                        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                        className="input-field text-xs py-3 font-mono"
                      />
                      <p className="text-[10px] text-gray-500 font-mono mt-1">3-30 letters, numbers, or underscores</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1.5">Full Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Ujwal Singh"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="input-field text-xs py-3"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    {isRegister ? 'Account Email' : 'Email or Username'}
                  </label>
                  <input
                    type={isRegister ? 'email' : 'text'}
                    required
                    placeholder={isRegister ? 'your@gmail.com' : 'your@gmail.com or alex_sec'}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field text-xs py-3"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Master Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input-field text-xs py-3 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-cyan-400 focus:outline-none transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {isRegister && password && (
                    <div className="space-y-1 mt-2">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-gray-400">Password Strength:</span>
                        <span className={password.length >= 12 ? 'text-emerald-400 font-semibold' : password.length >= 8 ? 'text-amber-400 font-semibold' : 'text-rose-400 font-semibold'}>
                          {password.length < 8 ? 'Too Short (min 8 chars)' : password.length >= 12 ? 'Strong (High Entropy)' : 'Good'}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            password.length < 8 ? 'w-1/4 bg-rose-500' : password.length >= 12 ? 'w-full bg-emerald-500' : 'w-2/3 bg-amber-500'
                          }`}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {authError && (
                  <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center gap-2">
                    <span>{authError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={authLoading}
                  className="btn-primary w-full justify-center text-xs py-3 shadow-lg shadow-cyan-500/25"
                >
                  {authLoading
                    ? 'Verifying Cryptographic Credentials...'
                    : isRegister
                    ? 'Generate RSA Keys & Create Vault'
                    : 'Authenticate & Decrypt Session'}{' '}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {/* Google Authentication Section */}
              <div className="space-y-3 pt-1">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-800" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase font-mono">
                    <span className="bg-[#0b1022] px-3 text-gray-500">Or continue with</span>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center">
                  <div id="googleSignInBtnContainer" className="flex justify-center min-h-[44px] w-full" />
                </div>
              </div>

              <div className="text-center text-xs text-gray-400">
                {isRegister ? 'Already have an encrypted vault?' : "Don't have a vault account?"}{' '}
                <button
                  onClick={() => {
                    setIsRegister(!isRegister);
                    setAuthError(null);
                  }}
                  className="text-cyan-400 font-bold hover:underline ml-1"
                >
                  {isRegister ? 'Sign In' : 'Register Account'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Auth Screen Footer Links */}
      <div className="absolute bottom-4 left-0 right-0 z-20 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-gray-400 font-mono px-4">
        <button
          onClick={() => {
            setLegalInitialTab('terms');
            setShowLegalModal(true);
          }}
          className="hover:text-cyan-400 transition-colors flex items-center gap-1.5"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Terms of Service</span>
        </button>
        <span className="text-gray-700 hidden sm:inline">•</span>
        <button
          onClick={() => {
            setLegalInitialTab('privacy');
            setShowLegalModal(true);
          }}
          className="hover:text-cyan-400 transition-colors flex items-center gap-1.5"
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Privacy Policy</span>
        </button>
        <span className="text-gray-700 hidden sm:inline">•</span>
        <button
          onClick={() => setShowContactModal(true)}
          className="hover:text-cyan-400 transition-colors flex items-center gap-1.5"
        >
          <Mail className="w-3.5 h-3.5" />
          <span>Contact Support</span>
        </button>
        {installPrompt && (
          <>
            <span className="text-gray-700 hidden sm:inline">•</span>
            <button
              onClick={handleTriggerInstall}
              className="text-purple-400 hover:text-purple-300 font-bold transition-colors flex items-center gap-1.5 bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/20"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Install Web App</span>
            </button>
          </>
        )}
      </div>

      {/* First-Time Device Permissions & Onboarding */}
      <DeviceOnboardingModal
        installPrompt={installPrompt}
        onTriggerInstall={handleTriggerInstall}
        onOpenLegal={(tab) => {
          setLegalInitialTab(tab || 'terms');
          setShowLegalModal(true);
        }}
        onOpenContact={() => setShowContactModal(true)}
      />

      {/* Legal Modal Overlay (Logged-out) */}
      {showLegalModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="w-full max-w-5xl my-auto">
            <LegalView
              initialTab={legalInitialTab}
              onClose={() => setShowLegalModal(false)}
            />
          </div>
        </div>
      )}

      {/* Contact Modal Overlay (Logged-out) */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="w-full max-w-4xl my-auto">
            <ContactView
              onClose={() => setShowContactModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
