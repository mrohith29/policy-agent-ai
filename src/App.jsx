import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { supabase } from './utils/supabase';
import Chat from './pages/Chat';
import Pricing from './pages/Pricing';
import Login from './components/Login';
import Signup from './components/Signup';
import { MessageSquare, CreditCard, Home as HomeIcon, Menu, X, LogOut } from 'lucide-react';
import Button from './components/Button';

function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };
  
  const toggleMenu = () => {
    setIsMenuOpen(prev => !prev);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Navigation Bar */}
        <header className="bg-white shadow-subtle py-4 px-6">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center">
                <MessageSquare size={20} className="text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                PolicyChat AI
              </span>
            </Link>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <Link to="/" className="text-gray-700 hover:text-indigo-600 transition-colors">
                Home
              </Link>
              {session ? (
                <>
                  <Link to="/chat" className="text-gray-700 hover:text-indigo-600 transition-colors">
                    Chat
                  </Link>
                  <Link to="/pricing" className="text-gray-700 hover:text-indigo-600 transition-colors">
                    Pricing
                  </Link>
                  <Button 
                    variant="secondary" 
                    className="ml-4"
                    onClick={handleSignOut}
                  >
                    <LogOut size={18} className="mr-2" />
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/pricing" className="text-gray-700 hover:text-indigo-600 transition-colors">
                    Pricing
                  </Link>
                  <Link to="/login">
                    <Button variant="secondary" className="ml-4">
                      Login
                    </Button>
                  </Link>
                  <Link to="/signup">
                    <Button variant="primary" className="ml-4">
                      Sign Up
                    </Button>
                  </Link>
                </>
              )}
            </nav>
            
            {/* Mobile Menu Button */}
            <button className="md:hidden text-gray-700" onClick={toggleMenu}>
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
          
          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden pt-4 pb-2 px-4 mt-2 bg-white border-t border-gray-100 animate-slide-down">
              <nav className="flex flex-col gap-3">
                <Link 
                  to="/" 
                  className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-md"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <HomeIcon size={18} />
                  <span>Home</span>
                </Link>
                {session ? (
                  <>
                    <Link 
                      to="/chat" 
                      className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-md"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <MessageSquare size={18} />
                      <span>Chat</span>
                    </Link>
                    <Link 
                      to="/pricing" 
                      className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-md"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <CreditCard size={18} />
                      <span>Pricing</span>
                    </Link>
                    <Button 
                      variant="secondary" 
                      className="mt-2"
                      onClick={() => {
                        handleSignOut();
                        setIsMenuOpen(false);
                      }}
                    >
                      <LogOut size={18} className="mr-2" />
                      Sign Out
                    </Button>
                  </>
                ) : (
                  <>
                    <Link 
                      to="/pricing" 
                      className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-md"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <CreditCard size={18} />
                      <span>Pricing</span>
                    </Link>
                    <Link 
                      to="/login" 
                      className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-md"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <span>Login</span>
                    </Link>
                    <Link to="/signup">
                      <Button variant="primary" className="mt-2 w-full">
                        Sign Up
                      </Button>
                    </Link>
                  </>
                )}
              </nav>
            </div>
          )}
        </header>
        
        {/* Main Content */}
        <main className="flex-1 relative">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route 
              path="/chat" 
              element={session ? <Chat /> : <Navigate to="/login" />} 
            />
            <Route path="/pricing" element={<Pricing />} />
            <Route 
              path="/login" 
              element={session ? <Navigate to="/chat" /> : <Login />} 
            />
            <Route 
              path="/signup" 
              element={session ? <Navigate to="/chat" /> : <Signup />} 
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

