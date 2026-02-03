let isLoaded = false;
let isLoading = false;
let callbacks = [];

export const loadGoogleMapsScript = (apiKey) => {
    return new Promise((resolve, reject) => {
        if (isLoaded) {
            resolve(window.google);
            return;
        }

        if (isLoading) {
            callbacks.push({ resolve, reject });
            return;
        }

        isLoading = true;
        callbacks.push({ resolve, reject });

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;

        script.onload = () => {
            isLoaded = true;
            isLoading = false;
            callbacks.forEach(cb => cb.resolve(window.google));
            callbacks = [];
        };

        script.onerror = (error) => {
            isLoaded = false;
            isLoading = false;
            callbacks.forEach(cb => cb.reject(error));
            callbacks = [];
        };

        document.head.appendChild(script);
    });
};
