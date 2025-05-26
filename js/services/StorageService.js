/**
 * StorageService - Handles localStorage operations for the application
 * Provides methods for user session management and post data persistence
 */
var StorageService = (function() {
    'use strict';

    /**
     * Generic method to set an item in localStorage
     * @param {string} key - The storage key
     * @param {*} value - The value to store (will be JSON stringified)
     */
    function setItem(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
    }

    /**
     * Generic method to get an item from localStorage
     * @param {string} key - The storage key
     * @returns {*} The parsed value or null if not found
     */
    function getItem(key) {
        try {
            var item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            return null;
        }
    }

    /**
     * Remove an item from localStorage
     * @param {string} key - The storage key
     */
    function removeItem(key) {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error('Error removing from localStorage:', error);
        }
    }

    /**
     * Clear all items from localStorage
     */
    function clear() {
        try {
            localStorage.clear();
        } catch (error) {
            console.error('Error clearing localStorage:', error);
        }
    }

    // User Session Management
    var USER_SESSION_KEY = 'user_session';

    /**
     * Save user session data
     * @param {Object} userData - User data object
     * @param {string} userData.companyCode - Company code
     * @param {string} userData.region - Selected region
     * @param {string} userData.email - User email
     */
    function setUser(userData) {
        setItem(USER_SESSION_KEY, userData);
    }

    /**
     * Get current user session data
     * @returns {Object|null} User data or null if not logged in
     */
    function getUser() {
        return getItem(USER_SESSION_KEY);
    }

    /**
     * Remove user session (logout)
     */
    function removeUser() {
        removeItem(USER_SESSION_KEY);
    }

    /**
     * Check if user is logged in
     * @returns {boolean} True if user session exists
     */
    function isLoggedIn() {
        return getUser() !== null;
    }

    // Posts Data Management
    var POSTS_CACHE_KEY = 'posts_cache';
    var EDITED_POST_PREFIX = 'edited_post_';

    /**
     * Cache original posts data from API
     * @param {Array} posts - Array of post objects
     */
    function cachePosts(posts) {
        setItem(POSTS_CACHE_KEY, {
            data: posts,
            timestamp: Date.now()
        });
    }

    /**
     * Get cached posts data
     * @returns {Array|null} Cached posts or null if not found/expired
     */
    function getCachedPosts() {
        var cache = getItem(POSTS_CACHE_KEY);
        if (!cache) return null;

        // Cache expires after 1 hour
        var oneHour = 60 * 60 * 1000;
        if (Date.now() - cache.timestamp > oneHour) {
            removeItem(POSTS_CACHE_KEY);
            return null;
        }

        return cache.data;
    }

    /**
     * Save edited post data
     * @param {number} postId - Post ID
     * @param {Object} postData - Modified post data
     */
    function saveEditedPost(postId, postData) {
        var key = EDITED_POST_PREFIX + postId;
        setItem(key, {
            data: postData,
            timestamp: Date.now()
        });
    }

    /**
     * Get edited post data
     * @param {number} postId - Post ID
     * @returns {Object|null} Edited post data or null if not found
     */
    function getEditedPost(postId) {
        var key = EDITED_POST_PREFIX + postId;
        var editedData = getItem(key);
        return editedData ? editedData.data : null;
    }

    /**
     * Check if a post has been edited
     * @param {number} postId - Post ID
     * @returns {boolean} True if post has been edited
     */
    function isPostEdited(postId) {
        return getEditedPost(postId) !== null;
    }

    /**
     * Get all edited post IDs
     * @returns {Array} Array of edited post IDs
     */
    function getEditedPostIds() {
        var editedIds = [];
        try {
            for (var i = 0; i < localStorage.length; i++) {
                var key = localStorage.key(i);
                if (key && key.startsWith(EDITED_POST_PREFIX)) {
                    var postId = parseInt(key.replace(EDITED_POST_PREFIX, ''));
                    if (!isNaN(postId)) {
                        editedIds.push(postId);
                    }
                }
            }
        } catch (error) {
            console.error('Error getting edited post IDs:', error);
        }
        return editedIds;
    }

    /**
     * Remove edited post data
     * @param {number} postId - Post ID
     */
    function removeEditedPost(postId) {
        var key = EDITED_POST_PREFIX + postId;
        removeItem(key);
    }

    /**
     * Clear all edited posts
     */
    function clearEditedPosts() {
        var editedIds = getEditedPostIds();
        editedIds.forEach(function(postId) {
            removeEditedPost(postId);
        });
    }

    /**
     * Get storage usage information
     * @returns {Object} Storage usage stats
     */
    function getStorageInfo() {
        var used = 0;
        var total = 5 * 1024 * 1024; 

        try {
            for (var key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    used += localStorage[key].length + key.length;
                }
            }
        } catch (error) {
            console.error('Error calculating storage usage:', error);
        }

        return {
            used: used,
            total: total,
            available: total - used,
            usedPercentage: Math.round((used / total) * 100)
        };
    }

    // Public API
    return {
        // Generic storage methods
        setItem: setItem,
        getItem: getItem,
        removeItem: removeItem,
        clear: clear,

        // User session management
        setUser: setUser,
        getUser: getUser,
        removeUser: removeUser,
        isLoggedIn: isLoggedIn,

        // Posts data management
        cachePosts: cachePosts,
        getCachedPosts: getCachedPosts,
        saveEditedPost: saveEditedPost,
        getEditedPost: getEditedPost,
        isPostEdited: isPostEdited,
        getEditedPostIds: getEditedPostIds,
        removeEditedPost: removeEditedPost,
        clearEditedPosts: clearEditedPosts,

        // Utility methods
        getStorageInfo: getStorageInfo
    };
})();
