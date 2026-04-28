import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { setSession } from "../utils/storage";
import { authAPI } from "../utils/api";
import { showNotification } from "../utils/notifications";

const Auth = () => {
  const [activeTab, setActiveTab] = useState("login");
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [signupForm, setSignupForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "user",
  });
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode === 'signup') {
      setActiveTab('signup');
    }
  }, [searchParams]);

  const handleLogin = async (e) => {
    e.preventDefault();
    const { email, password } = loginForm;
    if (!email || !password) {
      showNotification("Please fill in all fields", "error");
      return;
    }
    setLoading(true);
    try {
      const response = await authAPI.login(email, password);
      if (response.success) {
        setSession(response.user, response.token);
        showNotification(`Welcome ${response.user.firstName}!`, "success");
        setTimeout(() => {
          if (response.user.role === "admin") navigate("/admin");
          else if (response.user.role === "volunteer") navigate("/volunteers");
          else navigate("/user");
        }, 1000);
      }
    } catch (error) {
      showNotification(error.message || "Login failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    const { firstName, lastName, email, password, role } = signupForm;
    if (!firstName || !lastName || !email || !password) {
      showNotification("Please fill in all fields", "error");
      return;
    }
    setLoading(true);
    try {
      const response = await authAPI.register({ firstName, lastName, email, password, role });
      if (response.success) {
        setSession(response.user, response.token);
        showNotification("Account created successfully!", "success");
        setTimeout(() => {
          if (response.user.role === "admin") navigate("/admin");
          else if (response.user.role === "volunteer") navigate("/volunteers");
          else navigate("/user");
        }, 1000);
      }
    } catch (error) {
      showNotification(error.message || "Signup failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-rose-600/10 rounded-full blur-[120px]"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03]"></div>
      </div>
      <div className="w-full max-w-lg relative z-10">
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-[2.5rem] p-10 shadow-2xl">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-600 rounded-3xl shadow-xl shadow-indigo-500/20 mb-6 rotate-3 hover:rotate-0 transition-transform duration-300">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight mb-2 uppercase">Rahat Response</h1>
            <p className="text-slate-400 font-medium">Disaster Response Management System</p>
          </div>

          <div className="flex p-1.5 bg-slate-800/50 rounded-2xl mb-8">
            <button
              onClick={() => setActiveTab("login")}
              className={`flex-1 py-3 px-6 rounded-xl font-bold text-sm transition-all duration-300 ${
                activeTab === "login" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              LOGIN
            </button>
            <button
              onClick={() => setActiveTab("signup")}
              className={`flex-1 py-3 px-6 rounded-xl font-bold text-sm transition-all duration-300 ${
                activeTab === "signup" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              SIGN UP
            </button>
          </div>

          {activeTab === "login" ? (
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Email</label>
                <input
                  type="email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white p-4 rounded-2xl outline-none"
                  placeholder="name@agency.gov"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Password</label>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white p-4 rounded-2xl outline-none"
                  placeholder="••••••••"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black p-4 rounded-2xl transition-all shadow-xl shadow-indigo-500/20"
              >
                {loading ? "AUTHENTICATING..." : "SIGN IN"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">First Name</label>
                <input
                  type="text"
                  value={signupForm.firstName}
                  onChange={(e) => setSignupForm({ ...signupForm, firstName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white p-4 rounded-2xl outline-none"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Last Name</label>
                <input
                  type="text"
                  value={signupForm.lastName}
                  onChange={(e) => setSignupForm({ ...signupForm, lastName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white p-4 rounded-2xl outline-none"
                  required
                />
              </div>
              <div className="col-span-2 space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Email</label>
                <input
                  type="email"
                  value={signupForm.email}
                  onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white p-4 rounded-2xl outline-none"
                  required
                />
              </div>
              <div className="col-span-2 space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Role</label>
                <select
                  value={signupForm.role}
                  onChange={(e) => setSignupForm({ ...signupForm, role: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white p-4 rounded-2xl outline-none"
                >
                  <option value="user">Citizen / Reporter</option>
                  <option value="volunteer">Volunteer / Responder</option>
                  <option value="admin">System Admin</option>
                </select>
              </div>
              <div className="col-span-2 space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Password</label>
                <input
                  type="password"
                  value={signupForm.password}
                  onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white p-4 rounded-2xl outline-none"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="col-span-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black p-4 rounded-2xl shadow-xl transition-all"
              >
                CREATE ACCOUNT
              </button>
            </form>
          )}

          <div className="mt-8 text-center">
            <p className="text-slate-500 text-[10px] font-black leading-relaxed tracking-widest">
              SECURE ACCESS FOR AUTHORIZED RESPONSE TEAMS
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;