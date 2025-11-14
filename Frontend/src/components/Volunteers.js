import React, { useState, useEffect, useRef } from 'react';
import Navigation from './Navigation';
import { getSession, getIncidents, saveIncidents } from '../utils/storage';
import { formatTime, getSeverityText } from '../utils/format';
import { showNotification } from '../utils/notifications';

const Volunteers = () => {
  const [user, setUser] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [currentLocation, setCurrentLocation] = useState({ lat: 40.7128, lng: -74.0060 });
  const [volunteerStatus, setVolunteerStatus] = useState('available');
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const clusterGroupRef = useRef(null);
  const volunteerMarkerRef = useRef(null);

  useEffect(() => {
    const session = getSession();
    if (!session || session.role !== 'volunteer') {
      window.location.href = '/auth';
      return;
    }
    setUser(session);
    loadIncidents();
    getCurrentLocation();
  }, []);

  useEffect(() => {
    // Initialize map after component mounts and location is set
    const checkLeafletAndInit = () => {
      if (window.L && mapRef.current && !mapInstanceRef.current) {
        initializeMap();
      } else if (!window.L) {
        setTimeout(checkLeafletAndInit, 200);
      }
    };

    // Wait a bit for DOM to be ready
    setTimeout(checkLeafletAndInit, 100);

    // Cleanup function
    return () => {
      if (clusterGroupRef.current) {
        clusterGroupRef.current.clearLayers();
        clusterGroupRef.current = null;
      }
      if (volunteerMarkerRef.current) {
        volunteerMarkerRef.current = null;
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [currentLocation]);

  useEffect(() => {
    if (mapInstanceRef.current && incidents.length >= 0) {
      updateMapMarkers();
    }
  }, [incidents, currentLocation]);

  const loadIncidents = () => {
    setIncidents(getIncidents());
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        () => {
          showNotification('Unable to get location', 'error');
        }
      );
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
      }).setView([currentLocation.lat, currentLocation.lng], 12);
      
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(mapInstanceRef.current);

      // Add volunteer marker
      volunteerMarkerRef.current = window.L.marker([currentLocation.lat, currentLocation.lng], {
        icon: window.L.divIcon({
          className: 'volunteer-marker',
          html: '<div style="background: #3b82f6; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">👤</div>',
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        }),
        isVolunteerMarker: true
      }).addTo(mapInstanceRef.current).bindPopup('Your Location');

      // Force map to resize and load markers
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

      // Remove existing volunteer marker
      if (volunteerMarkerRef.current) {
        mapInstanceRef.current.removeLayer(volunteerMarkerRef.current);
        volunteerMarkerRef.current = null;
      }

      // Add updated volunteer marker
      volunteerMarkerRef.current = window.L.marker([currentLocation.lat, currentLocation.lng], {
        icon: window.L.divIcon({
          className: 'volunteer-marker',
          html: '<div style="background: #3b82f6; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">👤</div>',
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        }),
        isVolunteerMarker: true
      }).addTo(mapInstanceRef.current).bindPopup('Your Location');

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

      // Show ALL incidents (including unverified) for volunteers
      const allIncidents = incidents.filter(i => i.location);
      allIncidents.forEach(incident => {
        const color = incident.severity === 5 ? '#8e44ad' : 
                     incident.severity === 4 ? '#e74c3c' : 
                     incident.severity === 3 ? '#e67e22' : 
                     incident.severity === 2 ? '#f39c12' : '#27ae60';
        
        const markerColor = incident.status === 'available' ? color : 
                           incident.status === 'pending' ? '#3b82f6' : '#6b7280';
        
        const marker = window.L.circleMarker([incident.location.lat, incident.location.lng], {
          radius: 8,
          fillColor: markerColor,
          color: '#ffffff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.8
        });

        marker.on('click', () => {
          if (incident.status === 'available') {
            assignTaskToVolunteer(incident.id);
          }
        });

        marker.bindPopup(`
          <div style="padding: 8px;">
            <h4 style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">${incident.id}</h4>
            <p style="font-size: 12px; color: #666; margin-bottom: 4px;">${incident.type.toUpperCase()}</p>
            <p style="font-size: 12px; margin-bottom: 4px;">${incident.description}</p>
            <p style="font-size: 11px; color: #999;">Status: ${incident.status}</p>
          </div>
        `);
        
        clusterGroupRef.current.addLayer(marker);
      });

      // Add cluster group to map
      clusterGroupRef.current.addTo(mapInstanceRef.current);
    } catch (error) {
      console.error('Error updating map markers:', error);
    }
  };

  const assignTaskToVolunteer = (incidentId) => {
    const updatedIncidents = incidents.map(incident => {
      if (incident.id === incidentId && incident.status === 'available') {
        return {
          ...incident,
          status: 'pending',
          assignedTo: user.id,
          assignedAt: new Date()
        };
      }
      return incident;
    });
    saveIncidents(updatedIncidents);
    setIncidents(updatedIncidents);
    
    // Force immediate map update
    setTimeout(() => {
      if (mapInstanceRef.current) {
        updateMapMarkers();
      }
    }, 100);
    
    showNotification(`Task ${incidentId} assigned to you!`, 'success');
  };

  const completeTask = (incidentId) => {
    const updatedIncidents = incidents.map(incident => {
      if (incident.id === incidentId && incident.assignedTo === user.id) {
        return {
          ...incident,
          status: 'completed',
          resolvedAt: new Date()
        };
      }
      return incident;
    });
    saveIncidents(updatedIncidents);
    setIncidents(updatedIncidents);
    
    // Force immediate map update
    setTimeout(() => {
      if (mapInstanceRef.current) {
        updateMapMarkers();
      }
    }, 100);
    
    showNotification(`Task ${incidentId} marked as completed!`, 'success');
  };

  if (!user) return null;

  const availableTasks = incidents.filter(i => i.status === 'available' && i.verified);
  const myTasks = incidents.filter(i => i.assignedTo === user.id && i.status === 'pending');
  const completedTasks = incidents.filter(i => i.assignedTo === user.id && i.status === 'completed');

  return (
    <div className="bg-gray-50 min-h-screen">
      <Navigation currentPage="volunteers" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Volunteer Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage incidents and coordinate response efforts</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-gray-600 text-sm font-medium">Available Tasks</p>
            <p className="text-3xl font-bold text-gray-900">{availableTasks.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-gray-600 text-sm font-medium">My Tasks</p>
            <p className="text-3xl font-bold text-gray-900">{myTasks.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-gray-600 text-sm font-medium">Completed</p>
            <p className="text-3xl font-bold text-gray-900">{completedTasks.length}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Incidents</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {availableTasks.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No available incidents</p>
              ) : (
                availableTasks.map(task => (
                  <div key={task.id} className="p-4 bg-gray-50 rounded-lg border-l-4 border-green-500">
                    <h4 className="font-medium text-gray-900 mb-2">{task.description}</h4>
                    <p className="text-xs text-gray-600">{task.type.toUpperCase()} • {getSeverityText(task.severity)}</p>
                    <button
                      onClick={() => assignTaskToVolunteer(task.id)}
                      className="w-full mt-2 bg-blue-600 text-white py-2 px-3 rounded text-sm hover:bg-blue-700"
                    >
                      Take Task
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">My Assigned Tasks</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {myTasks.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No assigned tasks</p>
              ) : (
                myTasks.map(task => (
                  <div key={task.id} className="p-4 bg-gray-50 rounded-lg border-l-4 border-blue-500">
                    <h4 className="font-medium text-gray-900 mb-2">{task.description}</h4>
                    <p className="text-xs text-gray-600">{task.type.toUpperCase()} • {formatTime(task.timestamp)}</p>
                    <button
                      onClick={() => completeTask(task.id)}
                      className="w-full mt-2 bg-green-600 text-white py-2 px-3 rounded text-sm hover:bg-green-700"
                    >
                      Mark Complete
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Completed Tasks</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {completedTasks.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No completed tasks</p>
              ) : (
                completedTasks.map(task => (
                  <div key={task.id} className="p-4 bg-gray-50 rounded-lg border-l-4 border-gray-500">
                    <h4 className="font-medium text-gray-900 mb-2">{task.description}</h4>
                    <p className="text-xs text-gray-600">Completed {formatTime(task.resolvedAt)}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Live Incident Map</h3>
            <button
              onClick={getCurrentLocation}
              className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
            >
              📍 Update Location
            </button>
          </div>
          <div ref={mapRef} id="volunteer-map" className="h-96 rounded-lg" style={{ minHeight: '400px' }}></div>
        </div>
      </div>
    </div>
  );
};

export default Volunteers;