// Home page component
const HomePage = () => (
  <div className="min-h-screen flex flex-col">
    {/* Hero Section */}
    <section className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white py-24">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center">
        <div className="md:w-1/2 mb-10 md:mb-0 md:pr-10">
          <h1 className="text-5xl font-bold leading-tight mb-6 animate-fade-in">
            Understand Any Policy with AI
          </h1>
          <p className="text-xl text-indigo-100 mb-8 animate-fade-in" style={{animationDelay: '100ms'}}>
            PolicyChat AI helps you understand complex legal language in privacy policies, 
            terms of service, and other documents through natural conversation.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 animate-fade-in" style={{animationDelay: '200ms'}}>
            <Button variant="primary" className="bg-white text-indigo-600 hover:bg-gray-100">
              Get Started Free
            </Button>
            <Button variant="secondary" className="border-white text-white hover:bg-indigo-700">
              See How It Works
            </Button>
          </div>
        </div>
        <div className="md:w-1/2 animate-fade-in" style={{animationDelay: '300ms'}}>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <MessageSquare size={20} className="text-white" />
              </div>
              <div className="text-lg font-semibold">PolicyChat AI</div>
            </div>
            <div className="space-y-4">
              <div className="bg-white/10 rounded-lg p-3 text-sm animate-pulse">
                Can you explain the data collection section in this privacy policy?
              </div>
              <div className="bg-white/20 rounded-lg p-3 text-sm">
                Of course! Based on this privacy policy, the company collects:
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Basic account information (name, email)</li>
                  <li>Usage data (how you interact with their service)</li>
                  <li>Device information (browser, IP address)</li>
                </ul>
                They use this information primarily for providing their service and improving user experience. You can opt out of certain collection in your account settings.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
    
    {/* Features Section */}
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-3xl font-bold text-center mb-16">How PolicyChat AI Works</h2>
        
        <div className="grid md:grid-cols-3 gap-12">
          {[
            {
              icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>,
              title: "Upload Your Document",
              description: "Simply upload any policy or legal document you need to understand. Our AI can process PDFs, Word documents, or plain text."
            },
            {
              icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>,
              title: "Ask Questions Naturally",
              description: "Ask questions about specific sections or the entire document in plain English. No need for legal expertise or complex queries."
            },
            {
              icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>,
              title: "Get Clear Explanations",
              description: "Receive easy-to-understand explanations that break down complex legal jargon into simple language anyone can understand."
            }
          ].map((feature, i) => (
            <div key={i} className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 bg-indigo-100 rounded-full flex items-center justify-center">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold mb-4">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
    
    {/* Testimonials */}
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-3xl font-bold text-center mb-16">What Our Users Say</h2>
        
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              quote: "PolicyChat AI helped me understand my rental agreement in minutes. It was like having a legal expert at my fingertips!",
              author: "Sarah T.",
              role: "Tenant"
            },
            {
              quote: "As a small business owner, reviewing contracts used to take days. Now I can get the key points explained clearly in seconds.",
              author: "Michael R.",
              role: "Entrepreneur"
            },
            {
              quote: "The ability to ask follow-up questions makes this so much better than just reading through legal documents on my own.",
              author: "Jamie L.",
              role: "Software Developer"
            }
          ].map((testimonial, i) => (
            <div key={i} className="bg-white p-8 rounded-xl shadow-subtle border border-gray-100">
              <div className="flex mb-6">
                {Array(5).fill(0).map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.8-2.034c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                  </svg>
                ))}
              </div>
              <p className="text-gray-700 mb-6 italic">"{testimonial.quote}"</p>
              <div>
                <p className="font-semibold">{testimonial.author}</p>
                <p className="text-gray-500 text-sm">{testimonial.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
    
    {/* CTA */}
    <section className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white py-16">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <h2 className="text-3xl font-bold mb-6">Ready to demystify legal jargon?</h2>
        <p className="text-xl mb-8 text-indigo-100">
          Join thousands of users who are already saving time and reducing stress when dealing with legal documents.
        </p>
        <Link to="/chat">
          <Button variant="primary" className="bg-white text-indigo-600 hover:bg-gray-100">
            Try PolicyChat AI Now
          </Button>
        </Link>
      </div>
    </section>
    
    {/* Footer */}
    <footer className="bg-gray-900 text-gray-400 py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <Link to="/" className="flex items-center gap-2 text-white mb-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center">
                <MessageSquare size={16} />
              </div>
              <span className="font-bold">PolicyChat AI</span>
            </Link>
            <p className="text-sm">
              Making legal documents understandable for everyone through the power of AI.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold text-white mb-4">Product</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Use Cases</a></li>
              <li><Link to="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
              <li><a href="#" className="hover:text-white transition-colors">API</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold text-white mb-4">Resources</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Support</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold text-white mb-4">Company</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">About</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Terms</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-12 pt-6 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm">© 2025 PolicyChat AI. All rights reserved.</p>
          <div className="flex gap-4 mt-4 md:mt-0">
            <a href="#" className="text-gray-400 hover:text-white transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path></svg>
            </a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
            </a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
            </a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  </div>
);

export default App; 