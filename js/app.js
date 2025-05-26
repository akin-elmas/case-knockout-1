/**
 * Main Application - Knockout.js Post Management App
 * Initializes the application, sets up routing, and manages view models
 */
(function() {
    'use strict';

    /**
     * Main Application ViewModel
     */
    function AppViewModel() {
        var self = this;

        // Current page and view model
        self.currentPage = ko.observable('login');
        self.currentViewModel = ko.observable(null);
        self.userEmail = ko.observable('');
        self.isInitialized = ko.observable(false);

        // View model instances cache
        self.viewModels = {
            login: null,
            posts: null,
            detail: null,
            analytics: null
        };

        /**
         * Initialize the application
         */
        self.init = function() {
            console.info('Initializing Knockout.js');

            try {
                // Set up routes
                self.setupRoutes();

                // Initialize router
                Router.init();

                // Set up global error handling
                self.setupErrorHandling();

                // Set up route change callbacks
                self.setupRouteCallbacks();

                // Mark as initialized
                self.isInitialized(true);

                console.info('Application initialized successfully');
            } catch (error) {
                console.error('Failed to initialize application:', error);
                Helpers.showNotification('Failed to initialize application', 'error');
            }
        };

        /**
         * Set up application routes
         */
        self.setupRoutes = function() {
            // Login route
            Router.addRoute('login', function(params) {
                self.navigateToLogin();
            }, {
                title: 'Login',
                requiresAuth: false
            });

            // Posts list route
            Router.addRoute('posts', function(params) {
                self.navigateToPosts();
            }, {
                title: 'Posts',
                requiresAuth: true
            });

            // Post detail route
            Router.addRoute('detail', function(params) {
                self.navigateToDetail(params.id);
            }, {
                title: 'Post Detail',
                requiresAuth: true
            });

            // Analytics route
            Router.addRoute('analytics', function(params) {
                self.navigateToAnalytics();
            }, {
                title: 'Analytics',
                requiresAuth: true
            });

            console.info('Routes configured');
        };

        /**
         * Set up route change callbacks
         */
        self.setupRouteCallbacks = function() {
            // Before route change - cleanup previous view model
            Router.beforeRouteChange(function(currentRoute, newRoute) {
                if (currentRoute && currentRoute.path !== newRoute.path) {
                    self.cleanupCurrentViewModel();
                }
                return true; // Allow navigation
            });

            // After route change - update user email if logged in
            Router.afterRouteChange(function(currentRoute, previousRoute) {
                self.updateUserInfo();
            });
        };

        /**
         * Set up global error handling
         */
        self.setupErrorHandling = function() {
            // Handle unhandled promise rejections
            window.addEventListener('unhandledrejection', function(event) {
                console.error('Unhandled promise rejection:', event.reason);
                Helpers.showNotification('An unexpected error occurred', 'error');
            });

            // Handle JavaScript errors
            window.addEventListener('error', function(event) {
                console.error('JavaScript error:', event.error);
                // Don't show notification for every JS error to avoid spam
            });
        };

        /**
         * Update user information
         */
        self.updateUserInfo = function() {
            var userData = StorageService.getUser();
            if (userData) {
                self.userEmail(userData.email);
            } else {
                self.userEmail('');
            }
        };

        /**
         * Navigate to login page
         */
        self.navigateToLogin = function() {
            self.currentPage('login');
            
            if (!self.viewModels.login) {
                self.viewModels.login = new LoginViewModel();
            }
            
            self.currentViewModel(self.viewModels.login);
            console.info('Navigated to login page');
        };

        /**
         * Navigate to posts list page
         */
        self.navigateToPosts = function() {
            self.currentPage('posts');
            
            // Always create a new instance to refresh data
            self.cleanupViewModel('posts');
            self.viewModels.posts = new PostsListViewModel();
            
            self.currentViewModel(self.viewModels.posts);
            console.info('Navigated to posts page');
        };

        /**
         * Navigate to post detail page
         * @param {string} postId - Post ID
         */
        self.navigateToDetail = function(postId) {
            if (!postId) {
                console.error('Post ID is required for detail page');
                Helpers.showNotification('Post ID is required', 'error');
                Router.navigate('posts');
                return;
            }

            self.currentPage('detail');
            
            // Always create a new instance for each post
            self.cleanupViewModel('detail');
            self.viewModels.detail = new PostDetailViewModel(postId);
            
            self.currentViewModel(self.viewModels.detail);
            console.info('Navigated to post detail page:', postId);
        };

        /**
         * Navigate to analytics page
         */
        self.navigateToAnalytics = function() {
            self.currentPage('analytics');
            
            if (!self.viewModels.analytics) {
                self.viewModels.analytics = new AnalyticsViewModel();
            }
            
            self.currentViewModel(self.viewModels.analytics);
            console.info('Navigated to analytics page');
        };

        /**
         * Navigation helper methods for use in templates
         */
        self.navigateToPostsHelper = function() {
            Router.navigate('posts');
        };

        self.navigateToAnalyticsHelper = function() {
            Router.navigate('analytics');
        };

        self.navigateToDetailHelper = function(postId) {
            Router.navigate('detail', { id: postId });
        };

        /**
         * Logout helper
         */
        self.logout = function() {
            if (confirm('Are you sure you want to logout?')) {
                // Cleanup all view models
                self.cleanupAllViewModels();
                
                // Remove user session
                StorageService.removeUser();
                
                // Navigate to login
                Router.navigate('login');
                
                Helpers.showNotification('Logged out successfully', 'success');
            }
        };

        /**
         * Cleanup current view model
         */
        self.cleanupCurrentViewModel = function() {
            var currentVM = self.currentViewModel();
            if (currentVM && typeof currentVM.dispose === 'function') {
                currentVM.dispose();
            }
        };

        /**
         * Cleanup specific view model
         * @param {string} viewModelName - Name of view model to cleanup
         */
        self.cleanupViewModel = function(viewModelName) {
            if (self.viewModels[viewModelName]) {
                if (typeof self.viewModels[viewModelName].dispose === 'function') {
                    self.viewModels[viewModelName].dispose();
                }
                self.viewModels[viewModelName] = null;
            }
        };

        /**
         * Cleanup all view models
         */
        self.cleanupAllViewModels = function() {
            Object.keys(self.viewModels).forEach(function(key) {
                self.cleanupViewModel(key);
            });
        };

        /**
         * Handle application shutdown
         */
        self.shutdown = function() {
            console.info('Shutting down application...');
            
            // Cleanup all view models
            self.cleanupAllViewModels();
            
            // Clear current view model
            self.currentViewModel(null);
            
            console.info('Application shutdown complete');
        };

        // Initialize the application
        self.init();
    }

    /**
     * Application startup
     */
    function startApplication() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                initializeKnockout();
            });
        } else {
            initializeKnockout();
        }
    }

    /**
     * Initialize Knockout.js bindings
     */
    function initializeKnockout() {
        try {
            // Create main app view model
            var appViewModel = new AppViewModel();
            
            // Apply Knockout bindings
            ko.applyBindings(appViewModel, document.getElementById('app'));
            
            // Store app instance globally for debugging
            window.app = appViewModel;
            
            console.info('Knockout.js bindings applied successfully');
            
            
        } catch (error) {
            console.error('Failed to initialize Knockout.js:', error);
            
            // Show fallback error message
            document.body.innerHTML = 
                '<div class="container mt-5">' +
                '<div class="alert alert-danger" role="alert">' +
                '<h4 class="alert-heading">Application Error</h4>' +
                '<p>Failed to initialize the application. Please refresh the page and try again.</p>' +
                '<hr>' +
                '<p class="mb-0">Error: ' + error.message + '</p>' +
                '</div>' +
                '</div>';
        }
    }

    /**
     * Handle page unload
     */
    window.addEventListener('beforeunload', function() {
        if (window.app && typeof window.app.shutdown === 'function') {
            window.app.shutdown();
        }
    });

    // Start the application
    startApplication();

})();
