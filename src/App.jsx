import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import MapView from './components/MapView';
import { AlertCircle } from 'lucide-react';
import { subscribeToVehicleUpdates } from './services/api';

function App() {
  const [vehicles, setVehicles] = useState({
    'vehicle-1': { 
      id: 'vehicle-1', 
      name: 'Vehicle 1', 
      isOn: false, 
      temperature: 25,
      doorLocked: true,
      topic: 'GPS/location/1'
    },
    'vehicle-2': { 
      id: 'vehicle-2', 
      name: 'Vehicle 2', 
      isOn: false, 
      temperature: 27,
      doorLocked: true,
      topic: 'GPS/location/2'
    }
  });

  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const subscriptions = {};

    // Subscribe to updates for all non-custom vehicles regardless of engine state
    Object.values(vehicles).forEach(vehicle => {
      if (!vehicle.isCustom) {
        const cleanup = subscribeToVehicleUpdates(vehicle, (data) => {
          if (data.temperature !== undefined || data.latitude !== undefined) {
            setVehicles(prev => ({
              ...prev,
              [vehicle.id]: {
                ...prev[vehicle.id],
                temperature: data.temperature ?? prev[vehicle.id].temperature,
                latitude: data.latitude,
                longitude: data.longitude
              }
            }));
          }
        });
        
        subscriptions[vehicle.id] = cleanup;
      }
    });

    // Cleanup subscriptions
    return () => {
      Object.values(subscriptions).forEach(cleanup => {
        if (typeof cleanup === 'function') {
          cleanup();
        }
      });
    };
  }, []); // Only run on mount

  const toggleVehicle = (vehicleId) => {
    setVehicles(prev => ({
      ...prev,
      [vehicleId]: {
        ...prev[vehicleId],
        isOn: !prev[vehicleId].isOn
      }
    }));
  };

  const toggleDoorLock = (vehicleId) => {
    setVehicles(prev => ({
      ...prev,
      [vehicleId]: {
        ...prev[vehicleId],
        doorLocked: !prev[vehicleId].doorLocked
      }
    }));
  };

  const addNewVehicle = (vehicleData) => {
    const newVehicleId = `vehicle-${Object.keys(vehicles).length + 1}`;
    setVehicles(prev => ({
      ...prev,
      [newVehicleId]: {
        id: newVehicleId,
        name: `Vehicle ${vehicleData.vehicleNumber}`,
        isOn: false,
        temperature: 25,
        doorLocked: true,
        latitude: vehicleData.latitude,
        longitude: vehicleData.longitude,
        vehicleNumber: vehicleData.vehicleNumber,
        isCustom: true
      }
    }));
  };

  const handleGeofenceAlert = (vehicleId, isOutside) => {
    const vehicle = vehicles[vehicleId];
    if (!vehicle) return;

    const newAlert = {
      id: Date.now(),
      vehicleId,
      message: `${vehicle.name} has ${isOutside ? 'left' : 'returned to'} its designated area`,
      timestamp: new Date().toLocaleTimeString(),
      type: isOutside ? 'warning' : 'info'
    };

    setAlerts(prev => [newAlert, ...prev].slice(0, 10));
  };

  const dismissAlert = (alertId) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <nav className="bg-white shadow-md">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex justify-between h-16">
              <div className="flex">
                <div className="flex-shrink-0 flex items-center">
                  <span className="text-xl font-bold text-gray-800">Vehicle Tracker</span>
                </div>
                <div className="ml-6 flex space-x-8">
                  <Link to="/" className="inline-flex items-center px-1 pt-1 text-gray-600 hover:text-gray-800">
                    Dashboard
                  </Link>
                  <Link to="/map" className="inline-flex items-center px-1 pt-1 text-gray-600 hover:text-gray-800">
                    Map
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto py-6 px-4">
          {alerts.length > 0 && (
            <div className="mb-6 space-y-2">
              {alerts.map(alert => (
                <div
                  key={alert.id}
                  className={`flex items-center justify-between p-4 rounded-lg ${
                    alert.type === 'warning' ? 'bg-yellow-50 text-yellow-700' : 'bg-blue-50 text-blue-700'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <AlertCircle className="h-5 w-5" />
                    <div>
                      <p className="font-medium">{alert.message}</p>
                      <p className="text-sm opacity-75">{alert.timestamp}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => dismissAlert(alert.id)}
                    className="text-sm font-medium hover:underline"
                  >
                    Dismiss
                  </button>
                </div>
              ))}
            </div>
          )}

          <Routes>
            <Route path="/" element={
              <Dashboard 
                vehicles={vehicles} 
                toggleVehicle={toggleVehicle} 
                toggleDoorLock={toggleDoorLock}
                onAddVehicle={addNewVehicle}
              />
            } />
            <Route path="/map" element={
              <MapView 
                vehicles={vehicles} 
                onGeofenceAlert={handleGeofenceAlert}
              />
            } />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;