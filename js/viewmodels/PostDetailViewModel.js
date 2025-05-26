/**
 * PostDetailViewModel - Handles post detail editing and saving
 * Manages post data with local storage persistence
 */
function PostDetailViewModel(postId) {
    'use strict';
    
    var self = this;

    // Observable properties
    self.post = ko.observable({
        id: null,
        title: ko.observable(''),
        body: ko.observable(''),
        userId: null
    });
    self.isEdited = ko.observable(false);
    self.isSaving = ko.observable(false);
    self.isLoading = ko.observable(false);
    self.error = ko.observable('');
    self.originalPost = null;

    // Track changes for auto-save
    self.hasUnsavedChanges = ko.observable(false);
    self.lastSaved = ko.observable(null);

    /**
     * Load post data by ID
     * @param {number} id - Post ID to load
     */
    self.loadPost = function(id) {
        if (!id) {
            self.error('Post ID is required');
            return;
        }

        self.isLoading(true);
        self.error('');

        ApiService.getPostWithEdits(parseInt(id))
            .then(function(postData) {
                // Store original post for comparison
                self.originalPost = Helpers.deepClone(postData);
                
                // Create observable post object
                var observablePost = {
                    id: postData.id,
                    title: ko.observable(postData.title || ''),
                    body: ko.observable(postData.body || ''),
                    userId: postData.userId
                };

                self.post(observablePost);
                
                // Check if post has been edited locally
                self.isEdited(StorageService.isPostEdited(postData.id));
                
                // Set up change tracking
                self.setupChangeTracking();
                
                console.info('Loaded post:', postData.id, postData.title);
            })
            .catch(function(error) {
                console.error('Failed to load post:', error);
                self.error('Failed to load post: ' + error.message);
                Helpers.showNotification('Failed to load post', 'error');
            })
            .finally(function() {
                self.isLoading(false);
            });
    };

    /**
     * Set up change tracking for the post
     */
    self.setupChangeTracking = function() {
        var currentPost = self.post();
        if (!currentPost) return;

        // Subscribe to title changes
        currentPost.title.subscribe(function() {
            self.checkForChanges();
        });

        // Subscribe to body changes
        currentPost.body.subscribe(function() {
            self.checkForChanges();
        });
    };

    /**
     * Check if post has been modified
     */
    self.checkForChanges = function() {
        if (!self.originalPost || !self.post()) {
            return;
        }

        var currentPost = self.post();
        var hasChanges = 
            currentPost.title() !== self.originalPost.title ||
            currentPost.body() !== self.originalPost.body;

        self.hasUnsavedChanges(hasChanges);
    };

    /**
     * Save post changes
     */
    self.savePost = function() {
        if (self.isSaving()) {
            return false;
        }

        var currentPost = self.post();
        if (!currentPost) {
            Helpers.showNotification('No post data to save', 'error');
            return false;
        }

        // Validate required fields
        if (!currentPost.title().trim()) {
            Helpers.showNotification('Title is required', 'error');
            return false;
        }

        if (!currentPost.body().trim()) {
            Helpers.showNotification('Content is required', 'error');
            return false;
        }

        self.isSaving(true);
        self.error('');

        var postData = {
            id: currentPost.id,
            title: currentPost.title().trim(),
            body: currentPost.body().trim(),
            userId: currentPost.userId
        };

        ApiService.updatePost(currentPost.id, postData)
            .then(function(response) {
                // Update original post reference
                self.originalPost = Helpers.deepClone(postData);
                
                // Mark as edited and reset unsaved changes
                self.isEdited(true);
                self.hasUnsavedChanges(false);
                self.lastSaved(new Date());
                
                Helpers.showNotification('Post saved successfully', 'success');
                console.info('Post saved:', currentPost.id);
            })
            .catch(function(error) {
                console.error('Failed to save post:', error);
                self.error('Failed to save post: ' + error.message);
                Helpers.showNotification('Failed to save post', 'error');
            })
            .finally(function() {
                self.isSaving(false);
            });

        return false; // Prevent form submission
    };

    /**
     * Reset post to original state
     */
    self.resetPost = function() {
        if (!self.originalPost) {
            return;
        }

        if (self.hasUnsavedChanges() && 
            !confirm('Are you sure you want to discard your changes?')) {
            return;
        }

        var currentPost = self.post();
        if (currentPost) {
            currentPost.title(self.originalPost.title);
            currentPost.body(self.originalPost.body);
        }

        self.hasUnsavedChanges(false);
        Helpers.showNotification('Changes discarded', 'info');
    };

    /**
     * Auto-save functionality
     */
    self.autoSave = Helpers.debounce(function() {
        if (self.hasUnsavedChanges() && !self.isSaving()) {
            console.info('Auto-saving post...');
            self.savePost();
        }
    }, 2000); // Auto-save after 2 seconds of inactivity

    /**
     * Get post word count
     */
    self.getWordCount = ko.computed(function() {
        var currentPost = self.post();
        if (!currentPost) return 0;
        
        var text = currentPost.title() + ' ' + currentPost.body();
        var words = text.trim().split(/\s+/).filter(function(word) {
            return word.length > 0;
        });
        
        return words.length;
    });

    /**
     * Get character count
     */
    self.getCharacterCount = ko.computed(function() {
        var currentPost = self.post();
        if (!currentPost) return 0;
        
        return (currentPost.title() + currentPost.body()).length;
    });

    /**
     * Format last saved time
     */
    self.getLastSavedText = ko.computed(function() {
        var lastSaved = self.lastSaved();
        if (!lastSaved) return '';
        
        return 'Last saved: ' + Helpers.formatDate(lastSaved, {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    });

    /**
     * Handle keyboard shortcuts
     * @param {Object} data - Knockout data
     * @param {Event} event - Keyboard event
     */
    self.handleKeyPress = function(data, event) {
        // Ctrl/Cmd + S to save
        if ((event.ctrlKey || event.metaKey) && event.key === 's') {
            event.preventDefault();
            self.savePost();
            return false;
        }
        
        // Ctrl/Cmd + Z to reset (undo)
        if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
            event.preventDefault();
            self.resetPost();
            return false;
        }
        
        return true;
    };

    /**
     * Handle beforeunload event to warn about unsaved changes
     */
    self.handleBeforeUnload = function(event) {
        if (self.hasUnsavedChanges()) {
            var message = 'You have unsaved changes. Are you sure you want to leave?';
            event.returnValue = message;
            return message;
        }
    };

    /**
     * Navigate back to posts list
     */
    self.goBack = function() {
        if (self.hasUnsavedChanges() && 
            !confirm('You have unsaved changes. Are you sure you want to leave?')) {
            return;
        }
        
        Router.navigate('posts');
    };

    /**
     * Delete post (bonus feature)
     */
    self.deletePost = function() {
        var currentPost = self.post();
        if (!currentPost) return;

        if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
            return;
        }

        // Remove from local storage
        StorageService.removeEditedPost(currentPost.id);
        
        Helpers.showNotification('Post deleted locally', 'success');
        Router.navigate('posts');
    };

    /**
     * Duplicate post (bonus feature)
     */
    self.duplicatePost = function() {
        var currentPost = self.post();
        if (!currentPost) return;

        var duplicatedData = {
            title: '[Copy] ' + currentPost.title(),
            body: currentPost.body(),
            userId: currentPost.userId
        };

        // Save as a new edited post with a temporary ID
        var tempId = Date.now();
        StorageService.saveEditedPost(tempId, duplicatedData);
        
        Helpers.showNotification('Post duplicated', 'success');
        Router.navigate('detail', { id: tempId });
    };

    // Subscribe to changes for auto-save
    self.hasUnsavedChanges.subscribe(function(hasChanges) {
        if (hasChanges) {
            self.autoSave();
        }
    });

    /**
     * Initialize the view model
     * @param {number} id - Post ID to load
     */
    self.init = function(id) {
        console.info('PostDetailViewModel initialized with ID:', id);
        
        // Set up event listeners
        document.addEventListener('keydown', self.handleKeyPress);
        window.addEventListener('beforeunload', self.handleBeforeUnload);
        
        // Load post if ID provided
        if (id) {
            self.loadPost(id);
        } else {
            // Get ID from router params
            var params = Router.getParams();
            if (params.id) {
                self.loadPost(params.id);
            } else {
                self.error('No post ID provided');
                Helpers.showNotification('No post ID provided', 'error');
            }
        }
    };

    /**
     * Cleanup when view model is disposed
     */
    self.dispose = function() {
        console.info('PostDetailViewModel disposed');
        
        // Remove event listeners
        document.removeEventListener('keydown', self.handleKeyPress);
        window.removeEventListener('beforeunload', self.handleBeforeUnload);
        
        // Dispose computed observables
        if (self.getWordCount && typeof self.getWordCount.dispose === 'function') {
            self.getWordCount.dispose();
        }
        
        if (self.getCharacterCount && typeof self.getCharacterCount.dispose === 'function') {
            self.getCharacterCount.dispose();
        }
        
        if (self.getLastSavedText && typeof self.getLastSavedText.dispose === 'function') {
            self.getLastSavedText.dispose();
        }
    };

    // Auto-initialize with provided postId
    if (postId) {
        self.init(postId);
    } else {
        // Initialize without ID (will get from router)
        self.init();
    }
}
