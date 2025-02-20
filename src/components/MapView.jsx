import React, { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { subscribeToVehicleUpdates } from '../services/api';

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapView({ vehicles, onGeofenceAlert }) {
  const [locations, setLocations] = useState({});
  const [error, setError] = useState(null);
  const [geofenceStatus, setGeofenceStatus] = useState({});
  const defaultPosition = [12.9716, 77.5946]; // Bangalore coordinates

  // Geofence configurations
  const geofences = {
    'vehicle-1': {
      center: [12.9716, 77.5946],
      radius: 5000 // 5km in meters
    },
    'vehicle-2': {
      center: [12.9716, 77.5946],
      radius: 7000 // 7km in meters
    }
  };

  const checkGeofence = useCallback((vehicleId, location) => {
    const geofence = geofences[vehicleId];
    if (!geofence) return true;

    const distance = L.latLng(geofence.center).distanceTo(L.latLng(location));
    const isOutside = distance > geofence.radius;

    if (geofenceStatus[vehicleId] !== isOutside) {
      setGeofenceStatus(prev => ({ ...prev, [vehicleId]: isOutside }));
      onGeofenceAlert(vehicleId, isOutside);
    }

    return !isOutside;
  }, [geofenceStatus, onGeofenceAlert]);

  useEffect(() => {
    const subscriptions = {};

    Object.values(vehicles).forEach(vehicle => {
      // Subscribe to all non-custom vehicles regardless of engine state
      if (!vehicle.isCustom) {
        subscriptions[vehicle.id] = subscribeToVehicleUpdates(vehicle, (data) => {
          if (data.latitude && data.longitude) {
            const location = [data.latitude, data.longitude];
            setLocations(prev => ({
              ...prev,
              [vehicle.id]: location
            }));
            checkGeofence(vehicle.id, location);
            setError(null);
          }
        });
      } else if (vehicle.latitude && vehicle.longitude) {
        // Handle custom vehicles
        const location = [vehicle.latitude, vehicle.longitude];
        setLocations(prev => ({
          ...prev,
          [vehicle.id]: location
        }));
        checkGeofence(vehicle.id, location);
      }
    });

    return () => {
      Object.values(subscriptions).forEach(cleanup => cleanup());
    };
  }, [vehicles, checkGeofence]);

  const getMarkerColor = (vehicleId) => {
    const vehicle = vehicles[vehicleId];
    if (geofenceStatus[vehicleId]) return 'red';
    return vehicle.isOn ? 'green' : 'blue';
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          {error}
        </div>
      )}
      <div className="h-[calc(100vh-12rem)] w-full bg-white shadow-md rounded-lg overflow-hidden">
        <MapContainer
          center={Object.values(locations)[0] || defaultPosition}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Draw geofence circles */}
          {Object.entries(geofences).map(([vehicleId, geofence]) => (
            <Circle
              key={`geofence-${vehicleId}`}
              center={geofence.center}
              radius={geofence.radius}
              pathOptions={{
                color: 'green',
                fillColor: 'green',
                fillOpacity: 0.1
              }}
            />
          ))}

          {/* Draw vehicle markers */}
          {Object.entries(vehicles).map(([vehicleId, vehicle]) => (
            (locations[vehicleId] || (vehicle.isCustom && vehicle.latitude && vehicle.longitude)) && (
              <Marker 
                key={vehicleId} 
                position={vehicle.isCustom ? [vehicle.latitude, vehicle.longitude] : locations[vehicleId]}
                icon={new L.Icon({
                  iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${getMarkerColor(vehicleId)}.png`,
                  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
                  iconSize: [25, 41],
                  iconAnchor: [12, 41],
                  popupAnchor: [1, -34],
                  shadowSize: [41, 41]
                })}
              >
                <Popup>
                  <div className="text-sm">
                    <p className="font-bold">{vehicle.name}</p>
                    <p>Status: {vehicle.isOn ? 'Active' : 'Inactive'}</p>
                    <p>Temperature: {vehicle.temperature}°C</p>
                    {vehicle.isCustom && (
                      <p>Vehicle Number: {vehicle.vehicleNumber}</p>
                    )}
                    <p className={`font-medium ${geofenceStatus[vehicleId] ? 'text-red-600' : 'text-green-600'}`}>
                      {geofenceStatus[vehicleId] ? 'Outside Geofence' : 'Inside Geofence'}
                    </p>
                  </div>
                </Popup>
              </Marker>
            )
          ))}
        </MapContainer>
      </div>
    </div>
  );
}

export default MapView;