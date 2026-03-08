/**
 * Distance Calculation Service
 * Uses OSRM (Open Source Routing Machine) for road distance.
 */

/**
 * Calculates straight-line distance (as the crow flies)
 */
export const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

/**
 * Gets coordinates from an Irish Eircode using Nominatim (OpenStreetMap)
 */
export const geocodeEircode = async (eircode) => {
    try {
        const cleanEircode = eircode.replace(/\s/g, '');
        const url = `https://nominatim.openstreetmap.org/search?q=${cleanEircode}&countrycodes=ie&format=json&limit=1`;
        const res = await fetch(url, { headers: { 'User-Agent': 'SwiftApp-CRM' } });
        const data = await res.json();
        if (data && data.length > 0) {
            return {
                lat: parseFloat(data[0].lat),
                lon: parseFloat(data[0].lon)
            };
        }
    } catch (error) {
        console.error('Geocoding error:', error);
    }
    return null;
};

/**
 * Calculates road distance between two coordinates using OSRM
 */
export const calculateRoadDistanceInKm = async (lat1, lon1, lat2, lon2) => {
    try {
        const url = `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
            // distance is in meters, return in km
            return (data.routes[0].distance / 1000).toFixed(2);
        }
    } catch (error) {
        console.error('OSRM error:', error);
    }

    // Fallback to Haversine if OSRM fails
    return calculateHaversineDistance(lat1, lon1, lat2, lon2).toFixed(2);
};

/**
 * Combined function to get distance from two Eircodes
 */
export const getDistanceBetweenEircodes = async (eircode1, eircode2) => {
    const loc1 = await geocodeEircode(eircode1);
    const loc2 = await geocodeEircode(eircode2);

    if (loc1 && loc2) {
        return await calculateRoadDistanceInKm(loc1.lat, loc1.lon, loc2.lat, loc2.lon);
    }
    return null;
};
