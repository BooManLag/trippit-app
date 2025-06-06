import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

const RedditCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing Reddit authorization...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');
        
        if (error) {
          setStatus('error');
          setMessage(`Reddit authorization failed: ${error}`);
          setTimeout(() => navigate('/'), 3000);
          return;
        }

        if (!code || !state) {
          setStatus('error');
          setMessage('Missing authorization code or state');
          setTimeout(() => navigate('/'), 3000);
          return;
        }

        // Verify state matches what we stored
        const storedState = localStorage.getItem('reddit_oauth_state');
        if (state !== storedState) {
          setStatus('error');
          setMessage('Invalid state parameter - possible security issue');
          setTimeout(() => navigate('/'), 3000);
          return;
        }

        // Exchange code for token via our backend
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reddit-oauth-callback`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code }),
          }
        );

        if (!response.ok) {
          throw new Error(`Token exchange failed: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.success) {
          // Store the session token
          localStorage.setItem('reddit_session', result.sessionToken);
          localStorage.removeItem('reddit_oauth_state');
          
          setStatus('success');
          setMessage('Successfully connected to Reddit!');
          
          // Redirect back to where they came from or dashboard
          const returnTo = localStorage.getItem('reddit_auth_return_to') || '/';
          localStorage.removeItem('reddit_auth_return_to');
          
          setTimeout(() => navigate(returnTo), 2000);
        } else {
          throw new Error(result.error || 'Unknown error during token exchange');
        }
      } catch (error) {
        console.error('Reddit OAuth callback error:', error);
        setStatus('error');
        setMessage(`Failed to complete Reddit authorization: ${error.message}`);
        setTimeout(() => navigate('/'), 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="pixel-card max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
            <h2 className="pixel-text text-xl mb-2">CONNECTING...</h2>
          </>
        )}
        
        {status === 'success' && (
          <>
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h2 className="pixel-text text-xl mb-2 text-green-400">SUCCESS!</h2>
          </>
        )}
        
        {status === 'error' && (
          <>
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="pixel-text text-xl mb-2 text-red-400">ERROR</h2>
          </>
        )}
        
        <p className="outfit-text text-gray-400">{message}</p>
        
        {status !== 'loading' && (
          <p className="outfit-text text-sm text-gray-500 mt-4">
            Redirecting you back to the app...
          </p>
        )}
      </div>
    </div>
  );
};

export default RedditCallbackPage;