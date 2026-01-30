import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, MapPin, Search, Crosshair, Loader2 } from 'lucide-react';

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;

// UK Default coordinates (center of UK)
const UK_DEFAULT = { lat: 54.5, lng: -3.3 };

const LocationPicker = ({
    visible,
    onClose,
    onSelectLocation,
    initialLocation
}) => {
    const mapRef = useRef(null);
    const mapContainerRef = useRef(null);
    const autocompleteServiceRef = useRef(null);
    const placesServiceRef = useRef(null);
    const geocoderRef = useRef(null);

    const [address, setAddress] = useState('Move map to select location');
    const [addressComponents, setAddressComponents] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [searchingAddress, setSearchingAddress] = useState(false);
    const [currentPosition, setCurrentPosition] = useState(
        initialLocation || { lat: UK_DEFAULT.lat, lng: UK_DEFAULT.lng }
    );

    // Load Google Maps script
    useEffect(() => {
        if (!visible) return;

        const loadGoogleMaps = () => {
            if (window.google && window.google.maps) {
                initializeMap();
                return;
            }

            // Check if script is already loading
            if (document.querySelector('script[src*="maps.googleapis.com"]')) {
                const checkLoaded = setInterval(() => {
                    if (window.google && window.google.maps) {
                        clearInterval(checkLoaded);
                        initializeMap();
                    }
                }, 100);
                return;
            }

            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}&libraries=places`;
            script.async = true;
            script.defer = true;
            script.onload = () => initializeMap();
            document.head.appendChild(script);
        };

        loadGoogleMaps();
    }, [visible]);

    // Initialize map
    const initializeMap = useCallback(() => {
        if (!mapContainerRef.current || !window.google) return;

        const initialPos = initialLocation || currentPosition;

        const map = new window.google.maps.Map(mapContainerRef.current, {
            center: initialPos,
            zoom: 15,
            disableDefaultUI: false,
            zoomControl: true,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
            styles: [
                {
                    featureType: 'poi',
                    elementType: 'labels',
                    stylers: [{ visibility: 'off' }]
                }
            ]
        });

        mapRef.current = map;

        // Initialize services
        autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
        placesServiceRef.current = new window.google.maps.places.PlacesService(map);
        geocoderRef.current = new window.google.maps.Geocoder();

        setLoading(false);

        // Update position when map moves
        map.addListener('dragstart', () => setIsDragging(true));
        map.addListener('idle', () => {
            setIsDragging(false);
            const center = map.getCenter();
            const pos = { lat: center.lat(), lng: center.lng() };
            setCurrentPosition(pos);
            reverseGeocode(pos.lat, pos.lng);
        });

        // Initial reverse geocode
        if (initialLocation) {
            reverseGeocode(initialLocation.lat, initialLocation.lng);
        }
    }, [initialLocation]);

    // Reverse geocode using Geocoder service
    const reverseGeocode = async (lat, lng) => {
        if (!geocoderRef.current) return;

        try {
            geocoderRef.current.geocode({ location: { lat, lng } }, (results, status) => {
                if (status === 'OK' && results && results[0]) {
                    const result = results[0];
                    setAddress(result.formatted_address);
                    setAddressComponents(extractAddressComponents(result.address_components));
                } else {
                    setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
                    setAddressComponents(null);
                }
            });
        } catch (error) {
            console.error('Geocoding error:', error);
            setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        }
    };

    // Extract address components
    const extractAddressComponents = (components) => {
        const getComponent = (types) => {
            const comp = components.find(c => types.every(t => c.types.includes(t)));
            return comp ? comp.long_name : '';
        };

        return {
            buildingNumber: getComponent(['street_number']),
            street: getComponent(['route']),
            city: getComponent(['postal_town']) || getComponent(['locality']),
            county: getComponent(['administrative_area_level_2']),
            postcode: getComponent(['postal_code']),
            country: getComponent(['country']) || 'United Kingdom'
        };
    };

    // Search address using AutocompleteService
    const searchAddress = async (query) => {
        if (!query || query.length < 3 || !autocompleteServiceRef.current) {
            setSuggestions([]);
            return;
        }

        setSearchingAddress(true);

        autocompleteServiceRef.current.getPlacePredictions(
            {
                input: query,
                componentRestrictions: { country: 'gb' },
                types: ['establishment', 'geocode']
            },
            (predictions, status) => {
                setSearchingAddress(false);
                if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
                    setSuggestions(predictions.slice(0, 5));
                } else {
                    setSuggestions([]);
                }
            }
        );
    };

    // Debounced search
    const searchTimeoutRef = useRef(null);
    useEffect(() => {
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = setTimeout(() => searchAddress(searchQuery), 300);
        return () => clearTimeout(searchTimeoutRef.current);
    }, [searchQuery]);

    // Select suggestion using PlacesService
    const selectSuggestion = (suggestion) => {
        if (!placesServiceRef.current) return;

        placesServiceRef.current.getDetails(
            {
                placeId: suggestion.place_id,
                fields: ['formatted_address', 'geometry', 'address_components']
            },
            (place, status) => {
                if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
                    const lat = place.geometry.location.lat();
                    const lng = place.geometry.location.lng();
                    const pos = { lat, lng };

                    if (mapRef.current) {
                        mapRef.current.panTo(pos);
                        mapRef.current.setZoom(17);
                    }

                    setCurrentPosition(pos);
                    setAddress(place.formatted_address);
                    setAddressComponents(extractAddressComponents(place.address_components));
                    setSearchQuery('');
                    setSuggestions([]);
                }
            }
        );
    };

    // Get current location
    const getCurrentLocation = () => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser');
            return;
        }

        setLoading(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const pos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };

                if (mapRef.current) {
                    mapRef.current.panTo(pos);
                    mapRef.current.setZoom(17);
                }

                setCurrentPosition(pos);
                reverseGeocode(pos.lat, pos.lng);
                setLoading(false);
            },
            () => {
                alert('Unable to get your location');
                setLoading(false);
            }
        );
    };

    // Confirm selection
    const handleConfirm = () => {
        onSelectLocation({
            latitude: currentPosition.lat,
            longitude: currentPosition.lng,
            address: address,
            addressComponents: addressComponents
        });
        onClose();
    };

    if (!visible) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden shadow-2xl">
                {/* Header with Search */}
                <div className="p-4 border-b bg-white">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-lg transition"
                        >
                            <X className="w-5 h-5 text-gray-600" />
                        </button>

                        <div className="flex-1 relative">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search for a place..."
                                    className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                />
                                {searchingAddress && (
                                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin" />
                                )}
                            </div>

                            {/* Suggestions dropdown */}
                            {suggestions.length > 0 && (
                                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                                    {suggestions.map((suggestion) => (
                                        <button
                                            key={suggestion.place_id}
                                            onClick={() => selectSuggestion(suggestion)}
                                            className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0 flex items-start gap-2"
                                        >
                                            <MapPin className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                            <span className="text-sm text-gray-700">{suggestion.description}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <button
                            onClick={getCurrentLocation}
                            className="p-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition flex items-center gap-2"
                            title="Use current location"
                        >
                            <Crosshair className="w-5 h-5" />
                            <span className="hidden sm:inline text-sm font-medium">My Location</span>
                        </button>
                    </div>
                </div>

                {/* Map Container */}
                <div className="flex-1 relative">
                    {loading && (
                        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
                            <div className="flex flex-col items-center gap-2">
                                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                                <span className="text-gray-600">Loading map...</span>
                            </div>
                        </div>
                    )}

                    <div ref={mapContainerRef} className="w-full h-full" />

                    {/* Center Pin Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="relative">
                            <div className={`transition-transform ${isDragging ? 'scale-110 -translate-y-2' : ''}`}>
                                <MapPin className="w-12 h-12 text-blue-600 drop-shadow-lg" strokeWidth={2.5} fill="white" />
                            </div>
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black/30 rounded-full" />
                        </div>
                    </div>
                </div>

                {/* Bottom Panel */}
                <div className="p-4 border-t bg-white">
                    <div className="flex items-start gap-3 mb-4">
                        <MapPin className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Selected Location</p>
                            {isDragging ? (
                                <p className="text-gray-400 italic">Locating...</p>
                            ) : (
                                <p className="text-gray-800 font-medium">{address}</p>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={handleConfirm}
                        disabled={isDragging}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition disabled:opacity-50"
                    >
                        Confirm Location
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LocationPicker;
