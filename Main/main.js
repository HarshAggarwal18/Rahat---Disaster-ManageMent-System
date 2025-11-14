// Enhanced Disaster Management System with Role-Based Access Control and Location Features
class EnhancedDisasterManagementSystem {
    constructor() {
        this.map = null;
        this.incidents = [];
        this.volunteers = [];
        this.markers = [];
        this.charts = {};
        this.currentUser = null;
        this.heatmapLayer = null;
        this.markerClusterGroup = null;
        this.currentLocation = null;
        this.routingControl = null;
        this.draggedIncident = null;
        
        this.init();
    }

    init() {
        this.checkAuthentication();
        this.initializeTypedText();
        this.initializeMobileMenu();
        this.initializeMap();
        this.initializeCharts();
        this.loadData();
        this.setupEventListeners();
        this.startRealTimeUpdates();
        this.showEmergencyAlert();
        this.initializeRoleBasedFeatures();
        this.initializeLocationFeatures();
        this.initializeDragAndDrop();
    }

    checkAuthentication() {
        const session = localStorage.getItem('disaster_response_session');
        if (!session) {
            window.location.href = 'auth.html';
            return;
        }
        
        this.currentUser = JSON.parse(session);
        
        // Update user info in navigation if elements exist
        const userDisplay = document.getElementById('current-user-display');
        if (userDisplay && this.currentUser) {
            userDisplay.textContent = `${this.currentUser.firstName} ${this.currentUser.lastName} (${this.currentUser.role})`;
        }

        // Add logout button
        this.addLogoutButton();
    }

    addLogoutButton() {
        const navContainer = document.querySelector('.ml-10.flex.items-baseline.space-x-4');
        if (navContainer) {
            const logoutBtn = document.createElement('button');
            logoutBtn.id = 'logout-btn';
            logoutBtn.className = 'text-gray-300 hover:text-orange-300 px-3 py-2 rounded-md text-sm font-medium transition-colors';
            logoutBtn.textContent = 'Logout';
            logoutBtn.addEventListener('click', () => this.logout());
            navContainer.appendChild(logoutBtn);
        }
    }

    initializeRoleBasedFeatures() {
        if (!this.currentUser) return;

        // Update navigation based on role
        this.updateNavigationForRole(this.currentUser.role);
        
        // Show/hide features based on permissions
        this.updateFeaturesForRole(this.currentUser.role);
    }

    updateNavigationForRole(role) {
        const navContainer = document.querySelector('.ml-10.flex.items-baseline.space-x-4');
        if (!navContainer) return;

        // Clear existing navigation (except logout button)
        const logoutBtn = navContainer.querySelector('#logout-btn');
        navContainer.innerHTML = '';
        if (logoutBtn) navContainer.appendChild(logoutBtn);

        // Add role-specific navigation items
        const navItems = this.getRoleBasedNavigation(role);
        navItems.forEach(item => {
            const link = document.createElement('a');
            link.href = item.href;
            link.className = `text-gray-300 hover:text-orange-300 px-3 py-2 rounded-md text-sm font-medium transition-colors ${item.active ? 'text-orange-300' : ''}`;
            link.textContent = item.text;
            navContainer.insertBefore(link, logoutBtn);
        });
    }

    getRoleBasedNavigation(role) {
        const baseNav = [
            { href: 'index.html', text: 'Dashboard', active: window.location.pathname.includes('index.html') || window.location.pathname === '/' },
        ];

        switch (role) {
            case 'admin':
                return [
                    ...baseNav,
                    { href: 'admin.html', text: 'Admin Panel', active: window.location.pathname.includes('admin.html') },
                    { href: 'incidents.html', text: 'Incident Moderation', active: window.location.pathname.includes('incidents.html') },
                    { href: 'volunteers.html', text: 'Volunteer Management', active: window.location.pathname.includes('volunteers.html') }
                ];
            case 'moderator':
                return [
                    ...baseNav,
                    { href: 'incidents.html', text: 'Incident Moderation', active: window.location.pathname.includes('incidents.html') }
                ];
            case 'volunteer':
                return [
                    ...baseNav,
                    { href: 'volunteers.html', text: 'Volunteer Tasks', active: window.location.pathname.includes('volunteers.html') }
                ];
            default:
                return baseNav;
        }
    }

    updateFeaturesForRole(role) {
        const permissions = this.getRolePermissions(role);
        
        // Hide/show quick report form based on permissions
        const quickReportForm = document.getElementById('quick-report-form');
        if (quickReportForm && !permissions.includes('create_incidents')) {
            quickReportForm.style.display = 'none';
        }

        // Hide/show filter buttons based on permissions
        const filterButtons = document.querySelectorAll('[id^="filter-"]');
        if (!permissions.includes('view_all_incidents')) {
            filterButtons.forEach(btn => {
                if (btn.id !== 'filter-all') {
                    btn.style.display = 'none';
                }
            });
        }
    }

