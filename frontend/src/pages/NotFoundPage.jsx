import React from 'react';
import { ShieldAlert, ArrowLeft, Home, Folder } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 space-y-5 animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-xl shadow-cyan-500/10">
        <ShieldAlert className="w-8 h-8" />
      </div>

      <div className="space-y-2 max-w-md">
        <span className="badge badge-cyan text-xs font-mono">404 • Resource Not Found</span>
        <h1 className="text-2xl sm:text-3xl font-black font-heading text-gray-100">
          Cryptographic Path Missing
        </h1>
        <p className="text-xs text-gray-400 leading-relaxed">
          The requested sub-website or storage partition does not exist, has expired, or has been erased from the cluster.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <Link
          to="/overview"
          className="btn-primary text-xs py-2.5 px-4 shadow-lg shadow-cyan-500/20 inline-flex items-center gap-2"
        >
          <Home className="w-4 h-4" />
          <span>Go to Overview</span>
        </Link>
        <Link
          to="/files"
          className="btn-secondary text-xs py-2.5 px-4 inline-flex items-center gap-2"
        >
          <Folder className="w-4 h-4" />
          <span>My Cloud Storage</span>
        </Link>
      </div>
    </div>
  );
}
