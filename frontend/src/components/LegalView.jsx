import React, { useState } from 'react';
import {
  FileText,
  Shield,
  Lock,
  Eye,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  Bell,
  Fingerprint,
  Cpu,
  X,
  ExternalLink
} from 'lucide-react';

export const LegalView = ({ initialTab = 'terms', onClose }) => {
  const [activeLegalTab, setActiveLegalTab] = useState(initialTab);

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-10">
      {/* Top Banner */}
      <div className="glass-panel p-6 sm:p-8 border border-cyan-500/30 rounded-3xl relative overflow-hidden shadow-2xl bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="badge badge-cyan text-[10px] font-mono">Legal & Compliance</span>
              <span className="badge badge-emerald text-[10px] font-mono">Version 2.0 (Active)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-heading gradient-text">
              Terms of Service & Privacy Policies
            </h1>
            <p className="text-xs sm:text-sm text-gray-300 max-w-2xl leading-relaxed">
              Read how SecureCloud protects your civil liberties, cryptographic privacy, and data sovereignty through zero-knowledge end-to-end encryption.
            </p>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-gray-400 hover:text-gray-100 transition-colors border border-slate-800 self-start sm:self-auto"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap items-center gap-2 pt-6 mt-4 border-t border-slate-800/80">
          <button
            onClick={() => setActiveLegalTab('terms')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all ${
              activeLegalTab === 'terms'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-md'
                : 'text-gray-400 hover:text-gray-200 bg-slate-950/60 border border-slate-800'
            }`}
          >
            Terms of Service
          </button>
          <button
            onClick={() => setActiveLegalTab('privacy')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all ${
              activeLegalTab === 'privacy'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-md'
                : 'text-gray-400 hover:text-gray-200 bg-slate-950/60 border border-slate-800'
            }`}
          >
            Privacy Policy
          </button>
          <button
            onClick={() => setActiveLegalTab('permissions')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all ${
              activeLegalTab === 'permissions'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-md'
                : 'text-gray-400 hover:text-gray-200 bg-slate-950/60 border border-slate-800'
            }`}
          >
            Device Permissions Guide
          </button>
          <button
            onClick={() => setActiveLegalTab('security')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all ${
              activeLegalTab === 'security'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-md'
                : 'text-gray-400 hover:text-gray-200 bg-slate-950/60 border border-slate-800'
            }`}
          >
            Security & Zero-Knowledge Guarantee
          </button>
        </div>
      </div>

      {/* 1. TERMS OF SERVICE */}
      {activeLegalTab === 'terms' && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6 text-xs text-gray-300 leading-relaxed">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-100 font-heading">SecureCloud Terms of Service</h2>
              <p className="text-[11px] text-gray-400 font-mono">Last updated: October 2026</p>
            </div>
          </div>

          <div className="space-y-4">
            <section className="space-y-2">
              <h3 className="text-sm font-bold text-cyan-300 font-mono">1. Agreement to Terms</h3>
              <p>
                By accessing or using the SecureCloud platform (including web applications, progressive web app mobile installations, APIs, and associated cloud storage services), you agree to be bound by these Terms of Service. If you disagree with any part of these terms, you must discontinue use immediately.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-bold text-cyan-300 font-mono">2. Zero-Knowledge Cryptographic Model & Master Key Responsibility</h3>
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2">
                <p className="font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  CRITICAL: Sole Custodianship of Encryption Keys
                </p>
                <p className="text-[11px] leading-relaxed">
                  SecureCloud implements strict zero-knowledge architecture. File payloads are sealed using AES-256-GCM with unique Data Encryption Keys (DEKs), which are wrapped using your RSA-2048 PKI keypair. Because SecureCloud never stores your unencrypted master password or plaintext private keys, <strong>if you lose your credentials, SecureCloud personnel cannot recover, decrypt, or reset your file contents</strong>.
                </p>
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-bold text-cyan-300 font-mono">3. Acceptable Use Policy</h3>
              <p>
                You agree not to use SecureCloud for any unlawful or malicious activities, including:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-gray-400">
                <li>Distributing malicious software, trojans, ransomware, or spyware.</li>
                <li>Transmitting non-consensual imagery, child sexual abuse material, or content that infringes upon copyright laws.</li>
                <li>Attempting unauthorized brute-force attacks, reverse engineering, or exploiting platform infrastructure.</li>
                <li>Harassing peers through encrypted messaging or non-consensual file sharing.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-bold text-cyan-300 font-mono">4. Storage Quotas and Allocations</h3>
              <p>
                Users are granted storage according to their active subscription tier:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-gray-400">
                <li><strong className="text-gray-200 font-mono">Basic Tier:</strong> Personal secure text notes and docs quota, with 1-month free trial access to premium encrypted object vaults.</li>
                <li><strong className="text-gray-200 font-mono">Premium Tier:</strong> 1 GB (1,000 MB) of full-speed encrypted object storage backed by Backblaze B2 S3 vaults, unlimited end-to-end encrypted messaging, and priority hybrid sharing.</li>
                <li><strong className="text-gray-200 font-mono">Custom Enterprise Tier:</strong> Tailored capacity up to multi-terabyte dedicated vaults. Contact <span className="text-cyan-400 font-mono">ujwalsingh164@gmail.com</span> for arrangements.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-bold text-cyan-300 font-mono">5. Account Termination and Data Purging</h3>
              <p>
                You may delete your account at any time. Account deletion triggers an irreversible purge of your cryptographic keys, user records, and encrypted object payloads across all database and storage tiers.
              </p>
            </section>
          </div>
        </div>
      )}

      {/* 2. PRIVACY POLICY */}
      {activeLegalTab === 'privacy' && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6 text-xs text-gray-300 leading-relaxed">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-100 font-heading">SecureCloud Privacy Policy</h2>
              <p className="text-[11px] text-gray-400 font-mono">Strict Zero-Knowledge & No-Logging Framework</p>
            </div>
          </div>

          <div className="space-y-4">
            <section className="space-y-2">
              <h3 className="text-sm font-bold text-emerald-400 font-mono">1. Our Core Principle: We Cannot See Your Data</h3>
              <p>
                Unlike conventional cloud storage providers, SecureCloud was designed from mathematical ground principles to enforce zero-knowledge privacy. All file encryption occurs using the Web Crypto API on your local client machine before ciphertext ever leaves your browser. We never hold your decryption keys.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-bold text-emerald-400 font-mono">2. Information We Collect</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <h4 className="font-bold text-gray-200">What We Store (Encrypted Metadata)</h4>
                  <ul className="list-disc pl-4 text-gray-400 space-y-0.5 text-[11px]">
                    <li>Account email & unique username</li>
                    <li>Argon2 / PBKDF2 hashed password</li>
                    <li>Public RSA-2048 key (used for peer sharing)</li>
                    <li>Encrypted private key wrapped by PBKDF2</li>
                    <li>Raw encrypted ciphertext in Backblaze B2</li>
                  </ul>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <h4 className="font-bold text-rose-300">What We NEVER Store</h4>
                  <ul className="list-disc pl-4 text-gray-400 space-y-0.5 text-[11px]">
                    <li>Plaintext file contents or documents</li>
                    <li>Unencrypted master vault passwords</li>
                    <li>Plaintext private keys</li>
                    <li>Browser history or tracking cookies</li>
                    <li>Third-party marketing trackers</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-bold text-emerald-400 font-mono">3. Local Cookies and Web Storage Usage</h3>
              <p>
                We use browser <strong className="text-gray-200 font-mono">localStorage</strong> strictly for functional purposes: maintaining your authenticated JWT bearer session and caching your public user profile for fast 0ms application loading. We do not use third-party advertising cookies.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-bold text-emerald-400 font-mono">4. Data Sharing & Third Parties</h3>
              <p>
                We do not sell, rent, monetize, or disclose your personal information. Encrypted binary ciphertext is hosted across hardened Backblaze B2 S3 storage nodes, and database state is hosted on Neon Serverless PostgreSQL. All transfers use TLS 1.3 encryption.
              </p>
            </section>
          </div>
        </div>
      )}

      {/* 3. DEVICE PERMISSIONS GUIDE */}
      {activeLegalTab === 'permissions' && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6 text-xs text-gray-300 leading-relaxed">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
              <Fingerprint className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-100 font-heading">Device Permissions & Essential Capabilities</h2>
              <p className="text-[11px] text-gray-400 font-mono">Why SecureCloud requests specific hardware/browser permissions</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-cyan-300 font-bold">
                  <HardDrive className="w-4 h-4" />
                  <span>Local Cryptographic Storage</span>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Used by the Web Crypto API to derive AES-256 session keys in-memory and temporarily buffer decrypted file byte streams when downloading.
                </p>
                <span className="badge badge-cyan text-[9px] font-mono">Required for Decryption</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-emerald-300 font-bold">
                  <Bell className="w-4 h-4" />
                  <span>Push / Browser Notifications</span>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Allows SecureCloud to notify you instantly when a peer shares an encrypted file with you or sends a real-time private message.
                </p>
                <span className="badge badge-emerald text-[9px] font-mono">Optional / User Discretion</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-purple-300 font-bold">
                  <Cpu className="w-4 h-4" />
                  <span>Progressive Web App (PWA)</span>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Enables installing SecureCloud to your desktop or mobile home screen as a standalone, windowed native application with background sync.
                </p>
                <span className="badge badge-purple text-[9px] font-mono">Installable Anytime</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. SECURITY & ZERO-KNOWLEDGE GUARANTEE */}
      {activeLegalTab === 'security' && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6 text-xs text-gray-300 leading-relaxed">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-100 font-heading">Cryptographic Guarantee & Security Specification</h2>
              <p className="text-[11px] text-gray-400 font-mono">Mathematical guarantees of SecureCloud v2.0</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-cyan-500/30 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-gray-400">Payload Cipher:</span>
                <span className="text-cyan-300 font-bold">AES-256-GCM (Galois/Counter Mode with 128-bit Auth Tag)</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-gray-400">Asymmetric Key Exchange:</span>
                <span className="text-cyan-300 font-bold">RSA-2048 with OAEP padding (SHA-256 MGF1)</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-gray-400">Key Derivation Function:</span>
                <span className="text-cyan-300 font-bold">PBKDF2-HMAC-SHA256 (100,000 iterations)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Stream Integrity Verification:</span>
                <span className="text-cyan-300 font-bold">SHA-256 Checksum on every file version</span>
              </div>
            </div>

            <p className="text-[11px] text-gray-400 leading-relaxed">
              For security vulnerability disclosures or independent auditing inquiries, please contact our security engineering desk at <strong className="text-cyan-300 font-mono">ujwalsingh164@gmail.com</strong>.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
