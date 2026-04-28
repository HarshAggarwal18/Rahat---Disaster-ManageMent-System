import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { getSession, clearSession } from '../utils/storage';

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    clearSession();
    navigate('/auth');
  };

  if (!user) return null;

  const isActive = (path) => location.pathname === path;

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', roles: ['admin', 'volunteer', 'user'] },
    { name: 'Volunteers', path: '/volunteers', roles: ['admin', 'volunteer'] },
    { name: 'Incidents', path: '/incidents', roles: ['admin'] },
    { name: 'My Dashboard', path: '/user', roles: ['user'] },
    { name: 'Admin', path: '/admin', roles: ['admin'] },
  ];

  return (
    <nav className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-white text-2xl font-black tracking-tight">RAHAT RESPONSE</h1>
          </div>
          
          <div className="hidden md:flex items-center space-x-1">
            {navLinks.filter(link => link.roles.includes(user.role)).map(link => (
              <Link 
                key={link.path}
                to={link.path} 
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  isActive(link.path) 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center space-x-4 pl-4 border-l border-slate-800">
            <div className="flex flex-col items-end">
              <span className="text-white text-sm font-bold leading-none">{user.firstName} {user.lastName}</span>
              <span className={`text-[10px] font-black uppercase tracking-wider mt-1 px-2 py-0.5 rounded ${
                user.role === 'admin' ? 'text-rose-400 bg-rose-400/10' : 
                user.role === 'volunteer' ? 'text-amber-400 bg-amber-400/10' : 'text-emerald-400 bg-emerald-400/10'
              }`}>
                {user.role}
              </span>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-all"
              title="Logout"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>

          <div className="md:hidden">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-slate-400 p-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16m-7 6h7"} />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div className="md:hidden bg-slate-900 border-t border-slate-800 p-4 space-y-2">
          {navLinks.filter(link => link.roles.includes(user.role)).map(link => (
            <Link 
              key={link.path}
              to={link.path} 
              onClick={() => setIsMenuOpen(false)}
              className={`block px-4 py-3 rounded-xl text-base font-medium ${
                isActive(link.path) ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              {link.name}
            </Link>
          ))}
          <button onClick={handleLogout} className="w-full text-left px-4 py-3 rounded-xl text-rose-400 font-medium hover:bg-rose-400/10 transition-colors">
            Logout
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navigation;


