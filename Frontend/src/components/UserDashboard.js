import React, { useState, useEffect, useRef } from 'react';
import Navigation from './Navigation';
import { getSession, getIncidents, saveIncidents } from '../utils/storage';
import { formatTime, generateIncidentId } from '../utils/format';
import { showNotification } from '../utils/notifications';

const UserDashboard = () => {
  const [user, setUser] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [formData, setFormData] = useState({
    type: '',
    severity: '',
    description: '',
    location: null
  });
  const [selectedLocation, setSelectedLocation] = useState(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const clusterGroupRef = useRef(null);
  const locationMarkerRef = useRef(null);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      window.location.href = '/auth';
      return;
    }
    setUser(session);
    
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

    // Cleanup function
    return () => {
      clearTimeout(timer);
      if (clusterGroupRef.current) {
        clusterGroupRef.current.clearLayers();
        clusterGroupRef.current = null;
      }
      if (locationMarkerRef.current) {
        locationMarkerRef.current = null;
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (user) {
      loadIncidents();
    }
  }, [user]);

  const loadIncidents = () => {
    if (!user) return;
    const allIncidents = getIncidents();
    setIncidents(allIncidents);
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
      }).setView([40.7128, -74.0060], 12);
      
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(mapInstanceRef.current);

        mapInstanceRef.current.on('click', (e) => {
          const latlng = e.latlng;
          setSelectedLocation({ lat: latlng.lat, lng: latlng.lng });
          setFormData(prev => ({ ...prev, location: { lat: latlng.lat, lng: latlng.lng } }));
          
          // Remove existing location marker
          if (locationMarkerRef.current) {
            mapInstanceRef.current.removeLayer(locationMarkerRef.current);
            locationMarkerRef.current = null;
          }
          
          // Add new location marker
          locationMarkerRef.current = window.L.marker([latlng.lat, latlng.lng], {
            icon: window.L.icon({
              iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
              shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
              iconSize: [25, 41],
              iconAnchor: [12, 41],
              popupAnchor: [1, -34],
              shadowSize: [41, 41]
            })
          }).addTo(mapInstanceRef.current);
          locationMarkerRef.current.bindPopup('Incident Location').openPopup();
        });

      // Create cluster group for incidents
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

      // Load ALL existing incidents (including unverified)
      const allIncidents = getIncidents();
      allIncidents.filter(i => i.location).forEach(incident => {
        const color = incident.severity === 5 ? '#8e44ad' : 
                     incident.severity === 4 ? '#e74c3c' : 
                     incident.severity === 3 ? '#e67e22' : 
                     incident.severity === 2 ? '#f39c12' : '#27ae60';
        
        const isVerified = incident.verified !== false;
        const markerColor = isVerified ? color : '#f59e0b';
        const opacity = isVerified ? 0.8 : 0.6;
        
        const marker = window.L.circleMarker([incident.location.lat, incident.location.lng], {
          radius: 6,
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
            <p style="font-size: 11px; color: #999;">Status: ${incident.status} ${!isVerified ? '(Unverified)' : ''}</p>
          </div>
        `;
        marker.bindPopup(popupContent);
        clusterGroupRef.current.addLayer(marker);
      });
      
      clusterGroupRef.current.addTo(mapInstanceRef.current);

      // Force map to resize
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 300);
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      showNotification('Geolocation is not supported', 'error');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setSelectedLocation(location);
        setFormData({ ...formData, location });
        
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([location.lat, location.lng], 15);
          // Remove existing location marker
          if (locationMarkerRef.current) {
            mapInstanceRef.current.removeLayer(locationMarkerRef.current);
            locationMarkerRef.current = null;
          }
          
          // Add new location marker
          locationMarkerRef.current = window.L.marker([location.lat, location.lng], {
            icon: window.L.icon({
              iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
              shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
              iconSize: [25, 41],
              iconAnchor: [12, 41],
              popupAnchor: [1, -34],
              shadowSize: [41, 41]
            })
          }).addTo(mapInstanceRef.current);
          locationMarkerRef.current.bindPopup('Your Location').openPopup();
        }
        
        showNotification('Location captured successfully!', 'success');
      },
      (error) => {
        showNotification('Unable to get your location', 'error');
      }
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.type || !formData.severity || !formData.description) {
      showNotification('Please fill in all required fields', 'error');
      return;
    }
    
    if (!formData.location) {
      showNotification('Please select a location on the map or use GPS', 'error');
      return;
    }

    const newIncident = {
      id: generateIncidentId(),
      type: formData.type,
      severity: parseInt(formData.severity),
      status: 'unverified',
      location: formData.location,
      description: formData.description,
      timestamp: new Date(),
      reporter: `${user.firstName} ${user.lastName}`,
      reporterId: user.id,
      assignedVolunteers: [],
      resources: [],
      resolvedAt: null,
      assignedTo: null,
      verified: false
    };

    const allIncidents = getIncidents();
    allIncidents.unshift(newIncident);
    saveIncidents(allIncidents);
    setIncidents(allIncidents);
    
    // Force immediate map update
    setTimeout(() => {
      if (mapInstanceRef.current && clusterGroupRef.current) {
        // Reload incidents on map
        const updatedIncidents = getIncidents();
        setIncidents(updatedIncidents);
      }
    }, 100);
    
    showNotification('Incident reported successfully!', 'success');
    
    // Reset form
    setFormData({ type: '', severity: '', description: '', location: null });
    setSelectedLocation(null);
    
    // Clear location markers
    if (mapInstanceRef.current && locationMarkerRef.current) {
      mapInstanceRef.current.removeLayer(locationMarkerRef.current);
      locationMarkerRef.current = null;
    }
  };

  if (!user) return null;

  const userReports = incidents.filter(i => i.reporterId === user.id);

  return (
    <div className="bg-gray-50 min-h-screen">
      <Navigation currentPage="user" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">User Dashboard</h1>
          <p className="text-gray-600 mt-2">Report incidents and track your submissions</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-gray-600 text-sm font-medium">Total Reports</p>
            <p className="text-3xl font-bold text-gray-900">{userReports.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-gray-600 text-sm font-medium">Verified Reports</p>
            <p className="text-3xl font-bold text-gray-900">{userReports.filter(r => r.verified).length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-gray-600 text-sm font-medium">Pending Verification</p>
            <p className="text-3xl font-bold text-gray-900">{userReports.filter(r => !r.verified).length}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Report New Incident</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Incident Type</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-lg"
                      required
                    >
                      <option value="">Select Type</option>
                      <option value="fire">🔥 Fire</option>
                      <option value="medical">🏥 Medical Emergency</option>
                      <option value="flood">🌊 Flooding</option>
                      <option value="accident">🚗 Traffic Accident</option>
                      <option value="earthquake">🌍 Earthquake</option>
                      <option value="other">❓ Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Severity Level</label>
                    <select
                      value={formData.severity}
                      onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-lg"
                      required
                    >
                      <option value="">Select Severity</option>
                      <option value="1">🟢 Low</option>
                      <option value="2">🟡 Medium</option>
                      <option value="3">🟠 High</option>
                      <option value="4">🔴 Critical</option>
                      <option value="5">🟣 Emergency</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows="4"
                    className="w-full p-3 border border-gray-300 rounded-lg"
                    placeholder="Describe the incident in detail..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={selectedLocation ? `${selectedLocation.lat.toFixed(6)}, ${selectedLocation.lng.toFixed(6)}` : ''}
                      className="flex-1 p-3 border border-gray-300 rounded-lg"
                      placeholder="Click on map or use GPS"
                      readOnly
                    />
                    <button
                      type="button"
                      onClick={getCurrentLocation}
                      className="bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700"
                    >
                      📍 GPS
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg font-medium"
                >
                  🚨 Report Incident
                </button>
              </form>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Incident Locations</h3>
              <div ref={mapRef} id="user-map" className="h-96 rounded-lg" style={{ minHeight: '400px' }}></div>
              <p className="text-sm text-gray-600 mt-2">📍 Click on the map to set incident location</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">My Reports</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {userReports.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No reports yet</p>
                ) : (
                  userReports.map(report => (
                    <div key={report.id} className="p-4 bg-gray-50 rounded-lg border-l-4 border-blue-500">
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-xs font-medium px-2 py-1 rounded bg-blue-500 text-white">
                          {report.type.toUpperCase()}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          report.verified ? 'bg-green-500' : 'bg-yellow-500'
                        } text-white`}>
                          {report.verified ? 'VERIFIED' : 'UNVERIFIED'}
                        </span>
                      </div>
                      <h4 className="font-medium text-gray-900 mb-2">{report.description}</h4>
                      <p className="text-xs text-gray-600">{formatTime(report.timestamp)}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;


