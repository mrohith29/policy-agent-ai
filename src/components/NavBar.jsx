import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';

const NavBar = () => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check initial session
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };
    getSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleChatClick = (e) => {
    if (!user) {
      e.preventDefault();
      navigate('/login', { replace: true });
    }
  };

  return (
    <nav className="bg-gray-900 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-xl font-bold">Policy Agent AI</Link>
        <div className="space-x-4">
          <Link to="/" className="hover:text-indigo-400">Home</Link>
          <Link 
            to="/chat" 
            className="hover:text-indigo-400"
            onClick={handleChatClick}
          >
            Chat
          </Link>
          <Link to="/document-upload" className="hover:text-indigo-400">Upload</Link>
          {user && (
            <>
              <Link to="/account" className="hover:text-indigo-400">Account</Link>
              <Link to="/settings" className="hover:text-indigo-400">Settings</Link>
            </>
          )}
          <Link to="/documentation" className="hover:text-indigo-400">Docs</Link>
          <Link to="/pricing" className="hover:text-indigo-400">Pricing</Link>
          {user ? (
            <button
              onClick={handleLogout}
              className="bg-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Logout
            </button>
          ) : (
            <>
              <Link to="/login" className="bg-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                Login
              </Link>
              <Link to="/signup" className="bg-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default NavBar;