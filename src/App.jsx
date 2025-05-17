import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Account from './pages/Account';
import Settings from "./pages/Settings";
import Documentation from "./pages/documentation";
import Pricing from "./pages/Pricing";
import NavBar from "./components/NavBar";
import ProfileSidebar from "./components/ProfileSidebar";

function App() {
  return (
    <Router>
      <div className='flex'>
        <ProfileSidebar/>
        <div className='flex-1'>
          <NavBar/>
          <Routes>
            <Route path="/" element={<Home/>}/>
            <Route path="/account" element={<Account/>}/>
            <Route path="/settings" element={<Settings/>}/>
            <Route path="/documentation" element={<Documentation/>}/>
            <Route path="/pricing" element={<Pricing/>}/>
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App; 