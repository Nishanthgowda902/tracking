import mqtt from 'mqtt';

const API_BASE_URL = 'http://localhost:3001/api';
let mqttClient = null;
const subscribedTopics = new Set();

// Singleton MQTT client
const getMQTTClient = () => {
  if (!mqttClient) {
    mqttClient = mqtt.connect('wss://broker.hivemq.com:8884/mqtt');

    mqttClient.on('error', (error) => {
      console.error('MQTT client error:', error);
    });

    mqttClient.on('connect', () => {
      console.log('Connected to MQTT broker');
    });
  }
  return mqttClient;
};

export const getLatestLocation = async (vehicleId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/location/latest/${vehicleId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    if (!data) {
      throw new Error('No location data available');
    }
    return data;
  } catch (error) {
    console.error('Error fetching latest location:', error);
    throw error;
  }
};

export const publishVehicleStatus = async (vehicleId, isOn) => {
  try {
    const client = getMQTTClient();
    
    return new Promise((resolve, reject) => {
      const message = JSON.stringify({ 
        action: isOn ? 1 : 0
      });

      const topic = vehicleId === 'vehicle-1' ? 'location/1' : 'location/2';
      
      console.log(`Publishing to topic ${topic}:`, message);
      
      // Resolve immediately to improve response time
      resolve(true);
      
      client.publish(topic, message, (err) => {
        if (err) {
          console.error(`Error publishing to ${topic}:`, err);
          // Don't reject here to avoid UI lag
        } else {
          console.log(`Successfully published to ${topic}`);
        }
      });
    });
  } catch (error) {
    console.error('Error publishing vehicle status:', error);
    throw error;
  }
};

export const subscribeToVehicleUpdates = (vehicle, onMessage) => {
  if (vehicle.isCustom) {
    return () => {};
  }

  const client = getMQTTClient();
  const topic = vehicle.topic || (vehicle.id === 'vehicle-1' ? 'GPS/location/1' : 'GPS/location/2');

  const messageHandler = (receivedTopic, message) => {
    if (receivedTopic !== topic) return;

    try {
      const data = JSON.parse(message.toString());
      console.log(`Received message on ${receivedTopic}:`, data);

      // Validate and process location data
      if (data.latitude !== undefined && data.longitude !== undefined) {
        const latitude = parseFloat(data.latitude);
        const longitude = parseFloat(data.longitude);
        
        if (!isNaN(latitude) && !isNaN(longitude)) {
          onMessage({
            latitude,
            longitude,
            temperature: data.temperature ? parseFloat(data.temperature) : undefined
          });
        }
      }
    } catch (error) {
      console.error('Error processing MQTT message:', error);
    }
  };

  // Subscribe to topic if not already subscribed
  if (!subscribedTopics.has(topic)) {
    client.subscribe(topic, (err) => {
      if (err) {
        console.error(`Error subscribing to ${topic}:`, err);
      } else {
        console.log(`Subscribed to ${topic}`);
        subscribedTopics.add(topic);
      }
    });
  }

  // Add message handler
  client.on('message', messageHandler);

  // Return cleanup function that only removes the message handler
  return () => {
    client.removeListener('message', messageHandler);
  };
};