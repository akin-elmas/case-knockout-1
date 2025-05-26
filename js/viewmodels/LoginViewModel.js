/**
 * LoginViewModel - Handles user authentication and login form
 * Implements form validation and mock authentication logic
 */
function LoginViewModel() {
    'use strict';
    
    var self = this;

    // Observable properties for form fields
    self.companyCode = ko.observable('');
    self.region = ko.observable('');
    self.email = ko.observable('');
    self.password = ko.observable('');
    self.isLoading = ko.observable(false);

    // Observable properties for validation errors
    self.companyCodeError = ko.observable('');
    self.regionError = ko.observable('');
    self.emailError = ko.observable('');
    self.passwordError = ko.observable('');

    // Available regions
    self.regions = ['Europe', 'Asia', 'Americas'];

    /**
     * Validate individual form fields
     */
    self.validateCompanyCode = function() {
        var validation = Helpers.validateField(self.companyCode(), 'Company Code', {
            required: true,
            minLength: 2
        });
        self.companyCodeError(validation.isValid ? '' : validation.message);
        return validation.isValid;
    };

    self.validateRegion = function() {
        var validation = Helpers.validateField(self.region(), 'Region', {
            required: true
        });
        self.regionError(validation.isValid ? '' : validation.message);
        return validation.isValid;
    };

    self.validateEmail = function() {
        var validation = Helpers.validateField(self.email(), 'Email', {
            required: true,
            email: true
        });
        self.emailError(validation.isValid ? '' : validation.message);
        return validation.isValid;
    };

    self.validatePassword = function() {
        var validation = Helpers.validatePassword(self.password());
        self.passwordError(validation.isValid ? '' : validation.message);
        return validation.isValid;
    };

    /**
     * Validate entire form
     * @returns {boolean} True if form is valid
     */
    self.validateForm = function() {
        var isCompanyCodeValid = self.validateCompanyCode();
        var isRegionValid = self.validateRegion();
        var isEmailValid = self.validateEmail();
        var isPasswordValid = self.validatePassword();

        return isCompanyCodeValid && isRegionValid && isEmailValid && isPasswordValid;
    };

    /**
     * Clear all validation errors
     */
    self.clearErrors = function() {
        self.companyCodeError('');
        self.regionError('');
        self.emailError('');
        self.passwordError('');
    };

    /**
     * Reset form to initial state
     */
    self.resetForm = function() {
        self.companyCode('');
        self.region('');
        self.email('');
        self.password('');
        self.clearErrors();
        self.isLoading(false);
    };

    /**
     * Mock authentication logic
     * @returns {Promise} Promise that resolves to authentication result
     */
    self.authenticateUser = function() {
        return new Promise(function(resolve, reject) {
            // Simulate API call delay
            setTimeout(function() {
                // Mock authentication - accept any valid form data
                var userData = {
                    companyCode: self.companyCode(),
                    region: self.region(),
                    email: self.email(),
                    loginTime: new Date().toISOString(),
                    sessionId: Helpers.generateId(16)
                };

                resolve(userData);
            }, 1000); // 1 second delay to simulate network request
        });
    };

    /**
     * Handle login form submission
     */
    self.login = function() {
        // Prevent multiple submissions
        if (self.isLoading()) {
            return false;
        }

        // Clear previous errors
        self.clearErrors();

        // Validate form
        if (!self.validateForm()) {
            Helpers.showNotification('Please correct the errors in the form', 'error');
            return false;
        }

        // Set loading state
        self.isLoading(true);

        // Attempt authentication
        self.authenticateUser()
            .then(function(userData) {
                // Save user session
                StorageService.setUser(userData);
                
                // Show success message
                Helpers.showNotification('Login successful! Redirecting...', 'success', 2000);
                
                // Navigate to posts page
                setTimeout(function() {
                    Router.navigate('posts');
                }, 1500);
            })
            .catch(function(error) {
                console.error('Authentication failed:', error);
                Helpers.showNotification('Login failed. Please try again.', 'error');
            })
            .finally(function() {
                self.isLoading(false);
            });

        return false; // Prevent form submission
    };

    /**
     * Handle demo login (pre-fill form with demo data)
     */
    self.demoLogin = function() {
        self.companyCode('DEMO123');
        self.region('Europe');
        self.email('demo@example.com');
        self.password('demo123');
        
        // Trigger login after a short delay
        setTimeout(function() {
            self.login();
        }, 500);
    };

    /**
     * Check if user is already logged in on initialization
     */
    self.checkExistingSession = function() {
        if (StorageService.isLoggedIn()) {
            var userData = StorageService.getUser();
            console.info('Existing session found for:', userData.email);
            Router.navigate('posts', {}, true);
        }
    };

    // Computed observables for form state
    self.isFormValid = ko.computed(function() {
        return self.companyCode().trim() !== '' &&
               self.region() !== '' &&
               self.email().trim() !== '' &&
               self.password().trim() !== '' &&
               self.companyCodeError() === '' &&
               self.regionError() === '' &&
               self.emailError() === '' &&
               self.passwordError() === '';
    });

    self.canSubmit = ko.computed(function() {
        return self.isFormValid() && !self.isLoading();
    });

    // Real-time validation subscriptions
    self.companyCode.subscribe(function() {
        if (self.companyCode().trim() !== '') {
            self.validateCompanyCode();
        } else {
            self.companyCodeError('');
        }
    });

    self.region.subscribe(function() {
        if (self.region() !== '') {
            self.validateRegion();
        } else {
            self.regionError('');
        }
    });

    self.email.subscribe(function() {
        if (self.email().trim() !== '') {
            self.validateEmail();
        } else {
            self.emailError('');
        }
    });

    self.password.subscribe(function() {
        if (self.password().trim() !== '') {
            self.validatePassword();
        } else {
            self.passwordError('');
        }
    });

    /**
     * Initialize the view model
     */
    self.init = function() {
        console.info('LoginViewModel initialized');
        self.checkExistingSession();
        
        // Focus on first input field
        setTimeout(function() {
            var firstInput = document.getElementById('companyCode');
            if (firstInput) {
                firstInput.focus();
            }
        }, 100);
    };

    /**
     * Cleanup when view model is disposed
     */
    self.dispose = function() {
        console.info('LoginViewModel disposed');
        // Clean up any subscriptions or timers if needed
    };

    // Auto-initialize
    self.init();
}
