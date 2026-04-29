import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import Navigation from './Navigation';
import { getSession } from '../utils/storage';
import { incidentsAPI, usersAPI, adminAPI } from '../utils/api';
import { formatTime, getSeverityColorClass } from '../utils/format';
import { showNotification } from '../utils/notifications';
import { socket } from '../utils/socket';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [stats, setStats] = useState({
    critical: 0,
    volunteers: 0,
    resolved: 0,
    avgResponse: 12
  });
  const [activeFilter, setActiveFilter] = useState('all');
  const [showHeatmap, setShowHeatmap] = useState(false);

  const duplicateIncidentCount = incidents.filter(i => i.ai?.duplicateOf).length;
  const criticalAIIncidents = incidents.filter(i => i.ai?.priority === 'critical').length;
  const aiConfidenceAvg = incidents.reduce((acc, incident) => acc + (incident.ai?.confidence || 0), 0) / Math.max(1, incidents.length);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const clusterGroupRef = useRef(null);
  const heatLayerRef = useRef(null);
  const typedTextRef = useRef(null);

  const location = useLocation();

  const loadData = useCallback(async () => {
    try {
      console.log('Dashboard: Loading data...');
      const incidentsResponse = await incidentsAPI.getAll();
      console.log('Dashboard: Incidents response:', incidentsResponse);
      
      if (incidentsResponse.success) {
        const incidentsData = incidentsResponse.data || [];
        console.log('Dashboard: Setting incidents:', incidentsData.length);
        setIncidents(incidentsData);
        
        const verifiedIncidents = incidentsData.filter(i => i.verified);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const resolvedToday = incidentsData.filter(i => {
          if (!i.resolvedAt) return false;
          const resolvedDate = new Date(i.resolvedAt);
          resolvedDate.setHours(0, 0, 0, 0);
          return resolvedDate.getTime() === today.getTime();
        }).length;

        try {
          const usersResponse = await usersAPI.getAll();
          const users = usersResponse.success ? (usersResponse.data || []) : [];
          setStats({
            critical: verifiedIncidents.length,
            volunteers: users.filter(u => u.role === 'volunteer').length,
            resolved: resolvedToday,
            avgResponse: 12
          });
        } catch (err) {
          console.warn('Dashboard: Could not load users (may not be admin):', err);
          setStats({
            critical: verifiedIncidents.length,
            volunteers: 0,
            resolved: resolvedToday,
            avgResponse: 12
          });
        }
      } else {
        console.error('Dashboard: Incidents response not successful:', incidentsResponse);
        showNotification('Failed to load incidents', 'error');
      }
    } catch (error) {
      console.error('Dashboard: Error loading data:', error);
      showNotification(error.message || 'Failed to load data', 'error');
    }
  }, []);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      window.location.href = '/auth';
      return;
    }
    setUser(session);
    loadData();
  }, [loadData]);

  useEffect(() => {
    const handleIncidentUpdate = () => {
      loadData();
    };

    socket.on('incident:created', handleIncidentUpdate);
    socket.on('incident:updated', handleIncidentUpdate);
    socket.on('incident:deleted', handleIncidentUpdate);

    return () => {
      socket.off('incident:created', handleIncidentUpdate);
      socket.off('incident:updated', handleIncidentUpdate);
      socket.off('incident:deleted', handleIncidentUpdate);
    };
  }, [loadData]);

  useEffect(() => {
    if (location.state?.unauthorized) {
      showNotification('Access denied: admin permissions required.', 'warning');
    }
  }, [location]);

  useEffect(() => {
    if (window.Typed && typedTextRef.current && user) {
      new window.Typed(typedTextRef.current, {
        strings: [
          'Emergency Response Dashboard',
          'Real-time Crisis Coordination',
          'Disaster Management System',
          'AI-Powered Response Platform'
        ],
        typeSpeed: 50,
        backSpeed: 30,
        backDelay: 2000,
        loop: true,
        showCursor: true,
        cursorChar: '|'
      });
    }
  }, [user]);

  useEffect(() => {
    // Wait for component to fully mount
    const timer = setTimeout(() => {
      const checkLeafletAndInit = () => {
        if (window.L && mapRef.current && !mapInstanceRef.current) {
          initializeMap();
        } else if (!window.L) {
          // Retry after a short delay if Leaflet isn't loaded yet
          setTimeout(checkLeafletAndInit, 200);
        }
      };

      checkLeafletAndInit();
    }, 200);

    // Cleanup function
    return () => {
      clearTimeout(timer);
      if (heatLayerRef.current) {
        heatLayerRef.current = null;
      }
      if (clusterGroupRef.current) {
        clusterGroupRef.current.clearLayers();
        clusterGroupRef.current = null;
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (mapInstanceRef.current && incidents.length >= 0) {
      // Delay to ensure map is fully rendered and incidents are loaded
      const timer = setTimeout(() => {
        updateMapMarkers();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [incidents, showHeatmap]);

  const initializeMap = () => {
    if (!window.L || !mapRef.current) {
      console.log('Leaflet not loaded or map ref not available');
      return;
    }
    
    if (mapInstanceRef.current) {
      console.log('Map already initialized');
      return;
    }
    
    try {
      // Clear any existing content
      if (mapRef.current) {
        mapRef.current.innerHTML = '';
      }

      mapInstanceRef.current = window.L.map(mapRef.current, {
        zoomControl: true
      }).setView([40.7128, -74.0060], 10);
      
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(mapInstanceRef.current);

      // Force map to resize after initialization
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
          updateMapMarkers();
        }
      }, 300);
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  };

  const updateMapMarkers = () => {
    if (!mapInstanceRef.current || !window.L) return;
    
    try {
      // Remove existing cluster group
      if (clusterGroupRef.current) {
        mapInstanceRef.current.removeLayer(clusterGroupRef.current);
        clusterGroupRef.current.clearLayers();
        clusterGroupRef.current = null;
      }

      // Remove existing heat layer
      if (heatLayerRef.current) {
        mapInstanceRef.current.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }

      // Create new cluster group
      if (window.L.markerClusterGroup) {
        clusterGroupRef.current = window.L.markerClusterGroup({
          maxClusterRadius: 50,
          spiderfyOnMaxZoom: true,
          showCoverageOnHover: false,
          zoomToBoundsOnClick: true
        });
      } else {
        // Fallback if clustering not available
        clusterGroupRef.current = window.L.layerGroup();
      }

      // Show ALL incidents (including unverified/reported ones)
      const allIncidents = incidents.filter(i => {
        if (!i.location) return false;
        // Handle both object and nested structure
        const lat = i.location.lat || (i.location.coordinates && i.location.coordinates[1]);
        const lng = i.location.lng || (i.location.coordinates && i.location.coordinates[0]);
        return lat != null && lng != null && !isNaN(lat) && !isNaN(lng);
      });
      
      console.log('Updating map with', allIncidents.length, 'incidents');
      
      allIncidents.forEach(incident => {
        // Get coordinates - handle different data structures
        const lat = incident.location.lat || (incident.location.coordinates && incident.location.coordinates[1]) || incident.location[1];
        const lng = incident.location.lng || (incident.location.coordinates && incident.location.coordinates[0]) || incident.location[0];
        
        if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
          console.warn('Invalid location for incident:', incident.id, incident.location);
          return;
        }
        const color = incident.severity === 5 ? '#8e44ad' : 
                     incident.severity === 4 ? '#e74c3c' : 
                     incident.severity === 3 ? '#e67e22' : 
                     incident.severity === 2 ? '#f39c12' : '#27ae60';
        
        // Use different style for unverified incidents
        const isVerified = incident.verified !== false;
        const markerColor = isVerified ? color : '#f59e0b';
        const opacity = isVerified ? 0.8 : 0.6;
        
        const marker = window.L.circleMarker([lat, lng], {
          radius: 8,
          fillColor: markerColor,
          color: '#ffffff',
          weight: 2,
          opacity: 1,
          fillOpacity: opacity
        });

        const popupContent = `
          <div style="padding: 8px;">
            <h4 style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">${incident.id}</h4>
            <p style="font-size: 12px; color: #666; margin-bottom: 4px;">${incident.type.toUpperCase()} - Severity ${incident.severity}</p>
            <p style="font-size: 12px; margin-bottom: 4px;">${incident.description}</p>
            <p style="font-size: 11px; color: #999; margin-bottom: 2px;">${formatTime(incident.timestamp)}</p>
            <p style="font-size: 11px; color: #999; margin-bottom: 2px;">Reporter: ${incident.reporter}</p>
            <p style="font-size: 11px; color: ${isVerified ? '#10b981' : '#f59e0b'};">
              Status: ${incident.status} ${!isVerified ? '(Unverified)' : ''}
            </p>
          </div>
        `;
        marker.bindPopup(popupContent);
        clusterGroupRef.current.addLayer(marker);
      });

      // Add cluster group to map
      clusterGroupRef.current.addTo(mapInstanceRef.current);

      // Add heat map if enabled - only show available incidents
      if (showHeatmap && window.L) {
        // Check if heatLayer is available (different ways it might be exposed)
        // leaflet-heat exposes it as L.heatLayer
        const HeatLayer = window.L.heatLayer || window.L.HeatLayer || (window.HeatLayer && window.HeatLayer.heatLayer);
        
        if (HeatLayer) {
          // Filter only available and verified incidents for heatmap
          const availableIncidents = allIncidents.filter(i => 
            i.verified && i.status === 'available' && !i.assignedTo
          );
          
          console.log('Dashboard: Creating heatmap with', availableIncidents.length, 'available incidents');
          
          const heatData = availableIncidents.map(incident => {
            const lat = incident.location.lat || (incident.location.coordinates && incident.location.coordinates[1]) || incident.location[1];
            const lng = incident.location.lng || (incident.location.coordinates && incident.location.coordinates[0]) || incident.location[0];
            // Scale severity (1-5) to intensity (0.3-1.0) for bold colors
            const intensity = 0.3 + ((incident.severity || 1) - 1) / 4 * 0.7;
            return [lat, lng, intensity];
          }).filter(data => data[0] != null && data[1] != null && !isNaN(data[0]) && !isNaN(data[1]));
          
          console.log('Dashboard: Heatmap data points:', heatData.length);
          
          if (heatData.length > 0) {
            try {
              heatLayerRef.current = HeatLayer(heatData, {
                radius: 50, // Increased radius for better visibility
                blur: 30, // Increased blur for smoother heat effect
                maxZoom: 18,
                minOpacity: 0.7, // More visible
                max: 1.0,
                gradient: {
                  0.0: '#00ff00', // Bold green for low severity
                  0.2: '#ffff00', // Bold yellow
                  0.4: '#ff8800', // Bold orange
                  0.6: '#ff4400', // Bold red-orange
                  0.8: '#ff0000', // Bold red
                  1.0: '#cc0000'  // Bold dark red for highest severity
                }
              });
              heatLayerRef.current.addTo(mapInstanceRef.current);
              console.log('Dashboard: Heatmap added successfully');
            } catch (heatError) {
              console.error('Dashboard: Error creating heatmap:', heatError);
            }
          } else {
            console.warn('Dashboard: No heatmap data points available');
          }
        } else {
          console.warn('Dashboard: HeatLayer not available. Make sure leaflet-heat.js is loaded.');
        }
      }
    } catch (error) {
      console.error('Error updating map markers:', error);
    }
  };

  const handleFilter = (filter) => {
    setActiveFilter(filter);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <Navigation />
      
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-slate-900 py-16 mb-8">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl"></div>
        
        <div className="max-w-7xl mx-auto px-4 relative z-10 text-center">
          <h2 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tight">
            <span ref={typedTextRef}></span>
          </h2>
          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto font-medium">
            Next-generation crisis intelligence and resource orchestration platform.
          </p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 pb-20">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {[
            { label: 'Active Incidents', value: stats.critical, color: 'text-rose-500', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z', bg: 'bg-rose-500/10' },
            { label: 'Ready Responders', value: stats.volunteers, color: 'text-indigo-500', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', bg: 'bg-indigo-500/10' },
            { label: 'Resolved Today', value: stats.resolved, color: 'text-emerald-500', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', bg: 'bg-emerald-500/10' },
            { label: 'Intelligence Score', value: '98%', color: 'text-amber-500', icon: 'M13 10V3L4 14h7v7l9-11h-7z', bg: 'bg-amber-500/10' },
          ].map((stat, idx) => (
            <div key={idx} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl transition-all hover:scale-[1.02] hover:border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.bg} p-3 rounded-xl`}>
                  <svg className={`w-6 h-6 ${stat.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={stat.icon} />
                  </svg>
                </div>
                <span className={`text-3xl font-black ${stat.color}`}>{stat.value}</span>
              </div>
              <h3 className="text-slate-500 font-bold uppercase tracking-wider text-xs">{stat.label}</h3>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Map Column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></div>
                  <h3 className="font-black text-white uppercase tracking-tight">Live Situation Map</h3>
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => setShowHeatmap(!showHeatmap)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      showHeatmap 
                        ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20' 
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {showHeatmap ? '🔥 Heatview On' : '📍 Standard View'}
                  </button>
                </div>
              </div>
              <div ref={mapRef} className="h-[500px] z-0 grayscale-[0.2] brightness-90 contrast-125"></div>
            </div>
          </div>

          {/* Activity Column */}
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
              <h3 className="font-black text-white uppercase tracking-tight mb-6 flex items-center">
                <svg className="w-5 h-5 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Recent Intelligence
              </h3>
              
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {incidents.length > 0 ? (
                  incidents.slice(0, 8).map(incident => (
                    <div key={incident.id} className="group p-4 bg-slate-800/50 border border-slate-700/50 rounded-2xl hover:bg-slate-800 transition-all cursor-pointer">
                      <div className="flex justify-between items-start mb-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${getSeverityColorClass(incident.severity)}`}>
                          Level {incident.severity}
                        </span>
                        <span className="text-slate-500 text-[10px] font-medium">{formatTime(incident.timestamp)}</span>
                      </div>
                      <h4 className="text-white font-bold text-sm mb-1 line-clamp-1 group-hover:text-indigo-400">{incident.type.toUpperCase()}</h4>
                      <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed">{incident.description}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                    </div>
                    <p className="text-slate-500 text-sm font-medium">Scanning for signals...</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-white font-black uppercase tracking-widest text-xs">AI Insights</h4>
                  <p className="text-slate-400 text-sm">Actionable signals from incident intelligence</p>
                </div>
                <span className="text-xs uppercase tracking-widest text-slate-500 bg-slate-800 px-2 py-1 rounded-full">
                  Confidence {Math.round(aiConfidenceAvg * 100)}%
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
                  <p className="text-slate-400 text-sm">Potential duplicate reports</p>
                  <p className="text-white text-3xl font-black">{duplicateIncidentCount}</p>
                </div>
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
                  <p className="text-slate-400 text-sm">Critical AI priority</p>
                  <p className="text-white text-3xl font-black">{criticalAIIncidents}</p>
                </div>
              </div>
            </div>

            <div className="bg-indigo-600 rounded-3xl p-6 shadow-2xl shadow-indigo-500/20 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                <svg className="w-24 h-24 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                </svg>
              </div>
              <h4 className="text-white font-black uppercase tracking-widest text-xs mb-2">System Status</h4>
              <p className="text-indigo-100 text-2xl font-black mb-4">All Protocols Active</p>
              <button className="w-full py-3 bg-white text-indigo-600 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-50 transition-colors">
                Run Diagnostic
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;


