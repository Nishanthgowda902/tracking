import React, { useState } from 'react';
import { publishVehicleStatus } from '../services/api';
import AddVehicle from './AddVehicle';

function Dashboard({ vehicles, toggleVehicle, toggleDoorLock, onAddVehicle }) {
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [lastUpdate] = useState('12:56:40 PM');
  const [isToggling, setIsToggling] = useState({});
  
  const handleToggle = async (vehicleId) => {
    if (isToggling[vehicleId]) return;
    
    setIsToggling(prev => ({ ...prev, [vehicleId]: true }));
    
    try {
      if (!vehicles[vehicleId].isCustom) {
        console.log(`Attempting to publish status for ${vehicleId}...`);
        // Update local state first for better UX
        toggleVehicle(vehicleId);
        // Then publish the MQTT message
        await publishVehicleStatus(vehicleId, !vehicles[vehicleId].isOn);
        console.log(`Successfully toggled ${vehicleId} to ${!vehicles[vehicleId].isOn ? 'ON' : 'OFF'}`);
      } else {
        // For custom vehicles, just update the local state
        toggleVehicle(vehicleId);
      }
    } catch (error) {
      console.error('Error publishing vehicle status:', error);
      // Revert the state if MQTT publish fails
      if (!vehicles[vehicleId].isCustom) {
        toggleVehicle(vehicleId);
      }
    } finally {
      setIsToggling(prev => ({ ...prev, [vehicleId]: false }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Vehicle Status</h2>
        <button
          onClick={() => setShowAddVehicle(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Add Vehicle
        </button>
      </div>

      {showAddVehicle && (
        <AddVehicle
          onAdd={(data) => {
            onAddVehicle(data);
            setShowAddVehicle(false);
          }}
          onClose={() => setShowAddVehicle(false)}
        />
      )}

      <div className="bg-white shadow-md rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.values(vehicles).map(vehicle => (
            <div key={vehicle.id} className="bg-gray-50 p-6 rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M1 8h12M8 4v3" />
                  </svg>
                  <h3 className="text-lg font-medium">
                    {vehicle.name}
                    {vehicle.vehicleNumber && ` (${vehicle.vehicleNumber})`}
                  </h3>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => toggleDoorLock(vehicle.id)}
                    className={`px-4 py-2 rounded-full focus:outline-none transition-colors ${
                      vehicle.doorLocked ? 'bg-gray-300 text-gray-700' : 'bg-gray-300 text-gray-700'
                    }`}
                  >
                    {vehicle.doorLocked ? 'Locked' : 'Unlocked'}
                  </button>
                  <button
                    onClick={() => handleToggle(vehicle.id)}
                    disabled={isToggling[vehicle.id]}
                    className={`px-4 py-2 rounded-full focus:outline-none transition-colors ${
                      isToggling[vehicle.id] ? 'opacity-50 cursor-not-allowed ' : ''
                    } ${
                      vehicle.isOn ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-700'
                    }`}
                  >
                    Engine {vehicle.isOn ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Last Updated</p>
                  <p className="text-gray-700">{lastUpdate}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Temperature</p>
                    <p className="text-gray-700">{vehicle.temperature}°C</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Fuel Level</p>
                    <p className="text-gray-700">75%</p>
                  </div>
                </div>
                {vehicle.isCustom && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Latitude</p>
                      <p className="text-gray-700">{vehicle.latitude}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Longitude</p>
                      <p className="text-gray-700">{vehicle.longitude}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;