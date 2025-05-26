/**
 * Helpers - Utility functions for the application
 * Provides common helper methods for validation, formatting, and DOM manipulation
 */
var Helpers = (function() {
    'use strict';

    /**
     * Email validation using regex
     * @param {string} email - Email address to validate
     * @returns {boolean} True if email is valid
     */
    function isValidEmail(email) {
        if (!email || typeof email !== 'string') return false;
        
        var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email.trim());
    }

    /**
     * Password validation
     * @param {string} password - Password to validate
     * @returns {Object} Validation result with isValid and message
     */
    function validatePassword(password) {
        if (!password || typeof password !== 'string') {
            return { isValid: false, message: 'Password is required' };
        }

        if (password.length < 6) {
            return { isValid: false, message: 'Password must be at least 6 characters long' };
        }

        return { isValid: true, message: '' };
    }

    /**
     * Generic form field validation
     * @param {string} value - Value to validate
     * @param {string} fieldName - Name of the field for error messages
     * @param {Object} rules - Validation rules
     * @returns {Object} Validation result with isValid and message
     */
    function validateField(value, fieldName, rules) {
        rules = rules || {};
        
        // Required field validation
        if (rules.required && (!value || value.trim() === '')) {
            return { 
                isValid: false, 
                message: fieldName + ' is required' 
            };
        }

        // Skip other validations if field is empty and not required
        if (!value || value.trim() === '') {
            return { isValid: true, message: '' };
        }

        // Minimum length validation
        if (rules.minLength && value.length < rules.minLength) {
            return { 
                isValid: false, 
                message: fieldName + ' must be at least ' + rules.minLength + ' characters long' 
            };
        }

        // Maximum length validation
        if (rules.maxLength && value.length > rules.maxLength) {
            return { 
                isValid: false, 
                message: fieldName + ' must not exceed ' + rules.maxLength + ' characters' 
            };
        }

        // Email validation
        if (rules.email && !isValidEmail(value)) {
            return { 
                isValid: false, 
                message: 'Please enter a valid email address' 
            };
        }

        // Custom pattern validation
        if (rules.pattern && !rules.pattern.test(value)) {
            return { 
                isValid: false, 
                message: rules.patternMessage || fieldName + ' format is invalid' 
            };
        }

        return { isValid: true, message: '' };
    }

    /**
     * Debounce function to limit function calls
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @param {boolean} immediate - Execute immediately on first call
     * @returns {Function} Debounced function
     */
    function debounce(func, wait, immediate) {
        var timeout;
        return function() {
            var context = this;
            var args = arguments;
            
            var later = function() {
                timeout = null;
                if (!immediate) func.apply(context, args);
            };
            
            var callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            
            if (callNow) func.apply(context, args);
        };
    }

    /**
     * Throttle function to limit function calls
     * @param {Function} func - Function to throttle
     * @param {number} limit - Time limit in milliseconds
     * @returns {Function} Throttled function
     */
    function throttle(func, limit) {
        var inThrottle;
        return function() {
            var args = arguments;
            var context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(function() { inThrottle = false; }, limit);
            }
        };
    }

    /**
     * Format date to readable string
     * @param {Date|string|number} date - Date to format
     * @param {Object} options - Formatting options
     * @returns {string} Formatted date string
     */
    function formatDate(date, options) {
        if (!date) return '';
        
        var dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) return '';

        options = options || {};
        
        var defaultOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };

        var formatOptions = Object.assign(defaultOptions, options);
        
        try {
            return dateObj.toLocaleDateString('en-US', formatOptions);
        } catch (error) {
            return dateObj.toString();
        }
    }

    /**
     * Truncate text to specified length
     * @param {string} text - Text to truncate
     * @param {number} maxLength - Maximum length
     * @param {string} suffix - Suffix to add (default: '...')
     * @returns {string} Truncated text
     */
    function truncateText(text, maxLength, suffix) {
        if (!text || typeof text !== 'string') return '';
        
        maxLength = maxLength || 100;
        suffix = suffix || '...';
        
        if (text.length <= maxLength) return text;
        
        return text.substring(0, maxLength - suffix.length) + suffix;
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    function escapeHtml(text) {
        if (!text || typeof text !== 'string') return '';
        
        var map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        
        return text.replace(/[&<>"']/g, function(m) { return map[m]; });
    }

    /**
     * Generate a simple hash from string (for cache keys, etc.)
     * @param {string} str - String to hash
     * @returns {string} Hash string
     */
    function simpleHash(str) {
        if (!str || typeof str !== 'string') return '';
        
        var hash = 0;
        for (var i = 0; i < str.length; i++) {
            var char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }

    /**
     * Deep clone an object (simple implementation)
     * @param {*} obj - Object to clone
     * @returns {*} Cloned object
     */
    function deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(deepClone);
        if (typeof obj === 'object') {
            var cloned = {};
            for (var key in obj) {
                if (obj.hasOwnProperty(key)) {
                    cloned[key] = deepClone(obj[key]);
                }
            }
            return cloned;
        }
        return obj;
    }

    /**
     * Check if device is mobile
     * @returns {boolean} True if mobile device
     */
    function isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    /**
     * Get viewport dimensions
     * @returns {Object} Viewport width and height
     */
    function getViewportSize() {
        return {
            width: Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0),
            height: Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0)
        };
    }

    /**
     * Scroll to element smoothly
     * @param {string|Element} element - Element selector or element
     * @param {Object} options - Scroll options
     */
    function scrollToElement(element, options) {
        var targetElement = typeof element === 'string' ? 
            document.querySelector(element) : element;
            
        if (!targetElement) return;

        options = options || {};
        var defaultOptions = {
            behavior: 'smooth',
            block: 'start',
            inline: 'nearest'
        };

        var scrollOptions = Object.assign(defaultOptions, options);
        targetElement.scrollIntoView(scrollOptions);
    }

    /**
     * Show notification (simple implementation)
     * @param {string} message - Notification message
     * @param {string} type - Notification type (success, error, warning, info)
     * @param {number} duration - Duration in milliseconds
     */
    function showNotification(message, type, duration) {
        type = type || 'info';
        duration = duration || 3000;

        // Create notification element
        var notification = document.createElement('div');
        notification.className = 'alert alert-' + type + ' alert-dismissible fade show position-fixed';
        notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        notification.innerHTML = message + 
            '<button type="button" class="btn-close" data-bs-dismiss="alert"></button>';

        document.body.appendChild(notification);

        // Auto remove after duration
        setTimeout(function() {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, duration);
    }

    /**
     * Format number with thousands separator
     * @param {number} num - Number to format
     * @returns {string} Formatted number
     */
    function formatNumber(num) {
        if (typeof num !== 'number' || isNaN(num)) return '0';
        return num.toLocaleString();
    }

    /**
     * Generate random ID
     * @param {number} length - ID length
     * @returns {string} Random ID
     */
    function generateId(length) {
        length = length || 8;
        var chars = 'sdfasdfrqwefsdafasdfqwerqwerAsdafadsfqer';
        var result = '';
        for (var i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    // Public API
    return {
        // Validation
        isValidEmail: isValidEmail,
        validatePassword: validatePassword,
        validateField: validateField,

        // Function utilities
        debounce: debounce,
        throttle: throttle,

        // Formatting
        formatDate: formatDate,
        truncateText: truncateText,
        escapeHtml: escapeHtml,
        formatNumber: formatNumber,

        // Object utilities
        simpleHash: simpleHash,
        deepClone: deepClone,
        generateId: generateId,

        // DOM utilities
        isMobile: isMobile,
        getViewportSize: getViewportSize,
        scrollToElement: scrollToElement,
        showNotification: showNotification
    };
})();
