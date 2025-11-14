# Map Implementation Guide

## Overview
All maps in the application use Leaflet.js and are properly initialized with error handling and cleanup.

## Fixed Issues

### 1. Map Initialization
- **Problem**: Maps were not initializing properly due to timing issues with Leaflet loading
- **Solution**: Added retry mechanism that checks for Leaflet availability before initialization
- **Implementation**: `checkLeafletAndInit()` function with setTimeout retry

### 2. Map Cleanup
- **Problem**: Maps were not being cleaned up on component unmount, causing memory leaks
- **Solution**: Added cleanup functions in useEffect return statements
- **Implementation**: `mapInstanceRef.current.remove()` in cleanup

### 3. Map Resizing
- **Problem**: Maps were not resizing correctly after initial render
- **Solution**: Added `invalidateSize()` call after initialization
- **Implementation**: setTimeout with `mapInstanceRef.current.invalidateSize()`

### 4. Marker Management
- **Problem**: Markers were not being properly cleared and re-added
- **Solution**: Proper layer filtering to keep tile layers while removing markers
- **Implementation**: Check for marker types before removal

## Components with Maps

### 1. Dashboard (`Dashboard.js`)
- **Purpose**: Display all verified incidents on a map
- **Features**: 
  - Shows all verified incidents with color-coded markers by severity
  - Popup with incident details
  - Auto-updates when incidents change

### 2. UserDashboard (`UserDashboard.js`)
- **Purpose**: Allow users to select location for incident reporting
- **Features**:
  - Click to set incident location
  - GPS location button
  - Shows existing verified incidents
  - Location marker for selected position

### 3. Volunteers (`Volunteers.js`)
- **Purpose**: Show volunteer location and available incidents
- **Features**:
  - Volunteer location marker (blue circle with person icon)
  - Available incidents with click-to-assign functionality
  - Updates volunteer marker when location changes
  - Color-coded incident markers by status

### 4. Admin (`Admin.js`)
- **Purpose**: Admin overview of all incidents
- **Features**:
  - Shows all verified incidents
  - Different colors for verified vs unverified
  - Updates when incidents are verified/rejected

### 5. Incidents (`Incidents.js`)
- **Purpose**: Display filtered incidents on map
- **Features**:
  - Shows incidents based on active filter
  - Updates when filter changes
  - Popup with incident details

## Map Configuration

All maps use:
- **Tile Layer**: OpenStreetMap
- **Initial View**: New York area (40.7128, -74.0060)
- **Zoom Control**: Enabled
- **Max Zoom**: 19

## Marker Colors

### Severity-based Colors:
- **Severity 5 (Emergency)**: Purple (#8e44ad)
- **Severity 4 (Critical)**: Red (#e74c3c)
- **Severity 3 (High)**: Orange (#e67e22)
- **Severity 2 (Medium)**: Yellow (#f39c12)
- **Severity 1 (Low)**: Green (#27ae60)

### Status-based Colors:
- **Available**: Severity color
- **Pending/Assigned**: Blue (#3b82f6)
- **Completed**: Gray (#6b7280)
- **Unverified**: Yellow (#f59e0b)

## Best Practices

1. **Always check for Leaflet**: `if (!window.L) return;`
2. **Use refs for map instances**: `mapInstanceRef.current`
3. **Cleanup on unmount**: Remove map in useEffect cleanup
4. **Invalidate size after render**: Call `invalidateSize()` after initialization
5. **Filter layers properly**: Only remove markers, keep tile layers
6. **Error handling**: Wrap map operations in try-catch blocks

## Troubleshooting

### Map not showing:
1. Check if Leaflet CSS is loaded
2. Verify Leaflet JS is loaded: `console.log(window.L)`
3. Check map container has height: `minHeight: '400px'`
4. Verify map ref is attached: `mapRef.current`

### Markers not appearing:
1. Check if incidents have location data
2. Verify incidents are filtered correctly
3. Check console for errors
4. Ensure markers are added after map initialization

### Map not resizing:
1. Call `invalidateSize()` after state changes
2. Ensure container has explicit height
3. Check for CSS conflicts

