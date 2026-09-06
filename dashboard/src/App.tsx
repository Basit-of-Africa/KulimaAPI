import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Key, FlaskConical, BookOpen, Heart } from 'lucide-react';
import Overview from './pages/Overview';
import ApiKeys from './pages/ApiKeys';
import Explorer from './pages/Explorer';
import Docs from './pages/Docs';

const NAV_ITEMS = [
  { path: '/', label: 'Overview', icon: LayoutDashboard },
  { path: '/keys', label: 'API Keys', icon: Key },
  { path: '/explorer', label: 'API Explorer', icon: FlaskConical },
  { path: '/docs', label: 'Docs', icon: BookOpen },
];

export default function App() {
  const location = useLocation();

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-kulima-700 flex items-center gap-2">
            🌾 KulimaAPI
          </h1>
          <p className="text-xs text-gray-500 mt-1">Agriculture Intelligence</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
            const active = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-kulima-50 text-kulima-700 border border-kulima-200'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Heart size={12} />
            Built for Nigerian agriculture
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/keys" element={<ApiKeys />} />
          <Route path="/explorer" element={<Explorer />} />
          <Route path="/docs" element={<Docs />} />
        </Routes>
      </main>
    </div>
  );
}
