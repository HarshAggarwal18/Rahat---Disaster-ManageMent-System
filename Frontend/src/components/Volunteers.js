import React, { useState, useEffect, useRef } from 'react';
import Navigation from './Navigation';
import { getSession } from '../utils/storage';
import { incidentsAPI, volunteersAPI } from '../utils/api';
import { formatTime, getSeverityText } from '../utils/format';
import { showNotification } from '../utils/notifications';
import { getRoute, drawRouteOnMap } from '../utils/routing';

const Volunteers = () => {
  const [user, setUser] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [currentLocation, setCurrentLocation] = useState({ lat: 40.7128, lng: -74.0060 });
  const [volunteerStatus, setVolunteerStatus] = useState('available');
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showHeatmap, setShowHeatmap] = useState(false);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const clusterGroupRef = useRef(null);
  const volunteerMarkerRef = useRef(null);
  const routeRef = useRef(null);
  const heatLayerRef = useRef(null);

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
      if (routeRef.current) {
        if (routeRef.current.polyline && mapInstanceRef.current) {
          mapInstanceRef.current.removeLayer(routeRef.current.polyline);
        }
        if (routeRef.current.startMarker && mapInstanceRef.current) {
          mapInstanceRef.current.removeLayer(routeRef.current.startMarker);
        }
        if (routeRef.current.endMarker && mapInstanceRef.current) {
          mapInstanceRef.current.removeLayer(routeRef.current.endMarker);
        }
        routeRef.current = null;
      }
      if (heatLayerRef.current) {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.removeLayer(heatLayerRef.current);
        }
        heatLayerRef.current = null;
      }
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
  }, [incidents, currentLocation, showHeatmap]);

  const loadIncidents = async () => {
    try {
      console.log('Volunteers: Loading incidents...');
      const response = await incidentsAPI.getAll();
      console.log('Volunteers: Incidents response:', response);
      
      if (response.success) {
        const incidentsData = response.data || [];
        console.log('Volunteers: Setting incidents:', incidentsData.length);
        console.log('Volunteers: Incidents breakdown:', {
          total: incidentsData.length,
          verified: incidentsData.filter(i => i.verified).length,
          available: incidentsData.filter(i => i.status === 'available').length,
          verifiedAndAvailable: incidentsData.filter(i => i.status === 'available' && i.verified).length,
          pending: incidentsData.filter(i => i.status === 'pending').length,
          inProgress: incidentsData.filter(i => i.status === 'in-progress').length,
          completed: incidentsData.filter(i => i.status === 'completed').length,
          unverified: incidentsData.filter(i => !i.verified).length,
          assigned: incidentsData.filter(i => i.assignedTo).length,
          notAssigned: incidentsData.filter(i => !i.assignedTo).length
        });
        console.log('Volunteers: Sample incidents:', incidentsData.slice(0, 3).map(i => ({
          id: i.id,
          status: i.status,
          verified: i.verified,
          assignedTo: i.assignedTo,
          type: i.type
        })));
        setIncidents(incidentsData);
      } else {
        console.error('Volunteers: Response not successful:', response);
        showNotification('Failed to load incidents', 'error');
      }
    } catch (error) {
      console.error('Volunteers: Error loading incidents:', error);
      showNotification(error.message || 'Failed to load incidents', 'error');
    }
  };

  const getCurrentLocation = async () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setCurrentLocation(location);
          
          // Update location in backend
          try {
            await volunteersAPI.updateLocation(location);
          } catch (error) {
            console.error('Error updating location:', error);
          }
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
      const allIncidents = incidents.filter(i => {
        if (!i.location) return false;
        const lat = i.location.lat || (i.location.coordinates && i.location.coordinates[1]);
        const lng = i.location.lng || (i.location.coordinates && i.location.coordinates[0]);
        return lat != null && lng != null && !isNaN(lat) && !isNaN(lng);
      });
      
      console.log('Volunteers: Updating map with', allIncidents.length, 'incidents');
      
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
        
        const markerColor = incident.status === 'available' ? color : 
                           incident.status === 'pending' ? '#3b82f6' : '#6b7280';
        
        const marker = window.L.circleMarker([lat, lng], {
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

          // Add heat map if enabled - only show available incidents
          if (showHeatmap && window.L) {
            // Remove existing heat layer
            if (heatLayerRef.current) {
              mapInstanceRef.current.removeLayer(heatLayerRef.current);
              heatLayerRef.current = null;
            }

            // Check if heatLayer is available (different ways it might be exposed)
            // leaflet-heat exposes it as L.heatLayer
            const HeatLayer = window.L.heatLayer || window.L.HeatLayer || (window.HeatLayer && window.HeatLayer.heatLayer);
            
            if (HeatLayer) {
              // Filter only available and verified incidents for heatmap
              const availableIncidents = allIncidents.filter(i => 
                i.verified && i.status === 'available' && !i.assignedTo
              );
              
              console.log('Volunteers: Creating heatmap with', availableIncidents.length, 'available incidents');
              
              const heatData = availableIncidents.map(incident => {
                const lat = incident.location.lat || (incident.location.coordinates && incident.location.coordinates[1]) || incident.location[1];
                const lng = incident.location.lng || (incident.location.coordinates && incident.location.coordinates[0]) || incident.location[0];
                // Scale severity (1-5) to intensity (0.3-1.0) for bold colors
                const intensity = 0.3 + ((incident.severity || 1) - 1) / 4 * 0.7;
                return [lat, lng, intensity];
              }).filter(data => data[0] != null && data[1] != null && !isNaN(data[0]) && !isNaN(data[1]));
              
              console.log('Volunteers: Heatmap data points:', heatData.length);
              
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
                  console.log('Volunteers: Heatmap added successfully');
                } catch (heatError) {
                  console.error('Volunteers: Error creating heatmap:', heatError);
                }
              } else {
                console.warn('Volunteers: No heatmap data points available');
              }
            } else {
              console.warn('Volunteers: HeatLayer not available. Make sure leaflet-heat.js is loaded.');
            }
          }
    } catch (error) {
      console.error('Error updating map markers:', error);
    }
  };

  const assignTaskToVolunteer = async (incidentId) => {
    try {
      console.log('Volunteers: Assigning task:', incidentId);
      const response = await volunteersAPI.assignTask(incidentId);
      console.log('Volunteers: Assign response:', response);
      
      if (response.success) {
        const incident = incidents.find(i => i.id === incidentId);
        if (incident) {
          setSelectedIncident(incident);
          // Show route after assignment
          setTimeout(() => {
            showRouteToIncident(incident);
          }, 500);
        }
        showNotification(`Task ${incidentId} assigned to you!`, 'success');
        // Reload incidents after a short delay
        setTimeout(async () => {
          await loadIncidents();
        }, 300);
      } else {
        showNotification(response.message || 'Failed to assign task', 'error');
      }
    } catch (error) {
      console.error('Volunteers: Error assigning task:', error);
      showNotification(error.message || 'Failed to assign task', 'error');
    }
  };

  const showRouteToIncident = async (incident) => {
    if (!mapInstanceRef.current || !incident || !incident.location) return;
    
    try {
      // Clear existing route
      if (routeRef.current) {
        if (routeRef.current.polyline) {
          mapInstanceRef.current.removeLayer(routeRef.current.polyline);
        }
        if (routeRef.current.startMarker) {
          mapInstanceRef.current.removeLayer(routeRef.current.startMarker);
        }
        if (routeRef.current.endMarker) {
          mapInstanceRef.current.removeLayer(routeRef.current.endMarker);
        }
        routeRef.current = null;
      }

      const start = currentLocation;
      const end = {
        lat: incident.location.lat || (incident.location.coordinates && incident.location.coordinates[1]),
        lng: incident.location.lng || (incident.location.coordinates && incident.location.coordinates[0])
      };

      if (!start.lat || !start.lng || !end.lat || !end.lng) {
        console.warn('Invalid locations for routing');
        showNotification('Invalid location data for routing', 'error');
        return;
      }

      // Show loading notification
      showNotification('Calculating route...', 'info');

      // Get route using OSRM (real road-based routing)
      const routeData = await getRoute(start, end);
      const route = routeData.route;
      const distance = routeData.distance;
      
      // Draw route on map
      routeRef.current = drawRouteOnMap(mapInstanceRef.current, route, '#3b82f6', distance);
      
      // Fit map to show the entire route
      const bounds = window.L.latLngBounds(route.map(point => [point.lat, point.lng]));
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
      
      showNotification(`Route calculated! Distance: ${routeRef.current.distance.toFixed(2)} km`, 'success');
    } catch (error) {
      console.error('Error showing route:', error);
      showNotification('Failed to calculate route. Please try again.', 'error');
    }
  };

  const completeTask = async (incidentId) => {
    try {
      console.log('Volunteers: Completing task:', incidentId);
      const response = await volunteersAPI.completeTask(incidentId);
      console.log('Volunteers: Complete response:', response);
      
      if (response.success) {
        showNotification(`Task ${incidentId} marked as completed!`, 'success');
        // Reload incidents after a short delay
        setTimeout(async () => {
          await loadIncidents();
        }, 300);
      } else {
        showNotification(response.message || 'Failed to complete task', 'error');
      }
    } catch (error) {
      console.error('Volunteers: Error completing task:', error);
      showNotification(error.message || 'Failed to complete task', 'error');
    }
  };

  const unassignTask = async (incidentId) => {
    if (!window.confirm('Are you sure you want to release this task? It will become available for other volunteers.')) {
      return;
    }
    
    try {
      console.log('Volunteers: Unassigning task:', incidentId);
      const response = await volunteersAPI.unassignTask(incidentId);
      console.log('Volunteers: Unassign response:', response);
      
      if (response.success) {
        showNotification(`Task ${incidentId} released successfully!`, 'success');
        setSelectedIncident(null);
        // Clear route if exists
        if (routeRef.current) {
          if (routeRef.current.polyline && mapInstanceRef.current) {
            mapInstanceRef.current.removeLayer(routeRef.current.polyline);
          }
          if (routeRef.current.startMarker && mapInstanceRef.current) {
            mapInstanceRef.current.removeLayer(routeRef.current.startMarker);
          }
          if (routeRef.current.endMarker && mapInstanceRef.current) {
            mapInstanceRef.current.removeLayer(routeRef.current.endMarker);
          }
          routeRef.current = null;
        }
        // Reload incidents after a short delay
        setTimeout(async () => {
          await loadIncidents();
        }, 300);
      } else {
        showNotification(response.message || 'Failed to release task', 'error');
      }
    } catch (error) {
      console.error('Volunteers: Error unassigning task:', error);
      showNotification(error.message || 'Failed to release task', 'error');
    }
  };

  if (!user) return null;

  // Filter available tasks by category
  // Show all verified incidents that are available for assignment (not assigned to anyone, not completed)
  const availableTasks = incidents.filter(i => {
    // Must be verified
    if (!i.verified) return false;
    
    // Must not be completed
    if (i.status === 'completed') return false;
    
    // Check if assigned to anyone (including checking for null/undefined)
    const assignedToId = i.assignedTo?._id || i.assignedTo?.id || i.assignedTo;
    const userId = user?._id || user?.id;
    const isAssignedToMe = assignedToId && userId && assignedToId.toString() === userId.toString();
    
    // Exclude tasks assigned to this volunteer (those show in "My Tasks")
    if (isAssignedToMe) return false;
    
    // Show tasks that are:
    // 1. Status is 'available' AND not assigned to anyone
    // 2. Status is 'unverified' but verified=true AND not assigned (edge case)
    const isNotAssigned = !assignedToId || assignedToId === null || assignedToId === undefined;
    const isAvailable = (i.status === 'available' && isNotAssigned) || 
                        (i.status === 'unverified' && i.verified && isNotAssigned);
    
    // Match category filter
    const matchesCategory = categoryFilter === 'all' || i.type === categoryFilter;
    
    // Show if available and matches category
    return isAvailable && matchesCategory;
  });
  
  console.log('Volunteers: Available tasks filter result:', {
    totalIncidents: incidents.length,
    verifiedIncidents: incidents.filter(i => i.verified).length,
    availableStatus: incidents.filter(i => i.status === 'available').length,
    verifiedAndAvailable: incidents.filter(i => i.verified && i.status === 'available').length,
    notAssigned: incidents.filter(i => !i.assignedTo).length,
    finalAvailableTasks: availableTasks.length,
    categoryFilter: categoryFilter
  });
  const myTasks = incidents.filter(i => {
    const assignedToId = i.assignedTo?._id || i.assignedTo?.id || i.assignedTo;
    const userId = user?._id || user?.id;
    return assignedToId && userId && assignedToId.toString() === userId.toString() && (i.status === 'pending' || i.status === 'in-progress');
  });
  const completedTasks = incidents.filter(i => {
    const assignedToId = i.assignedTo?._id || i.assignedTo?.id || i.assignedTo;
    const userId = user?._id || user?.id;
    return assignedToId && userId && assignedToId.toString() === userId.toString() && i.status === 'completed';
  });

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
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Available Incidents</h3>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-sm border border-gray-300 rounded-md px-2 py-1"
              >
                <option value="all">All Types</option>
                <option value="fire">🔥 Fire</option>
                <option value="medical">🏥 Medical</option>
                <option value="flood">🌊 Flood</option>
                <option value="earthquake">🌍 Earthquake</option>
                <option value="storm">⛈️ Storm</option>
                <option value="other">📋 Other</option>
              </select>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {availableTasks.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No available incidents</p>
              ) : (
                availableTasks.map(task => (
                  <div key={task.id} className="p-4 bg-gray-50 rounded-lg border-l-4 border-green-500">
                    <h4 className="font-medium text-gray-900 mb-2">{task.id}</h4>
                    <p className="text-sm text-gray-700 mb-1">{task.description}</p>
                    <p className="text-xs text-gray-600 mb-2">{task.type.toUpperCase()} • {getSeverityText(task.severity)}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => assignTaskToVolunteer(task.id)}
                        className="flex-1 bg-blue-600 text-white py-2 px-3 rounded text-sm hover:bg-blue-700"
                      >
                        Take Task
                      </button>
                      <button
                        onClick={() => {
                          setSelectedIncident(task);
                          showRouteToIncident(task);
                        }}
                        className="flex-1 bg-green-600 text-white py-2 px-3 rounded text-sm hover:bg-green-700"
                        title="Show route to incident"
                      >
                        🗺️ Route
                      </button>
                    </div>
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
                    <h4 className="font-medium text-gray-900 mb-2">{task.id}</h4>
                    <p className="text-sm text-gray-700 mb-1">{task.description}</p>
                    <p className="text-xs text-gray-600 mb-2">{task.type.toUpperCase()} • {formatTime(task.timestamp)}</p>
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedIncident(task);
                            showRouteToIncident(task);
                          }}
                          className="flex-1 bg-blue-600 text-white py-2 px-3 rounded text-sm hover:bg-blue-700"
                          title="Show route"
                        >
                          🗺️ Show Route
                        </button>
                        <button
                          onClick={() => completeTask(task.id)}
                          className="flex-1 bg-green-600 text-white py-2 px-3 rounded text-sm hover:bg-green-700"
                        >
                          ✓ Complete
                        </button>
                      </div>
                      <button
                        onClick={() => unassignTask(task.id)}
                        className="w-full bg-orange-600 text-white py-2 px-3 rounded text-sm hover:bg-orange-700"
                        title="Release this task"
                      >
                        ↩️ Go Back / Release Task
                      </button>
                    </div>
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
            <div className="flex gap-2">
              <button
                onClick={() => setShowHeatmap(!showHeatmap)}
                className={`text-sm px-3 py-1 rounded transition-colors ${
                  showHeatmap
                    ? 'bg-orange-600 text-white hover:bg-orange-700'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {showHeatmap ? '🔥 Heatmap ON' : '🗺️ Show Heatmap'}
              </button>
              {selectedIncident && (
                <button
                  onClick={() => {
                    if (selectedIncident) {
                      showRouteToIncident(selectedIncident);
                    }
                  }}
                  className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                >
                  🗺️ Show Route
                </button>
              )}
              <button
                onClick={getCurrentLocation}
                className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
              >
                📍 Update Location
              </button>
            </div>
          </div>
          <div ref={mapRef} id="volunteer-map" className="h-96 rounded-lg" style={{ minHeight: '400px' }}></div>
        </div>
      </div>
    </div>
  );
};

export default Volunteers;


