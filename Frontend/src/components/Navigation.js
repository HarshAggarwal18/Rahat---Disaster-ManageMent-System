import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getSession, clearSession } from '../utils/storage';

const Navigation = ({ currentPage }) => {
  const navigate = useNavigate();
  const user = getSession();

  const handleLogout = () => {
    clearSession();
    navigate('/auth');
  };

  if (!user) return null;

  return (
    <nav className="gradient-bg shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-white text-xl font-bold">DisasterResponse</h1>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              <Link 
                to="/dashboard" 
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentPage === 'dashboard' ? 'text-orange-300' : 'text-gray-300 hover:text-orange-300'
                }`}
              >
                Dashboard
              </Link>
              {user.role === 'volunteer' && (
                <Link 
                  to="/volunteers" 
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentPage === 'volunteers' ? 'text-orange-300' : 'text-gray-300 hover:text-orange-300'
                  }`}
                >
                  Volunteers
                </Link>
              )}
              {user.role === 'admin' && (
                <>
                  <Link 
                    to="/admin" 
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      currentPage === 'admin' ? 'text-orange-300' : 'text-gray-300 hover:text-orange-300'
                    }`}
                  >
                    Admin
                  </Link>
                  <Link 
                    to="/incidents" 
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      currentPage === 'incidents' ? 'text-orange-300' : 'text-gray-300 hover:text-orange-300'
                    }`}
                  >
                    Incidents
                  </Link>
                </>
              )}
              {user.role === 'user' && (
                <Link 
                  to="/user" 
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentPage === 'user' ? 'text-orange-300' : 'text-gray-300 hover:text-orange-300'
                  }`}
                >
                  My Dashboard
                </Link>
              )}
              <span className="text-gray-300 px-3 py-2 text-sm font-medium">
                {user.firstName} {user.lastName} 
                <span className={`ml-2 inline-block px-2 py-1 rounded-full text-xs ${
                  user.role === 'admin' ? 'bg-red-600' : 
                  user.role === 'volunteer' ? 'bg-blue-600' : 'bg-green-600'
                } text-white`}>
                  {user.role.toUpperCase()}
                </span>
              </span>
              <button 
                onClick={handleLogout}
                className="text-gray-300 hover:text-orange-300 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;


