/**
 * AnalyticsViewModel - Handles analytics dashboard with Chart.js
 * Displays posts count per user and other statistics
 */
function AnalyticsViewModel() {
    'use strict';
    
    var self = this;

    // Observable properties
    self.isLoading = ko.observable(false);
    self.error = ko.observable('');
    self.chartData = ko.observable(null);
    self.chartInstance = null;
    self.userEmail = ko.observable('');

    // Analytics data
    self.totalPosts = ko.observable(0);
    self.totalUsers = ko.observable(0);
    self.editedPosts = ko.observable(0);
    self.averagePostsPerUser = ko.observable(0);

    /**
     * Load user information from storage
     */
    self.loadUserInfo = function() {
        var userData = StorageService.getUser();
        if (userData) {
            self.userEmail(userData.email);
        } else {
            Router.navigate('login');
        }
    };

    /**
     * Load analytics data
     */
    self.loadAnalytics = function() {
        self.isLoading(true);
        self.error('');

        ApiService.fetchPosts()
            .then(function(posts) {
                self.processAnalyticsData(posts);
                self.createChart();
            })
            .catch(function(error) {
                console.error('Failed to load analytics data:', error);
                self.error('Failed to load analytics data: ' + error.message);
                Helpers.showNotification('Failed to load analytics data', 'error');
            })
            .finally(function() {
                self.isLoading(false);
            });
    };

    /**
     * Process posts data for analytics
     * @param {Array} posts - Array of posts
     */
    self.processAnalyticsData = function(posts) {
        if (!posts || !Array.isArray(posts)) {
            console.error('Invalid posts data for analytics');
            return;
        }

        // Count posts per user
        var userPostCounts = {};
        posts.forEach(function(post) {
            var userId = post.userId;
            if (userPostCounts[userId]) {
                userPostCounts[userId]++;
            } else {
                userPostCounts[userId] = 1;
            }
        });

        // Calculate statistics
        var userIds = Object.keys(userPostCounts);
        var totalUsers = userIds.length;
        var totalPosts = posts.length;
        var editedPostsCount = StorageService.getEditedPostIds().length;
        var averagePosts = totalUsers > 0 ? Math.round((totalPosts / totalUsers) * 100) / 100 : 0;

        // Update observables
        self.totalPosts(totalPosts);
        self.totalUsers(totalUsers);
        self.editedPosts(editedPostsCount);
        self.averagePostsPerUser(averagePosts);

        // Prepare chart data
        var chartLabels = userIds.map(function(userId) {
            return 'User ' + userId;
        });

        var chartValues = userIds.map(function(userId) {
            return userPostCounts[userId];
        });

        // Generate colors for chart
        var colors = self.generateColors(userIds.length);

        self.chartData({
            labels: chartLabels,
            values: chartValues,
            colors: colors,
            userPostCounts: userPostCounts
        });

        console.info('Analytics data processed:', {
            totalPosts: totalPosts,
            totalUsers: totalUsers,
            editedPosts: editedPostsCount,
            averagePosts: averagePosts
        });
    };

    /**
     * Generate colors for chart
     * @param {number} count - Number of colors needed
     * @returns {Array} Array of color strings
     */
    self.generateColors = function(count) {
        var colors = [];
        var baseColors = [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
            '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF',
            '#4BC0C0', '#FF6384'
        ];

        for (var i = 0; i < count; i++) {
            if (i < baseColors.length) {
                colors.push(baseColors[i]);
            } else {
                // Generate random colors for additional users
                var hue = (i * 137.508) % 360; // Golden angle approximation
                colors.push('hsl(' + hue + ', 70%, 60%)');
            }
        }

        return colors;
    };

    /**
     * Create Chart.js chart
     */
    self.createChart = function() {
        var chartData = self.chartData();
        if (!chartData) {
            console.error('No chart data available');
            return;
        }

        // Destroy existing chart if it exists
        if (self.chartInstance) {
            self.chartInstance.destroy();
        }

        var canvas = document.getElementById('analyticsChart');
        if (!canvas) {
            console.error('Chart canvas not found');
            return;
        }

        var ctx = canvas.getContext('2d');

        self.chartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: chartData.labels,
                datasets: [{
                    label: 'Posts Count',
                    data: chartData.values,
                    backgroundColor: chartData.colors.map(function(color) {
                        return color + '80'; 
                    }),
                    borderColor: chartData.colors,
                    borderWidth: 2,
                    borderRadius: 4,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Posts Count by User',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    },
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            title: function(context) {
                                return context[0].label;
                            },
                            label: function(context) {
                                var count = context.parsed.y;
                                var percentage = ((count / self.totalPosts()) * 100).toFixed(1);
                                return 'Posts: ' + count + ' (' + percentage + '%)';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        },
                        title: {
                            display: true,
                            text: 'Number of Posts'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Users'
                        }
                    }
                },
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart'
                }
            }
        });

        console.info('Chart created successfully');
    };

    /**
     * Refresh analytics data
     */
    self.refreshAnalytics = function() {
        console.info('Refreshing analytics...');
        self.loadAnalytics();
    };

    /**
     * Export analytics data
     */
    self.exportAnalytics = function() {
        try {
            var chartData = self.chartData();
            if (!chartData) {
                Helpers.showNotification('No data to export', 'warning');
                return;
            }

            var analyticsData = {
                summary: {
                    totalPosts: self.totalPosts(),
                    totalUsers: self.totalUsers(),
                    editedPosts: self.editedPosts(),
                    averagePostsPerUser: self.averagePostsPerUser()
                },
                userPostCounts: chartData.userPostCounts,
                exportDate: new Date().toISOString(),
                exportedBy: self.userEmail()
            };

            var dataStr = JSON.stringify(analyticsData, null, 2);
            var dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            var link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = 'analytics-export-' + new Date().toISOString().split('T')[0] + '.json';
            link.click();
            
            Helpers.showNotification('Analytics exported successfully', 'success');
        } catch (error) {
            console.error('Export failed:', error);
            Helpers.showNotification('Export failed', 'error');
        }
    };

    /**
     * Switch chart type
     * @param {string} type - Chart type (bar, pie, doughnut, line)
     */
    self.switchChartType = function(type) {
        if (!self.chartInstance || !self.chartData()) {
            return;
        }

        var validTypes = ['bar', 'pie', 'doughnut', 'line'];
        if (validTypes.indexOf(type) === -1) {
            console.error('Invalid chart type:', type);
            return;
        }

        self.chartInstance.config.type = type;
        
        // Adjust options based on chart type
        if (type === 'pie' || type === 'doughnut') {
            self.chartInstance.config.options.scales = {};
            self.chartInstance.config.options.plugins.legend.display = true;
        } else {
            self.chartInstance.config.options.scales = {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 },
                    title: { display: true, text: 'Number of Posts' }
                },
                x: {
                    title: { display: true, text: 'Users' }
                }
            };
            self.chartInstance.config.options.plugins.legend.display = false;
        }

        self.chartInstance.update();
        console.info('Chart type changed to:', type);
    };

    /**
     * Get top users by post count
     * @param {number} limit - Number of top users to return
     * @returns {Array} Array of top users
     */
    self.getTopUsers = ko.computed(function() {
        var chartData = self.chartData();
        if (!chartData) return [];

        var users = Object.keys(chartData.userPostCounts).map(function(userId) {
            return {
                userId: userId,
                postCount: chartData.userPostCounts[userId]
            };
        });

        return users.sort(function(a, b) {
            return b.postCount - a.postCount;
        }).slice(0, 5); // Top 5 users
    });

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
     * Initialize the view model
     */
    self.init = function() {
        console.info('AnalyticsViewModel initialized');
        
        // Load user information
        self.loadUserInfo();
        
        // Load analytics data
        self.loadAnalytics();
    };

    /**
     * Cleanup when view model is disposed
     */
    self.dispose = function() {
        console.info('AnalyticsViewModel disposed');
        
        // Destroy chart instance
        if (self.chartInstance) {
            self.chartInstance.destroy();
            self.chartInstance = null;
        }
        
        // Dispose computed observables
        if (self.getTopUsers && typeof self.getTopUsers.dispose === 'function') {
            self.getTopUsers.dispose();
        }
    };

    // Auto-initialize
    self.init();
}