    getRolePermissions(role) {
        const permissions = {
            admin: ['view_all_incidents', 'moderate_incidents', 'manage_users', 'manage_system', 'view_analytics', 'assign_tasks', 'create_incidents'],
            moderator: ['view_all_incidents', 'moderate_incidents', 'view_analytics', 'assign_tasks', 'create_incidents'],
            volunteer: ['view_assigned_incidents', 'update_incident_status', 'view_tasks', 'accept_tasks'],
            operator: ['view_incidents', 'create_incidents', 'view_basic_analytics']
        };

        return permissions[role] || [];
    }

    initializeLocationFeatures() {
        // Add "Use Current Location" button to quick report form
        this.addCurrentLocationButton();
        
        // Initialize geolocation features for incident reporting
        this.setupGeolocationReporting();
    }

    addCurrentLocationButton() {
        const quickReportForm = document.getElementById('quick-report-form');
        if (!quickReportForm) return;

        const locationButton = document.createElement('button');
        locationButton.type = 'button';
        locationButton.id = 'use-current-location';
        locationButton.className = 'w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors mb-2';
        locationButton.innerHTML = '📍 Use Current Location';
        
        // Insert before the submit button
        const submitBtn = quickReportForm.querySelector('button[type="submit"]');
        quickReportForm.insertBefore(locationButton, submitBtn);

        locationButton.addEventListener('click', () => this.getCurrentLocation());
    }

    setupGeolocationReporting() {
        // Add click handler for map reporting with enhanced features
        if (this.map) {
            this.map.on('click', (e) => {
                this.handleEnhancedMapClick(e);
            });
        }
    }

