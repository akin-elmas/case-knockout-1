/**
 * PostsListViewModel - Handles posts listing, search, and navigation
 * Fetches posts from API and provides search functionality
 */
function PostsListViewModel() {
    'use strict';
    
    var self = this;

    // Observable properties
    self.posts = ko.observableArray([]);
    self.searchTerm = ko.observable('');
    self.userEmail = ko.observable('');
    self.isLoading = ko.observable(false);
    self.error = ko.observable('');

    // Debounced search function
    var debouncedSearch = Helpers.debounce(function() {
        // Search is handled by computed observable
    }, 300);

    /**
     * Computed observable for filtered posts based on search term
     */
    self.filteredPosts = ko.computed(function() {
        var searchTerm = self.searchTerm().toLowerCase().trim();
        
        if (!searchTerm) {
            return self.posts();
        }

        return self.posts().filter(function(post) {
            var titleMatch = post.title.toLowerCase().indexOf(searchTerm) !== -1;
            var bodyMatch = post.body.toLowerCase().indexOf(searchTerm) !== -1;
            return titleMatch || bodyMatch;
        });
    });

    /**
     * Load posts from API
     */
    self.loadPosts = function() {
        self.isLoading(true);
        self.error('');

        ApiService.getPostsWithEdits()
            .then(function(posts) {
                self.posts(posts);
                console.info('Loaded', posts.length, 'posts');
                
                // Show notification for edited posts
                var editedCount = StorageService.getEditedPostIds().length;
                if (editedCount > 0) {
                    Helpers.showNotification(
                        editedCount + ' post(s) have local edits', 
                        'info', 
                        3000
                    );
                }
            })
            .catch(function(error) {
                console.error('Failed to load posts:', error);
                self.error('Failed to load posts: ' + error.message);
                Helpers.showNotification('Failed to load posts', 'error');
            })
            .finally(function() {
                self.isLoading(false);
            });
    };

    /**
     * Refresh posts data
     */
    self.refreshPosts = function() {
        console.info('Refreshing posts...');
        self.loadPosts();
    };

    /**
     * Select a post and navigate to detail page
     * @param {Object} post - Selected post object
     */
    self.selectPost = function(post) {
        if (!post || !post.id) {
            console.error('Invalid post selected');
            return;
        }

        console.info('Selecting post:', post.id, post.title);
        Router.navigate('detail', { id: post.id });
    };

    /**
     * Handle logout
     */
    self.logout = function() {
        if (confirm('Are you sure you want to logout?')) {
            StorageService.removeUser();
            Helpers.showNotification('Logged out successfully', 'success');
            Router.navigate('login');
        }
    };

    /**
     * Get user information from storage
     */
    self.loadUserInfo = function() {
        var userData = StorageService.getUser();
        if (userData) {
            self.userEmail(userData.email);
        } else {
            // User not logged in, redirect to login
            Router.navigate('login');
        }
    };

    /**
     * Handle search input changes
     */
    self.onSearchChange = function() {
        debouncedSearch();
    };

    /**
     * Clear search
     */
    self.clearSearch = function() {
        self.searchTerm('');
    };

    /**
     * Get post summary for display
     * @param {Object} post - Post object
     * @returns {string} Truncated post body
     */
    self.getPostSummary = function(post) {
        if (!post || !post.body) return '';
        return Helpers.truncateText(post.body, 100);
    };

    /**
     * Check if post has been edited locally
     * @param {Object} post - Post object
     * @returns {boolean} True if post has local edits
     */
    self.isPostEdited = function(post) {
        if (!post || !post.id) return false;
        return StorageService.isPostEdited(post.id);
    };

    /**
     * Get posts count by status
     * @returns {Object} Posts count statistics
     */
    self.getPostsStats = ko.computed(function() {
        var total = self.posts().length;
        var filtered = self.filteredPosts().length;
        var edited = StorageService.getEditedPostIds().length;
        
        return {
            total: total,
            filtered: filtered,
            edited: edited,
            searchActive: self.searchTerm().trim() !== ''
        };
    });

    /**
     * Handle keyboard shortcuts
     * @param {Object} data - Knockout data
     * @param {Event} event - Keyboard event
     */
    self.handleKeyPress = function(data, event) {
        // Ctrl/Cmd + F to focus search
        if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
            event.preventDefault();
            var searchInput = document.querySelector('input[data-bind*="searchTerm"]');
            if (searchInput) {
                searchInput.focus();
            }
            return false;
        }
        
        // Escape to clear search
        if (event.key === 'Escape' && self.searchTerm()) {
            self.clearSearch();
            return false;
        }
        
        return true;
    };

    /**
     * Export posts data (bonus feature)
     */
    self.exportPosts = function() {
        try {
            var postsData = {
                posts: self.posts(),
                editedPosts: StorageService.getEditedPostIds().map(function(id) {
                    return {
                        id: id,
                        data: StorageService.getEditedPost(id)
                    };
                }),
                exportDate: new Date().toISOString(),
                userEmail: self.userEmail()
            };

            var dataStr = JSON.stringify(postsData, null, 2);
            var dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            var link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = 'posts-export-' + new Date().toISOString().split('T')[0] + '.json';
            link.click();
            
            Helpers.showNotification('Posts exported successfully', 'success');
        } catch (error) {
            console.error('Export failed:', error);
            Helpers.showNotification('Export failed', 'error');
        }
    };

    /**
     * Check API connectivity status
     */
    self.checkConnectivity = function() {
        ApiService.getApiStatus()
            .then(function(status) {
                var message = status.online ? 
                    'API is online (Response: ' + status.responseTime + 'ms)' : 
                    'API is offline - using cached data';
                var type = status.online ? 'success' : 'warning';
                Helpers.showNotification(message, type);
            });
    };

    // Subscribe to search term changes
    self.searchTerm.subscribe(function(newValue) {
        console.info('Search term changed:', newValue);
    });

    /**
     * Initialize the view model
     */
    self.init = function() {
        console.info('PostsListViewModel initialized');
        
        // Load user information
        self.loadUserInfo();
        
        // Load posts
        self.loadPosts();
        
        // Set up keyboard shortcuts
        document.addEventListener('keydown', self.handleKeyPress);
        
        // Focus search input if available
        setTimeout(function() {
            var searchInput = document.querySelector('input[data-bind*="searchTerm"]');
            if (searchInput && Helpers.isMobile()) {
                // Don't auto-focus on mobile to prevent keyboard popup
                return;
            }
        }, 100);
    };

    /**
     * Cleanup when view model is disposed
     */
    self.dispose = function() {
        console.info('PostsListViewModel disposed');
        
        // Remove event listeners
        document.removeEventListener('keydown', self.handleKeyPress);
        
        // Dispose computed observables
        if (self.filteredPosts && typeof self.filteredPosts.dispose === 'function') {
            self.filteredPosts.dispose();
        }
        
        if (self.getPostsStats && typeof self.getPostsStats.dispose === 'function') {
            self.getPostsStats.dispose();
        }
    };

    // Auto-initialize
    self.init();
}
