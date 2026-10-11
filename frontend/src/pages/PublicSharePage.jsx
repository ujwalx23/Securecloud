import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PublicShareView } from '../components/PublicShareView';

export default function PublicSharePage() {
  const { shareCode: routeShareCode } = useParams();
  const navigate = useNavigate();

  // Support path, query param, or hash
  const shareCode = routeShareCode || new URLSearchParams(window.location.search).get('share') || '';

  return (
    <div className="min-h-screen bg-[#050811] text-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <PublicShareView
          shareCode={shareCode}
          onGoToApp={() => navigate('/overview')}
        />
      </div>
    </div>
  );
}
