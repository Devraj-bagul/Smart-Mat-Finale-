import { useState, useRef, useCallback, useEffect } from 'react';

// Must match the UUIDs in the ESP32 code exactly!
const SMART_MAT_SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914c";
const TX_CHARACTERISTIC_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8"; // Receive from ESP
const RX_CHARACTERISTIC_UUID = "1c28c89c-5a9e-4c3f-918b-577d612457fb"; // Send to ESP

export function useSmartMatBLE() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  
  // Default empty state
  const [sensorData, setSensorData] = useState({
    hr: 0,
    bat: 0,
    fsr: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 0, rf: 0 }
  });

  const deviceRef = useRef(null);
  const rxCharacteristicRef = useRef(null); // Ref to hold the write characteristic

  const handleCharacteristicValueChanged = (event) => {
    const value = event.target.value;
    const decoder = new TextDecoder('utf-8');
    const jsonString = decoder.decode(value);
    
    try {
      const data = JSON.parse(jsonString);
      setSensorData(data);
    } catch (e) {
      console.warn("Failed to parse BLE data:", jsonString);
    }
  };

  const onDisconnected = () => {
    console.log('Device Disconnected');
    setIsConnected(false);
    rxCharacteristicRef.current = null;
  };

  const connect = useCallback(async () => {
    if (!navigator.bluetooth) {
      setError("Web Bluetooth is not supported in this browser.");
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      console.log('Requesting Bluetooth Device...');
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [SMART_MAT_SERVICE_UUID]
      });

      deviceRef.current = device;
      device.addEventListener('gattserverdisconnected', onDisconnected);

      console.log('Connecting to GATT Server...');
      const server = await device.gatt.connect();

      // Wait a moment for connection to stabilize (Windows/Chrome workaround)
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('Getting Service...');
      const service = await server.getPrimaryService(SMART_MAT_SERVICE_UUID);

      console.log('Getting Characteristics...');
      const txCharacteristic = await service.getCharacteristic(TX_CHARACTERISTIC_UUID);
      rxCharacteristicRef.current = await service.getCharacteristic(RX_CHARACTERISTIC_UUID);

      console.log('Starting Notifications...');
      await txCharacteristic.startNotifications();
      txCharacteristic.addEventListener('characteristicvaluechanged', handleCharacteristicValueChanged);

      setIsConnected(true);
      localStorage.setItem('was_mat_connected', 'true');
      console.log('Connected to Smart Mat!');
    } catch (error) {
      console.error("Bluetooth connection failed", error);
      setError(error.message);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (!deviceRef.current) {
      return;
    }
    console.log('Disconnecting from Bluetooth Device...');
    localStorage.removeItem('was_mat_connected');
    if (deviceRef.current.gatt.connected) {
      deviceRef.current.gatt.disconnect();
    }
  }, []);

  const sendCommand = useCallback(async (commandObj) => {
    if (!rxCharacteristicRef.current || !isConnected) return;
    
    try {
      const jsonString = JSON.stringify(commandObj);
      const encoder = new TextEncoder();
      const data = encoder.encode(jsonString);
      await rxCharacteristicRef.current.writeValueWithoutResponse(data);
      console.log("Sent command to mat:", jsonString);
    } catch (err) {
      console.error("Failed to send command to mat", err);
    }
  }, [isConnected]);

  // Auto-reconnect on refresh/mount if it was previously connected
  useEffect(() => {
    const checkAutoReconnect = async () => {
      const wasConnected = localStorage.getItem('was_mat_connected') === 'true';
      if (!wasConnected) return;

      if (navigator.bluetooth && navigator.bluetooth.getDevices) {
        try {
          const devices = await navigator.bluetooth.getDevices();
          if (devices.length > 0) {
            const device = devices[0];
            console.log('Auto-reconnecting to paired device:', device.name);
            setIsConnecting(true);
            
            deviceRef.current = device;
            device.addEventListener('gattserverdisconnected', onDisconnected);

            const server = await device.gatt.connect();
            await new Promise(resolve => setTimeout(resolve, 1000));

            const service = await server.getPrimaryService(SMART_MAT_SERVICE_UUID);
            const txChar = await service.getCharacteristic(TX_CHARACTERISTIC_UUID);
            rxCharacteristicRef.current = await service.getCharacteristic(RX_CHARACTERISTIC_UUID);

            await txChar.startNotifications();
            txChar.addEventListener('characteristicvaluechanged', handleCharacteristicValueChanged);

            setIsConnected(true);
            console.log('Auto-reconnected successfully on refresh!');
          }
        } catch (e) {
          console.warn("Auto-reconnect failed:", e);
          localStorage.removeItem('was_mat_connected');
        } finally {
          setIsConnecting(false);
        }
      }
    };
    checkAutoReconnect();
  }, []);

  return {
    connect,
    disconnect,
    isConnected,
    isConnecting,
    sensorData,
    error,
    sendCommand
  };
}
