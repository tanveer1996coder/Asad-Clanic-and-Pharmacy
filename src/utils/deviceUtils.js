import { v4 as uuidv4 } from 'uuid';

const DEVICE_ID_KEY = 'medical_store_device_id';

export const getDeviceId = () => {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
        deviceId = uuidv4();
        localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
};

export const getDeviceName = () => {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Win')) return 'Windows PC';
    if (userAgent.includes('Mac')) return 'Mac';
    if (userAgent.includes('Linux')) return 'Linux PC';
    if (userAgent.includes('Android')) return 'Android Device';
    if (userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS Device';
    return 'Unknown Device';
};
