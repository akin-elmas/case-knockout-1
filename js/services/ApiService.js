/**
 * ApiService - Handles HTTP requests to JSONPlaceholder API
 * Provides methods for fetching posts data with error handling and caching
 */
var ApiService = (function() {
    'use strict';

    var BASE_URL = 'https://jsonplaceholder.typicode.com';

    /**
     * Generic HTTP request handler
     * @param {string} url - The URL to fetch
     * @param {Object} options - Fetch options
     * @returns {Promise} Promise that resolves to response data
     */
    function makeRequest(url, options) {
        options = options || {};
        
        // Set default headers
        var defaultHeaders = {
            'Content-Type': 'application/json'
        };
        
        options.headers = Object.assign(defaultHeaders, options.headers || {});

        return fetch(url, options)
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('HTTP ' + response.status + ': ' + response.statusText);
                }
                return response.json();
            })
            .catch(function(error) {
                console.error('API Request failed:', error);
                throw error;
            });
    }

    /**
     * Fetch all posts from JSONPlaceholder
     * @returns {Promise<Array>} Promise that resolves to array of posts
     */
    function fetchPosts() {
        return makeRequest(BASE_URL + '/posts')
            .then(function(posts) {
                // Cache the posts for offline access
                StorageService.cachePosts(posts);
                return posts;
            })
            .catch(function(error) {
                console.warn('Failed to fetch posts from API, trying cache:', error);
                
                // Try to get cached posts if API fails
                var cachedPosts = StorageService.getCachedPosts();
                if (cachedPosts) {
                    console.info('Using cached posts data');
                    return cachedPosts;
                }
                
                // If no cache available, throw the original error
                throw new Error('Unable to fetch posts: ' + error.message);
            });
    }

    /**
     * Fetch a single post by ID
     * @param {number} postId - The post ID
     * @returns {Promise<Object>} Promise that resolves to post object
     */
    function fetchPost(postId) {
        return makeRequest(BASE_URL + '/posts/' + postId)
            .catch(function(error) {
                console.warn('Failed to fetch post from API, trying cache:', error);
                
                // Try to get from cached posts
                var cachedPosts = StorageService.getCachedPosts();
                if (cachedPosts) {
                    var post = cachedPosts.find(function(p) { return p.id === parseInt(postId); });
                    if (post) {
                        console.info('Using cached post data for ID:', postId);
                        return post;
                    }
                }
                
                throw new Error('Unable to fetch post: ' + error.message);
            });
    }

    /**
     * Fetch posts by user ID
     * @param {number} userId - The user ID
     * @returns {Promise<Array>} Promise that resolves to array of posts
     */
    function fetchPostsByUser(userId) {
        return makeRequest(BASE_URL + '/posts?userId=' + userId)
            .catch(function(error) {
                console.warn('Failed to fetch user posts from API, trying cache:', error);
                
                // Try to get from cached posts
                var cachedPosts = StorageService.getCachedPosts();
                if (cachedPosts) {
                    var userPosts = cachedPosts.filter(function(p) { 
                        return p.userId === parseInt(userId); 
                    });
                    if (userPosts.length > 0) {
                        console.info('Using cached posts data for user:', userId);
                        return userPosts;
                    }
                }
                
                throw new Error('Unable to fetch user posts: ' + error.message);
            });
    }

    /**
     * Fetch users data (for analytics)
     * @returns {Promise<Array>} Promise that resolves to array of users
     */
    function fetchUsers() {
        return makeRequest(BASE_URL + '/users')
            .catch(function(error) {
                console.warn('Failed to fetch users from API:', error);
                throw new Error('Unable to fetch users: ' + error.message);
            });
    }

    /**
     * Simulate post update (JSONPlaceholder doesn't actually update data)
     * @param {number} postId - The post ID
     * @param {Object} postData - The updated post data
     * @returns {Promise<Object>} Promise that resolves to updated post
     */
    function updatePost(postId, postData) {
        var options = {
            method: 'PUT',
            body: JSON.stringify(postData)
        };

        return makeRequest(BASE_URL + '/posts/' + postId, options)
            .then(function(response) {
                // Since JSONPlaceholder doesn't actually update, we save to localStorage
                StorageService.saveEditedPost(postId, postData);
                console.info('Post updated locally:', postId);
                return response;
            })
            .catch(function(error) {
                // Even if API fails, save locally
                StorageService.saveEditedPost(postId, postData);
                console.info('Post saved locally due to API error:', postId);
                return postData;
            });
    }

    /**
     * Get post data with local edits merged
     * @param {number} postId - The post ID
     * @returns {Promise<Object>} Promise that resolves to post with edits
     */
    function getPostWithEdits(postId) {
        return fetchPost(postId)
            .then(function(originalPost) {
                var editedData = StorageService.getEditedPost(postId);
                
                if (editedData) {
                    // Merge edited data with original
                    return Object.assign({}, originalPost, editedData);
                }
                
                return originalPost;
            });
    }

    /**
     * Get all posts with local edits merged
     * @returns {Promise<Array>} Promise that resolves to posts array with edits
     */
    function getPostsWithEdits() {
        return fetchPosts()
            .then(function(originalPosts) {
                var editedPostIds = StorageService.getEditedPostIds();
                
                return originalPosts.map(function(post) {
                    if (editedPostIds.includes(post.id)) {
                        var editedData = StorageService.getEditedPost(post.id);
                        return Object.assign({}, post, editedData);
                    }
                    return post;
                });
            });
    }

    /**
     * Check API connectivity
     * @returns {Promise<boolean>} Promise that resolves to connectivity status
     */
    function checkConnectivity() {
        return fetch(BASE_URL + '/posts/1', { method: 'HEAD' })
            .then(function(response) {
                return response.ok;
            })
            .catch(function() {
                return false;
            });
    }

    /**
     * Get API status information
     * @returns {Promise<Object>} Promise that resolves to status info
     */
    function getApiStatus() {
        var startTime = Date.now();
        
        return checkConnectivity()
            .then(function(isOnline) {
                var responseTime = Date.now() - startTime;
                
                return {
                    online: isOnline,
                    responseTime: responseTime,
                    baseUrl: BASE_URL,
                    timestamp: new Date().toISOString()
                };
            });
    }

    /**
     * Retry a failed request with exponential backoff
     * @param {Function} requestFn - The request function to retry
     * @param {number} maxRetries - Maximum number of retries
     * @param {number} delay - Initial delay in milliseconds
     * @returns {Promise} Promise that resolves to request result
     */
    function retryRequest(requestFn, maxRetries, delay) {
        maxRetries = maxRetries || 3;
        delay = delay || 1000;

        return requestFn()
            .catch(function(error) {
                if (maxRetries <= 0) {
                    throw error;
                }

                console.warn('Request failed, retrying in ' + delay + 'ms. Retries left:', maxRetries);
                
                return new Promise(function(resolve) {
                    setTimeout(resolve, delay);
                }).then(function() {
                    return retryRequest(requestFn, maxRetries - 1, delay * 2);
                });
            });
    }

    return {
        // Core API methods
        fetchPosts: fetchPosts,
        fetchPost: fetchPost,
        fetchPostsByUser: fetchPostsByUser,
        fetchUsers: fetchUsers,
        updatePost: updatePost,

        // Enhanced methods with local storage integration
        getPostWithEdits: getPostWithEdits,
        getPostsWithEdits: getPostsWithEdits,

        // Utility methods
        checkConnectivity: checkConnectivity,
        getApiStatus: getApiStatus,
        retryRequest: retryRequest,

        // Generic request method for custom endpoints
        makeRequest: makeRequest,

        // Constants
        BASE_URL: BASE_URL
    };
})();
