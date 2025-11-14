import React, { useState, useEffect, useRef } from 'react';
import Navigation from './Navigation';
import { getSession, getIncidents, saveIncidents } from '../utils/storage';
import { formatTime, getSeverityText, getSeverityColor } from '../utils/format';
import { showNotification } from '../utils/notifications';

const Incidents = () => {
  const [user, setUser] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [sortBy, setSortBy] = useState('timestamp');
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const clusterGroupRef = useRef(null);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      window.location.href = '/auth';
      return;
    }
    setUser(session);
    loadIncidents();
    
    // Wait for component to fully mount
    const timer = setTimeout(() => {
      const checkLeafletAndInit = () => {
        if (window.L && mapRef.current && !mapInstanceRef.current) {
          initializeMap();
        } else if (!window.L) {
          setTimeout(checkLeafletAndInit, 200);
        }
      };

      checkLeafletAndInit();
    }, 200);

    return () => {
      clearTimeout(timer);
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
  }, [incidents, activeFilter]);

  const loadIncidents = () => {
    setIncidents(getIncidents());
  };

  const getFilteredIncidents = () => {
    let filtered = [...incidents];
    
    if (activeFilter === 'new') {
      filtered = filtered.filter(i => i.status === 'new');
    } else if (activeFilter === 'assigned') {
      filtered = filtered.filter(i => i.status === 'assigned');
    } else if (activeFilter === 'completed') {
      filtered = filtered.filter(i => i.status === 'completed');
    } else if (activeFilter === 'critical') {
      filtered = filtered.filter(i => i.severity >= 4);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'severity':
          return b.severity - a.severity;
        case 'status':
          return a.status.localeCompare(b.status);
        case 'type':
          return a.type.localeCompare(b.type);
        case 'timestamp':
        default:
          return new Date(b.timestamp) - new Date(a.timestamp);
      }
    });

    return filtered;
  };

  const assignIncident = (incidentId) => {
    const updatedIncidents = incidents.map(incident => {
      if (incident.id === incidentId) {
        return {
          ...incident,
          status: 'assigned',
          assignedTo: 'VOL-001',
          assignedVolunteers: ['VOL-001']
        };
      }
      return incident;
    });
    saveIncidents(updatedIncidents);
    setIncidents(updatedIncidents);
    showNotification(`Incident ${incidentId} assigned`, 'success');
  };

  const updateStatus = (incidentId, newStatus) => {
    const updatedIncidents = incidents.map(incident => {
      if (incident.id === incidentId) {
        return {
          ...incident,
          status: newStatus,
          resolvedAt: newStatus === 'completed' ? new Date() : incident.resolvedAt
        };
      }
      return incident;
    });
    saveIncidents(updatedIncidents);
    setIncidents(updatedIncidents);
    showNotification(`Incident ${incidentId} status updated`, 'success');
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

      // Create new cluster group
      if (window.L.markerClusterGroup) {
        clusterGroupRef.current = window.L.markerClusterGroup({
          maxClusterRadius: 50,
          spiderfyOnMaxZoom: true,
          showCoverageOnHover: false,
          zoomToBoundsOnClick: true
        });
      } else {
        clusterGroupRef.current = window.L.layerGroup();
      }

      // Show filtered incidents (all incidents with location)
      const filteredIncidents = getFilteredIncidents().filter(i => i.location);
      filteredIncidents.forEach(incident => {
        const color = incident.severity === 5 ? '#8e44ad' : 
                     incident.severity === 4 ? '#e74c3c' : 
                     incident.severity === 3 ? '#e67e22' : 
                     incident.severity === 2 ? '#f39c12' : '#27ae60';
        
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
            <p style="font-size: 11px; color: #999;">Status: ${incident.status} ${!isVerified ? '(Unverified)' : ''}</p>
          </div>
        `;
        marker.bindPopup(popupContent);
        clusterGroupRef.current.addLayer(marker);
      });

      // Add cluster group to map
      clusterGroupRef.current.addTo(mapInstanceRef.current);
    } catch (error) {
      console.error('Error updating map markers:', error);
    }
  };

  if (!user) return null;

  const filteredIncidents = getFilteredIncidents();
  const stats = {
    total: incidents.length,
    active: incidents.filter(i => ['new', 'assigned', 'in-progress'].includes(i.status)).length,
    resolved: incidents.filter(i => i.status === 'completed').length,
    avgResponse: 12
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <Navigation currentPage="incidents" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Incident Management</h1>
          <p className="text-gray-600 mt-2">Monitor, manage, and coordinate incident response</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-gray-600 text-sm font-medium">Total Incidents</p>
            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-gray-600 text-sm font-medium">Active Incidents</p>
            <p className="text-3xl font-bold text-gray-900">{stats.active}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-gray-600 text-sm font-medium">Resolved Today</p>
            <p className="text-3xl font-bold text-gray-900">{stats.resolved}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-gray-600 text-sm font-medium">Avg Response Time</p>
            <p className="text-3xl font-bold text-gray-900">{stats.avgResponse}<span className="text-lg">m</span></p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Filter by:</span>
              {['all', 'new', 'assigned', 'completed', 'critical'].map(filter => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    activeFilter === filter
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-sm border border-gray-300 rounded-md px-2 py-1"
              >
                <option value="timestamp">Time</option>
                <option value="severity">Severity</option>
                <option value="status">Status</option>
                <option value="type">Type</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Recent Incidents</h3>
              <div className="space-y-4">
                {filteredIncidents.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No incidents found</p>
                ) : (
                  filteredIncidents.map(incident => (
                    <div
                      key={incident.id}
                      className={`p-6 rounded-lg shadow-sm border-l-4 ${
                        incident.severity >= 4 ? 'border-red-500' :
                        incident.severity >= 3 ? 'border-orange-500' : 'border-green-500'
                      } bg-white`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <span className={`text-xs font-medium px-2 py-1 rounded text-white ${
                            getSeverityColor(incident.severity) === '#8e44ad' ? 'bg-purple-500' :
                            getSeverityColor(incident.severity) === '#e74c3c' ? 'bg-red-500' :
                            getSeverityColor(incident.severity) === '#e67e22' ? 'bg-orange-500' :
                            getSeverityColor(incident.severity) === '#f39c12' ? 'bg-yellow-500' : 'bg-green-500'
                          }`}>
                            {incident.type.toUpperCase()}
                          </span>
                          <span className="text-xs px-2 py-1 rounded bg-gray-200 text-gray-700">
                            {incident.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-gray-500">{incident.id}</span>
                          <div className="text-xs text-gray-400 mt-1">{formatTime(incident.timestamp)}</div>
                        </div>
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-2">{incident.description}</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                        <div>
                          <span className="font-medium">Severity:</span> {getSeverityText(incident.severity)}
                        </div>
                        <div>
                          <span className="font-medium">Reporter:</span> {incident.reporter}
                        </div>
                      </div>
                      {incident.status === 'new' && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => assignIncident(incident.id)}
                            className="flex-1 bg-blue-600 text-white py-2 px-3 rounded text-sm hover:bg-blue-700"
                          >
                            Assign
                          </button>
                        </div>
                      )}
                      {incident.status === 'assigned' && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => updateStatus(incident.id, 'in-progress')}
                            className="flex-1 bg-yellow-600 text-white py-2 px-3 rounded text-sm hover:bg-yellow-700"
                          >
                            In Progress
                          </button>
                          <button
                            onClick={() => updateStatus(incident.id, 'completed')}
                            className="flex-1 bg-green-600 text-white py-2 px-3 rounded text-sm hover:bg-green-700"
                          >
                            Complete
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Incident Map</h3>
              <div ref={mapRef} id="incident-map" className="h-96 rounded-lg" style={{ minHeight: '400px' }}></div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 text-sm">
                  👥 Assign Volunteer
                </button>
                <button className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 text-sm">
                  🚨 Escalate Incident
                </button>
                <button className="w-full bg-yellow-600 text-white py-2 px-4 rounded-md hover:bg-yellow-700 text-sm">
                  🔧 Request Resources
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Incidents;


