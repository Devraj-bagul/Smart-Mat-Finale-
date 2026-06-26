import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import HomePage from './pages/HomePage';
import AuthPage from './pages/AuthPage';
import YogaBookPage from './pages/YogaBookPage';
import VirtualSessionPage from './pages/VirtualSessionPage';
import AIGuruPage from './pages/AIGuruPage';
import StartYogaPage from './pages/StartYogaPage';
import ProfilePage from './pages/ProfilePage';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/yogabook" element={<YogaBookPage />} />
        <Route path="/virtual-session" element={<VirtualSessionPage />} />
        <Route path="/ai-guru" element={<AIGuruPage />} />
        <Route path="/start-yoga" element={<StartYogaPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
