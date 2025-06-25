import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from './utils/supabase';
import { useOfflineSync } from './hooks/useOfflineSync';
import OfflineIndicator from './components/OfflineIndicator';
import Chat from './pages/Chat';
import Pricing from './pages/Pricing';
import Login from './components/Login';
import Signup from './components/Signup';
import { MessageSquare, CreditCard, Home as HomeIcon, Menu, X, LogOut } from 'lucide-react';
import Button from './components/Button';
import DocumentUpload from './components/DocumentUpload';
import { NotificationProvider } from './contexts/NotificationContext';
import { UserProvider, UserContext } from './contexts/UserContext';

// Main app content component that uses router hooks
function AppContent() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { userProfile, userLoading } = React.useContext(UserContext);
  const { isOnline, syncStatus } = useOfflineSync();
  const navigate = useNavigate();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    // UserContext will automatically update userProfile to null via onAuthStateChange
    navigate('/');
  };
  
  const toggleMenu = () => {
    setIsMenuOpen(prev => !prev);
  };

  if (userLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const isAuthenticated = !!userProfile; // A user is authenticated if userProfile exists

  return (
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
            <Link 
              to="/chat" 
              className="text-gray-700 hover:text-indigo-600 transition-colors"
              onClick={(e) => {
                if (!isAuthenticated) {
                  e.preventDefault();
                  navigate('/login', { replace: true });
                }
              }}
            >
              Chat
            </Link>
            <Link to="/pricing" className="text-gray-700 hover:text-indigo-600 transition-colors">
              Pricing
            </Link>
            {isAuthenticated ? (
              <Button 
                variant="secondary" 
                className="ml-4"
                onClick={handleSignOut}
              >
                <LogOut size={18} className="mr-2" />
                Sign Out
              </Button>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="secondary" className="ml-4 w-24">
                    Login
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button variant="primary" className="ml-4 w-24">
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
              <Link 
                to="/chat" 
                className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-md"
                onClick={(e) => {
                  if (!isAuthenticated) {
                    e.preventDefault();
                    navigate('/login', { replace: true });
                  }
                  setIsMenuOpen(false);
                }}
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
              {isAuthenticated ? (
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
              ) : (
                <>
                  <Link 
                    to="/login" 
                    className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-md"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Button variant="secondary" className="w-full">
                      Login
                    </Button>
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
          <Route path="/" element={<HomePage isAuthenticated={isAuthenticated} />} />
          <Route 
            path="/chat" 
            element={isAuthenticated ? <Navigate to="/chat/new" replace /> : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/chat/:conversationId" 
            element={isAuthenticated ? <Chat /> : <Navigate to="/login" replace />} 
          />
          <Route path="/pricing" element={<Pricing />} />
          <Route 
            path="/login" 
            element={isAuthenticated ? <Navigate to="/chat" replace /> : <Login />} 
          />
          <Route 
            path="/signup" 
            element={isAuthenticated ? <Navigate to="/chat" replace /> : <Signup />} 
          />
          <Route path="/upload" element={<DocumentUpload />} />
        </Routes>
      </main>
      
      <OfflineIndicator 
        isOffline={!isOnline} 
        queueLength={syncStatus.pendingActions} 
      />
    </div>
  );
}

// Home page component
const HomePage = ({ isAuthenticated }) => {
  const navigate = useNavigate();
  
  return (
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
              <Button
                variant="primary"
                className="bg-white text-indigo-600 hover:bg-gray-100"
                onClick={() => {
                  if (isAuthenticated) {
                    navigate('/chat/new');
                  } else {
                    navigate('/signup');
                  }
                }}
              >
                Start Chatting
              </Button>
              <Link to="/pricing">
                <Button variant="secondary" className="text-white border-white hover:bg-white hover:text-indigo-600">
                  View Pricing
              </Button>
              </Link>
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
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-4xl font-bold text-center text-gray-800 mb-12">Key Features</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<MessageSquare size={36} className="text-indigo-600" />}
              title="Natural Language Interaction"
              description="Ask questions in plain English and get clear, concise answers to complex policies."
            />
            <FeatureCard 
              icon={<CreditCard size={36} className="text-indigo-600" />}
              title="Contextual Understanding"
              description="Our AI understands the nuances of legal jargon, providing accurate and relevant information."
            />
            <FeatureCard 
              icon={<HomeIcon size={36} className="text-indigo-600" />}
              title="Secure & Private"
              description="Your conversations are kept confidential and secure, ensuring your data privacy."
            />
          </div>
        </div>
      </section>
      
      {/* Call to Action Section */}
      <section className="bg-gray-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Simplify Policy Understanding?</h2>
          <p className="text-xl text-gray-300 mb-10">
            Join PolicyChat AI today and transform the way you interact with complex documents.
          </p>
          <Button
            variant="primary"
            className="bg-indigo-500 text-white hover:bg-indigo-600"
            onClick={() => {
              if (isAuthenticated) {
                navigate('/chat/new');
              } else {
                navigate('/signup');
              }
            }}
          >
            Get Started for Free
            </Button>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm">
          &copy; {new Date().getFullYear()} PolicyChat AI. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

// FeatureCard component
const FeatureCard = ({ icon, title, description }) => (
  <div className="bg-white rounded-lg shadow-sm p-6 text-center border border-gray-100">
    <div className="mb-4 flex justify-center">
      {icon}
    </div>
    <h3 className="text-xl font-semibold text-gray-800 mb-3">{title}</h3>
    <p className="text-gray-600">{description}</p>
  </div>
);

export default function App() {
  return (
    <NotificationProvider>
      <UserProvider>
        <Router>
          <AppContent />
        </Router>
      </UserProvider>
    </NotificationProvider>
  );
}