/**
 * Router - Simple hash-based router for SPA navigation
 * Handles route changes and viewmodel switching
 */
var Router = (function() {
    'use strict';

    var routes = {};
    var currentRoute = null;
    var defaultRoute = 'login';
    var beforeRouteChangeCallbacks = [];
    var afterRouteChangeCallbacks = [];

    /**
     * Register a route with its handler
     * @param {string} path - Route path (without #)
     * @param {Function} handler - Route handler function
     * @param {Object} options - Route options
     */
    function addRoute(path, handler, options) {
        options = options || {};
        
        routes[path] = {
            handler: handler,
            requiresAuth: options.requiresAuth || false,
            title: options.title || '',
            params: options.params || []
        };
    }

    /**
     * Navigate to a specific route
     * @param {string} path - Route path
     * @param {Object} params - Route parameters
     * @param {boolean} replace - Replace current history entry
     */
    function navigate(path, params, replace) {
        params = params || {};
        
        var hash = '#' + path;
        
        if (Object.keys(params).length > 0) {
            var queryString = Object.keys(params)
                .map(function(key) {
                    return encodeURIComponent(key) + '=' + encodeURIComponent(params[key]);
                })
                .join('&');
            hash += '?' + queryString;
        }

        if (replace) {
            window.location.replace(hash);
        } else {
            window.location.hash = hash;
        }
    }

    /**
     * Get current route information
     * @returns {Object} Current route info
     */
    function getCurrentRoute() {
        return currentRoute;
    }

    /**
     * Parse hash to extract route and parameters
     * @param {string} hash - Window hash
     * @returns {Object} Parsed route info
     */
    function parseHash(hash) {
        hash = hash || window.location.hash;
        
        // Remove # from beginning
        hash = hash.replace(/^#/, '');
        
        if (!hash) {
            return { path: defaultRoute, params: {} };
        }

        var parts = hash.split('?');
        var path = parts[0] || defaultRoute;
        var queryString = parts[1] || '';
        
        var params = {};
        if (queryString) {
            queryString.split('&').forEach(function(param) {
                var keyValue = param.split('=');
                if (keyValue.length === 2) {
                    params[decodeURIComponent(keyValue[0])] = decodeURIComponent(keyValue[1]);
                }
            });
        }

        return { path: path, params: params };
    }

    /**
     * Check if user is authenticated
     * @returns {boolean} Authentication status
     */
    function isAuthenticated() {
        return StorageService.isLoggedIn();
    }

    /**
     * Handle route change
     * @param {Object} routeInfo - Route information
     */
    function handleRouteChange(routeInfo) {
        var route = routes[routeInfo.path];
        
        if (!route) {
            console.warn('Route not found:', routeInfo.path);
            navigate(defaultRoute, {}, true);
            return;
        }

        // Check authentication requirement
        if (route.requiresAuth && !isAuthenticated()) {
            console.warn('Route requires authentication:', routeInfo.path);
            navigate('login', {}, true);
            return;
        }

        // Redirect to posts if already logged in and trying to access login
        if (routeInfo.path === 'login' && isAuthenticated()) {
            navigate('posts', {}, true);
            return;
        }

        // Execute before route change callbacks
        var canProceed = true;
        beforeRouteChangeCallbacks.forEach(function(callback) {
            try {
                var result = callback(currentRoute, routeInfo);
                if (result === false) {
                    canProceed = false;
                }
            } catch (error) {
                console.error('Error in before route change callback:', error);
            }
        });

        if (!canProceed) {
            return;
        }

        // Update current route
        var previousRoute = currentRoute;
        currentRoute = {
            path: routeInfo.path,
            params: routeInfo.params,
            route: route
        };

        // Update document title
        if (route.title) {
            document.title = route.title + ' - Post Management';
        }

        // Execute route handler
        try {
            route.handler(routeInfo.params, previousRoute);
        } catch (error) {
            console.error('Error executing route handler:', error);
        }

        // Execute after route change callbacks
        afterRouteChangeCallbacks.forEach(function(callback) {
            try {
                callback(currentRoute, previousRoute);
            } catch (error) {
                console.error('Error in after route change callback:', error);
            }
        });
    }

    /**
     * Initialize the router
     */
    function init() {
        // Handle initial route
        var initialRoute = parseHash();
        handleRouteChange(initialRoute);

        // Listen for hash changes
        window.addEventListener('hashchange', function() {
            var routeInfo = parseHash();
            handleRouteChange(routeInfo);
        });

        // Handle browser back/forward buttons
        window.addEventListener('popstate', function() {
            var routeInfo = parseHash();
            handleRouteChange(routeInfo);
        });
    }

    /**
     * Add callback to execute before route changes
     * @param {Function} callback - Callback function
     */
    function beforeRouteChange(callback) {
        if (typeof callback === 'function') {
            beforeRouteChangeCallbacks.push(callback);
        }
    }

    /**
     * Add callback to execute after route changes
     * @param {Function} callback - Callback function
     */
    function afterRouteChange(callback) {
        if (typeof callback === 'function') {
            afterRouteChangeCallbacks.push(callback);
        }
    }

    /**
     * Remove route change callback
     * @param {Function} callback - Callback to remove
     * @param {string} type - 'before' or 'after'
     */
    function removeRouteChangeCallback(callback, type) {
        var callbacks = type === 'before' ? beforeRouteChangeCallbacks : afterRouteChangeCallbacks;
        var index = callbacks.indexOf(callback);
        if (index > -1) {
            callbacks.splice(index, 1);
        }
    }

    /**
     * Get all registered routes
     * @returns {Object} Routes object
     */
    function getRoutes() {
        return routes;
    }

    /**
     * Check if a route exists
     * @param {string} path - Route path
     * @returns {boolean} True if route exists
     */
    function hasRoute(path) {
        return routes.hasOwnProperty(path);
    }

    /**
     * Generate URL for a route
     * @param {string} path - Route path
     * @param {Object} params - Route parameters
     * @returns {string} Generated URL
     */
    function generateUrl(path, params) {
        params = params || {};
        
        var url = '#' + path;
        
        if (Object.keys(params).length > 0) {
            var queryString = Object.keys(params)
                .map(function(key) {
                    return encodeURIComponent(key) + '=' + encodeURIComponent(params[key]);
                })
                .join('&');
            url += '?' + queryString;
        }

        return url;
    }

    /**
     * Refresh current route
     */
    function refresh() {
        var routeInfo = parseHash();
        handleRouteChange(routeInfo);
    }

    /**
     * Go back in history
     */
    function goBack() {
        window.history.back();
    }

    /**
     * Go forward in history
     */
    function goForward() {
        window.history.forward();
    }

    /**
     * Set default route
     * @param {string} path - Default route path
     */
    function setDefaultRoute(path) {
        defaultRoute = path;
    }

    /**
     * Get route parameters from current URL
     * @returns {Object} Route parameters
     */
    function getParams() {
        return currentRoute ? currentRoute.params : {};
    }

    /**
     * Get specific parameter value
     * @param {string} key - Parameter key
     * @param {*} defaultValue - Default value if not found
     * @returns {*} Parameter value
     */
    function getParam(key, defaultValue) {
        var params = getParams();
        return params.hasOwnProperty(key) ? params[key] : defaultValue;
    }

    // Public API
    return {
        // Core routing methods
        addRoute: addRoute,
        navigate: navigate,
        init: init,
        refresh: refresh,

        // Route information
        getCurrentRoute: getCurrentRoute,
        getRoutes: getRoutes,
        hasRoute: hasRoute,
        generateUrl: generateUrl,

        // Parameters
        getParams: getParams,
        getParam: getParam,

        // Navigation
        goBack: goBack,
        goForward: goForward,

        // Configuration
        setDefaultRoute: setDefaultRoute,

        // Callbacks
        beforeRouteChange: beforeRouteChange,
        afterRouteChange: afterRouteChange,
        removeRouteChangeCallback: removeRouteChangeCallback,

        // Utilities
        parseHash: parseHash,
        isAuthenticated: isAuthenticated
    };
})();
