import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Globe, MapPin, Compass, Heart } from 'lucide-react';
import { AuthStatus } from '../components/AuthStatus';

const AboutPage: React.FC = () => {
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
              <h2 className="pixel-text mobile-heading text-blue-400 glow-text">ABOUT TRIPPIT</h2>
              <p className="outfit-text text-gray-400 mt-1 text-sm sm:text-base break-words">
                Our story, mission, and the team behind the adventure
              </p>
            </div>
          </div>
          <AuthStatus className="flex-shrink-0" />
        </div>

        {/* Main Content */}
        <div className={`space-y-8 sm:space-y-12 transform transition-all duration-1000 delay-300 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          {/* Our Story */}
          <section className="pixel-card bg-gradient-to-br from-gray-900 to-gray-800 border-2 border-blue-500/20">
            <div className="flex items-center gap-3 mb-6">
              <Globe className="w-6 h-6 text-blue-400 animate-pulse" />
              <h3 className="pixel-text text-blue-400 text-lg">OUR STORY</h3>
            </div>
            
            <div className="space-y-4 outfit-text text-gray-300">
              <p>
                Trippit was born from a simple observation: first-time travelers often feel overwhelmed by the planning process and miss out on the joy of discovery. Our founders, BooManLag and mynrjad, experienced this firsthand during their early travel adventures.
              </p>
              <p>
                After one particularly chaotic trip where everything that could go wrong did go wrong, they realized there was a gap in the market. Most travel apps focused on experienced travelers or were too complex for beginners. What if there was an app that combined practical planning tools with fun challenges and real advice from travelers who'd been there before?
              </p>
              <p>
                That's how Trippit came to be - a lightweight travel companion that makes planning less stressful and the journey more fun, especially for those new to travel.
              </p>
            </div>
          </section>

          {/* Our Mission */}
          <section className="pixel-card bg-gradient-to-br from-gray-900 to-gray-800 border-2 border-purple-500/20">
            <div className="flex items-center gap-3 mb-6">
              <Compass className="w-6 h-6 text-purple-400 animate-float" />
              <h3 className="pixel-text text-purple-400 text-lg">OUR MISSION</h3>
            </div>
            
            <div className="space-y-4 outfit-text text-gray-300">
              <p>
                At Trippit, we believe that travel should be accessible and enjoyable for everyone, regardless of experience level. Our mission is to reduce the anxiety of travel planning while increasing the joy of discovery.
              </p>
              <p>
                We do this by:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Simplifying the planning process with intuitive tools</li>
                <li>Providing real, crowdsourced advice from travelers who've been there</li>
                <li>Adding elements of fun and gamification to encourage exploration</li>
                <li>Creating a supportive community where travelers can share experiences</li>
                <li>Focusing on practical solutions to common travel problems</li>
              </ul>
              <p>
                Our goal is to help you create memories that last a lifetime, with less stress and more adventure.
              </p>
            </div>
          </section>

          {/* Pain Points We Solve */}
          <section className="pixel-card bg-gradient-to-br from-gray-900 to-gray-800 border-2 border-red-500/20">
            <div className="flex items-center gap-3 mb-6">
              <Heart className="w-6 h-6 text-red-400 animate-pulse" />
              <h3 className="pixel-text text-red-400 text-lg">PAIN POINTS WE SOLVE</h3>
            </div>
            
            <div className="space-y-6 outfit-text text-gray-300">
              <div>
                <h4 className="font-bold text-white mb-2">Overwhelming Planning Process</h4>
                <p>
                  Many travelers feel paralyzed by the sheer amount of information and decisions required when planning a trip. Trippit breaks this down into manageable steps with clear guidance.
                </p>
              </div>
              
              <div>
                <h4 className="font-bold text-white mb-2">Fear of the Unknown</h4>
                <p>
                  First-time travelers often worry about making mistakes or encountering problems in unfamiliar places. Our "Where'd I Go?" game helps practice handling common travel scenarios before you even leave home.
                </p>
              </div>
              
              <div>
                <h4 className="font-bold text-white mb-2">Information Overload</h4>
                <p>
                  Generic travel advice is everywhere, but finding specific, relevant tips can be challenging. Trippit curates location-specific advice from real travelers who've been there.
                </p>
              </div>
              
              <div>
                <h4 className="font-bold text-white mb-2">Missing Out on Experiences</h4>
                <p>
                  Many travelers stick to tourist traps and miss authentic experiences. Our dare bucket list encourages stepping outside comfort zones to discover the heart of each destination.
                </p>
              </div>
              
              <div>
                <h4 className="font-bold text-white mb-2">Forgetting Essential Items</h4>
                <p>
                  It's easy to forget important items when packing. Our smart checklists ensure you're prepared for your specific destination and trip type.
                </p>
              </div>
            </div>
          </section>

          {/* The Team */}
          <section className="pixel-card bg-gradient-to-br from-gray-900 to-gray-800 border-2 border-green-500/20">
            <div className="flex items-center gap-3 mb-6">
              <MapPin className="w-6 h-6 text-green-400 animate-float" />
              <h3 className="pixel-text text-green-400 text-lg">THE TEAM</h3>
            </div>
            
            <div className="space-y-6 outfit-text text-gray-300">
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex-1">
                  <h4 className="font-bold text-white mb-2">Joshua Bumanlag (BooManLag)</h4>
                  <p className="mb-2">
                    Co-founder and lead developer with a passion for creating tools that solve real problems. Joshua brings technical expertise and a traveler's perspective to Trippit.
                  </p>
                  <a 
                    href="https://www.linkedin.com/in/joshuabumanlag/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    Connect on LinkedIn
                  </a>
                </div>
                
                <div className="flex-1">
                  <h4 className="font-bold text-white mb-2">mynrjad</h4>
                  <p>
                    Co-founder and creative director who brings the user experience to life. With a background in design and a love for adventure, mynrjad ensures Trippit is both functional and fun.
                  </p>
                </div>
              </div>
              
              <p>
                Together, we're a small team with big dreams, working to make travel more accessible and enjoyable for everyone. Trippit is our labor of love, built during the Bolt Hackathon to solve problems we've experienced firsthand.
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

export default AboutPage;