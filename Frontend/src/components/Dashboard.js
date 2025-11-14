import React, { useState, useEffect, useRef } from 'react';
import Navigation from './Navigation';
import { getSession, getIncidents, getUsers } from '../utils/storage';
import { formatTime, getSeverityColorClass } from '../utils/format';
import { showNotification } from '../utils/notifications';

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
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const clusterGroupRef = useRef(null);
  const heatLayerRef = useRef(null);
  const typedTextRef = useRef(null);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      window.location.href = '/auth';
      return;
    }
    setUser(session);
    loadData();
  }, []);

  useEffect(() => {
    // Initialize typed text animation after component mounts
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
      updateMapMarkers();
    }
  }, [incidents, showHeatmap]);

  const loadData = () => {
    const allIncidents = getIncidents();
    const users = getUsers();
    
    setIncidents(allIncidents);
    
    const verifiedIncidents = allIncidents.filter(i => i.verified);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const resolvedToday = allIncidents.filter(i => {
      if (!i.resolvedAt) return false;
      const resolvedDate = new Date(i.resolvedAt);
      resolvedDate.setHours(0, 0, 0, 0);
      return resolvedDate.getTime() === today.getTime();
    }).length;

    setStats({
      critical: verifiedIncidents.length,
      volunteers: users.filter(u => u.role === 'volunteer').length,
      resolved: resolvedToday,
      avgResponse: 12
    });
  };

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
      const allIncidents = incidents.filter(i => i.location);
      allIncidents.forEach(incident => {
        const color = incident.severity === 5 ? '#8e44ad' : 
                     incident.severity === 4 ? '#e74c3c' : 
                     incident.severity === 3 ? '#e67e22' : 
                     incident.severity === 2 ? '#f39c12' : '#27ae60';
        
        // Use different style for unverified incidents
        const isVerified = incident.verified !== false;
        const markerColor = isVerified ? color : '#f59e0b';
        const opacity = isVerified ? 0.8 : 0.6;
        
        const marker = window.L.circleMarker([incident.location.lat, incident.location.lng], {
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

      // Add heat map if enabled
      if (showHeatmap && window.L && window.L.heatLayer) {
        const heatData = allIncidents.map(incident => [
          incident.location.lat,
          incident.location.lng,
          (incident.severity || 1) * 0.2 // Intensity based on severity (0.2 to 1.0)
        ]);
        
        heatLayerRef.current = window.L.heatLayer(heatData, {
          radius: 30,
          blur: 20,
          maxZoom: 17,
          gradient: {
            0.0: 'blue',
            0.3: 'cyan',
            0.5: 'lime',
            0.7: 'yellow',
            1.0: 'red'
          }
        });
        heatLayerRef.current.addTo(mapInstanceRef.current);
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
    <div className="bg-gray-50 min-h-screen">
      <Navigation currentPage="dashboard" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6 card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Active Incidents</p>
                <p className="text-3xl font-bold text-gray-900">{stats.critical}</p>
                <p className="text-red-600 text-sm mt-1">
                  <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs">+3 since last hour</span>
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Active Volunteers</p>
                <p className="text-3xl font-bold text-gray-900">{stats.volunteers}</p>
                <p className="text-blue-600 text-sm mt-1">
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">85% response rate</span>
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Resolved Today</p>
                <p className="text-3xl font-bold text-gray-900">{stats.resolved}</p>
                <p className="text-green-600 text-sm mt-1">
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">+12% efficiency</span>
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.414-1.414L11 9.586V6z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Avg Response Time</p>
                <p className="text-3xl font-bold text-gray-900">{stats.avgResponse}<span className="text-lg">m</span></p>
                <p className="text-green-600 text-sm mt-1">
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">-8% improvement</span>
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Live Incident Map</h3>
                <button
                  onClick={() => setShowHeatmap(!showHeatmap)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    showHeatmap
                      ? 'bg-orange-600 text-white hover:bg-orange-700'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {showHeatmap ? '🔥 Heat Map ON' : '🗺️ Show Heat Map'}
                </button>
              </div>
              <div ref={mapRef} id="incident-map" className="h-96 rounded-lg" style={{ minHeight: '400px' }}></div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter Incidents</h3>
              <div className="space-y-2">
                {['all', 'critical', 'fire', 'medical'].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => handleFilter(filter)}
                    className={`w-full text-left px-3 py-2 text-sm rounded transition-colors ${
                      activeFilter === filter
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {filter === 'all' ? 'All Incidents' : 
                     filter === 'critical' ? '🔴 Critical Only' :
                     filter === 'fire' ? '🔥 Fire Incidents' : '🏥 Medical'}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Live Activity Feed</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {incidents.filter(i => i.verified).slice(0, 8).map(incident => (
                  <div key={incident.id} className="p-3 bg-gray-50 rounded-lg border-l-4 border-blue-500">
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${getSeverityColorClass(incident.severity)}`}></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{incident.description}</p>
                        <p className="text-xs text-gray-500">{incident.type.toUpperCase()} • {incident.id} • {formatTime(incident.timestamp)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;