    getCurrentLocation() {
        if (!navigator.geolocation) {
            this.showNotification('Geolocation is not supported by this browser', 'error');
            return;
        }

        const locationButton = document.getElementById('use-current-location');
        locationButton.disabled = true;
        locationButton.innerHTML = '📍 Getting location...';

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                
                // Store location for the report
                this.currentLocation = { lat, lng };
                
                locationButton.innerHTML = `📍 Location captured (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
                locationButton.className = 'w-full bg-green-700 text-white py-2 px-4 rounded-md cursor-not-allowed mb-2';
                
                this.showNotification('Location captured successfully!', 'success');
            },
            (error) => {
                locationButton.disabled = false;
                locationButton.innerHTML = '📍 Use Current Location';
                locationButton.className = 'w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors mb-2';
                
                let errorMessage = 'Unable to get your location';
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'Location permission denied';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'Location information unavailable';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'Location request timed out';
                        break;
                }
                this.showNotification(errorMessage, 'error');
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000 // 5 minutes
            }
        );
    }

    handleEnhancedMapClick(e) {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;
        
        // Create enhanced incident reporting form
        this.showEnhancedIncidentForm(lat, lng);
    }

    showEnhancedIncidentForm(lat, lng) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                <h3 class="text-lg font-semibold mb-4">Report Incident</h3>
                <p class="text-sm text-gray-600 mb-4">Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}</p>
                
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Incident Type</label>
                        <select id="modal-incident-type" class="w-full p-2 border border-gray-300 rounded-md">
                            <option value="fire">Fire</option>
                            <option value="medical">Medical Emergency</option>
                            <option value="flood">Flooding</option>
                            <option value="accident">Traffic Accident</option>
                            <option value="earthquake">Earthquake</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                        <select id="modal-incident-severity" class="w-full p-2 border border-gray-300 rounded-md">
                            <option value="1">Low</option>
                            <option value="2" selected>Medium</option>
                            <option value="3">High</option>
                            <option value="4">Critical</option>
                            <option value="5">Emergency</option>
                        </select>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea id="modal-incident-description" rows="3" class="w-full p-2 border border-gray-300 rounded-md" placeholder="Brief description of the incident..."></textarea>
                    </div>
                </div>
                
                <div class="flex space-x-3 mt-6">
                    <button id="cancel-report" class="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors">
                        Cancel
                    </button>
                    <button id="submit-report" class="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors">
                        Report Incident
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Add event listeners
        modal.querySelector('#cancel-report').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        modal.querySelector('#submit-report').addEventListener('click', () => {
            const type = modal.querySelector('#modal-incident-type').value;
            const severity = parseInt(modal.querySelector('#modal-incident-severity').value);
            const description = modal.querySelector('#modal-incident-description').value;

            if (!description.trim()) {
                this.showNotification('Please provide a description', 'error');
                return;
            }

            this.createIncident({
                type,
                severity,
                description,
                location: { lat, lng },
                timestamp: new Date()
            });

            document.body.removeChild(modal);
            this.showNotification('Incident reported successfully!', 'success');
        });
    }

    initializeTypedText() {
        if (document.getElementById('typed-text')) {
            new Typed('#typed-text', {
                strings: [
                    'Emergency Response Dashboard',
                    'Real-time Crisis Coordination',
                    'Disaster Management System'
                ],
                typeSpeed: 50,
                backSpeed: 30,
                backDelay: 2000,
                loop: true
            });
        }
    }

    initializeMobileMenu() {
        const mobileMenuButton = document.getElementById('mobile-menu-button');
        const mobileMenu = document.getElementById('mobile-menu');
        
        if (mobileMenuButton && mobileMenu) {
            mobileMenuButton.addEventListener('click', () => {
                mobileMenu.classList.toggle('hidden');
            });
        }
    }

    initializeMap() {
        if (document.getElementById('incident-map')) {
            this.map = L.map('incident-map').setView([40.7128, -74.0060], 10);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(this.map);

            // Initialize marker cluster group
            this.markerClusterGroup = L.markerClusterGroup({
                chunkedLoading: true,
                maxClusterRadius: 50
            });
            this.map.addLayer(this.markerClusterGroup);

            // Initialize heatmap layer
            this.initializeHeatmap();

            // Add click handler for map reporting
            this.map.on('click', (e) => {
                this.handleEnhancedMapClick(e);
            });
        }
    }

    initializeHeatmap() {
        if (this.heatmapLayer) {
            this.map.removeLayer(this.heatmapLayer);
        }
        
        // Create heatmap data from incidents
        const heatmapData = this.incidents.map(incident => [
            incident.location.lat,
            incident.location.lng,
            this.scaleSeverity(incident.severity) // Scale severity to 0.2-1.0
        ]);

        if (heatmapData.length > 0) {
            this.heatmapLayer = L.heatLayer(heatmapData, {
                radius: 25,
                blur: 15,
                maxZoom: 17,
                gradient: {
                    0.2: '#27ae60', // Low severity - Green
                    0.4: '#f39c12', // Medium severity - Orange
                    0.6: '#e67e22', // High severity - Dark Orange
                    0.8: '#e74c3c', // Critical severity - Red
                    1.0: '#8e44ad'  // Emergency severity - Purple
                }
            }).addTo(this.map);
        }
    }

    scaleSeverity(severity) {
        // Scale severity (1-5) to intensity (0.2-1.0)
        return 0.2 + ((severity - 1) / 4) * 0.8;
    }

    updateHeatmap() {
        if (this.heatmapLayer) {
            // Remove existing heatmap
            this.map.removeLayer(this.heatmapLayer);
        }
        
        // Recreate heatmap with updated data
        this.initializeHeatmap();
    }

    initializeCharts() {
        this.initTrendsChart();
        this.initResponseChart();
        this.initHeatmapChart();
    }

    initHeatmapChart() {
        const chartElement = document.getElementById('heatmap-chart');
        if (!chartElement) return;

        const chart = echarts.init(chartElement);
        
        // Generate heatmap data based on incident density
        const heatmapData = this.generateHeatmapData();
        
        const option = {
            title: {
                text: 'Incident Density Heatmap',
                left: 'center'
            },
            tooltip: {
                position: 'top',
                formatter: function (params) {
                    return `Incidents: ${params.value[2]}`;
                }
            },
            grid: {
                height: '50%',
                top: '10%'
            },
            xAxis: {
                type: 'category',
                data: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'],
                splitArea: {
                    show: true
                }
            },
            yAxis: {
                type: 'category',
                data: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
                splitArea: {
                    show: true
                }
            },
            visualMap: {
                min: 0,
                max: 10,
                calculable: true,
                orient: 'horizontal',
                left: 'center',
                bottom: '15%',
                inRange: {
                    color: ['#313695', '#4575b4', '#74add1', '#abd9e9', '#e0f3f8', '#ffffcc', '#fee090', '#fdae61', '#f46d43', '#d73027', '#a50026']
                }
            },
            series: [{
                name: 'Incident Density',
                type: 'heatmap',
                data: heatmapData,
                label: {
                    show: false
                },
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                }
            }]
        };

        chart.setOption(option);
        this.charts.heatmap = chart;
    }

    generateHeatmapData() {
        const data = [];
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const hours = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'];
        
        for (let i = 0; i < days.length; i++) {
            for (let j = 0; j < hours.length; j++) {
                data.push([j, i, Math.floor(Math.random() * 10)]);
            }
        }
        
        return data;
    }

    initTrendsChart() {
        const chartElement = document.getElementById('trends-chart');
        if (!chartElement) return;

        const chart = echarts.init(chartElement);
        
        const option = {
            title: {
                text: 'Incident Trends',
                left: 'center'
            },
            tooltip: {
                trigger: 'axis'
            },
            xAxis: {
                type: 'category',
                data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
            },
            yAxis: {
                type: 'value'
            },
            series: [{
                data: [12, 19, 3, 5, 2, 3, 9],
                type: 'line',
                smooth: true,
                itemStyle: {
                    color: '#3b82f6'
                }
            }]
        };

        chart.setOption(option);
        this.charts.trends = chart;
    }

    initResponseChart() {
        const chartElement = document.getElementById('response-chart');
        if (!chartElement) return;

        const chart = echarts.init(chartElement);
        
        const option = {
            title: {
                text: 'Response Time Distribution',
                left: 'center'
            },
            tooltip: {
                trigger: 'item'
            },
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

        chart.setOption(option);
        this.charts.response = chart;
    }

    loadData() {
        // Load from localStorage or use mock data
        const savedIncidents = localStorage.getItem('disaster_response_incidents');
        const savedVolunteers = localStorage.getItem('disaster_response_volunteers');
        
        if (savedIncidents) {
            this.incidents = JSON.parse(savedIncidents);
        } else {
            this.incidents = this.getMockIncidents();
        }
        
        if (savedVolunteers) {
            this.volunteers = JSON.parse(savedVolunteers);
        } else {
            this.volunteers = this.getMockVolunteers();
        }
        
        this.updateIncidentMarkers();
        this.updateIncidentFeed();
        this.updateDashboardStats();
    }

    saveData() {
        localStorage.setItem('disaster_response_incidents', JSON.stringify(this.incidents));
        localStorage.setItem('disaster_response_volunteers', JSON.stringify(this.volunteers));
    }

    getMockIncidents() {
        return [
            {
                id: 'INC-2025-001',
                type: 'fire',
                severity: 5,
                status: 'new',
                location: { lat: 40.7589, lng: -73.9851 },
                description: 'High-rise building fire in Manhattan',
                timestamp: new Date(Date.now() - 1000 * 60 * 15),
                reporter: 'John Smith',
                assignedVolunteers: [],
                resources: [],
                resolvedAt: null,
                assignedTo: null
            },
            {
                id: 'INC-2025-002',
                type: 'medical',
                severity: 3,
                status: 'assigned',
                location: { lat: 40.7505, lng: -73.9934 },
                description: 'Cardiac emergency at subway station',
                timestamp: new Date(Date.now() - 1000 * 60 * 8),
                reporter: 'Sarah Johnson',
                assignedVolunteers: ['VOL-003'],
                resources: ['Ambulance 17'],
                resolvedAt: null,
                assignedTo: 'VOL-003'
            },
            {
                id: 'INC-2025-003',
                type: 'flood',
                severity: 2,
                status: 'completed',
                location: { lat: 40.7282, lng: -74.0776 },
                description: 'Street flooding due to heavy rain',
                timestamp: new Date(Date.now() - 1000 * 60 * 45),
                reporter: 'Mike Davis',
                assignedVolunteers: ['VOL-004', 'VOL-005'],
                resources: ['Pump Truck 3'],
                resolvedAt: new Date(Date.now() - 1000 * 60 * 120),
                assignedTo: 'VOL-004'
            },
            {
                id: 'INC-2025-004',
                type: 'accident',
                severity: 3,
                status: 'new',
                location: { lat: 40.7614, lng: -73.9776 },
                description: 'Multi-vehicle collision on highway',
                timestamp: new Date(Date.now() - 1000 * 60 * 22),
                reporter: 'Lisa Chen',
                assignedVolunteers: [],
                resources: [],
                resolvedAt: null,
                assignedTo: null
            },
            {
                id: 'INC-2025-005',
                type: 'fire',
                severity: 2,
                status: 'new',
                location: { lat: 40.7831, lng: -73.9712 },
                description: 'Small kitchen fire in residential building',
                timestamp: new Date(Date.now() - 1000 * 60 * 67),
                reporter: 'Tom Wilson',
                assignedVolunteers: [],
                resources: [],
                resolvedAt: null,
                assignedTo: null
            }
        ];
    }

    getMockVolunteers() {
        return [
            {
                id: 'VOL-001',
                name: 'Alice Brown',
                skills: ['Fire Response', 'Medical Aid'],
                availability: true,
                location: { lat: 40.7500, lng: -73.9900 },
                contact: '+1-555-0101',
                assignedTasks: ['INC-2025-001'],
                hoursLogged: 24,
                status: 'active',
                currentLocation: { lat: 40.7500, lng: -73.9900 }
            },
            {
                id: 'VOL-002',
                name: 'Bob Green',
                skills: ['Fire Response', 'Search & Rescue'],
                availability: true,
                location: { lat: 40.7600, lng: -73.9800 },
                contact: '+1-555-0102',
                assignedTasks: [],
                hoursLogged: 18,
                status: 'active',
                currentLocation: { lat: 40.7600, lng: -73.9800 }
            },
            {
                id: 'VOL-003',
                name: 'Carol White',
                skills: ['Medical Aid', 'EMT'],
                availability: false,
                location: { lat: 40.7550, lng: -73.9950 },
                contact: '+1-555-0103',
                assignedTasks: ['INC-2025-002'],
                hoursLogged: 32,
                status: 'busy',
                currentLocation: { lat: 40.7550, lng: -73.9950 }
            }
        ];
    }

    createIncident(incidentData) {
        const newIncident = {
            id: `INC-2025-${String(this.incidents.length + 1).padStart(3, '0')}`,
            ...incidentData,
            status: 'new',
            reporter: this.currentUser ? `${this.currentUser.firstName} ${this.currentUser.lastName}` : 'System User',
            assignedVolunteers: [],
            resources: [],
            resolvedAt: null,
            assignedTo: null
        };

        this.incidents.unshift(newIncident);
        this.saveData();
        this.updateIncidentMarkers();
        this.updateIncidentFeed();
        this.updateDashboardStats();
        this.updateHeatmap();
        this.showNotification('New incident reported successfully!', 'success');
        
        // Animate the new incident
        this.animateNewIncident(newIncident);
    }

    updateIncidentMarkers() {
        // Clear existing markers from cluster group
        this.markerClusterGroup.clearLayers();
        this.markers = [];

        // Add new markers for each incident
        this.incidents.forEach(incident => {
            const color = this.getStatusColor(incident.severity);
            const marker = L.circleMarker([incident.location.lat, incident.location.lng], {
                radius: this.getMarkerRadius(incident.severity),
                fillColor: color,
                color: '#ffffff',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.8
            });

            const popupContent = `
                <div class="p-2">
                    <h3 class="font-semibold text-sm">${incident.id}</h3>
                    <p class="text-xs text-gray-600">${incident.type.toUpperCase()} - ${this.getStatusText(incident.severity)}</p>
                    <p class="text-xs mt-1">${incident.description}</p>
                    <p class="text-xs text-gray-500 mt-1">${this.formatTime(incident.timestamp)}</p>
                    <p class="text-xs text-gray-500">Reporter: ${incident.reporter}</p>
                    <p class="text-xs text-gray-500">Status: ${incident.status}</p>
                    ${incident.assignedTo ? `<p class="text-xs text-blue-500">Assigned to: ${incident.assignedTo}</p>` : ''}
                </div>
            `;

            marker.bindPopup(popupContent);
            this.markerClusterGroup.addLayer(marker);
            this.markers.push(marker);
        });
    }

    getMarkerRadius(severity) {
        // Size markers based on severity
        switch(severity) {
            case 5: return 12; // Emergency
            case 4: return 10; // Critical
            case 3: return 8;  // High
            case 2: return 6;  // Medium
            case 1: return 4;  // Low
            default: return 6;
        }
    }

    updateIncidentFeed() {
        const feedElement = document.getElementById('incident-feed');
        if (!feedElement) return;

        const recentIncidents = this.incidents.slice(0, 8);
        
        feedElement.innerHTML = recentIncidents.map(incident => `
            <div class="border-l-4 ${this.getStatusBorderColor(incident.severity)} pl-3 py-2 bg-gray-50 rounded-r-lg">
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <div class="flex items-center space-x-2">
                            <span class="text-xs font-medium px-2 py-1 rounded ${this.getStatusBgColor(incident.severity)} text-white">
                                ${incident.type.toUpperCase()}
                            </span>
                            <span class="text-xs text-gray-500">${incident.id}</span>
                            <span class="text-xs px-2 py-1 rounded ${incident.status === 'completed' ? 'bg-green-100 text-green-800' : incident.status === 'assigned' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}">
                                ${incident.status.charAt(0).toUpperCase() + incident.status.slice(1)}
                            </span>
                        </div>
                        <p class="text-sm text-gray-900 mt-1">${incident.description}</p>
                        <p class="text-xs text-gray-500">${this.formatTime(incident.timestamp)} • ${incident.reporter}</p>
                        <p class="text-xs text-gray-400">📍 ${incident.location.lat.toFixed(4)}, ${incident.location.lng.toFixed(4)}</p>
                        ${incident.assignedTo ? `<p class="text-xs text-blue-500">Assigned to: ${incident.assignedTo}</p>` : ''}
                    </div>
                    <div class="flex items-center space-x-1">
                        <div class="w-2 h-2 rounded-full ${this.getStatusColorClass(incident.severity)}"></div>
                        <span class="text-xs text-gray-500">${this.getStatusText(incident.severity)}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    setupEventListeners() {
        // Quick report form
        const reportForm = document.getElementById('quick-report-form');
        if (reportForm) {
            reportForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleQuickReport();
            });
        }

