import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUsers, saveUsers, setSession, initializeDemoData } from '../utils/storage';
import { generateUserId } from '../utils/format';
import { showNotification } from '../utils/notifications';

const Auth = () => {
  const [activeTab, setActiveTab] = useState('login');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({ 
    firstName: '', 
    lastName: '', 
    email: '', 
    password: '', 
    role: 'user' 
  });
  const navigate = useNavigate();

  useEffect(() => {
    initializeDemoData();
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    const { email, password } = loginForm;

    if (!email || !password) {
      showNotification('Please fill in all fields', 'error');
      return;
    }

    const users = getUsers();
    const user = users.find(u => u.email === email);

    if (user) {
      loginUser(user);
    } else {
      // New demo user - create session
      const demoUser = {
        id: generateUserId(),
        firstName: 'Demo',
        lastName: 'User',
        email: email,
        role: 'user',
        loginTime: new Date().toISOString()
      };
      
      const updatedUsers = [...users, demoUser];
      saveUsers(updatedUsers);
      loginUser(demoUser);
    }
  };

  const handleSignup = (e) => {
    e.preventDefault();
    const { firstName, lastName, email, password, role } = signupForm;

    if (!firstName || !lastName || !email || !password) {
      showNotification('Please fill in all fields', 'error');
      return;
    }

    const users = getUsers();
    if (users.find(u => u.email === email)) {
      showNotification('Email already registered', 'error');
      return;
    }

    const newUser = {
      id: generateUserId(),
      firstName,
      lastName,
      email,
      password,
      role,
      signupDate: new Date().toISOString(),
      loginTime: new Date().toISOString()
    };

    const updatedUsers = [...users, newUser];
    saveUsers(updatedUsers);

    showNotification(`Welcome ${firstName}! Account created successfully.`, 'success');
    
    setTimeout(() => {
      loginUser(newUser);
    }, 1500);
  };

  const loginUser = (user) => {
    setSession(user);
    showNotification(`Welcome ${user.firstName}! Redirecting...`, 'success');
    
    setTimeout(() => {
      switch (user.role) {
        case 'admin':
          navigate('/admin');
          break;
        case 'volunteer':
          navigate('/volunteers');
          break;
        case 'user':
          navigate('/user');
          break;
        default:
          navigate('/dashboard');
      }
    }, 1500);
  };

  return (
    <div className="gradient-bg min-h-screen flex items-center justify-center relative">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-1">
        <div className="absolute top-20 left-10 w-16 h-16 bg-orange-400 rounded-full opacity-10 animate-float"></div>
        <div className="absolute top-60 left-80 w-12 h-12 bg-red-400 rounded-lg opacity-10 animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-80 left-20 w-20 h-20 bg-yellow-400 rounded-full opacity-10 animate-float" style={{ animationDelay: '4s' }}></div>
        <div className="absolute top-30 left-70 w-14 h-14 bg-blue-400 rounded-lg opacity-10 animate-float" style={{ animationDelay: '6s' }}></div>
      </div>

      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4 relative z-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">DisasterResponse</h1>
          <p className="text-gray-600">Emergency Management System</p>
        </div>

        <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('login')}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
              activeTab === 'login' 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-600'
            }`}
          >
            Login
          </button>
          <button
            onClick={() => setActiveTab('signup')}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
              activeTab === 'signup' 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-600'
            }`}
          >
            Sign Up
          </button>
        </div>

        {activeTab === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={loginForm.email}
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your email"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your password"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
            >
              Login
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input
                  type="text"
                  value={signupForm.firstName}
                  onChange={(e) => setSignupForm({ ...signupForm, firstName: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="First name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input
                  type="text"
                  value={signupForm.lastName}
                  onChange={(e) => setSignupForm({ ...signupForm, lastName: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Last name"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={signupForm.email}
                onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your email"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={signupForm.password}
                onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your password"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">I want to register as:</label>
              <div className="grid grid-cols-3 gap-2">
                {['user', 'volunteer', 'admin'].map((role) => (
                  <label
                    key={role}
                    className={`flex items-center p-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-blue-50 ${
                      signupForm.role === role ? 'bg-blue-50 border-blue-500' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={role}
                      checked={signupForm.role === role}
                      onChange={(e) => setSignupForm({ ...signupForm, role: e.target.value })}
                      className="mr-2"
                    />
                    <span className="text-sm">
                      {role === 'user' ? '👤' : role === 'volunteer' ? '🚑' : '👨‍💼'} {role.charAt(0).toUpperCase() + role.slice(1)}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
            >
              Sign Up
            </button>
          </form>
        )}

        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="text-sm font-semibold text-blue-800 mb-2">📝 Demo Access</h3>
          <p className="text-xs text-blue-700 mb-2">Use any credentials to login - this is a demo system</p>
          <div className="text-xs text-blue-600 space-y-1">
            <div><strong>User:</strong> Reports incidents, tracks own incidents</div>
            <div><strong>Volunteer:</strong> Takes assigned incidents, completes tasks</div>
            <div><strong>Admin:</strong> Verifies incidents, manages system</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;


