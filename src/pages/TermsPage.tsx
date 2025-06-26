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
              <h2 className="pixel-text mobile-heading text-blue-400 glow-text">TERMS & PRIVACY</h2>
              <p className="outfit-text text-gray-400 mt-1 text-sm sm:text-base break-words">
                Legal information and privacy policy
              </p>
            </div>
          </div>
          <AuthStatus className="flex-shrink-0" />
        </div>

        {/* Main Content */}
        <div className={`space-y-8 sm:space-y-12 transform transition-all duration-1000 delay-300 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          {/* Terms of Service */}
          <section className="pixel-card bg-gradient-to-br from-gray-900 to-gray-800 border-2 border-blue-500/20">
            <div className="flex items-center gap-3 mb-6">
              <FileText className="w-6 h-6 text-blue-400 animate-pulse" />
              <h3 className="pixel-text text-blue-400 text-lg">TERMS OF SERVICE</h3>
            </div>
            
            <div className="space-y-4 outfit-text text-gray-300">
              <p className="font-semibold text-white">Last Updated: June 25, 2025</p>
              
              <p>
                Welcome to Trippit! These Terms of Service ("Terms") govern your use of the Trippit application, website, and services (collectively, the "Service"). By accessing or using the Service, you agree to be bound by these Terms.
              </p>
              
              <h4 className="font-bold text-white mt-6 mb-2">1. Acceptance of Terms</h4>
              <p>
                By accessing or using Trippit, you acknowledge that you have read, understood, and agree to be bound by these Terms. If you do not agree to these Terms, please do not use the Service.
              </p>
              
              <h4 className="font-bold text-white mt-6 mb-2">2. Description of Service</h4>
              <p>
                Trippit is a travel planning application that helps users organize trips, access travel tips, complete challenges, and track their travel experiences. The Service is provided for personal, non-commercial use only.
              </p>
              
              <h4 className="font-bold text-white mt-6 mb-2">3. User Accounts</h4>
              <p>
                To use certain features of the Service, you may need to create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to provide accurate and complete information when creating your account and to update your information as necessary.
              </p>
              
              <h4 className="font-bold text-white mt-6 mb-2">4. User Content</h4>
              <p>
                You retain ownership of any content you submit to the Service, including trip details, reviews, and photos ("User Content"). By submitting User Content, you grant Trippit a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, adapt, publish, and display such content for the purpose of providing and improving the Service.
              </p>
              
              <h4 className="font-bold text-white mt-6 mb-2">5. Prohibited Conduct</h4>
              <p>
                You agree not to:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Use the Service for any illegal purpose</li>
                <li>Violate any applicable laws or regulations</li>
                <li>Impersonate any person or entity</li>
                <li>Interfere with the operation of the Service</li>
                <li>Attempt to gain unauthorized access to the Service</li>
                <li>Use the Service to transmit harmful code or malware</li>
                <li>Harass, abuse, or harm another person</li>
              </ul>
              
              <h4 className="font-bold text-white mt-6 mb-2">6. Termination</h4>
              <p>
                Trippit reserves the right to terminate or suspend your account and access to the Service at any time, without notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties, or for any other reason.
              </p>
              
              <h4 className="font-bold text-white mt-6 mb-2">7. Disclaimer of Warranties</h4>
              <p>
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. TO THE FULLEST EXTENT PERMISSIBLE UNDER APPLICABLE LAW, TRIPPIT DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
              </p>
              
              <h4 className="font-bold text-white mt-6 mb-2">8. Limitation of Liability</h4>
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, TRIPPIT SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES.
              </p>
              
              <h4 className="font-bold text-white mt-6 mb-2">9. Changes to Terms</h4>
              <p>
                Trippit reserves the right to modify these Terms at any time. We will provide notice of significant changes by posting the updated Terms on the Service. Your continued use of the Service after such changes constitutes your acceptance of the new Terms.
              </p>
              
              <h4 className="font-bold text-white mt-6 mb-2">10. Governing Law</h4>
              <p>
                These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which Trippit operates, without regard to its conflict of law provisions.
              </p>
            </div>
          </section>

          {/* Privacy Policy */}
          <section className="pixel-card bg-gradient-to-br from-gray-900 to-gray-800 border-2 border-purple-500/20">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-6 h-6 text-purple-400 animate-float" />
              <h3 className="pixel-text text-purple-400 text-lg">PRIVACY POLICY</h3>
            </div>
            
            <div className="space-y-4 outfit-text text-gray-300">
              <p className="font-semibold text-white">Last Updated: June 25, 2025</p>
              
              <p>
                At Trippit, we take your privacy seriously. This Privacy Policy explains how we collect, use, and protect your personal information when you use our Service.
              </p>
              
              <h4 className="font-bold text-white mt-6 mb-2">1. Information We Collect</h4>
              <p>
                We collect the following types of information:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><span className="text-white">Account Information:</span> Email address, display name, and password</li>
                <li><span className="text-white">Trip Information:</span> Destinations, dates, and travel preferences</li>
                <li><span className="text-white">User Content:</span> Information you provide in checklists, bucket lists, and diary entries</li>
                <li><span className="text-white">Usage Data:</span> How you interact with our Service</li>
                <li><span className="text-white">Device Information:</span> Browser type, IP address, and device type</li>
              </ul>
              
              <h4 className="font-bold text-white mt-6 mb-2">2. How We Use Your Information</h4>
              <p>
                We use your information to:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Provide and improve the Service</li>
                <li>Personalize your experience</li>
                <li>Communicate with you about your account or the Service</li>
                <li>Respond to your inquiries and support requests</li>
                <li>Analyze usage patterns to improve the Service</li>
                <li>Protect the security and integrity of the Service</li>
              </ul>
              
              <h4 className="font-bold text-white mt-6 mb-2">3. Data Sharing and Disclosure</h4>
              <p>
                We do not sell your personal information. We may share your information in the following circumstances:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><span className="text-white">With Your Consent:</span> When you explicitly agree to share your information</li>
                <li><span className="text-white">Service Providers:</span> With third-party vendors who help us operate the Service</li>
                <li><span className="text-white">Legal Requirements:</span> When required by law or to protect our rights</li>
                <li><span className="text-white">Business Transfers:</span> In connection with a merger, acquisition, or sale of assets</li>
              </ul>
              
              <h4 className="font-bold text-white mt-6 mb-2">4. Data Security</h4>
              <p>
                We implement appropriate technical and organizational measures to protect your personal information from unauthorized access, disclosure, alteration, and destruction. However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
              </p>
              
              <h4 className="font-bold text-white mt-6 mb-2">5. Your Rights</h4>
              <p>
                Depending on your location, you may have certain rights regarding your personal information, including:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Accessing your personal information</li>
                <li>Correcting inaccurate information</li>
                <li>Deleting your personal information</li>
                <li>Restricting or objecting to processing</li>
                <li>Data portability</li>
                <li>Withdrawing consent</li>
              </ul>
              <p>
                To exercise these rights, please contact us using the information provided in the Contact section.
              </p>
              
              <h4 className="font-bold text-white mt-6 mb-2">6. Children's Privacy</h4>
              <p>
                The Service is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If you believe we have collected information from a child under 13, please contact us immediately.
              </p>
              
              <h4 className="font-bold text-white mt-6 mb-2">7. Changes to This Privacy Policy</h4>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.
              </p>
            </div>
          </section>

          {/* Data Protection */}
          <section className="pixel-card bg-gradient-to-br from-gray-900 to-gray-800 border-2 border-green-500/20">
            <div className="flex items-center gap-3 mb-6">
              <Lock className="w-6 h-6 text-green-400 animate-pulse" />
              <h3 className="pixel-text text-green-400 text-lg">DATA PROTECTION</h3>
            </div>
            
            <div className="space-y-4 outfit-text text-gray-300">
              <p>
                Trippit is committed to protecting your data. Here's how we implement data protection principles:
              </p>
              
              <h4 className="font-bold text-white mt-4 mb-2">Data Minimization</h4>
              <p>
                We only collect the information necessary to provide the Service. We don't ask for unnecessary personal details.
              </p>
              
              <h4 className="font-bold text-white mt-4 mb-2">Storage Limitation</h4>
              <p>
                We retain your data only for as long as necessary to provide the Service and comply with legal obligations.
              </p>
              
              <h4 className="font-bold text-white mt-4 mb-2">Security Measures</h4>
              <p>
                We use industry-standard security measures to protect your data, including:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Encryption of sensitive data</li>
                <li>Secure database access controls</li>
                <li>Regular security audits</li>
                <li>Employee training on data protection</li>
              </ul>
              
              <h4 className="font-bold text-white mt-4 mb-2">Third-Party Services</h4>
              <p>
                Trippit uses the following third-party services:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><span className="text-white">Supabase:</span> For database and authentication</li>
                <li><span className="text-white">Google AI:</span> For itinerary generation (optional feature)</li>
                <li><span className="text-white">Reddit API:</span> For sourcing travel tips (no personal data shared)</li>
              </ul>
              <p>
                Each of these services has their own privacy policies and security measures. We carefully select partners who maintain high standards of data protection.
              </p>
            </div>
          </section>

          {/* Cookie Policy */}
          <section className="pixel-card bg-gradient-to-br from-gray-900 to-gray-800 border-2 border-yellow-500/20">
            <div className="flex items-center gap-3 mb-6">
              <Eye className="w-6 h-6 text-yellow-400 animate-float" />
              <h3 className="pixel-text text-yellow-400 text-lg">COOKIE POLICY</h3>
            </div>
            
            <div className="space-y-4 outfit-text text-gray-300">
              <p>
                Trippit uses cookies and similar technologies to enhance your experience with our Service. This Cookie Policy explains how we use these technologies.
              </p>
              
              <h4 className="font-bold text-white mt-4 mb-2">What Are Cookies?</h4>
              <p>
                Cookies are small text files that are stored on your device when you visit a website. They are widely used to make websites work more efficiently and provide information to the website owners.
              </p>
              
              <h4 className="font-bold text-white mt-4 mb-2">How We Use Cookies</h4>
              <p>
                We use cookies for the following purposes:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><span className="text-white">Essential Cookies:</span> Required for the Service to function properly</li>
                <li><span className="text-white">Authentication Cookies:</span> To remember your login status</li>
                <li><span className="text-white">Preference Cookies:</span> To remember your settings and preferences</li>
                <li><span className="text-white">Analytics Cookies:</span> To understand how users interact with the Service</li>
              </ul>
              
              <h4 className="font-bold text-white mt-4 mb-2">Managing Cookies</h4>
              <p>
                Most web browsers allow you to control cookies through their settings. You can typically delete existing cookies, block certain types of cookies, or set your browser to notify you when cookies are being placed on your device.
              </p>
              <p>
                Please note that blocking or deleting certain cookies may impact the functionality of the Service.
              </p>
            </div>
          </section>

          {/* Contact Information */}
          <section className="pixel-card bg-gradient-to-br from-gray-900 to-gray-800 border-2 border-red-500/20">
            <div className="flex items-center gap-3 mb-6">
              <Mail className="w-6 h-6 text-red-400 animate-pulse" />
              <h3 className="pixel-text text-red-400 text-lg">CONTACT INFORMATION</h3>
            </div>
            
            <div className="space-y-4 outfit-text text-gray-300">
              <p>
                If you have any questions about these Terms, Privacy Policy, or our data practices, please contact us:
              </p>
              
              <div className="pixel-card bg-gradient-to-br from-blue-900/20 to-purple-900/20 border-blue-500/30">
                <div className="space-y-2">
                  <p>
                    <span className="text-white font-semibold">Contact Person:</span> Joshua Bumanlag
                  </p>
                  <p>
                    <span className="text-white font-semibold">LinkedIn:</span>{' '}
                    <a 
                      href="https://www.linkedin.com/in/joshuabumanlag/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 underline"
                    >
                      linkedin.com/in/joshuabumanlag
                    </a>
                  </p>
                </div>
              </div>
              
              <p>
                We will respond to your inquiry as soon as possible, typically within 1-2 business days.
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