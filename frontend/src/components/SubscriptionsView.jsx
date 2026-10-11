import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Sparkles,
  Check,
  Shield,
  HardDrive,
  Clock,
  Mail,
  Zap,
  ArrowRight,
  CreditCard,
  Lock,
  X,
  AlertTriangle,
  Receipt,
  CheckCircle2,
  Calendar,
  Gift
} from 'lucide-react';

export const SubscriptionsView = () => {
  const { token, user, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const [status, setStatus] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Free Trial Modal State
  const [showTrialModal, setShowTrialModal] = useState(false);

  // Stripe Checkout Modal State
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('888');
  const [cardName, setCardName] = useState(user?.full_name || 'SecureCloud Subscriber');
  const [cardZip, setCardZip] = useState('400001');
  const [checkoutReceipt, setCheckoutReceipt] = useState(null);

  const fetchStatusAndPlans = async () => {
    try {
      setLoading(true);
      const [stRes, plRes] = await Promise.all([
        fetch('/api/subscriptions/status', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/subscriptions/plans')
      ]);
      if (stRes.ok) setStatus(await stRes.json());
      if (plRes.ok) {
        const plData = await plRes.json();
        setPlans(plData.plans || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatusAndPlans();
  }, [token]);

  // Activate 30-day Free Trial
  const handleActivateTrial = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/subscriptions/start-trial', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Could not activate trial');
      showToast({
        type: 'success',
        title: '30-Day Free Trial Activated!',
        message: 'You have been granted 1 GB of secure cloud storage for 30 days.'
      });
      setShowTrialModal(false);
      await fetchStatusAndPlans();
      refreshProfile?.();
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Trial Activation Failed',
        message: err.message
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Complete Stripe Checkout (₹399/yr)
  const handleStripePayment = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch('/api/subscriptions/checkout-stripe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          card_number: cardNumber,
          exp_month: cardExpiry.split('/')[0] || '12',
          exp_year: cardExpiry.split('/')[1] || '28',
          cvc: cardCvc,
          name_on_card: cardName,
          postal_code: cardZip
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Payment processing failed');
      setCheckoutReceipt(data);
      showToast({
        type: 'success',
        title: 'Payment Successful (₹399)',
        message: '1 GB Premium subscription activated for 1 year!'
      });
      await fetchStatusAndPlans();
      refreshProfile?.();
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Payment Error',
        message: err.message
      });
    } finally {
      setActionLoading(false);
    }
  };

  const isPremium = user?.plan_type === 'premium';
  const isTrialActive = Boolean(status?.trial_expires_at && new Date(status.trial_expires_at) > new Date());
  const trialDaysLeft = status?.trial_expires_at
    ? Math.max(0, Math.ceil((new Date(status.trial_expires_at) - new Date()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Banner: Plan Status Overview */}
      <div className="p-6 rounded-3xl glass-panel border border-slate-800/80 relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950/20 to-slate-900 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`badge ${
                isPremium ? 'badge-cyan font-bold' : 'bg-slate-800 text-gray-300'
              } text-xs py-1 px-3 font-mono uppercase tracking-wider`}>
                CURRENT PLAN: {isPremium ? 'PREMIUM (1 GB)' : 'BASIC'}
              </span>

              {isTrialActive && (
                <span className="badge bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs py-1 px-3 font-mono flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  Free Trial: {trialDaysLeft} Days Remaining
                </span>
              )}
            </div>

            <h2 className="text-xl md:text-2xl font-black text-gray-100 font-heading">
              SecureCloud Subscriptions & Quotas
            </h2>
            <p className="text-xs text-gray-400 mt-1 max-w-xl">
              Zero-knowledge cloud infrastructure with authenticated AES-256-GCM partitions, RSA-2048 identity keys, and client-isolated storage.
            </p>
          </div>

          {/* Quick Storage Overview Pill */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 shrink-0 space-y-2 min-w-[240px]">
            <div className="flex items-center justify-between text-xs font-bold text-gray-300 font-mono">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <HardDrive className="w-4 h-4" /> Allocated Storage
              </span>
              <span className="text-cyan-300">{isPremium ? '1 GB' : 'Notes Only'}</span>
            </div>
            <p className="text-[11px] text-gray-400 font-mono">
              {isPremium
                ? 'High-speed encrypted Backblaze B2 partition active.'
                : 'Upgrade or start your 30-day trial for 1 GB.'}
            </p>
          </div>
        </div>
      </div>

      {/* 3 Tier Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* PLAN 1: BASIC (FREE) */}
        <div className="p-6 rounded-3xl glass-panel border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-all hover:shadow-xl hover:-translate-y-1 duration-300">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-100 font-heading">Basic Plan</h3>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-gray-400 text-[10px] font-mono font-bold">
                FREE
              </span>
            </div>

            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-gray-100 font-heading">₹0</span>
              <span className="text-xs text-gray-400 font-mono">/ Forever</span>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">
              Essential cloud identity with encrypted markdown notes, user search, and private 1-on-1 chat.
            </p>

            <ul className="space-y-2.5 text-xs text-gray-300 pt-2 border-t border-slate-800/80">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Verified Account & Unique Handle</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Encrypted Personal Notes & Documents</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Private 1-on-1 Encrypted Chat</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Zero-Knowledge Secret Vault Access</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Eligible for 1-Month Free Trial</span>
              </li>
            </ul>
          </div>

          <div className="pt-6">
            {!isPremium && !status?.has_used_trial ? (
              <button
                onClick={() => setShowTrialModal(true)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 hover:from-cyan-500/30 hover:to-indigo-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
              >
                <Gift className="w-4 h-4 text-cyan-400" />
                Start 30-Day Free Trial (1 GB)
              </button>
            ) : (
              <button
                disabled
                className="w-full py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-gray-400 text-xs font-bold cursor-default"
              >
                {!isPremium ? 'Active Plan' : 'Free Tier'}
              </button>
            )}
          </div>
        </div>

        {/* PLAN 2: PREMIUM (1 GB - ₹399/year) */}
        <div className="p-6 rounded-3xl glass-panel border-2 border-cyan-500/60 flex flex-col justify-between shadow-2xl shadow-cyan-500/10 relative bg-gradient-to-b from-cyan-950/25 to-slate-900 hover:-translate-y-1 transition-all duration-300">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3.5 py-0.5 rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 text-slate-950 text-[10px] font-black uppercase tracking-wider font-mono shadow-md">
            RECOMMENDED • 1 GB
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-100 font-heading">Premium</h3>
              <span className="badge badge-cyan text-[10px] py-0.5 px-2 font-mono font-bold">
                1 GB STORAGE
              </span>
            </div>

            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-cyan-300 font-heading">₹399</span>
              <span className="text-xs text-gray-400 font-mono">/ year</span>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              Full zero-knowledge cloud file storage with AES-256-GCM + RSA-2048 hybrid client-server payload encryption.
            </p>

            <ul className="space-y-2.5 text-xs text-gray-200 pt-2 border-t border-slate-800/80">
              <li className="flex items-center gap-2 font-semibold text-cyan-300">
                <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>1 GB Allocated Secure Cloud Storage</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>End-to-End Hybrid File Encryption</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Encrypted Folder Hierarchy Management</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Private Expirable File Sharing Links</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Integrity Center SHA-256 Hash Auditing</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>All Basic & Private Chat Features Included</span>
              </li>
            </ul>
          </div>

          <div className="pt-6 space-y-2">
            {isPremium && !isTrialActive ? (
              <div className="w-full py-2.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-bold text-center flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                Premium Plan Active (1 GB)
              </div>
            ) : (
              <button
                onClick={() => setShowStripeModal(true)}
                disabled={actionLoading}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400 text-slate-950 text-xs font-black shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2"
              >
                <CreditCard className="w-4 h-4" />
                {isTrialActive ? 'Upgrade to Paid (₹399/yr)' : 'Subscribe for ₹399/yr'}
              </button>
            )}

            {!isPremium && !status?.has_used_trial && (
              <button
                onClick={() => setShowTrialModal(true)}
                className="w-full text-center text-[11px] text-cyan-400 hover:underline font-mono pt-1"
              >
                Or start 1-month free trial &rarr;
              </button>
            )}
          </div>
        </div>

        {/* PLAN 3: CUSTOM PLAN (ENTERPRISE) */}
        <div className="p-6 rounded-3xl glass-panel border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-all hover:shadow-xl hover:-translate-y-1 duration-300">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-100 font-heading">Custom Plan</h3>
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-mono font-bold">
                ENTERPRISE
              </span>
            </div>

            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-gray-100 font-heading">Contact Us</span>
              <span className="text-xs text-gray-400 font-mono">/ Custom</span>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">
              Tailored high-capacity storage allocations, multi-tenant organization workspaces, and priority engineering support.
            </p>

            <ul className="space-y-2.5 text-xs text-gray-300 pt-2 border-t border-slate-800/80">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-purple-400 shrink-0" />
                <span>Custom Multi-GB / TB Storage Quotas</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-purple-400 shrink-0" />
                <span>Dedicated Enterprise Key Management</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-purple-400 shrink-0" />
                <span>Team & Department Workspaces</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-purple-400 shrink-0" />
                <span>Direct S3 & API Ingestion Pipelines</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-purple-400 shrink-0" />
                <span>Priority Dedicated Email & SLA Support</span>
              </li>
            </ul>
          </div>

          <div className="pt-6">
            <a
              href="mailto:ujwalsingh164@gmail.com?subject=SecureCloud Enterprise Plan Inquiry"
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-md shadow-purple-600/20"
            >
              <Mail className="w-3.5 h-3.5" />
              Contact Enterprise Sales
            </a>
          </div>
        </div>
      </div>

      {/* 30-DAY FREE TRIAL CONFIRMATION MODAL */}
      {showTrialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel p-6 max-w-lg w-full border-cyan-500/40 shadow-2xl relative space-y-5 bg-gradient-to-b from-[#0b1224] to-[#060a14]">
            <button
              onClick={() => setShowTrialModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-gray-400 hover:text-gray-100 hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/35 flex items-center justify-center text-cyan-300">
                <Gift className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-100 font-heading">
                  Activate 1-Month Free Trial
                </h3>
                <p className="text-xs text-cyan-400 font-mono">
                  1 GB Secure Cloud Storage • Zero Cost
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-300">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>Important Trial Terms & Conditions</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-gray-300 text-[11px] leading-relaxed">
                <li>Your account will be upgraded immediately to <strong>1 GB storage</strong> for 30 consecutive days.</li>
                <li>No credit card is required to begin this trial.</li>
                <li><strong>Privacy Policy Notice:</strong> If you choose not to upgrade to the ₹399/year plan after 30 days, your account will automatically revert to Basic. To protect your cryptographic confidentiality and cloud privacy, any files stored in the trial vault will be securely purged upon trial expiration.</li>
              </ul>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowTrialModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-gray-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleActivateTrial}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400 text-slate-950 text-xs font-black shadow-lg shadow-cyan-500/20"
              >
                {actionLoading ? 'Activating...' : 'I Accept & Start Free Trial'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STRIPE CHECKOUT MODAL */}
      {showStripeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel p-6 max-w-md w-full border-cyan-500/40 shadow-2xl relative space-y-5 bg-[#0a0f1d]">
            <button
              onClick={() => {
                setShowStripeModal(false);
                setCheckoutReceipt(null);
              }}
              className="absolute top-4 right-4 p-1 rounded-lg text-gray-400 hover:text-gray-100 hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            {!checkoutReceipt ? (
              <form onSubmit={handleStripePayment} className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold font-mono text-sm shadow">
                      S
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-100 font-heading">Stripe Checkout</h4>
                      <p className="text-[10px] text-gray-400 font-mono">Secure 256-Bit SSL Payment</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-black text-cyan-300 font-heading">₹399</span>
                    <span className="text-[10px] text-gray-400 block font-mono">1 Year Plan</span>
                  </div>
                </div>

                {/* Card Visual Preview */}
                <div className="p-4 rounded-2xl bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 text-white space-y-3 shadow-inner">
                  <div className="flex justify-between items-center text-xs font-mono text-cyan-400">
                    <span>SecureCloud Vault Card</span>
                    <span className="text-[10px] uppercase font-bold tracking-wider">Debit / Credit</span>
                  </div>
                  <div className="text-base font-mono tracking-widest text-gray-200">
                    {cardNumber}
                  </div>
                  <div className="flex justify-between text-[11px] font-mono text-gray-400 pt-1">
                    <span>{cardName.toUpperCase()}</span>
                    <span>EXP {cardExpiry}</span>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-gray-400 mb-1 font-mono text-[11px]">Cardholder Name</label>
                    <input
                      type="text"
                      required
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      className="input-field text-xs py-2 bg-slate-950/80 border-slate-700"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1 font-mono text-[11px]">Card Number</label>
                    <input
                      type="text"
                      required
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="4242 4242 4242 4242"
                      className="input-field text-xs py-2 font-mono bg-slate-950/80 border-slate-700"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-gray-400 mb-1 font-mono text-[11px]">Expires (MM/YY)</label>
                      <input
                        type="text"
                        required
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        placeholder="MM/YY"
                        className="input-field text-xs py-2 font-mono bg-slate-950/80 border-slate-700"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 mb-1 font-mono text-[11px]">CVC / CVV</label>
                      <input
                        type="password"
                        required
                        maxLength={4}
                        value={cardCvc}
                        onChange={(e) => setCardCvc(e.target.value)}
                        placeholder="CVC"
                        className="input-field text-xs py-2 font-mono bg-slate-950/80 border-slate-700"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="btn-primary w-full justify-center text-xs py-3 shadow-lg shadow-cyan-500/25"
                  >
                    <Lock className="w-4 h-4" />
                    {actionLoading ? 'Processing via Stripe...' : 'Pay ₹399 & Activate 1 GB'}
                  </button>
                </div>

                <div className="flex items-center justify-center gap-1.5 text-[10px] text-gray-400 font-mono">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Stripe PCI-DSS Level 1 Encrypted Gateway</span>
                </div>
              </form>
            ) : (
              /* Receipt View */
              <div className="space-y-4 text-center py-2 animate-fade-in">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-gray-100 font-heading">
                    Payment Confirmed!
                  </h4>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">
                    Your 1 GB Premium plan has been activated.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-left text-xs font-mono space-y-1.5 text-gray-300">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Invoice:</span>
                    <span className="text-cyan-400">{checkoutReceipt.receipt_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Transaction ID:</span>
                    <span className="text-gray-300 truncate max-w-[180px]">{checkoutReceipt.transaction_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Amount Paid:</span>
                    <span className="text-emerald-400 font-bold">₹399.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Storage Quota:</span>
                    <span className="text-cyan-400 font-bold">1 GB (1,073 MB)</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShowStripeModal(false);
                    setCheckoutReceipt(null);
                  }}
                  className="btn-primary w-full justify-center text-xs py-2.5"
                >
                  Return to Dashboard
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
