import { Routes, Route, Navigate } from 'react-router-dom';
import Shell from './components/Shell';
import Today from './pages/Today';
import Alerts from './pages/Alerts';
import Advisor from './pages/Advisor';
import Planting from './pages/Planting';
import Farms from './pages/Farms';
import Setup from './pages/Setup';
import Auth from './pages/Auth';
import { getSetup } from './lib/store';

function RequireSetup({ children }: { children: JSX.Element }) {
  return getSetup() ? children : <Navigate to="/setup" replace />;
}

export default function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<RequireSetup><Today /></RequireSetup>} />
        <Route path="/setup" element={<Setup />} />
        <Route path="/alerts" element={<RequireSetup><Alerts /></RequireSetup>} />
        <Route path="/advisor" element={<RequireSetup><Advisor /></RequireSetup>} />
        <Route path="/planting" element={<RequireSetup><Planting /></RequireSetup>} />
        <Route path="/farms" element={<Farms />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}
