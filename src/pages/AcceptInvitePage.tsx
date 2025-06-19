import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle2, XCircle, MapPin, Calendar } from 'lucide-react';
import { invitationService } from '../services/invitationService';
import { useAuth } from '../hooks/useAuth';
import AuthModal from '../components/AuthModal';

const AcceptInvitePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; tripId?: string } | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [invitation, setInvitation] = useState<any>(null);

  useEffect(() => {
    if (!token) {
      navigate('/');
      return;
    }

    if (authLoading) return;

    if (!user) {
      // Store token and show auth modal
      setShowAuthModal(true);
      return;
    }

    // User is authenticated, process the invitation
    processInvitation();
  }, [token, user, authLoading, navigate]);

  const processInvitation = async () => {
    if (!token) return;

    setLoading(true);
    try {
      const result = await invitationService.acceptInvitation(token);
      setResult(result);

      if (result.success && result.tripId) {
        // Redirect to trip dashboard after a short delay
        setTimeout(() => {
          navigate(`/trip/${result.tripId}`);
        }, 2000);
      }
    } catch (error: any) {
      console.error('Error processing invitation:', error);
      setResult({
        success: false,
        message: error.message || 'Failed to process invitation'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    // After successful auth, process the invitation
    processInvitation();
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="pixel-text text-xl text-red-400 mb-4">INVALID INVITATION</h2>
          <p className="outfit-text text-gray-400 mb-6">This invitation link is invalid or expired.</p>
          <button
            onClick={() => navigate('/')}
            className="pixel-button-secondary"
          >
            GO HOME
          </button>
        </div>
      </div>
    );
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-blue-500 animate-spin mx-auto mb-4" />
          <h2 className="pixel-text text-xl text-blue-400 mb-4">
            {authLoading ? 'CHECKING AUTHENTICATION...' : 'PROCESSING INVITATION...'}
          </h2>
          <p className="outfit-text text-gray-400">Please wait while we process your invitation.</p>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="pixel-card max-w-md w-full text-center">
          {result.success ? (
            <>
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="pixel-text text-xl text-green-400 mb-4">SUCCESS!</h2>
              <p className="outfit-text text-gray-300 mb-6">{result.message}</p>
              <p className="outfit-text text-gray-500 text-sm">Redirecting to trip dashboard...</p>
            </>
          ) : (
            <>
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="pixel-text text-xl text-red-400 mb-4">INVITATION FAILED</h2>
              <p className="outfit-text text-gray-300 mb-6">{result.message}</p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => navigate('/my-trips')}
                  className="pixel-button-secondary flex-1"
                >
                  MY TRIPS
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="pixel-button-primary flex-1"
                >
                  GO HOME
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => navigate('/')}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
};

export default AcceptInvitePage;