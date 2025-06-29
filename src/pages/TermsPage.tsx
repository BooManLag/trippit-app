import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Shield, Eye, Lock } from 'lucide-react';
import { AuthStatus } from '../components/AuthStatus';

const TermsPage: React.FC = () => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white mobile-padding py-6 sm:py-8 lg:py-12 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-10 left-10 w-2 h-2 bg-blue-500 rounded-full animate-pulse opacity-60"></div>
        <div className="absolute top-32 right-20 w-1 h-1 bg-yellow-400 rounded-full animate-ping opacity-40"></div>
        <div className="absolute bottom-40 left-1/4 w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce opacity-50"></div>
        <div className="absolute top-1/2 right-10 w-1 h-1 bg-green-400 rounded-full animate-pulse opacity-30"></div>
        <div className="absolute bottom-20 right-1/3 w-2 h-2 bg-pink-500 rounded-full animate-ping opacity-40"></div>
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <div className={`flex items-center justify-between mb-6 sm:mb-8 lg:mb-12 transform transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <button 
              onClick={() => navigate('/')} 
              className="text-blue-400 hover:text-blue-300 transition-colors hover:scale-110 flex-shrink-0"
            >
              <ArrowLeft className="w-4 sm:w-5 h-4 sm:h-5" />
            </button>
            <div className="min-w-0 flex-1">
              <h2 className="pixel-text mobile-heading text-blue-400 glow-text">COMMUNITY</h2>
              <p className="outfit-text text-gray-400 mt-1 text-sm sm:text-base break-words">
                Join our Reddit community
              </p>
            </div>
          </div>
          <AuthStatus className="flex-shrink-0" />
        </div>

        {/* Main Content */}
        <div className={`space-y-8 sm:space-y-12 transform transition-all duration-1000 delay-300 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          {/* Reddit Community */}
          <section className="pixel-card bg-gradient-to-br from-gray-900 to-gray-800 border-2 border-red-500/20">
            <div className="flex items-center gap-3 mb-6">
              <FileText className="w-6 h-6 text-red-400 animate-pulse" />
              <h3 className="pixel-text text-red-400 text-lg">JOIN OUR COMMUNITY</h3>
            </div>
            
            <div className="space-y-4 outfit-text text-gray-300">
              <p>
                We've created a Reddit community where travelers can share their experiences, itineraries, and tips with each other.
              </p>
              
              <div className="pixel-card bg-gradient-to-br from-red-900/20 to-orange-900/20 border-red-500/30 text-center">
                <h4 className="pixel-text text-red-400 text-sm mb-3">r/trippit</h4>
                <p className="text-sm mb-4">
                  Join our growing community of travelers sharing their adventures, tips, and stories.
                </p>
                <a 
                  href="https://www.reddit.com/r/trippit/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="pixel-button-primary bg-red-600 hover:bg-red-500 inline-block"
                >
                  VISIT SUBREDDIT
                </a>
              </div>
              
              <p>
                In our Reddit community, you can:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Share your completed itineraries</li>
                <li>Ask for advice about specific destinations</li>
                <li>Post photos from your trips</li>
                <li>Connect with other travelers</li>
                <li>Suggest new features for the Trippit app</li>
              </ul>
              
              <p>
                We look forward to seeing you there and hearing about your adventures!
              </p>
            </div>
          </section>

          {/* Footer */}
          <div className="text-center">
            <p className="outfit-text text-gray-500 text-sm">
              © Trippit 2025 • Made with ❤️ during the Bolt Hackathon
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;