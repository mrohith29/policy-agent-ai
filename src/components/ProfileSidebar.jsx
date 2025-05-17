import { FaTimes } from "react-icons/fa";

const ProfileSidebar = ({ isOpen, onClose }) => {
  return (
    <div
      className={`fixed top-0 right-0 h-full w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out z-50 ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="flex justify-between items-center p-4 border-b">
        <h2 className="text-lg font-semibold">Account</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-red-600">
          <FaTimes />
        </button>
      </div>
      <div className="p-4 space-y-4">
        <button className="w-full text-left hover:text-blue-600">Profile</button>
        <button className="w-full text-left hover:text-blue-600">Settings</button>
        <button className="w-full text-left text-red-500 hover:text-red-600">Sign Out</button>
      </div>
    </div>
  );
};

export default ProfileSidebar;
