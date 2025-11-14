// Routing utilities using OSRM (Open Source Routing Machine) for real road-based routing
// Falls back to Dijkstra's algorithm if OSRM is unavailable

/**
 * Calculate distance between two coordinates using Haversine formula
 */
export const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

/**
 * Get route from OSRM (Open Source Routing Machine) API
 * This returns actual road-based routes following real streets
 */
export const getOSRMRoute = async (start, end) => {
  try {
    // OSRM API format: /route/v1/{profile}/{coordinates}?overview=full&geometries=geojson
    // Coordinates format: lng,lat;lng,lat (note: longitude first!)
    const startCoords = `${start.lng},${start.lat}`;
    const endCoords = `${end.lng},${end.lat}`;
    
    // Using OSRM public demo server (free, no API key needed)
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startCoords};${endCoords}?overview=full&geometries=geojson&alternatives=false`;
    
    console.log('Fetching route from OSRM:', osrmUrl);
    
    const response = await fetch(osrmUrl);
    
    if (!response.ok) {
      throw new Error(`OSRM API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      throw new Error('No route found from OSRM');
    }
    
    // Extract route geometry (GeoJSON format)
    const route = data.routes[0];
    const geometry = route.geometry;
    
    // Convert GeoJSON coordinates [lng, lat] to [lat, lng] format
    const routePoints = geometry.coordinates.map(coord => ({
      lat: coord[1],
      lng: coord[0]
    }));
    
    // Get distance in meters, convert to km
    const distance = route.distance / 1000;
    
    console.log('OSRM route found:', routePoints.length, 'points,', distance.toFixed(2), 'km');
    
    return {
      route: routePoints,
      distance: distance,
      duration: route.duration // in seconds
    };
  } catch (error) {
    console.error('OSRM routing error:', error);
    throw error;
  }
};

/**
 * Generate intermediate waypoints for routing (simplified Dijkstra approach)
 * Creates a path with intermediate points for visualization
 */
export const generateRouteWaypoints = (start, end, numPoints = 10) => {
  const waypoints = [];
  const latStep = (end.lat - start.lat) / (numPoints + 1);
  const lngStep = (end.lng - start.lng) / (numPoints + 1);

  for (let i = 1; i <= numPoints; i++) {
    waypoints.push({
      lat: start.lat + latStep * i,
      lng: start.lng + lngStep * i
    });
  }

  return waypoints;
};

/**
 * Get route using OSRM (real road-based routing) with Dijkstra fallback
 * This is the main routing function that should be used
 * Returns { route: [...], distance: number }
 */
export const getRoute = async (start, end) => {
  try {
    // First, try to get route from OSRM (real roads)
    const osrmRoute = await getOSRMRoute(start, end);
    return {
      route: osrmRoute.route,
      distance: osrmRoute.distance
    };
  } catch (error) {
    console.warn('OSRM routing failed, using Dijkstra fallback:', error);
    // Fallback to Dijkstra if OSRM fails
    const dijkstraPath = dijkstraRoute(start, end);
    // Calculate distance for Dijkstra path
    let distance = 0;
    for (let i = 0; i < dijkstraPath.length - 1; i++) {
      distance += calculateDistance(
        dijkstraPath[i].lat, dijkstraPath[i].lng,
        dijkstraPath[i + 1].lat, dijkstraPath[i + 1].lng
      );
    }
    return {
      route: dijkstraPath,
      distance: distance
    };
  }
};

/**
 * Dijkstra's algorithm for finding shortest path (fallback)
 * For map routing, we create a simplified graph with waypoints
 */
