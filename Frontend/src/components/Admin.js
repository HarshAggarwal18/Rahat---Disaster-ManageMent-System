import React, { useState, useEffect, useRef, useCallback } from 'react';
import Navigation from './Navigation';
import { getSession } from '../utils/storage';
import { incidentsAPI, usersAPI, adminAPI, groupsAPI } from '../utils/api';
import { formatTime, getSeverityText, getSeverityColor } from '../utils/format';
import { showNotification } from '../utils/notifications';
import { socket } from '../utils/socket';

const Admin = () => {
  const [user, setUser] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [users, setUsers] = useState([]);
  const [assigningIncident, setAssigningIncident] = useState(null);
  const [dispatchRecommendations, setDispatchRecommendations] = useState([]);
  const [dispatchLoading, setDispatchLoading] = useState(false);
  const [groups, setGroups] = useState([]);
  const [groupForm, setGroupForm] = useState({ name: '', notes: '', members: [] });
  const [groupAssign, setGroupAssign] = useState({ groupId: '', incidentId: '' });
  const [auditLogs, setAuditLogs] = useState([]);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [verificationFilter, setVerificationFilter] = useState('all');
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [selectedVolunteer, setSelectedVolunteer] = useState(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const clusterGroupRef = useRef(null);
  const heatLayerRef = useRef(null);
  const volunteerMarkersRef = useRef({});

  const loadData = useCallback(async () => {
    try {
      console.log('Admin: Loading data...');
      const incidentsResponse = await incidentsAPI.getAll();
      console.log('Admin: Incidents response:', incidentsResponse);

      if (incidentsResponse.success) {
        const incidentsData = incidentsResponse.data || [];
        console.log('Admin: Setting incidents:', incidentsData.length);
        setIncidents(incidentsData);
      } else {
        console.error('Admin: Incidents response not successful:', incidentsResponse);
      }

      try {
        const usersResponse = await usersAPI.getAll();
        console.log('Admin: Users response:', usersResponse);

        if (usersResponse.success) {
          const usersData = usersResponse.data || [];
          console.log('Admin: Setting users:', usersData.length);
          setUsers(usersData);
        } else {
          console.error('Admin: Users response not successful:', usersResponse);
        }
      } catch (userError) {
        console.error('Admin: Error loading users:', userError);
      }

      try {
        const groupsResponse = await groupsAPI.getAll();
        if (groupsResponse.success) {
          setGroups(groupsResponse.data || []);
        }
      } catch (groupError) {
        console.error('Admin: Error loading groups:', groupError);
      }

      try {
        const logsResponse = await adminAPI.getAuditLogs();
        if (logsResponse.success) {
          setAuditLogs(logsResponse.data || []);
        }
      } catch (auditError) {
        console.error('Admin: Error loading audit logs:', auditError);
      }
    } catch (error) {
      console.error('Admin: Error loading data:', error);
    }
  }, []);

  useEffect(() => {
    const session = getSession();
    if (!session || session.role !== 'admin') {
      window.location.href = '/auth';
      return;
    }
    setUser(session);
    loadData();
  }, [loadData]);

  useEffect(() => {
    // Initialize map when dashboard section is active
    if (activeSection === 'dashboard' && mapRef.current) {
      const checkLeafletAndInit = () => {
        if (window.L && mapRef.current && !mapInstanceRef.current) {
          initializeMap();
        } else if (!window.L) {
          setTimeout(checkLeafletAndInit, 200);
        }
      };
      
      // Wait a bit for DOM to be ready
      setTimeout(checkLeafletAndInit, 100);
    }

    return () => {
      if (heatLayerRef.current) {
        heatLayerRef.current = null;
      }
      if (clusterGroupRef.current) {
        clusterGroupRef.current.clearLayers();
        clusterGroupRef.current = null;
      }
      if (mapInstanceRef.current && activeSection !== 'dashboard') {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [activeSection]);

  useEffect(() => {
    if (mapInstanceRef.current && activeSection === 'dashboard' && incidents.length >= 0) {
      updateMapMarkers();
    }
  }, [incidents, activeSection, showHeatmap, users]);

  useEffect(() => {
    // Initialize charts when analytics section is active
    if (activeSection === 'analytics') {
      const timer = setTimeout(() => {
        if (window.echarts) {
          initializeCharts();
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [activeSection, incidents]);

  useEffect(() => {
    const handleIncidentUpdate = () => {
      loadData();
    };

    socket.on('incident:created', handleIncidentUpdate);
    socket.on('incident:updated', handleIncidentUpdate);
    socket.on('incident:deleted', handleIncidentUpdate);
    socket.on('volunteer:location', handleIncidentUpdate);

    return () => {
      socket.off('incident:created', handleIncidentUpdate);
      socket.off('incident:updated', handleIncidentUpdate);
      socket.off('incident:deleted', handleIncidentUpdate);
      socket.off('volunteer:location', handleIncidentUpdate);
    };
  }, [loadData]);

  useEffect(() => {
    const loadRecommendations = async () => {
      if (!assigningIncident) {
        setDispatchRecommendations([]);
        return;
      }
      setDispatchLoading(true);
      try {
        const response = await adminAPI.getDispatchRecommendations(assigningIncident);
        if (response.success) {
          setDispatchRecommendations(response.data.slice(0, 5));
        }
      } catch (error) {
        console.error('Dispatch recommendation error:', error);
      } finally {
        setDispatchLoading(false);
      }
    };

    loadRecommendations();
  }, [assigningIncident]);


  const createGroup = async () => {
    if (!groupForm.name.trim()) {
      showNotification('Group name is required', 'error');
      return;
    }

    try {
      const response = await groupsAPI.create({
        name: groupForm.name.trim(),
        notes: groupForm.notes.trim(),
        members: groupForm.members
      });
      if (response.success) {
        showNotification('Group created successfully', 'success');
        setGroupForm({ name: '', notes: '', members: [] });
        await loadData();
      }
    } catch (error) {
      showNotification(error.message || 'Failed to create group', 'error');
    }
  };

  const assignGroupToIncident = async () => {
    if (!groupAssign.groupId || !groupAssign.incidentId) {
      showNotification('Select both group and incident', 'error');
      return;
    }
    try {
      const response = await groupsAPI.assignGroupToIncident(groupAssign.groupId, groupAssign.incidentId);
      if (response.success) {
        showNotification('Group assigned to incident', 'success');
        setGroupAssign({ groupId: '', incidentId: '' });
        await loadData();
      }
    } catch (error) {
      showNotification(error.message || 'Failed to assign group', 'error');
    }
  };

  const verifyIncident = async (incidentId) => {
    try {
      console.log('Admin: Verifying incident:', incidentId);
      const response = await adminAPI.verifyIncident(incidentId);
      console.log('Admin: Verify response:', response);
      
      if (response.success) {
        showNotification(`Incident ${incidentId} verified successfully`, 'success');
        // Reload incidents after a short delay to ensure DB is updated
        setTimeout(async () => {
          await loadData();
        }, 300);
      } else {
        showNotification(response.message || 'Failed to verify incident', 'error');
      }
    } catch (error) {
      console.error('Admin: Error verifying incident:', error);
      showNotification(error.message || 'Failed to verify incident', 'error');
    }
  };

  const rejectIncident = async (incidentId) => {
    if (window.confirm('Are you sure you want to reject this incident?')) {
      try {
        console.log('Admin: Rejecting incident:', incidentId);
        const response = await adminAPI.rejectIncident(incidentId);
        console.log('Admin: Reject response:', response);
        
        if (response.success) {
          showNotification(`Incident ${incidentId} rejected and removed`, 'warning');
          // Reload incidents after a short delay to ensure DB is updated
          setTimeout(async () => {
            await loadData();
          }, 300);
        } else {
          showNotification(response.message || 'Failed to reject incident', 'error');
        }
      } catch (error) {
        console.error('Admin: Error rejecting incident:', error);
        showNotification(error.message || 'Failed to reject incident', 'error');
      }
    }
  };

  const assignIncidentToVolunteer = async (incidentId, volunteerId) => {
    try {
      console.log('Admin: Assigning incident:', incidentId, 'to volunteer:', volunteerId);
      const response = await adminAPI.assignIncidentToVolunteer(incidentId, volunteerId);
      console.log('Admin: Assign response:', response);
      
      if (response.success) {
        showNotification(`Incident ${incidentId} assigned to volunteer successfully!`, 'success');
        setAssigningIncident(null);
        // Reload data after a short delay
        setTimeout(async () => {
          await loadData();
        }, 300);
      } else {
        showNotification(response.message || 'Failed to assign incident', 'error');
      }
    } catch (error) {
      console.error('Admin: Error assigning incident:', error);
      showNotification(error.message || 'Failed to assign incident', 'error');
    }
  };

  const getFilteredIncidents = () => {
    if (verificationFilter === 'unverified') {
      return incidents.filter(i => !i.verified);
    } else if (verificationFilter === 'verified') {
      return incidents.filter(i => i.verified);
    }
    return incidents;
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
      }).setView([40.7128, -74.0060], 11);
      
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
        clusterGroupRef.current = window.L.layerGroup();
      }

      // Clear existing volunteer markers
      Object.values(volunteerMarkersRef.current).forEach(marker => {
        if (marker && mapInstanceRef.current) {
          mapInstanceRef.current.removeLayer(marker);
        }
      });
      volunteerMarkersRef.current = {};

      // Add volunteer markers
      const volunteers = users.filter(u => u.role === 'volunteer' && u.currentLocation);
      volunteers.forEach(volunteer => {
        const loc = volunteer.currentLocation;
        if (loc && loc.lat && loc.lng) {
          const marker = window.L.marker([loc.lat, loc.lng], {
            icon: window.L.divIcon({
              className: 'volunteer-marker',
              html: '<div style="background: #3b82f6; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">👤</div>',
              iconSize: [24, 24],
              iconAnchor: [12, 12]
            })
          }).addTo(mapInstanceRef.current);
          marker.bindPopup(`<strong>${volunteer.firstName} ${volunteer.lastName}</strong><br>${volunteer.email}`);
          volunteerMarkersRef.current[volunteer._id || volunteer.id] = marker;
        }
      });

      // Show ALL incidents (including unverified ones for admin)
      const allIncidents = incidents.filter(i => {
        if (!i.location) return false;
        const lat = i.location.lat || (i.location.coordinates && i.location.coordinates[1]);
        const lng = i.location.lng || (i.location.coordinates && i.location.coordinates[0]);
        return lat != null && lng != null && !isNaN(lat) && !isNaN(lng);
      });
      
      console.log('Admin: Updating map with', allIncidents.length, 'incidents');
      
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
              Status: ${isVerified ? 'Verified' : 'Unverified'}
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
          // Filter available incidents; fall back to all verified if none available
          let availableIncidents = allIncidents.filter(i => 
            i.verified && i.status === 'available' && !i.assignedTo
          );
          if (availableIncidents.length === 0) {
            availableIncidents = allIncidents.filter(i => i.verified);
          }
          
          console.log('Admin: Creating heatmap with', availableIncidents.length, 'available incidents');
          
          const heatData = availableIncidents.map(incident => {
            const lat = incident.location.lat || (incident.location.coordinates && incident.location.coordinates[1]) || incident.location[1];
            const lng = incident.location.lng || (incident.location.coordinates && incident.location.coordinates[0]) || incident.location[0];
            // Scale severity (1-5) to intensity (0.3-1.0) for bold colors
            const intensity = 0.3 + ((incident.severity || 1) - 1) / 4 * 0.7;
            return [lat, lng, intensity];
          }).filter(data => data[0] != null && data[1] != null && !isNaN(data[0]) && !isNaN(data[1]));
          
          console.log('Admin: Heatmap data points:', heatData.length);
          
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
              console.log('Admin: Heatmap added successfully');
            } catch (heatError) {
              console.error('Admin: Error creating heatmap:', heatError);
            }
          } else {
            console.warn('Admin: No heatmap data points available');
          }
        } else {
          console.warn('Admin: HeatLayer not available. Make sure leaflet-heat.js is loaded.');
        }
      }
    } catch (error) {
      console.error('Error updating map markers:', error);
    }
  };

  const initializeCharts = () => {
    if (!window.echarts) {
      console.log('ECharts not loaded');
      return;
    }

    try {
      // Trends Chart
      const trendsElement = document.getElementById('trends-chart');
      if (trendsElement && !trendsElement._echarts_instance_) {
        const trendsChart = window.echarts.init(trendsElement);
        const trendsOption = {
          title: { text: 'Incident Trends', left: 'center', textStyle: { fontSize: 14 } },
          tooltip: { trigger: 'axis' },
          xAxis: { type: 'category', data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
          yAxis: { type: 'value' },
          series: [{
            data: [12, 19, 3, 5, 2, 3, 9],
            type: 'line',
            smooth: true,
            itemStyle: { color: '#3b82f6' }
          }]
        };
        trendsChart.setOption(trendsOption);
      }

      // Response Time Chart
      const responseElement = document.getElementById('response-chart');
      if (responseElement && !responseElement._echarts_instance_) {
        const responseChart = window.echarts.init(responseElement);
        const responseOption = {
          title: { text: 'Response Time Distribution', left: 'center', textStyle: { fontSize: 14 } },
          tooltip: { trigger: 'item' },
          series: [{
            type: 'pie',
            radius: '50%',
            data: [
              { value: 35, name: '< 5 min' },
              { value: 25, name: '5-15 min' },
              { value: 20, name: '15-30 min' },
              { value: 20, name: '> 30 min' }
            ]
          }]
        };
        responseChart.setOption(responseOption);
      }

      // Incident Distribution Chart
      const distElement = document.getElementById('incident-distribution-chart');
      if (distElement && !distElement._echarts_instance_) {
        const distChart = window.echarts.init(distElement);
        const typeCounts = {};
        incidents.forEach(incident => {
          typeCounts[incident.type] = (typeCounts[incident.type] || 0) + 1;
        });
        
        const distData = Object.entries(typeCounts).map(([type, count]) => ({
          value: count,
          name: type.toUpperCase()
        }));
        
        // If no data, show placeholder
        if (distData.length === 0) {
          distData.push({ value: 1, name: 'NO DATA' });
        }
        
        const distOption = {
          title: { text: 'Incidents by Type', left: 'center', textStyle: { fontSize: 14 } },
          tooltip: { trigger: 'item' },
          series: [{
            type: 'pie',
            radius: '60%',
            data: distData
          }]
        };
        distChart.setOption(distOption);
      }
    } catch (error) {
      console.error('Error initializing charts:', error);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <Navigation />
      <div className="flex">
        <div className="w-64 bg-gradient-to-b from-gray-800 to-gray-900 min-h-screen sticky top-0">
          <div className="p-6">
          <h1 className="text-white text-xl font-bold mb-8">Admin Panel</h1>
          <nav className="space-y-2">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: '📊' },
              { id: 'verification', label: 'Verification', icon: '✅' },
              { id: 'users', label: 'Users', icon: '👥' },
              { id: 'volunteers', label: 'Volunteers', icon: '🚑' },
              { id: 'analytics', label: 'Analytics', icon: '📈' },
              { id: 'groups', label: 'Groups', icon: '🧩' },
              { id: 'settings', label: 'Settings', icon: '⚙️' }
            ].map(section => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                  activeSection === section.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                {section.icon} {section.label}
              </button>
            ))}
          </nav>
          </div>
        </div>

        <div className="flex-1">
        <div className="bg-slate-900/80 shadow-xl border-b border-slate-800 px-6 py-4">
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-slate-400 text-sm">System overview and management</p>
        </div>

        <div className="p-6">
          {activeSection === 'dashboard' && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl p-6">
                  <p className="text-slate-400 text-sm font-medium">Total Incidents</p>
                  <p className="text-3xl font-bold text-white">{incidents.length}</p>
                </div>
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl p-6">
                  <p className="text-slate-400 text-sm font-medium">Verified Incidents</p>
                  <p className="text-3xl font-bold text-white">{incidents.filter(i => i.verified).length}</p>
                </div>
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl p-6">
                  <p className="text-slate-400 text-sm font-medium">Active Volunteers</p>
                  <p className="text-3xl font-bold text-white">{users.filter(u => u.role === 'volunteer').length}</p>
                </div>
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl p-6">
                  <p className="text-slate-400 text-sm font-medium">System Health</p>
                  <p className="text-3xl font-bold text-white">98%</p>
                </div>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Live Incident Map</h3>
                  <button
                    onClick={() => setShowHeatmap(!showHeatmap)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      showHeatmap
                        ? 'bg-orange-600 text-white hover:bg-orange-700'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {showHeatmap ? '🔥 Heat Map ON' : '🗺️ Show Heat Map'}
                  </button>
                </div>
                <div ref={mapRef} id="admin-map" className="h-96 rounded-lg" style={{ minHeight: '400px' }}></div>
              </div>
            </div>
          )}

          {activeSection === 'verification' && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">Incident Verification</h3>
                <select
                  value={verificationFilter}
                  onChange={(e) => setVerificationFilter(e.target.value)}
                  className="text-sm border border-slate-700 bg-slate-950 text-slate-200 rounded-md px-2 py-1"
                >
                  <option value="all">All Incidents</option>
                  <option value="unverified">Unverified Only</option>
                  <option value="verified">Verified Only</option>
                </select>
              </div>
              <div className="space-y-4">
                {getFilteredIncidents().map(incident => (
                  <div
                    key={incident.id}
                    className={`p-4 rounded-lg shadow-sm border-2 ${
                      incident.verified ? 'border-emerald-500 bg-slate-950/60' : 'border-amber-500 bg-slate-950/60'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-white">{incident.description}</h4>
                        <p className="text-sm text-slate-400">{incident.id} • {incident.type.toUpperCase()}</p>
                        {incident.ai?.summary && (
                          <p className="text-xs text-slate-400 mt-1">AI Summary: {incident.ai.summary}</p>
                        )}
                        {incident.ai?.duplicateOf && (
                          <p className="text-xs text-red-600 mt-1">Possible duplicate of {incident.ai.duplicateOf} (score {incident.ai.duplicateScore})</p>
                        )}
                      </div>
                      <span className={`px-2 py-1 rounded text-xs ${
                        incident.verified ? 'bg-green-500 text-white' : 'bg-yellow-500 text-white'
                      }`}>
                        {incident.verified ? 'VERIFIED' : 'UNVERIFIED'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {!incident.verified && (
                        <>
                          <button
                            onClick={() => verifyIncident(incident.id)}
                            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                          >
                            ✅ Verify
                          </button>
                          <button
                            onClick={() => rejectIncident(incident.id)}
                            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                          >
                            ❌ Reject
                          </button>
                        </>
                      )}
                      {incident.verified && incident.status === 'available' && (
                        <button
                          onClick={() => setAssigningIncident(incident.id)}
                          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                        >
                          👤 Assign to Volunteer
                        </button>
                      )}
                      {assigningIncident === incident.id && (
                        <div className="w-full mt-2 p-3 bg-slate-950/60 rounded border border-slate-700">
                          <p className="text-sm font-medium text-slate-200 mb-2">AI Recommended Volunteers:</p>
                          {dispatchLoading ? (
                            <p className="text-xs text-slate-500">Loading recommendations...</p>
                          ) : dispatchRecommendations.length === 0 ? (
                            <p className="text-xs text-slate-500">No recommendations available yet.</p>
                          ) : (
                            <div className="space-y-2 mb-3">
                              {dispatchRecommendations.map((rec) => (
                                <div key={rec.id} className="flex items-center justify-between text-xs bg-slate-900/80 p-2 rounded border border-slate-700">
                                  <div>
                                    <p className="font-semibold text-slate-200">{rec.name}</p>
                                    <p className="text-slate-500">Score {rec.score} • {rec.distanceKm != null ? `${rec.distanceKm} km` : 'No GPS'} • {rec.typeMatch ? 'Skill match' : 'General'}</p>
                                  </div>
                                  <button
                                    onClick={() => assignIncidentToVolunteer(incident.id, rec.id)}
                                    className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                                  >
                                    Assign
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                          <p className="text-sm font-medium text-slate-200 mb-2">Select Volunteer:</p>
                          <select
                            className="w-full p-2 border border-slate-700 bg-slate-900 text-slate-200 rounded mb-2"
                            onChange={(e) => {
                              if (e.target.value) {
                                assignIncidentToVolunteer(incident.id, e.target.value);
                              }
                            }}
                          >
                            <option value="">Choose a volunteer...</option>
                            {users.filter(u => u.role === 'volunteer').map(volunteer => (
                              <option key={volunteer._id || volunteer.id} value={volunteer._id || volunteer.id}>
                                {volunteer.firstName} {volunteer.lastName} ({volunteer.email})
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => setAssigningIncident(null)}
                            className="text-sm text-gray-600 hover:text-gray-800"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'groups' && (
            <div className="space-y-6">
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Create Volunteer Group</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={groupForm.name}
                    onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                    placeholder="Group name"
                    className="p-3 rounded-lg bg-slate-950 border border-slate-700 text-slate-200"
                  />
                  <input
                    type="text"
                    value={groupForm.notes}
                    onChange={(e) => setGroupForm({ ...groupForm, notes: e.target.value })}
                    placeholder="Notes (optional)"
                    className="p-3 rounded-lg bg-slate-950 border border-slate-700 text-slate-200"
                  />
                </div>
                <div className="mt-4">
                  <label className="text-sm text-slate-300">Select Members</label>
                  <select
                    multiple
                    value={groupForm.members}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions).map(option => option.value);
                      setGroupForm({ ...groupForm, members: selected });
                    }}
                    className="w-full mt-2 p-3 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 h-40"
                  >
                    {users.filter(u => u.role === 'volunteer').map(volunteer => (
                      <option key={volunteer._id || volunteer.id} value={volunteer._id || volunteer.id}>
                        {volunteer.firstName} {volunteer.lastName} ({volunteer.email})
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={createGroup}
                  className="mt-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2 rounded-lg"
                >
                  Create Group
                </button>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Assign Group to Incident</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <select
                    value={groupAssign.groupId}
                    onChange={(e) => setGroupAssign({ ...groupAssign, groupId: e.target.value })}
                    className="p-3 rounded-lg bg-slate-950 border border-slate-700 text-slate-200"
                  >
                    <option value="">Select Group</option>
                    {groups.map(group => (
                      <option key={group._id} value={group._id}>{group.name}</option>
                    ))}
                  </select>
                  <select
                    value={groupAssign.incidentId}
                    onChange={(e) => setGroupAssign({ ...groupAssign, incidentId: e.target.value })}
                    className="p-3 rounded-lg bg-slate-950 border border-slate-700 text-slate-200"
                  >
                    <option value="">Select Incident</option>
                    {incidents.map(incident => (
                      <option key={incident.id} value={incident.id}>{incident.id} • {incident.type}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={assignGroupToIncident}
                  className="mt-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2 rounded-lg"
                >
                  Assign Group
                </button>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Existing Groups</h3>
                <div className="space-y-3">
                  {groups.length === 0 ? (
                    <p className="text-slate-500">No groups created yet.</p>
                  ) : (
                    groups.map(group => (
                      <div key={group._id} className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-white font-semibold">{group.name}</p>
                            <p className="text-xs text-slate-400">Members: {group.members?.length || 0}</p>
                          </div>
                          <span className="text-xs text-slate-500">{group.roleScope.toUpperCase()}</span>
                        </div>
                        {group.notes && <p className="text-xs text-slate-400 mt-2">{group.notes}</p>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'users' && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">User Management</h3>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Email</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Role</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="py-8 text-center text-gray-500">No users found</td>
                    </tr>
                  ) : (
                    users.map(user => (
                      <tr key={user.id} className="border-b border-gray-100">
                        <td className="py-3 px-4">{user.firstName} {user.lastName}</td>
                        <td className="py-3 px-4">{user.email}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            user.role === 'admin' ? 'bg-red-600' :
                            user.role === 'volunteer' ? 'bg-blue-600' : 'bg-green-600'
                          } text-white`}>
                            {user.role.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 rounded-full text-xs bg-green-500 text-white">Active</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeSection === 'volunteers' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Volunteer Management</h3>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Name</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Email</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Location</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Tasks</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.filter(u => u.role === 'volunteer').length === 0 ? (
                      <tr>
                        <td colSpan="6" className="py-8 text-center text-gray-500">No volunteers found</td>
                      </tr>
                    ) : (
                      users.filter(u => u.role === 'volunteer').map(volunteer => {
                        const volunteerTasks = incidents.filter(i => {
                          const assignedToId = i.assignedTo?._id || i.assignedTo?.id || i.assignedTo;
                          const volunteerId = volunteer._id || volunteer.id;
                          return assignedToId && volunteerId && assignedToId.toString() === volunteerId.toString();
                        });
                        const hasLocation = volunteer.currentLocation && volunteer.currentLocation.lat && volunteer.currentLocation.lng;
                        return (
                          <tr key={volunteer.id || volunteer._id} className="border-b border-gray-100">
                            <td className="py-3 px-4">{volunteer.firstName} {volunteer.lastName}</td>
                            <td className="py-3 px-4">{volunteer.email}</td>
                            <td className="py-3 px-4">
                              {hasLocation ? (
                                <span className="text-xs text-green-600">
                                  {volunteer.currentLocation.lat.toFixed(4)}, {volunteer.currentLocation.lng.toFixed(4)}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400">Not set</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-1 rounded-full text-xs bg-green-500 text-white">Active</span>
                            </td>
                            <td className="py-3 px-4">{volunteerTasks.length}</td>
                            <td className="py-3 px-4">
                              <button
                                onClick={() => setSelectedVolunteer(volunteer)}
                                className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                              >
                                📍 Mark Location
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {selectedVolunteer && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Mark Location for {selectedVolunteer.firstName} {selectedVolunteer.lastName}
                    </h3>
                    <button
                      onClick={() => setSelectedVolunteer(null)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">
                      Click on the map in Dashboard section to set location, or use GPS to get current location.
                    </p>
                    <div className="flex gap-2 mb-4">
                      <button
                        onClick={async () => {
                          if (navigator.geolocation) {
                            navigator.geolocation.getCurrentPosition(
                              async (position) => {
                                const location = {
                                  lat: position.coords.latitude,
                                  lng: position.coords.longitude
                                };
                                try {
                                  const response = await adminAPI.updateVolunteerLocation(
                                    selectedVolunteer._id || selectedVolunteer.id,
                                    location
                                  );
                                  if (response.success) {
                                    showNotification('Volunteer location updated successfully!', 'success');
                                    setSelectedVolunteer(null);
                                    await loadData();
                                  } else {
                                    showNotification(response.message || 'Failed to update location', 'error');
                                  }
                                } catch (error) {
                                  console.error('Error updating volunteer location:', error);
                                  showNotification(error.message || 'Failed to update location', 'error');
                                }
                              },
                              () => {
                                showNotification('Unable to get location', 'error');
                              }
                            );
                          } else {
                            showNotification('Geolocation is not supported', 'error');
                          }
                        }}
                        className="text-sm bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                      >
                        📍 Use GPS Location
                      </button>
                      <button
                        onClick={async () => {
                          if (mapInstanceRef.current && selectedVolunteer) {
                            const center = mapInstanceRef.current.getCenter();
                            const location = {
                              lat: center.lat,
                              lng: center.lng
                            };
                            try {
                              const response = await adminAPI.updateVolunteerLocation(
                                selectedVolunteer._id || selectedVolunteer.id,
                                location
                              );
                              if (response.success) {
                                showNotification('Volunteer location updated successfully!', 'success');
                                setSelectedVolunteer(null);
                                await loadData();
                              } else {
                                showNotification(response.message || 'Failed to update location', 'error');
                              }
                            } catch (error) {
                              console.error('Error updating volunteer location:', error);
                              showNotification(error.message || 'Failed to update location', 'error');
                            }
                          }
                        }}
                        className="text-sm bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                      >
                        📍 Use Map Center
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSection === 'analytics' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">System Analytics</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-md font-medium text-gray-700 mb-3">Incident Trends</h4>
                    <div id="trends-chart" className="h-64"></div>
                  </div>
                  <div>
                    <h4 className="text-md font-medium text-gray-700 mb-3">Response Time Analysis</h4>
                    <div id="response-chart" className="h-64"></div>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h4 className="text-md font-medium text-gray-700 mb-3">Incident Distribution by Type</h4>
                <div id="incident-distribution-chart" className="h-64"></div>
              </div>
            </div>
          )}

          {activeSection === 'settings' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">System Settings</h3>
                <div className="space-y-6">
                  <div>
                    <h4 className="text-md font-medium text-gray-700 mb-3">General Settings</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">System Name</label>
                        <input 
                          type="text" 
                          className="w-full p-2 border border-gray-300 rounded-md" 
                          defaultValue="Disaster Response System"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Alert Threshold</label>
                        <input 
                          type="number" 
                          className="w-full p-2 border border-gray-300 rounded-md" 
                          defaultValue="5"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-md font-medium text-gray-700 mb-3">Notification Settings</h4>
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input type="checkbox" className="mr-3" defaultChecked />
                        <span className="text-sm text-gray-700">Email notifications for critical incidents</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="mr-3" defaultChecked />
                        <span className="text-sm text-gray-700">SMS alerts for emergency situations</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="mr-3" />
                        <span className="text-sm text-gray-700">Daily system reports</span>
                      </label>
                    </div>
                  </div>
                  <div className="pt-4">
                    <button className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors">
                      Save Settings
                    </button>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Audit Log</h3>
                  <span className="text-sm text-slate-500">Recent admin activity</span>
                </div>
                <div className="space-y-3">
                  {auditLogs.length === 0 ? (
                    <p className="text-sm text-slate-500">No audit events found yet.</p>
                  ) : (
                    auditLogs.slice(0, 6).map((log) => (
                      <div key={log._id} className="border border-slate-200 rounded-lg p-3 bg-slate-50/80">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{log.action.replace(/_/g, ' ')}</p>
                            <p className="text-xs text-slate-500">{new Date(log.timestamp).toLocaleString()}</p>
                          </div>
                          <span className="text-xs uppercase tracking-wider text-slate-600 bg-slate-200 px-2 py-1 rounded-full">
                            {log.role}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 mt-2">User: {log.userName} • {log.entityType} {log.entityId}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
  );
};

export default Admin;


