import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Linkedin, Github, Send, Loader2 } from 'lucide-react';
import { AuthStatus } from '../components/AuthStatus';

const ContactPage: React.FC = () => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSending(true);
    
    // Simulate sending a message
    setTimeout(() => {
      setSending(false);
      setSent(true);
      
      // Reset form after showing success message
      setTimeout(() => {
        setName('');
        setEmail('');
        setMessage('');
        setSent(false);
      }, 5000);
    }, 1500);
  };

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
              <h2 className="pixel-text mobile-heading text-blue-400 glow-text">CONTACT US</h2>
              <p className="outfit-text text-gray-400 mt-1 text-sm sm:text-base break-words">
                Get in touch with the Trippit team
              </p>
            </div>
          </div>
          <AuthStatus className="flex-shrink-0" />
        </div>

        {/* Main Content */}
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 transform transition-all duration-1000 delay-300 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          {/* Contact Info */}
          <div className="pixel-card bg-gradient-to-br from-gray-900 to-gray-800 border-2 border-blue-500/20">
            <div className="flex items-center gap-3 mb-6">
              <Mail className="w-6 h-6 text-blue-400 animate-pulse" />
              <h3 className="pixel-text text-blue-400 text-lg">GET IN TOUCH</h3>
            </div>
            
            <div className="space-y-6 outfit-text text-gray-300">
              <p>
                Have questions, feedback, or just want to say hello? We'd love to hear from you! The Trippit team is always looking for ways to improve and make your travel experience better.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Linkedin className="w-5 h-5 text-blue-400 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-white">Connect on LinkedIn</h4>
                    <a 
                      href="https://www.linkedin.com/in/joshuabumanlag/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Joshua Bumanlag
                    </a>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Github className="w-5 h-5 text-purple-400 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-white">Find us on GitHub</h4>
                    <p className="text-purple-400">
                      Trippit Travel App
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="pixel-card bg-gradient-to-br from-blue-900/20 to-purple-900/20 border-blue-500/30">
                <h4 className="pixel-text text-yellow-400 text-sm mb-3">RESPONSE TIME</h4>
                <p className="text-sm">
                  We typically respond to inquiries within 1-2 business days. For urgent matters, please reach out directly via LinkedIn.
                </p>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="pixel-card bg-gradient-to-br from-gray-900 to-gray-800 border-2 border-purple-500/20">
            <div className="flex items-center gap-3 mb-6">
              <Send className="w-6 h-6 text-purple-400 animate-float" />
              <h3 className="pixel-text text-purple-400 text-lg">MESSAGE US</h3>
            </div>
            
            {sent ? (
              <div className="pixel-card bg-green-500/10 border-green-500/20 animate-bounce-in">
                <div className="text-center">
                  <div className="text-4xl mb-4">✅</div>
                  <h4 className="pixel-text text-green-400 text-sm mb-2">MESSAGE SENT!</h4>
                  <p className="outfit-text text-gray-300">
                    Thank you for reaching out! We'll get back to you as soon as possible.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block pixel-text text-xs text-purple-400 mb-2">
                    YOUR NAME
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full input-pixel"
                    placeholder="Enter your name"
                    required
                  />
                </div>
                
                <div>
                  <label className="block pixel-text text-xs text-purple-400 mb-2">
                    YOUR EMAIL
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full input-pixel"
                    placeholder="Enter your email address"
                    required
                  />
                </div>
                
                <div>
                  <label className="block pixel-text text-xs text-purple-400 mb-2">
                    YOUR MESSAGE
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full input-pixel h-32 resize-none"
                    placeholder="What would you like to tell us?"
                    required
                  />
                </div>
                
                {error && (
                  <div className="pixel-card bg-red-500/10 border-red-500/20">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}
                
                <button
                  type="submit"
                  disabled={sending}
                  className="pixel-button-primary w-full flex items-center justify-center gap-2"
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>SENDING...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>SEND MESSAGE</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* FAQ Section */}
        <div className={`mt-12 pixel-card bg-gradient-to-br from-gray-900 to-gray-800 border-2 border-yellow-500/20 transform transition-all duration-1000 delay-500 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <div className="flex items-center gap-3 mb-6">
            <div className="text-2xl">❓</div>
            <h3 className="pixel-text text-yellow-400 text-lg">FREQUENTLY ASKED QUESTIONS</h3>
          </div>
          
          <div className="space-y-6 outfit-text">
            <div>
              <h4 className="font-bold text-white mb-2">Is Trippit free to use?</h4>
              <p className="text-gray-300">
                Yes! Trippit is completely free to use. We believe travel planning should be accessible to everyone.
              </p>
            </div>
            
            <div>
              <h4 className="font-bold text-white mb-2">Can I use Trippit for group trips?</h4>
              <p className="text-gray-300">
                Absolutely! Trippit is designed for both solo travelers and groups. You can invite friends to join your trips and collaborate on planning.
              </p>
            </div>
            
            <div>
              <h4 className="font-bold text-white mb-2">How do I report a bug or suggest a feature?</h4>
              <p className="text-gray-300">
                You can use the contact form on this page to report bugs or suggest new features. We appreciate your feedback!
              </p>
            </div>
            
            <div>
              <h4 className="font-bold text-white mb-2">Is my data secure?</h4>
              <p className="text-gray-300">
                Yes, we take data security seriously. We use industry-standard encryption and security practices to protect your information. For more details, please see our Terms page.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12">
          <p className="outfit-text text-gray-500 text-sm">
            © Trippit 2025 • Made with ❤️ during the Bolt Hackathon
          </p>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;