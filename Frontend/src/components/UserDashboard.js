import React, { useState, useEffect, useRef } from 'react';
import Navigation from './Navigation';
import { getSession } from '../utils/storage';
import { incidentsAPI } from '../utils/api';
import { formatTime } from '../utils/format';
import { showNotification } from '../utils/notifications';
import { socket } from '../utils/socket';

const UserDashboard = () => {
  const [user, setUser] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [formData, setFormData] = useState({
    type: '',
    severity: '',
    description: '',
    location: null,
    peopleRequired: 1
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

  useEffect(() => {
    const handleIncidentUpdate = () => {
      loadIncidents();
    };

    socket.on('incident:created', handleIncidentUpdate);
    socket.on('incident:updated', handleIncidentUpdate);
    socket.on('incident:deleted', handleIncidentUpdate);

    return () => {
      socket.off('incident:created', handleIncidentUpdate);
      socket.off('incident:updated', handleIncidentUpdate);
      socket.off('incident:deleted', handleIncidentUpdate);
    };
  }, [user]);

  // Update map when incidents change
  useEffect(() => {
    if (mapInstanceRef.current && incidents.length >= 0 && clusterGroupRef.current !== null) {
      // Re-initialize map markers when incidents update
      const updateMapWithIncidents = () => {
        if (!mapInstanceRef.current || !window.L) return;
        
        try {
          // Remove existing cluster group
          if (clusterGroupRef.current) {
            mapInstanceRef.current.removeLayer(clusterGroupRef.current);
            clusterGroupRef.current.clearLayers();
            clusterGroupRef.current = null;
          }
          
          // Recreate cluster group
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

          const allIncidents = incidents.filter(i => {
            if (!i.location) return false;
            const lat = i.location.lat || (i.location.coordinates && i.location.coordinates[1]);
            const lng = i.location.lng || (i.location.coordinates && i.location.coordinates[0]);
            return lat != null && lng != null && !isNaN(lat) && !isNaN(lng);
          });
          
          console.log('UserDashboard useEffect: Updating map with', allIncidents.length, 'incidents');
          
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
            
            const isVerified = incident.verified !== false;
            const markerColor = isVerified ? color : '#f59e0b';
            const opacity = isVerified ? 0.8 : 0.6;
            
            const marker = window.L.circleMarker([lat, lng], {
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
          
          if (clusterGroupRef.current) {
            clusterGroupRef.current.addTo(mapInstanceRef.current);
          }
        } catch (error) {
          console.error('Error updating map markers:', error);
        }
      };
      
      const timer = setTimeout(() => {
        updateMapWithIncidents();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [incidents]);

  const loadIncidents = async () => {
    if (!user) return;
    try {
      console.log('UserDashboard: Loading incidents...');
      const response = await incidentsAPI.getAll();
      console.log('UserDashboard: Incidents response:', response);
      
      if (response.success) {
        const incidentsData = response.data || [];
        console.log('UserDashboard: Setting incidents:', incidentsData.length);
        setIncidents(incidentsData);
      } else {
        console.error('UserDashboard: Response not successful:', response);
        showNotification('Failed to load incidents', 'error');
      }
    } catch (error) {
      console.error('UserDashboard: Error loading incidents:', error);
      showNotification(error.message || 'Failed to load incidents', 'error');
    }
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
      // This will be populated from state after API call
      const allIncidents = incidents.filter(i => {
        if (!i.location) return false;
        const lat = i.location.lat || (i.location.coordinates && i.location.coordinates[1]);
        const lng = i.location.lng || (i.location.coordinates && i.location.coordinates[0]);
        return lat != null && lng != null && !isNaN(lat) && !isNaN(lng);
      });
      
      console.log('UserDashboard: Updating map with', allIncidents.length, 'incidents');
      
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
        
        const isVerified = incident.verified !== false;
        const markerColor = isVerified ? color : '#f59e0b';
        const opacity = isVerified ? 0.8 : 0.6;
        
        const marker = window.L.circleMarker([lat, lng], {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.type || !formData.severity || !formData.description) {
      showNotification('Please fill in all required fields', 'error');
      return;
    }
    
    try {
      // Validate location
      if (!formData.location || !formData.location.lat || !formData.location.lng) {
        showNotification('Please select a location on the map or use GPS', 'error');
        return;
      }

      // Validate all fields
      if (!formData.type || !formData.severity || !formData.description) {
        showNotification('Please fill in all required fields', 'error');
        return;
      }

      const incidentData = {
        type: formData.type,
        severity: parseInt(formData.severity),
        description: formData.description.trim(),
        location: {
          lat: parseFloat(formData.location.lat),
          lng: parseFloat(formData.location.lng)
        },
        peopleRequired: parseInt(formData.peopleRequired || 1)
      };

          console.log('Creating incident with data:', incidentData);
          
          const response = await incidentsAPI.create(incidentData);

          console.log('Incident creation response:', response);

      if (response.success) {
        showNotification('Incident reported successfully!', 'success');
        
        // Reset form first
        setFormData({ type: '', severity: '', description: '', location: null, peopleRequired: 1 });
        setSelectedLocation(null);
        
        // Clear location markers
        if (mapInstanceRef.current && locationMarkerRef.current) {
          mapInstanceRef.current.removeLayer(locationMarkerRef.current);
          locationMarkerRef.current = null;
        }
        
        // Reload incidents to update the list and map - wait a bit for DB to update
        setTimeout(async () => {
          await loadIncidents();
        }, 500);
      } else {
        showNotification(response.message || 'Failed to report incident', 'error');
      }
    } catch (error) {
      console.error('Error creating incident:', error);
      showNotification(error.message || 'Failed to report incident. Please try again.', 'error');
    }
  };

  if (!user) return null;

  const userReports = incidents.filter(i => {
    const reporterId = i.reporterId?._id || i.reporterId?.id || i.reporterId;
    const userId = user?._id || user?.id;
    return reporterId && userId && reporterId.toString() === userId.toString();
  });

  return (
    <div className="bg-slate-950 text-slate-200 min-h-screen">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">User Dashboard</h1>
          <p className="text-slate-400 mt-2">Report incidents and track your submissions</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl p-6">
            <p className="text-slate-400 text-sm font-medium">Total Reports</p>
            <p className="text-3xl font-bold text-white">{userReports.length}</p>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl p-6">
            <p className="text-slate-400 text-sm font-medium">Verified Reports</p>
            <p className="text-3xl font-bold text-white">{userReports.filter(r => r.verified).length}</p>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl p-6">
            <p className="text-slate-400 text-sm font-medium">Pending Verification</p>
            <p className="text-3xl font-bold text-white">{userReports.filter(r => !r.verified).length}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Report New Incident</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Incident Type</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full p-3 border border-slate-700 bg-slate-950 text-slate-200 rounded-lg"
                      required
                    >
                      <option value="">Select Type</option>
                      <option value="fire">🔥 Fire</option>
                      <option value="medical">🏥 Medical Emergency</option>
                      <option value="flood">🌊 Flooding</option>
                      <option value="storm">⛈️ Storm</option>
                      <option value="accident">🚗 Traffic Accident</option>
                      <option value="earthquake">🌍 Earthquake</option>
                      <option value="other">❓ Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Severity Level</label>
                    <select
                      value={formData.severity}
                      onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                      className="w-full p-3 border border-slate-700 bg-slate-950 text-slate-200 rounded-lg"
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
                  <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows="4"
                    className="w-full p-3 border border-slate-700 bg-slate-950 text-slate-200 rounded-lg"
                    placeholder="Describe the incident in detail..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">People Required</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.peopleRequired}
                    onChange={(e) => setFormData({ ...formData, peopleRequired: e.target.value })}
                    className="w-full p-3 border border-slate-700 bg-slate-950 text-slate-200 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Location</label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={selectedLocation ? `${selectedLocation.lat.toFixed(6)}, ${selectedLocation.lng.toFixed(6)}` : ''}
                      className="flex-1 p-3 border border-slate-700 bg-slate-950 text-slate-200 rounded-lg"
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

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Incident Locations</h3>
              <div ref={mapRef} id="user-map" className="h-96 rounded-lg" style={{ minHeight: '400px' }}></div>
              <p className="text-sm text-slate-400 mt-2">📍 Click on the map to set incident location</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">My Reports</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                {userReports.length === 0 ? (
                  <p className="text-center text-slate-500 py-8">No reports yet</p>
                ) : (
                  userReports.map(report => (
                    <div key={report.id} className="p-4 bg-slate-950/60 rounded-lg border-l-4 border-indigo-500">
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
                      <h4 className="font-medium text-white mb-2">{report.description}</h4>
                      {report.ai?.summary && (
                        <p className="text-xs text-slate-400 mb-1">AI Summary: {report.ai.summary}</p>
                      )}
                      {report.ai?.duplicateOf && (
                        <p className="text-xs text-red-600 mb-1">Possible duplicate of {report.ai.duplicateOf} (score {report.ai.duplicateScore})</p>
                      )}
                      <p className="text-xs text-slate-500">{formatTime(report.timestamp)}</p>
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