        // Filter buttons
        const filterButtons = ['filter-all', 'filter-critical', 'filter-fire', 'filter-medical'];
        filterButtons.forEach(buttonId => {
            const button = document.getElementById(buttonId);
            if (button) {
                button.addEventListener('click', () => {
                    this.filterIncidents(buttonId.replace('filter-', ''));
                    this.updateFilterButtons(buttonId);
                });
            }
        });

        // Window resize for charts
        window.addEventListener('resize', () => {
            Object.values(this.charts).forEach(chart => {
                if (chart && chart.resize) {
                    chart.resize();
                }
            });
        });
    }

    handleQuickReport() {
        const type = document.getElementById('incident-type').value;
        const severity = parseInt(document.getElementById('incident-severity').value);
        const description = document.getElementById('incident-description').value;

        if (!description.trim()) {
            this.showNotification('Please provide a description', 'error');
            return;
        }

        let lat, lng;
        
        // Use current location if available, otherwise use random location
        if (this.currentLocation) {
            lat = this.currentLocation.lat;
            lng = this.currentLocation.lng;
            this.currentLocation = null; // Reset after use
            
            // Reset location button
            const locationButton = document.getElementById('use-current-location');
            if (locationButton) {
                locationButton.disabled = false;
                locationButton.innerHTML = '📍 Use Current Location';
                locationButton.className = 'w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors mb-2';
            }
        } else {
            // Get random location near center for demo
            lat = 40.7128 + (Math.random() - 0.5) * 0.1;
            lng = -74.0060 + (Math.random() - 0.5) * 0.1;
        }

        this.createIncident({
            type,
            severity,
            description,
            location: { lat, lng },
            timestamp: new Date()
        });

        // Reset form
        document.getElementById('quick-report-form').reset();
    }

    filterIncidents(filter) {
        this.markers.forEach(marker => {
            if (filter === 'all') {
                marker.setStyle({ ...marker.options, fillOpacity: 0.8 });
            } else if (filter === 'critical') {
                const isCritical = Math.random() > 0.7; // Simplified for demo
                marker.setStyle({ ...marker.options, fillOpacity: isCritical ? 0.8 : 0.2 });
            } else {
                const matchesFilter = Math.random() > 0.5; // Simplified for demo
                marker.setStyle({ ...marker.options, fillOpacity: matchesFilter ? 0.8 : 0.2 });
            }
        });
    }

    updateFilterButtons(activeButtonId) {
        const buttons = ['filter-all', 'filter-critical', 'filter-fire', 'filter-medical'];
        buttons.forEach(buttonId => {
            const button = document.getElementById(buttonId);
            if (button) {
                if (buttonId === activeButtonId) {
                    button.className = 'px-3 py-1 text-sm bg-blue-500 text-white rounded';
                } else {
                    button.className = 'px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded';
                }
            }
        });
    }

    updateDashboardStats() {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        // Calculate statistics
        const criticalIncidents = this.incidents.filter(incident => incident.severity >= 4).length;
        const activeVolunteers = this.volunteers.filter(vol => vol.status === 'active' && vol.availability).length;
        const resolvedToday = this.incidents.filter(incident => 
            incident.resolvedAt && new Date(incident.resolvedAt) >= today
        ).length;
        
        // Update DOM elements if they exist
        const criticalElement = document.getElementById('critical-total');
        const volunteersElement = document.getElementById('volunteers-total');
        const resolvedElement = document.getElementById('resolved-today');
        const responseElement = document.getElementById('avg-response');
        
        if (criticalElement) criticalElement.textContent = criticalIncidents;
        if (volunteersElement) volunteersElement.textContent = activeVolunteers;
        if (resolvedElement) resolvedElement.textContent = resolvedToday;
        if (responseElement) responseElement.textContent = '12m';
    }

    animateStatistics() {
        const stats = [
            { id: 'critical-total', target: 24 },
            { id: 'volunteers-total', target: 342 },
            { id: 'resolved-today', target: 18 },
            { id: 'avg-response', target: 12, suffix: 'm' }
        ];

        stats.forEach(stat => {
            const element = document.getElementById(stat.id);
            if (element) {
                this.animateNumber(element, 0, stat.target, stat.suffix || '');
            }
        });
    }

    animateNumber(element, start, end, suffix = '') {
        const duration = 2000;
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const current = Math.floor(start + (end - start) * progress);
            element.textContent = current + suffix;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }

    animateNewIncident(incident) {
        // Add animation for new incident
        const feedElement = document.getElementById('incident-feed');
        if (feedElement) {
            const firstChild = feedElement.firstElementChild;
            if (firstChild) {
                anime({
                    targets: firstChild,
                    scale: [0.8, 1],
                    opacity: [0, 1],
                    duration: 500,
                    easing: 'easeOutElastic(1, .8)'
                });
            }
        }
    }

    startRealTimeUpdates() {
        // Simulate real-time updates
        setInterval(() => {
            this.updateRealTimeData();
        }, 30000); // Update every 30 seconds
    }

    updateRealTimeData() {
        // Randomly update some statistics
        const activeVolunteers = document.getElementById('active-volunteers');
        if (activeVolunteers && Math.random() > 0.8) {
            const currentCount = parseInt(activeVolunteers.textContent);
            const change = Math.random() > 0.5 ? 1 : -1;
            activeVolunteers.textContent = Math.max(0, currentCount + change);
        }
    }

    showEmergencyAlert() {
        const alert = document.getElementById('emergency-alert');
        if (alert) {
            setTimeout(() => {
                alert.classList.remove('hidden');
                anime({
                    targets: alert,
                    translateY: [-50, 0],
                    opacity: [0, 1],
                    duration: 500,
                    easing: 'easeOutQuad'
                });
            }, 2000);
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `fixed top-20 right-4 p-4 rounded-lg shadow-lg z-50 ${
            type === 'success' ? 'bg-green-500' : 
            type === 'error' ? 'bg-red-500' : 'bg-blue-500'
        } text-white`;
        notification.textContent = message;

        document.body.appendChild(notification);

        anime({
            targets: notification,
            translateX: [300, 0],
            opacity: [0, 1],
            duration: 300,
            easing: 'easeOutQuad'
        });

        setTimeout(() => {
            anime({
                targets: notification,
                translateX: [0, 300],
                opacity: [1, 0],
                duration: 300,
                easing: 'easeInQuad',
                complete: () => {
                    if (document.body.contains(notification)) {
                        document.body.removeChild(notification);
                    }
                }
            });
        }, 3000);
    }

    logout() {
        localStorage.removeItem('disaster_response_session');
        window.location.href = 'auth.html';
    }

    // Utility functions
    getStatusColor(severity) {
        const colors = {
            1: '#27ae60', // Low - Green
            2: '#f39c12', // Medium - Orange
            3: '#e67e22', // High - Dark Orange
            4: '#e74c3c', // Critical - Red
            5: '#8e44ad'  // Emergency - Purple
        };
        return colors[severity] || '#f39c12';
    }

    getStatusText(severity) {
        const texts = {
            1: 'Low',
            2: 'Medium',
            3: 'High',
            4: 'Critical',
            5: 'Emergency'
        };
        return texts[severity] || 'Medium';
    }

    getStatusBorderColor(severity) {
        const colors = {
            1: 'border-green-500',
            2: 'border-yellow-500',
            3: 'border-orange-500',
            4: 'border-red-500',
            5: 'border-purple-500'
        };
        return colors[severity] || 'border-yellow-500';
    }

    getStatusBgColor(severity) {
        const colors = {
            1: 'bg-green-500',
            2: 'bg-yellow-500',
            3: 'bg-orange-500',
            4: 'bg-red-500',
            5: 'bg-purple-500'
        };
        return colors[severity] || 'bg-yellow-500';
    }

    getStatusColorClass(severity) {
        const classes = {
            1: 'bg-green-500',
            2: 'bg-yellow-500',
            3: 'bg-orange-500',
            4: 'bg-red-500',
            5: 'bg-purple-500'
        };
        return classes[severity] || 'bg-yellow-500';
    }

    formatTime(timestamp) {
        const now = new Date();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return timestamp.toLocaleDateString();
    }

    // Drag and Drop functionality
    initializeDragAndDrop() {
        if (document.getElementById('available-incidents') || document.getElementById('volunteer-tasks')) {
            this.setupDragAndDropContainers();
        }
    }

    setupDragAndDropContainers() {
        // Make incident cards draggable
        const incidentCards = document.querySelectorAll('.task-card');
        incidentCards.forEach(card => {
            card.draggable = true;
            card.addEventListener('dragstart', this.handleDragStart.bind(this));
            card.addEventListener('dragend', this.handleDragEnd.bind(this));
        });

        // Setup drop zones
        const dropZones = document.querySelectorAll('.drop-zone');
        dropZones.forEach(zone => {
            zone.addEventListener('dragover', this.handleDragOver.bind(this));
            zone.addEventListener('drop', this.handleDrop.bind(this));
            zone.addEventListener('dragenter', this.handleDragEnter.bind(this));
            zone.addEventListener('dragleave', this.handleDragLeave.bind(this));
        });
    }

    handleDragStart(e) {
        this.draggedIncident = {
            id: e.target.dataset.incidentId,
            element: e.target
        };
        e.target.classList.add('dragging');
    }

    handleDragEnd(e) {
        e.target.classList.remove('dragging');
        this.draggedIncident = null;
    }

    handleDragOver(e) {
        e.preventDefault();
    }

    handleDragEnter(e) {
        e.preventDefault();
        e.target.classList.add('drag-over');
    }

    handleDragLeave(e) {
        e.target.classList.remove('drag-over');
    }

    handleDrop(e) {
        e.preventDefault();
        e.target.classList.remove('drag-over');
        
        if (!this.draggedIncident) return;

        const dropZone = e.target.closest('.drop-zone');
        const targetType = dropZone.dataset.type;
        const incidentId = this.draggedIncident.id;

        if (targetType === 'assigned') {
            this.assignIncidentToVolunteer(incidentId, this.currentUser.id);
        } else if (targetType === 'completed') {
            this.completeIncident(incidentId);
        }
    }

    assignIncidentToVolunteer(incidentId, volunteerId) {
        const incident = this.incidents.find(i => i.id === incidentId);
        const volunteer = this.volunteers.find(v => v.id === volunteerId);
        
        if (incident && volunteer) {
            incident.status = 'assigned';
            incident.assignedTo = volunteerId;
            incident.assignedVolunteers = [volunteerId];
            
            volunteer.assignedTasks.push(incidentId);
            volunteer.availability = false;
            volunteer.status = 'busy';
            
            this.saveData();
            this.updateIncidentMarkers();
            this.updateIncidentFeed();
            this.updateHeatmap();
            this.showNotification(`Incident ${incidentId} assigned to ${volunteer.name}`, 'success');
            
            // Calculate and show route
            this.showRouteToIncident(volunteer.currentLocation, incident.location);
        }
    }

    completeIncident(incidentId) {
        const incident = this.incidents.find(i => i.id === incidentId);
        if (incident) {
            incident.status = 'completed';
            incident.resolvedAt = new Date();
            
            // Update volunteer status
            if (incident.assignedTo) {
                const volunteer = this.volunteers.find(v => v.id === incident.assignedTo);
                if (volunteer) {
                    volunteer.assignedTasks = volunteer.assignedTasks.filter(id => id !== incidentId);
                    volunteer.availability = true;
                    volunteer.status = 'active';
                }
            }
            
            this.saveData();
            this.updateIncidentMarkers();
            this.updateIncidentFeed();
            this.updateHeatmap();
            this.showNotification(`Incident ${incidentId} marked as completed`, 'success');
            
            // Remove route if exists
            if (this.routingControl) {
                this.map.removeControl(this.routingControl);
                this.routingControl = null;
            }
        }
    }

    showRouteToIncident(volunteerLocation, incidentLocation) {
        // Remove existing route
        if (this.routingControl) {
            this.map.removeControl(this.routingControl);
        }
        
        // Add new route using Leaflet Routing Machine (if available)
        if (window.L && window.L.Routing) {
            this.routingControl = L.Routing.control({
                waypoints: [
                    L.latLng(volunteerLocation.lat, volunteerLocation.lng),
                    L.latLng(incidentLocation.lat, incidentLocation.lng)
                ],
                lineOptions: { 
                    addWaypoints: false,
                    styles: [{ color: '#007bff', weight: 4, opacity: 0.7 }]
                },
                draggableWaypoints: false,
                fitSelectedRoutes: true,
                showAlternatives: false
            }).addTo(this.map);
        } else {
            // Fallback: draw a simple line
            const routeLine = L.polyline([
                [volunteerLocation.lat, volunteerLocation.lng],
                [incidentLocation.lat, incidentLocation.lng]
            ], {
                color: '#007bff',
                weight: 4,
                opacity: 0.7
            }).addTo(this.map);
            
            this.routingControl = routeLine;
        }
    }
}

// Initialize the enhanced disaster management system
let disasterSystem;
document.addEventListener('DOMContentLoaded', () => {
    disasterSystem = new EnhancedDisasterManagementSystem();
    window.disasterSystem = disasterSystem;
});