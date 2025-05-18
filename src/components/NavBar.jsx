import { useState } from "react";
import { FaUserCircle } from "react-icons/fa";
import ProfileSidebar from "./ProfileSidebar";
import { Link } from "react-router-dom";

const Navbar = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <nav className="flex justify-between items-center p-4 shadow-md bg-white">
      {/* Left: Product Name */}
      <div className="text-xl font-bold text-blue-600"><Link to="/">PolicyAgent</Link></div>

      {/* Right: Navigation */}
      <div className="flex items-center gap-6">
        <Link to="/pricing" className="text-gray-700 hover:text-blue-600">Pricing</Link>
        <Link to="/chat" className="text-gray-700 hover:text-blue-600">Chat</Link>
        <Link to="/documentation" className="text-gray-700 hover:text-blue-600">Documentation</Link>
        
        {/* Profile Icon */}
        <button onClick={() => setIsSidebarOpen(true)} className="text-2xl text-gray-700 hover:text-blue-600">
          <FaUserCircle />
        </button>
      </div>

      {/* Slide-out Sidebar */}
      <ProfileSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
    </nav>
  );
};

export default Navbar;
