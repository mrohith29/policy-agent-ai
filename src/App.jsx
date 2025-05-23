import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Account from './pages/Account';
import Settings from "./pages/Settings";
import Documentation from "./pages/documentation";
import Pricing from "./pages/Pricing";
import NavBar from "./components/NavBar";
import ProfileSidebar from "./components/ProfileSidebar";
import Chat from './pages/Chat';
import Login from './components/Login';
import Signup from './components/Signup';

function App() {
  return (
    <Router>
      <div className='flex'>
        <ProfileSidebar/>
        <div className='flex-1'>
          <NavBar/>
          <Routes>
            <Route path="/" element={<Home/>}/>
            <Route path="/chat" element={<Chat/>}/>
            <Route path="/account" element={<Account/>}/>
            <Route path="/settings" element={<Settings/>}/>
            <Route path="/documentation" element={<Documentation/>}/>
            <Route path="/pricing" element={<Pricing/>}/>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App; 