const dijkstraRoute = (start, end, obstacles = []) => {
  try {
    // Validate inputs
    if (!start || !end || !start.lat || !start.lng || !end.lat || !end.lng) {
      console.warn('Invalid start or end coordinates');
      return [start, end];
    }

    // Create waypoints
    const waypoints = generateRouteWaypoints(start, end, 10);
    
    // Build graph: each waypoint is a node
    const nodes = [start, ...waypoints, end];
    const graph = {};
    const maxConnectionDistance = 5; // Increased to 5km to ensure connectivity
    
    // Initialize graph
    nodes.forEach((node, i) => {
      graph[i] = [];
      nodes.forEach((otherNode, j) => {
        if (i !== j) {
          const distance = calculateDistance(
            node.lat, node.lng,
            otherNode.lat, otherNode.lng
          );
          // Connect to next/previous nodes and nearby nodes
          const isAdjacent = Math.abs(i - j) <= 2; // Connect to adjacent nodes
          if (isAdjacent || distance < maxConnectionDistance) {
            graph[i].push({ node: j, distance });
          }
        }
      });
    });

    // Ensure graph is connected - connect each node to next
    for (let i = 0; i < nodes.length - 1; i++) {
      const distance = calculateDistance(
        nodes[i].lat, nodes[i].lng,
        nodes[i + 1].lat, nodes[i + 1].lng
      );
      if (!graph[i].some(edge => edge.node === i + 1)) {
        graph[i].push({ node: i + 1, distance });
      }
    }

    // Dijkstra's algorithm
    const distances = {};
    const previous = {};
    const unvisited = new Set();
    
    nodes.forEach((_, i) => {
      distances[i] = i === 0 ? 0 : Infinity;
      previous[i] = null;
      unvisited.add(i);
    });

    while (unvisited.size > 0) {
      // Find unvisited node with smallest distance
      let current = null;
      let minDist = Infinity;
      
      unvisited.forEach(node => {
        if (distances[node] < minDist) {
          minDist = distances[node];
          current = node;
        }
      });

      if (current === null || minDist === Infinity) {
        // If no path found, return direct line
        break;
      }
      
      unvisited.delete(current);

      // Update distances to neighbors
      if (graph[current]) {
        graph[current].forEach(neighbor => {
          if (unvisited.has(neighbor.node)) {
            const alt = distances[current] + neighbor.distance;
            if (alt < distances[neighbor.node]) {
              distances[neighbor.node] = alt;
              previous[neighbor.node] = current;
            }
          }
        });
      }
    }

    // Reconstruct path
    const path = [];
    let current = nodes.length - 1; // End node
    
    while (current !== null && current !== undefined) {
      path.unshift(nodes[current]);
      current = previous[current];
    }

    // If path reconstruction failed, use direct line with waypoints
    if (path.length < 2) {
      return [start, ...waypoints, end];
    }

    return path;
  } catch (error) {
    console.error('Error in dijkstraRoute:', error);
    // Fallback to direct line
    return [start, end];
  }
};

/**
 * Create route polyline on Leaflet map
 * @param {Object} map - Leaflet map instance
 * @param {Array} route - Array of {lat, lng} points
 * @param {string} color - Route color
 * @param {number} distance - Route distance in km (optional, will calculate if not provided)
 */
export const drawRouteOnMap = (map, route, color = '#3b82f6', distance = null) => {
  if (!map || !route || route.length < 2) return null;

  const latlngs = route.map(point => [point.lat, point.lng]);
  
  // Create polyline with smooth curve for road-based routes
  const polyline = window.L.polyline(latlngs, {
    color: color,
    weight: 5,
    opacity: 0.8,
    smoothFactor: 1.0, // Keep original geometry for road routes
    lineJoin: 'round',
    lineCap: 'round'
  }).addTo(map);

  // Calculate distance if not provided
  let totalDistance = distance;
  if (totalDistance === null || totalDistance === undefined) {
    totalDistance = 0;
    for (let i = 0; i < route.length - 1; i++) {
      totalDistance += calculateDistance(
        route[i].lat, route[i].lng,
        route[i + 1].lat, route[i + 1].lng
      );
    }
  }

  // Add start marker
  const startMarker = window.L.marker([route[0].lat, route[0].lng], {
    icon: window.L.divIcon({
      className: 'route-start-marker',
      html: '<div style="background: #10b981; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4);">S</div>',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    })
  }).addTo(map).bindPopup(`<strong>Start Point</strong><br>Distance: ${totalDistance.toFixed(2)} km`);

  // Add end marker
  const endMarker = window.L.marker([route[route.length - 1].lat, route[route.length - 1].lng], {
    icon: window.L.divIcon({
      className: 'route-end-marker',
      html: '<div style="background: #ef4444; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4);">E</div>',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    })
  }).addTo(map).bindPopup(`<strong>End Point</strong><br>Total Distance: ${totalDistance.toFixed(2)} km`);

  return {
    polyline,
    startMarker,
    endMarker,
    distance: totalDistance
  };
};

