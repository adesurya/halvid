// ===== SHORTVIDEO - MAIN JAVASCRIPT =====
// Modern JavaScript for ShortVideo Platform
// Author: ShortVideo Team
// Version: 1.0.0

'use strict';

// ===== GLOBAL VARIABLES =====
let isVideoPlayerActive = false;
let searchCache = new Map();
let lastSearchQuery = '';
let debounceTimer = null;

// ===== DOM CONTENT LOADED =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎬 ShortVideo Platform Loading...');
    
    // Initialize all modules
    initializeApp();
    
    console.log('✅ ShortVideo Platform Ready!');
});

// ===== MAIN INITIALIZATION =====
function initializeApp() {
    try {
        // Core functionality
        initializeNavigation();
        initializeSearch();
        initializeVideoCards();
        initializeVideoPlayer();
        
        // UI enhancements
        initializeLazyLoading();
        initializeAnimations();
        initializeKeyboardShortcuts();
        initializeTooltips();
        
        // Performance optimizations
        initializePerformanceOptimizations();
        
        // User interactions
        initializeLikeSystem();
        initializeShareSystem();
        
        // Responsive features
        initializeResponsiveFeatures();
        
    } catch (error) {
        console.error('❌ Error initializing app:', error);
        showNotification('Terjadi kesalahan saat memuat aplikasi', 'error');
    }
}

// ===== NAVIGATION SYSTEM =====
function initializeNavigation() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;
    
    // Navbar scroll effect
    let lastScrollY = window.scrollY;
    
    window.addEventListener('scroll', throttle(() => {
        const currentScrollY = window.scrollY;
        
        if (currentScrollY > 100) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
        
        // Hide navbar on scroll down, show on scroll up
        if (currentScrollY > lastScrollY && currentScrollY > 200) {
            navbar.style.transform = 'translateY(-100%)';
        } else {
            navbar.style.transform = 'translateY(0)';
        }
        
        lastScrollY = currentScrollY;
    }, 100));
    
    // Active navigation links
    updateActiveNavLink();
}

function updateActiveNavLink() {
    const navLinks = document.querySelectorAll('.nav-link');
    const currentPath = window.location.pathname;
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === currentPath || 
            (currentPath === '/' && link.getAttribute('href') === '/')) {
            link.classList.add('active');
        }
    });
}

// ===== ADVANCED SEARCH SYSTEM =====
function initializeSearch() {
    const searchForm = document.querySelector('.search-form');
    const searchInput = document.querySelector('.search-input');
    const searchBtn = document.querySelector('.search-btn');
    
    if (!searchForm || !searchInput) return;
    
    // Search input enhancements
    setupSearchInput(searchInput);
    
    // Search form submission
    searchForm.addEventListener('submit', handleSearchSubmit);
    
    // Search button loading state
    setupSearchButton(searchBtn);
    
    // Auto-complete (future enhancement)
    setupSearchAutocomplete(searchInput);
}

function setupSearchInput(searchInput) {
    let searchHistory = [];
    
    // Safely get search history from localStorage
    try {
        searchHistory = JSON.parse(localStorage.getItem('searchHistory') || '[]');
    } catch (error) {
        console.warn('Could not load search history:', error);
        searchHistory = [];
    }
    
    // Input events
    searchInput.addEventListener('input', debounce((e) => {
        const query = e.target.value.trim();
        
        if (query.length > 2) {
            showSearchSuggestions(query);
        } else {
            hideSearchSuggestions();
        }
    }, 300));
    
    // Focus and blur events
    searchInput.addEventListener('focus', () => {
        searchInput.parentElement.classList.add('focused');
        if (searchHistory.length > 0) {
            showSearchHistory(searchHistory);
        }
    });
    
    searchInput.addEventListener('blur', () => {
        setTimeout(() => {
            searchInput.parentElement.classList.remove('focused');
            hideSearchSuggestions();
        }, 200);
    });
    
    // Keyboard navigation - now properly defined
    searchInput.addEventListener('keydown', (e) => {
        handleSearchKeydown(e);
    });
}

function handleSearchSubmit(e) {
    const searchInput = e.target.querySelector('.search-input');
    const query = searchInput.value.trim();
    
    if (!query) {
        e.preventDefault();
        searchInput.focus();
        showNotification('Silakan masukkan kata kunci pencarian', 'warning');
        return;
    }
    
    // Add to search history
    addToSearchHistory(query);
    
    // Show loading state
    showSearchLoading();
}

function addToSearchHistory(query) {
    try {
        let searchHistory = JSON.parse(localStorage.getItem('searchHistory') || '[]');
        
        // Remove if already exists
        searchHistory = searchHistory.filter(item => item !== query);
        
        // Add to beginning
        searchHistory.unshift(query);
        
        // Keep only last 10 searches
        searchHistory = searchHistory.slice(0, 10);
        
        localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
    } catch (error) {
        console.warn('Could not save search history:', error);
    }
}

function showSearchSuggestions(query) {
    // This would typically fetch from an API
    // For now, we'll use cached results or show popular searches
    const suggestions = generateSearchSuggestions(query);
    displaySearchDropdown(suggestions, 'suggestions');
}

function showSearchHistory(history) {
    displaySearchDropdown(history, 'history');
}

function displaySearchDropdown(items, type) {
    hideSearchSuggestions(); // Remove existing dropdown
    
    if (items.length === 0) return;
    
    const searchContainer = document.querySelector('.nav-search');
    const dropdown = document.createElement('div');
    dropdown.className = `search-dropdown search-dropdown-${type}`;
    
    const title = type === 'history' ? 'Pencarian Terakhir' : 'Saran Pencarian';
    
    dropdown.innerHTML = `
        <div class="search-dropdown-header">
            <span>${title}</span>
            ${type === 'history' ? '<button class="clear-history-btn" title="Hapus Riwayat"><i class="fas fa-trash"></i></button>' : ''}
        </div>
        <div class="search-dropdown-items">
            ${items.map(item => `
                <div class="search-dropdown-item" data-query="${item}">
                    <i class="fas fa-${type === 'history' ? 'history' : 'search'}"></i>
                    <span>${item}</span>
                </div>
            `).join('')}
        </div>
    `;
    
    searchContainer.appendChild(dropdown);
    
    // Add event listeners
    dropdown.addEventListener('click', handleDropdownClick);
    
    // Clear history functionality
    const clearBtn = dropdown.querySelector('.clear-history-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            localStorage.removeItem('searchHistory');
            hideSearchSuggestions();
            showNotification('Riwayat pencarian dihapus', 'success');
        });
    }
}

function handleDropdownClick(e) {
    const item = e.target.closest('.search-dropdown-item');
    if (item) {
        const query = item.dataset.query;
        const searchInput = document.querySelector('.search-input');
        searchInput.value = query;
        hideSearchSuggestions();
        
        // Trigger search
        const searchForm = document.querySelector('.search-form');
        searchForm.dispatchEvent(new Event('submit'));
    }
}

function hideSearchSuggestions() {
    const dropdown = document.querySelector('.search-dropdown');
    if (dropdown) {
        dropdown.remove();
    }
}

function generateSearchSuggestions(query) {
    // Mock suggestions based on query
    const suggestions = [
        'tutorial javascript',
        'video kucing lucu',
        'pemandangan alam',
        'resep masakan',
        'musik relaksasi'
    ];
    
    return suggestions.filter(s => 
        s.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 5);
}

// ===== VIDEO CARDS SYSTEM =====
function initializeVideoCards() {
    const videoCards = document.querySelectorAll('.video-card, .trending-card');
    
    videoCards.forEach((card, index) => {
        // Staggered animation
        card.style.animationDelay = `${index * 0.1}s`;
        
        // Hover effects
        setupVideoCardHover(card);
        
        // Click tracking
        setupVideoCardClick(card);
        
        // Intersection observer for analytics
        observeVideoCard(card);
    });
}

function setupVideoCardHover(card) {
    const thumbnail = card.querySelector('.video-thumbnail, .trending-thumbnail');
    const playOverlay = card.querySelector('.play-overlay');
    
    if (!thumbnail || !playOverlay) return;
    
    card.addEventListener('mouseenter', () => {
        playOverlay.style.opacity = '1';
        playOverlay.style.transform = 'translate(-50%, -50%) scale(1.1)';
        
        // Preload video metadata
        const videoLink = card.querySelector('a[href^="/video/"]');
        if (videoLink) {
            const videoId = videoLink.href.split('/').pop();
            preloadVideoMetadata(videoId);
        }
    });
    
    card.addEventListener('mouseleave', () => {
        playOverlay.style.opacity = '0';
        playOverlay.style.transform = 'translate(-50%, -50%) scale(1)';
    });
}

function setupVideoCardClick(card) {
    const videoLink = card.querySelector('a[href^="/video/"]');
    
    if (videoLink) {
        videoLink.addEventListener('click', (e) => {
            // Add loading state
            const playOverlay = card.querySelector('.play-overlay');
            if (playOverlay) {
                playOverlay.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            }
            
            // Track click analytics
            const videoId = videoLink.href.split('/').pop();
            trackVideoClick(videoId);
        });
    }
}

function observeVideoCard(card) {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Track impression
                const videoLink = card.querySelector('a[href^="/video/"]');
                if (videoLink) {
                    const videoId = videoLink.href.split('/').pop();
                    trackVideoImpression(videoId);
                }
                
                observer.unobserve(card);
            }
        });
    }, { threshold: 0.5 });
    
    observer.observe(card);
}

// ===== ADVANCED VIDEO PLAYER =====
function initializeVideoPlayer() {
    const videoPlayer = document.getElementById('videoPlayer');
    if (!videoPlayer) return;
    
    isVideoPlayerActive = true;
    
    // Setup video player enhancements
    setupVideoPlayerEvents(videoPlayer);
    setupVideoPlayerControls(videoPlayer);
    setupVideoPlayerAnalytics(videoPlayer);
    setupVideoPlayerKeyboard(videoPlayer);
    
    // Custom controls overlay
    createCustomVideoControls(videoPlayer);
}

function setupVideoPlayerEvents(video) {
    // Loading states
    video.addEventListener('loadstart', () => {
        showVideoLoading();
    });
    
    video.addEventListener('loadedmetadata', () => {
        hideVideoLoading();
        updateVideoInfo(video);
    });
    
    video.addEventListener('canplay', () => {
        hideVideoLoading();
    });
    
    // Error handling
    video.addEventListener('error', (e) => {
        console.error('Video error:', e);
        showVideoError();
    });
    
    // Progress tracking
    video.addEventListener('timeupdate', () => {
        updateVideoProgress(video);
    });
    
    // Playback events
    video.addEventListener('play', () => {
        trackVideoEvent('play');
    });
    
    video.addEventListener('pause', () => {
        trackVideoEvent('pause');
    });
    
    video.addEventListener('ended', () => {
        trackVideoEvent('ended');
        showVideoEndScreen();
    });
    
    // Volume changes
    video.addEventListener('volumechange', () => {
        updateVolumeDisplay(video);
    });
}

function setupVideoPlayerControls(video) {
    // Picture-in-Picture support
    if (document.pictureInPictureEnabled) {
        addPictureInPictureButton(video);
    }
    
    // Playback speed control
    addPlaybackSpeedControl(video);
    
    // Quality selector (if multiple sources available)
    addQualitySelector(video);
    
    // Theater mode
    addTheaterModeButton(video);
}

function setupVideoPlayerAnalytics(video) {
    let watchTime = 0;
    let lastTime = 0;
    
    video.addEventListener('timeupdate', () => {
        if (!video.paused) {
            watchTime += video.currentTime - lastTime;
        }
        lastTime = video.currentTime;
        
        // Track watch milestones
        const progress = (video.currentTime / video.duration) * 100;
        trackWatchMilestones(progress);
    });
    
    // Send analytics on page unload
    window.addEventListener('beforeunload', () => {
        if (watchTime > 0) {
            sendVideoAnalytics(video, watchTime);
        }
    });
}

function createCustomVideoControls(video) {
    const playerContainer = video.parentElement;
    
    const customControls = document.createElement('div');
    customControls.className = 'custom-video-controls';
    customControls.innerHTML = `
        <div class="video-controls-overlay">
            <div class="video-controls-top">
                <div class="video-title-overlay">${getVideoTitle()}</div>
                <div class="video-controls-actions">
                    <button class="control-btn pip-btn" title="Picture in Picture">
                        <i class="fas fa-external-link-alt"></i>
                    </button>
                    <button class="control-btn theater-btn" title="Theater Mode">
                        <i class="fas fa-expand"></i>
                    </button>
                </div>
            </div>
            <div class="video-controls-bottom">
                <div class="video-progress-container">
                    <div class="video-progress-bar">
                        <div class="video-progress-filled"></div>
                        <div class="video-progress-handle"></div>
                    </div>
                </div>
                <div class="video-controls-main">
                    <div class="video-controls-left">
                        <button class="control-btn play-pause-btn">
                            <i class="fas fa-play"></i>
                        </button>
                        <div class="volume-control">
                            <button class="control-btn volume-btn">
                                <i class="fas fa-volume-up"></i>
                            </button>
                            <div class="volume-slider">
                                <input type="range" min="0" max="1" step="0.1" value="1">
                            </div>
                        </div>
                        <div class="time-display">
                            <span class="current-time">0:00</span>
                            <span class="time-separator">/</span>
                            <span class="total-time">0:00</span>
                        </div>
                    </div>
                    <div class="video-controls-right">
                        <div class="playback-speed">
                            <select class="speed-select">
                                <option value="0.5">0.5x</option>
                                <option value="0.75">0.75x</option>
                                <option value="1" selected>1x</option>
                                <option value="1.25">1.25x</option>
                                <option value="1.5">1.5x</option>
                                <option value="2">2x</option>
                            </select>
                        </div>
                        <button class="control-btn fullscreen-btn">
                            <i class="fas fa-expand"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    playerContainer.appendChild(customControls);
    
    // Setup custom controls functionality
    setupCustomControlsEvents(video, customControls);
}

// ===== LIKE SYSTEM =====
function initializeLikeSystem() {
    const likeButtons = document.querySelectorAll('.like-btn, .action-btn[data-action="like"]');
    
    likeButtons.forEach(btn => {
        btn.addEventListener('click', handleLikeClick);
    });
}

async function handleLikeClick(e) {
    e.preventDefault();
    
    const button = e.currentTarget;
    const videoId = button.dataset.videoId || getVideoIdFromUrl();
    
    if (!videoId) {
        showNotification('ID video tidak ditemukan', 'error');
        return;
    }
    
    // Prevent double clicks
    if (button.classList.contains('loading')) return;
    
    // Add loading state
    button.classList.add('loading');
    const originalIcon = button.querySelector('i').className;
    button.querySelector('i').className = 'fas fa-spinner fa-spin';
    
    try {
        const response = await fetch(`/video/${videoId}/like`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Update like count
            const likeCount = button.querySelector('.like-count, #likesCount');
            if (likeCount) {
                animateNumberChange(likeCount, result.likes);
            }
            
            // Add liked state
            button.classList.add('liked');
            button.querySelector('i').className = 'fas fa-heart';
            
            // Heart animation
            createHeartAnimation(button);
            
            // Show success notification
            showNotification('Video disukai! ❤️', 'success');
            
            // Track analytics
            trackVideoEvent('like');
            
        } else {
            throw new Error(result.message || 'Gagal memberikan like');
        }
        
    } catch (error) {
        console.error('Like error:', error);
        showNotification('Gagal memberikan like', 'error');
        
        // Restore original icon
        button.querySelector('i').className = originalIcon;
        
    } finally {
        button.classList.remove('loading');
    }
}

function createHeartAnimation(button) {
    const heart = document.createElement('div');
    heart.className = 'floating-heart';
    heart.innerHTML = '<i class="fas fa-heart"></i>';
    
    // Position relative to button
    const rect = button.getBoundingClientRect();
    heart.style.left = rect.left + rect.width/2 + 'px';
    heart.style.top = rect.top + rect.height/2 + 'px';
    
    document.body.appendChild(heart);
    
    // Animate and remove
    setTimeout(() => heart.remove(), 2000);
}

// ===== SHARE SYSTEM =====
function initializeShareSystem() {
    const shareButtons = document.querySelectorAll('.share-btn, .action-btn[data-action="share"]');
    
    shareButtons.forEach(btn => {
        btn.addEventListener('click', handleShareClick);
    });
}

async function handleShareClick(e) {
    e.preventDefault();
    
    const videoTitle = getVideoTitle();
    const videoUrl = window.location.href;
    const videoDescription = getVideoDescription();
    
    // Try native Web Share API first
    if (navigator.share) {
        try {
            await navigator.share({
                title: videoTitle,
                text: videoDescription,
                url: videoUrl
            });
            
            trackVideoEvent('share_native');
            showNotification('Video dibagikan!', 'success');
            return;
            
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Share error:', error);
            }
        }
    }
    
    // Fallback to custom share modal
    showShareModal(videoTitle, videoUrl, videoDescription);
}

function showShareModal(title, url, description) {
    const modal = createShareModal(title, url, description);
    document.body.appendChild(modal);
    
    // Show modal
    setTimeout(() => modal.classList.add('active'), 10);
    
    // Setup event listeners
    setupShareModalEvents(modal, url);
}

function createShareModal(title, url, description) {
    const modal = document.createElement('div');
    modal.className = 'share-modal';
    modal.innerHTML = `
        <div class="share-modal-overlay"></div>
        <div class="share-modal-content">
            <div class="share-modal-header">
                <h3>Bagikan Video</h3>
                <button class="share-modal-close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="share-modal-body">
                <div class="share-url-section">
                    <label>Link Video:</label>
                    <div class="share-url-container">
                        <input type="text" value="${url}" readonly class="share-url-input">
                        <button class="copy-url-btn" title="Salin Link">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                </div>
                <div class="share-social-section">
                    <label>Bagikan ke:</label>
                    <div class="share-social-buttons">
                        <button class="social-btn whatsapp-btn" data-platform="whatsapp">
                            <i class="fab fa-whatsapp"></i>
                            <span>WhatsApp</span>
                        </button>
                        <button class="social-btn facebook-btn" data-platform="facebook">
                            <i class="fab fa-facebook"></i>
                            <span>Facebook</span>
                        </button>
                        <button class="social-btn twitter-btn" data-platform="twitter">
                            <i class="fab fa-twitter"></i>
                            <span>Twitter</span>
                        </button>
                        <button class="social-btn telegram-btn" data-platform="telegram">
                            <i class="fab fa-telegram"></i>
                            <span>Telegram</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    return modal;
}

// ===== LAZY LOADING =====
function initializeLazyLoading() {
    if (!('IntersectionObserver' in window)) {
        // Fallback for older browsers
        loadAllImages();
        return;
    }
    
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                loadImage(img);
                imageObserver.unobserve(img);
            }
        });
    }, {
        rootMargin: '50px 0px',
        threshold: 0.01
    });
    
    // Observe all lazy images
    document.querySelectorAll('img[loading="lazy"]').forEach(img => {
        imageObserver.observe(img);
    });
}

function loadImage(img) {
    return new Promise((resolve, reject) => {
        const imageLoader = new Image();
        
        imageLoader.onload = () => {
            // Update src and remove lazy class
            img.src = imageLoader.src;
            img.classList.remove('lazy');
            img.classList.add('loaded');
            resolve();
        };
        
        imageLoader.onerror = () => {
            // Load fallback image
            img.src = '/images/default-thumbnail.jpg';
            img.classList.add('error');
            reject();
        };
        
        // Start loading
        imageLoader.src = img.dataset.src || img.src;
    });
}

// ===== KEYBOARD SHORTCUTS =====
function initializeKeyboardShortcuts() {
    document.addEventListener('keydown', handleGlobalKeydown);
    
    // Show shortcuts help on first visit
    if (!localStorage.getItem('shortcutsShown')) {
        setTimeout(() => {
            showKeyboardShortcuts();
            localStorage.setItem('shortcutsShown', 'true');
        }, 3000);
    }
}

function handleGlobalKeydown(e) {
    // Don't trigger shortcuts when typing in inputs
    if (e.target.matches('input, textarea, select')) {
        return;
    }
    
    const video = document.getElementById('videoPlayer');
    
    switch(e.key.toLowerCase()) {
        case '/':
            e.preventDefault();
            focusSearch();
            break;
            
        case 'h':
            window.location.href = '/';
            break;
            
        case '?':
            e.preventDefault();
            showKeyboardShortcuts();
            break;
            
        case 'escape':
            closeModals();
            break;
            
        // Video controls (only if video player exists)
        case ' ':
        case 'k':
            if (video) {
                e.preventDefault();
                toggleVideoPlayback(video);
            }
            break;
            
        case 'arrowleft':
            if (video) {
                e.preventDefault();
                skipVideo(video, -10);
            }
            break;
            
        case 'arrowright':
            if (video) {
                e.preventDefault();
                skipVideo(video, 10);
            }
            break;
            
        case 'arrowup':
            if (video) {
                e.preventDefault();
                adjustVolume(video, 0.1);
            }
            break;
            
        case 'arrowdown':
            if (video) {
                e.preventDefault();
                adjustVolume(video, -0.1);
            }
            break;
            
        case 'm':
            if (video) {
                e.preventDefault();
                toggleMute(video);
            }
            break;
            
        case 'f':
            if (video) {
                e.preventDefault();
                toggleFullscreen(video);
            }
            break;
    }
}

// ===== NOTIFICATIONS SYSTEM =====
function showNotification(message, type = 'info', duration = 3000) {
    const notification = createNotification(message, type);
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Auto hide
    setTimeout(() => {
        hideNotification(notification);
    }, duration);
    
    return notification;
}

function createNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${icons[type] || icons.info}"></i>
            <span class="notification-message">${message}</span>
            <button class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    // Close button functionality
    notification.querySelector('.notification-close').addEventListener('click', () => {
        hideNotification(notification);
    });
    
    return notification;
}

function hideNotification(notification) {
    notification.classList.add('hiding');
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 300);
}

// ===== UTILITY FUNCTIONS =====
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function animateNumberChange(element, newValue) {
    const currentValue = parseInt(element.textContent) || 0;
    const difference = newValue - currentValue;
    const steps = 20;
    const stepValue = difference / steps;
    let currentStep = 0;
    
    const animation = setInterval(() => {
        currentStep++;
        const displayValue = Math.round(currentValue + (stepValue * currentStep));
        element.textContent = displayValue.toLocaleString();
        
        if (currentStep >= steps) {
            clearInterval(animation);
            element.textContent = newValue.toLocaleString();
        }
    }, 50);
}

// ===== HELPER FUNCTIONS =====
function getVideoIdFromUrl() {
    const path = window.location.pathname;
    const match = path.match(/\/video\/(\d+)/);
    return match ? match[1] : null;
}

function getVideoTitle() {
    const titleElement = document.querySelector('.video-title, h1');
    return titleElement ? titleElement.textContent.trim() : 'ShortVideo';
}

function getVideoDescription() {
    const descElement = document.querySelector('.video-description p, meta[name="description"]');
    return descElement ? descElement.textContent.trim() : '';
}

function focusSearch() {
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.focus();
        searchInput.select();
    }
}

function closeModals() {
    const modals = document.querySelectorAll('.modal, .share-modal, .shortcuts-modal');
    modals.forEach(modal => {
        if (modal.classList.contains('active') || modal.classList.contains('show')) {
            modal.remove();
        }
    });
}

// ===== ANALYTICS TRACKING =====
function trackVideoClick(videoId) {
    console.log('🎯 Video clicked:', videoId);
    // You can send analytics to your backend here
    // Example: sendAnalytics('video_click', { videoId });
}

function trackVideoImpression(videoId) {
    console.log('👁️ Video impression:', videoId);
    // Track when video comes into view
    // Example: sendAnalytics('video_impression', { videoId });
}

function trackVideoEvent(eventType, data = {}) {
    console.log('📊 Video event:', eventType, data);
    // Track video events like play, pause, etc.
    // Example: sendAnalytics('video_event', { eventType, ...data });
}

function trackWatchMilestones(progress) {
    const milestones = [25, 50, 75, 100];
    
    milestones.forEach(milestone => {
        if (progress >= milestone && !window[`milestone_${milestone}_tracked`]) {
            window[`milestone_${milestone}_tracked`] = true;
            console.log(`🎯 Watch milestone: ${milestone}%`);
            // Track watch progress milestones
            // Example: sendAnalytics('watch_milestone', { milestone });
        }
    });
}

function sendVideoAnalytics(video, watchTime) {
    const analytics = {
        videoId: getVideoIdFromUrl(),
        duration: video.duration,
        watchTime: watchTime,
        completionRate: (watchTime / video.duration) * 100,
        timestamp: new Date().toISOString()
    };
    
    console.log('📈 Sending video analytics:', analytics);
    // Send to your analytics endpoint
    // Example: fetch('/api/analytics', { method: 'POST', body: JSON.stringify(analytics) });
}

// ===== PERFORMANCE OPTIMIZATIONS =====
function initializePerformanceOptimizations() {
    // Preload critical resources
    preloadCriticalResources();
    
    // Optimize images
    optimizeImages();
    
    // Setup intersection observers for performance
    setupPerformanceObservers();
    
    // Memory management
    setupMemoryManagement();
}

function preloadCriticalResources() {
    // Preload important fonts
    const fontLink = document.createElement('link');
    fontLink.rel = 'preload';
    fontLink.as = 'font';
    fontLink.type = 'font/woff2';
    fontLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.woff2';
    fontLink.crossOrigin = 'anonymous';
    document.head.appendChild(fontLink);
    
    // Preload next page if pagination exists
    const nextPageLink = document.querySelector('a[href*="page="]');
    if (nextPageLink) {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = nextPageLink.href;
        document.head.appendChild(link);
    }
}

function optimizeImages() {
    // Add loading="lazy" to images that don't have it
    const images = document.querySelectorAll('img:not([loading])');
    images.forEach(img => {
        if (!isImageInViewport(img)) {
            img.loading = 'lazy';
        }
    });
}

function isImageInViewport(img) {
    const rect = img.getBoundingClientRect();
    return rect.top < window.innerHeight && rect.bottom > 0;
}

function setupPerformanceObservers() {
    // Monitor layout shifts
    if ('LayoutShift' in window) {
        new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (!entry.hadRecentInput) {
                    console.log('⚠️ Layout shift detected:', entry.value);
                }
            }
        }).observe({ entryTypes: ['layout-shift'] });
    }
    
    // Monitor long tasks
    if ('PerformanceObserver' in window) {
        try {
            new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    console.log('⏱️ Long task detected:', entry.duration);
                }
            }).observe({ entryTypes: ['longtask'] });
        } catch (e) {
            // Long task API not supported
        }
    }
}

function setupMemoryManagement() {
    // Clean up event listeners on page unload
    window.addEventListener('beforeunload', () => {
        // Remove all event listeners
        const elements = document.querySelectorAll('*');
        elements.forEach(el => {
            const clone = el.cloneNode(true);
            if (el.parentNode) {
                el.parentNode.replaceChild(clone, el);
            }
        });
    });
    
    // Periodic cleanup
    setInterval(() => {
        // Clean up expired cache entries
        cleanupCache();
    }, 300000); // Every 5 minutes
}

function cleanupCache() {
    // Clean up search cache
    if (searchCache.size > 50) {
        const entries = Array.from(searchCache.entries());
        const toDelete = entries.slice(0, entries.length - 25);
        toDelete.forEach(([key]) => searchCache.delete(key));
    }
}

// ===== RESPONSIVE FEATURES =====
function initializeResponsiveFeatures() {
    // Mobile-specific optimizations
    if (window.innerWidth <= 768) {
        optimizeForMobile();
    }
    
    // Handle orientation changes
    window.addEventListener('orientationchange', handleOrientationChange);
    
    // Responsive video player
    setupResponsiveVideoPlayer();
    
    // Touch gestures
    setupTouchGestures();
}

function optimizeForMobile() {
    // Reduce animation complexity on mobile
    document.body.classList.add('mobile-optimized');
    
    // Optimize scroll performance
    document.addEventListener('touchstart', () => {}, { passive: true });
    document.addEventListener('touchmove', () => {}, { passive: true });
    
    // Prevent zoom on double tap for video controls
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
        const now = new Date().getTime();
        if (now - lastTouchEnd <= 300) {
            e.preventDefault();
        }
        lastTouchEnd = now;
    }, false);
}

function handleOrientationChange() {
    setTimeout(() => {
        // Recalculate layouts after orientation change
        window.dispatchEvent(new Event('resize'));
        
        // Adjust video player if in fullscreen
        const video = document.getElementById('videoPlayer');
        if (video && document.fullscreenElement) {
            adjustVideoForOrientation(video);
        }
    }, 100);
}

function setupResponsiveVideoPlayer() {
    const video = document.getElementById('videoPlayer');
    if (!video) return;
    
    // Responsive aspect ratio
    const updateVideoSize = () => {
        const container = video.parentElement;
        const containerWidth = container.offsetWidth;
        const aspectRatio = 16 / 9;
        
        if (window.innerWidth <= 768) {
            // Mobile: use full width
            video.style.width = '100%';
            video.style.height = 'auto';
        } else {
            // Desktop: maintain aspect ratio
            const maxHeight = window.innerHeight * 0.7;
            const calculatedHeight = containerWidth / aspectRatio;
            
            if (calculatedHeight > maxHeight) {
                video.style.height = maxHeight + 'px';
                video.style.width = (maxHeight * aspectRatio) + 'px';
            } else {
                video.style.width = '100%';
                video.style.height = 'auto';
            }
        }
    };
    
    updateVideoSize();
    window.addEventListener('resize', debounce(updateVideoSize, 250));
}

function setupTouchGestures() {
    const video = document.getElementById('videoPlayer');
    if (!video) return;
    
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;
    
    video.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
    });
    
    video.addEventListener('touchend', (e) => {
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const touchEndTime = Date.now();
        
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;
        const deltaTime = touchEndTime - touchStartTime;
        
        // Swipe gestures
        if (Math.abs(deltaX) > 50 && deltaTime < 300) {
            if (deltaX > 0) {
                // Swipe right - seek forward
                skipVideo(video, 10);
                showSeekIndicator('+10s');
            } else {
                // Swipe left - seek backward
                skipVideo(video, -10);
                showSeekIndicator('-10s');
            }
        }
        
        // Tap to play/pause
        if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10 && deltaTime < 300) {
            toggleVideoPlayback(video);
        }
    });
    
    // Double tap for fullscreen
    let lastTap = 0;
    video.addEventListener('touchend', (e) => {
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTap;
        
        if (tapLength < 500 && tapLength > 0) {
            // Double tap detected
            e.preventDefault();
            toggleFullscreen(video);
        }
        lastTap = currentTime;
    });
}

// ===== VIDEO PLAYER HELPER FUNCTIONS =====
function toggleVideoPlayback(video) {
    if (video.paused) {
        video.play();
    } else {
        video.pause();
    }
}

function skipVideo(video, seconds) {
    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
}

function adjustVolume(video, delta) {
    video.volume = Math.max(0, Math.min(1, video.volume + delta));
}

function toggleMute(video) {
    video.muted = !video.muted;
}

function toggleFullscreen(video) {
    if (!document.fullscreenElement) {
        video.requestFullscreen().catch(err => {
            console.error('Error entering fullscreen:', err);
        });
    } else {
        document.exitFullscreen();
    }
}

function showSeekIndicator(text) {
    const indicator = document.createElement('div');
    indicator.className = 'seek-indicator';
    indicator.textContent = text;
    
    const video = document.getElementById('videoPlayer');
    if (video && video.parentElement) {
        video.parentElement.appendChild(indicator);
        
        setTimeout(() => {
            indicator.remove();
        }, 1000);
    }
}

// ===== ADDITIONAL UI ENHANCEMENTS =====
function initializeAnimations() {
    // Smooth page transitions
    setupPageTransitions();
    
    // Parallax scrolling for hero section
    setupParallaxScrolling();
    
    // Animate elements on scroll
    setupScrollAnimations();
}

function setupPageTransitions() {
    // Add page transition class on link clicks
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a[href^="/"]');
        if (link && !e.ctrlKey && !e.metaKey) {
            document.body.classList.add('page-transitioning');
        }
    });
}

function setupParallaxScrolling() {
    const hero = document.querySelector('.hero');
    if (!hero) return;
    
    window.addEventListener('scroll', throttle(() => {
        const scrolled = window.pageYOffset;
        const rate = scrolled * -0.5;
        hero.style.transform = `translateY(${rate}px)`;
    }, 10));
}

function setupScrollAnimations() {
    const animateElements = document.querySelectorAll('.video-card, .trending-card');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    
    animateElements.forEach(el => observer.observe(el));
}

function initializeTooltips() {
    // Enhanced tooltip system
    const tooltipElements = document.querySelectorAll('[title], [data-tooltip]');
    
    tooltipElements.forEach(element => {
        const tooltipText = element.getAttribute('data-tooltip') || element.getAttribute('title');
        if (!tooltipText) return;
        
        // Remove default title to prevent browser tooltip
        element.removeAttribute('title');
        
        let tooltip = null;
        
        element.addEventListener('mouseenter', (e) => {
            tooltip = createTooltip(tooltipText);
            document.body.appendChild(tooltip);
            positionTooltip(tooltip, element);
        });
        
        element.addEventListener('mouseleave', () => {
            if (tooltip) {
                tooltip.remove();
                tooltip = null;
            }
        });
        
        element.addEventListener('focus', (e) => {
            if (!tooltip) {
                tooltip = createTooltip(tooltipText);
                document.body.appendChild(tooltip);
                positionTooltip(tooltip, element);
            }
        });
        
        element.addEventListener('blur', () => {
            if (tooltip) {
                tooltip.remove();
                tooltip = null;
            }
        });
    });
}

function createTooltip(text) {
    const tooltip = document.createElement('div');
    tooltip.className = 'custom-tooltip';
    tooltip.textContent = text;
    return tooltip;
}

function positionTooltip(tooltip, element) {
    const rect = element.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    
    let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
    let top = rect.top - tooltipRect.height - 8;
    
    // Adjust if tooltip goes off screen
    if (left < 10) left = 10;
    if (left + tooltipRect.width > window.innerWidth - 10) {
        left = window.innerWidth - tooltipRect.width - 10;
    }
    if (top < 10) {
        top = rect.bottom + 8;
        tooltip.classList.add('bottom');
    }
    
    tooltip.style.left = left + window.scrollX + 'px';
    tooltip.style.top = top + window.scrollY + 'px';
}

// ===== KEYBOARD SHORTCUTS MODAL =====
function showKeyboardShortcuts() {
    const modal = createKeyboardShortcutsModal();
    document.body.appendChild(modal);
    
    setTimeout(() => modal.classList.add('active'), 10);
    
    // Close events
    const closeBtn = modal.querySelector('.shortcuts-close');
    const overlay = modal.querySelector('.shortcuts-overlay');
    
    closeBtn.addEventListener('click', () => hideShortcutsModal(modal));
    overlay.addEventListener('click', () => hideShortcutsModal(modal));
    
    // Close on escape
    const escapeHandler = (e) => {
        if (e.key === 'Escape') {
            hideShortcutsModal(modal);
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);
}

function createKeyboardShortcutsModal() {
    const modal = document.createElement('div');
    modal.className = 'shortcuts-modal';
    modal.innerHTML = `
        <div class="shortcuts-overlay"></div>
        <div class="shortcuts-content">
            <div class="shortcuts-header">
                <h3><i class="fas fa-keyboard"></i> Keyboard Shortcuts</h3>
                <button class="shortcuts-close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="shortcuts-body">
                <div class="shortcuts-section">
                    <h4>Navigasi</h4>
                    <div class="shortcut-list">
                        <div class="shortcut-item">
                            <kbd>/</kbd>
                            <span>Fokus ke pencarian</span>
                        </div>
                        <div class="shortcut-item">
                            <kbd>h</kbd>
                            <span>Kembali ke beranda</span>
                        </div>
                        <div class="shortcut-item">
                            <kbd>Esc</kbd>
                            <span>Tutup modal/dialog</span>
                        </div>
                        <div class="shortcut-item">
                            <kbd>?</kbd>
                            <span>Tampilkan bantuan ini</span>
                        </div>
                    </div>
                </div>
                <div class="shortcuts-section">
                    <h4>Video Player</h4>
                    <div class="shortcut-list">
                        <div class="shortcut-item">
                            <kbd>Space</kbd> / <kbd>k</kbd>
                            <span>Play/Pause</span>
                        </div>
                        <div class="shortcut-item">
                            <kbd>←</kbd> / <kbd>→</kbd>
                            <span>Mundur/Maju 10 detik</span>
                        </div>
                        <div class="shortcut-item">
                            <kbd>↑</kbd> / <kbd>↓</kbd>
                            <span>Volume naik/turun</span>
                        </div>
                        <div class="shortcut-item">
                            <kbd>m</kbd>
                            <span>Mute/Unmute</span>
                        </div>
                        <div class="shortcut-item">
                            <kbd>f</kbd>
                            <span>Toggle Fullscreen</span>
                        </div>
                    </div>
                </div>
                <div class="shortcuts-section">
                    <h4>Mobile Gestures</h4>
                    <div class="shortcut-list">
                        <div class="shortcut-item">
                            <span class="gesture">Tap</span>
                            <span>Play/Pause</span>
                        </div>
                        <div class="shortcut-item">
                            <span class="gesture">Double Tap</span>
                            <span>Fullscreen</span>
                        </div>
                        <div class="shortcut-item">
                            <span class="gesture">Swipe Right</span>
                            <span>Maju 10 detik</span>
                        </div>
                        <div class="shortcut-item">
                            <span class="gesture">Swipe Left</span>
                            <span>Mundur 10 detik</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    return modal;
}

function hideShortcutsModal(modal) {
    modal.classList.remove('active');
    setTimeout(() => {
        if (modal.parentNode) {
            modal.remove();
        }
    }, 300);
}

// ===== INITIALIZATION COMPLETION =====
console.log('🎬 ShortVideo JavaScript Loaded Successfully!');

// Add custom styles for new components
const customStyles = `
    .custom-tooltip {
        position: absolute;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 0.875rem;
        white-space: nowrap;
        z-index: 10000;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.3s ease;
        animation: tooltipFadeIn 0.3s ease forwards;
    }
    
    .custom-tooltip.bottom::before {
        content: '';
        position: absolute;
        top: -5px;
        left: 50%;
        transform: translateX(-50%);
        border-left: 5px solid transparent;
        border-right: 5px solid transparent;
        border-bottom: 5px solid rgba(0, 0, 0, 0.9);
    }
    
    .custom-tooltip::before {
        content: '';
        position: absolute;
        bottom: -5px;
        left: 50%;
        transform: translateX(-50%);
        border-left: 5px solid transparent;
        border-right: 5px solid transparent;
        border-top: 5px solid rgba(0, 0, 0, 0.9);
    }
    
    @keyframes tooltipFadeIn {
        from { opacity: 0; transform: translateY(-5px); }
        to { opacity: 1; transform: translateY(0); }
    }
    
    .floating-heart {
        position: fixed;
        pointer-events: none;
        z-index: 10000;
        color: #ef4444;
        font-size: 1.5rem;
        animation: floatHeart 2s ease-out forwards;
    }
    
    @keyframes floatHeart {
        0% {
            opacity: 1;
            transform: translateY(0) scale(1);
        }
        100% {
            opacity: 0;
            transform: translateY(-100px) scale(1.5);
        }
    }
    
    .seek-indicator {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 1.125rem;
        font-weight: 600;
        z-index: 1000;
        animation: seekIndicator 1s ease-out forwards;
    }
    
    @keyframes seekIndicator {
        0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
        20% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
        80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        100% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
    }
    
    .notification {
        position: fixed;
        top: 20px;
        right: -400px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        z-index: 10000;
        min-width: 300px;
        max-width: 400px;
        transition: all 0.3s ease;
    }
    
    .notification.show {
        right: 20px;
    }
    
    .notification.hiding {
        right: -400px;
        opacity: 0;
    }
    
    .notification-success {
        border-left: 4px solid #22c55e;
    }
    
    .notification-error {
        border-left: 4px solid #ef4444;
    }
    
    .notification-warning {
        border-left: 4px solid #f59e0b;
    }
    
    .notification-info {
        border-left: 4px solid #6366f1;
    }
    
    .notification-content {
        display: flex;
        align-items: center;
        padding: 16px;
        color: #1e293b;
    }
    
    .notification-content i {
        margin-right: 12px;
        font-size: 1.25rem;
    }
    
    .notification-success .notification-content i { color: #22c55e; }
    .notification-error .notification-content i { color: #ef4444; }
    .notification-warning .notification-content i { color: #f59e0b; }
    .notification-info .notification-content i { color: #6366f1; }
    
    .notification-message {
        flex: 1;
        font-weight: 500;
    }
    
    .notification-close {
        background: none;
        border: none;
        color: #64748b;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        transition: all 0.3s ease;
        margin-left: 12px;
    }
    
    .notification-close:hover {
        background: #f1f5f9;
        color: #1e293b;
    }
    
    .shortcuts-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s ease;
    }
    
    .shortcuts-modal.active {
        opacity: 1;
        visibility: visible;
    }
    
    .shortcuts-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(5px);
    }
    
    .shortcuts-content {
        background: var(--dark-surface);
        border-radius: 16px;
        max-width: 600px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        position: relative;
        z-index: 1;
        border: 1px solid rgba(255, 255, 255, 0.1);
        transform: scale(0.9);
        transition: transform 0.3s ease;
    }
    
    .shortcuts-modal.active .shortcuts-content {
        transform: scale(1);
    }
    
    .shortcuts-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 24px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .shortcuts-header h3 {
        margin: 0;
        color: var(--dark-text);
        display: flex;
        align-items: center;
        gap: 12px;
    }
    
    .shortcuts-close {
        background: none;
        border: none;
        color: var(--dark-text-secondary);
        font-size: 1.25rem;
        cursor: pointer;
        padding: 8px;
        border-radius: 8px;
        transition: all 0.3s ease;
    }
    
    .shortcuts-close:hover {
        color: var(--dark-text);
        background: rgba(255, 255, 255, 0.1);
    }
    
    .shortcuts-body {
        padding: 24px;
    }
    
    .shortcuts-section {
        margin-bottom: 32px;
    }
    
    .shortcuts-section:last-child {
        margin-bottom: 0;
    }
    
    .shortcuts-section h4 {
        color: var(--primary-color);
        font-size: 1.125rem;
        font-weight: 600;
        margin-bottom: 16px;
        display: flex;
        align-items: center;
        gap: 8px;
    }
    
    .shortcut-list {
        display: grid;
        gap: 12px;
    }
    
    .shortcut-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 0;
        color: var(--dark-text-secondary);
    }
    
    .shortcut-item kbd {
        background: var(--dark-card);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 6px;
        padding: 6px 12px;
        font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
        font-size: 0.875rem;
        color: var(--dark-text);
        min-width: 60px;
        text-align: center;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    
    .shortcut-item .gesture {
        background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
        color: white;
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 0.875rem;
        font-weight: 500;
        min-width: 100px;
        text-align: center;
    }
    
    .search-dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: var(--dark-surface);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        margin-top: 8px;
        overflow: hidden;
        z-index: 1000;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        animation: dropdownSlideDown 0.3s ease;
    }
    
    @keyframes dropdownSlideDown {
        from {
            opacity: 0;
            transform: translateY(-10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .search-dropdown-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        background: rgba(255, 255, 255, 0.05);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        color: var(--dark-text-secondary);
        font-size: 0.875rem;
        font-weight: 500;
    }
    
    .clear-history-btn:hover {
        background: rgba(239, 68, 68, 0.1);
    }
    
    .search-dropdown-items {
        max-height: 300px;
        overflow-y: auto;
    }
    
    .search-dropdown-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        color: var(--dark-text);
        cursor: pointer;
        transition: all 0.3s ease;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }
    
    .search-dropdown-item:last-child {
        border-bottom: none;
    }
    
    .search-dropdown-item:hover {
        background: rgba(255, 255, 255, 0.05);
        color: var(--primary-color);
    }
    
    .search-dropdown-item i {
        color: var(--dark-text-secondary);
        font-size: 0.875rem;
        width: 16px;
        text-align: center;
    }
    
    .search-dropdown-item:hover i {
        color: var(--primary-color);
    }
    
    .navbar.scrolled {
        background: rgba(15, 23, 42, 0.98);
        backdrop-filter: blur(20px);
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    
    .mobile-optimized * {
        transform: translateZ(0);
        backface-visibility: hidden;
    }
    
    .page-transitioning {
        opacity: 0.8;
        transition: opacity 0.3s ease;
    }
    
    .animate-in {
        animation: slideInUp 0.6s ease-out;
    }
    
    @keyframes slideInUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .video-card:nth-child(odd) .animate-in {
        animation-delay: 0.1s;
    }
    
    .video-card:nth-child(even) .animate-in {
        animation-delay: 0.2s;
    }
    
    .like-btn.loading i {
        animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    
    .like-btn.liked {
        background: var(--danger-color) !important;
        color: white !important;
        transform: scale(1.05);
    }
    
    .like-btn.liked i {
        animation: heartBeat 0.6s ease;
    }
    
    @keyframes heartBeat {
        0%, 100% { transform: scale(1); }
        25% { transform: scale(1.2); }
        50% { transform: scale(1.1); }
        75% { transform: scale(1.15); }
    }
    
    .search-input-container.focused {
        transform: scale(1.02);
        box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.2);
    }
    
    .nav-search {
        position: relative;
    }
    
    @media (max-width: 768px) {
        .shortcuts-content {
            width: 95%;
            margin: 20px;
        }
        
        .shortcuts-body {
            padding: 16px;
        }
        
        .shortcuts-section {
            margin-bottom: 24px;
        }
        
        .shortcut-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
        }
        
        .shortcut-item kbd,
        .shortcut-item .gesture {
            align-self: flex-end;
        }
        
        .notification {
            left: 10px;
            right: 10px;
            min-width: auto;
            max-width: none;
        }
        
        .notification.show {
            right: 10px;
        }
        
        .notification.hiding {
            right: 10px;
            transform: translateY(-100px);
        }
        
        .search-dropdown {
            position: fixed;
            left: 10px;
            right: 10px;
            top: auto;
            margin-top: 0;
        }
    }
    
    @media (prefers-reduced-motion: reduce) {
        *,
        *::before,
        *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
        }
    }
    
    .custom-video-controls {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        pointer-events: none;
        z-index: 10;
    }
    
    .video-controls-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(
            to bottom,
            rgba(0, 0, 0, 0.7) 0%,
            transparent 20%,
            transparent 80%,
            rgba(0, 0, 0, 0.8) 100%
        );
        opacity: 0;
        transition: opacity 0.3s ease;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: 20px;
    }
    
    .custom-video-controls:hover .video-controls-overlay,
    .custom-video-controls.active .video-controls-overlay {
        opacity: 1;
        pointer-events: all;
    }
    
    .video-controls-top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
    }
    
    .video-title-overlay {
        color: white;
        font-size: 1.125rem;
        font-weight: 600;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
        flex: 1;
        margin-right: 20px;
    }
    
    .video-controls-actions {
        display: flex;
        gap: 12px;
    }
    
    .control-btn {
        background: rgba(0, 0, 0, 0.5);
        border: none;
        color: white;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.3s ease;
        backdrop-filter: blur(10px);
    }
    
    .control-btn:hover {
        background: rgba(0, 0, 0, 0.8);
        transform: scale(1.1);
    }
    
    .video-progress-container {
        margin-bottom: 16px;
    }
    
    .video-progress-bar {
        position: relative;
        height: 6px;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 3px;
        cursor: pointer;
    }
    
    .video-progress-filled {
        height: 100%;
        background: var(--primary-color);
        border-radius: 3px;
        transition: width 0.1s ease;
        width: 0%;
    }
    
    .video-progress-handle {
        position: absolute;
        top: 50%;
        left: 0%;
        transform: translate(-50%, -50%);
        width: 14px;
        height: 14px;
        background: var(--primary-color);
        border-radius: 50%;
        opacity: 0;
        transition: opacity 0.3s ease;
    }
    
    .video-progress-bar:hover .video-progress-handle {
        opacity: 1;
    }
    
    .video-controls-main {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    
    .video-controls-left,
    .video-controls-right {
        display: flex;
        align-items: center;
        gap: 12px;
    }
    
    .volume-control {
        position: relative;
        display: flex;
        align-items: center;
    }
    
    .volume-slider {
        width: 0;
        overflow: hidden;
        transition: width 0.3s ease;
        margin-left: 8px;
    }
    
    .volume-control:hover .volume-slider {
        width: 80px;
    }
    
    .volume-slider input {
        width: 100%;
        height: 4px;
        background: rgba(255, 255, 255, 0.3);
        outline: none;
        border-radius: 2px;
    }
    
    .time-display {
        color: white;
        font-size: 0.875rem;
        font-weight: 500;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        gap: 4px;
    }
    
    .speed-select {
        background: rgba(0, 0, 0, 0.5);
        border: 1px solid rgba(255, 255, 255, 0.3);
        color: white;
        padding: 4px 8px;
        border-radius: 6px;
        font-size: 0.875rem;
        cursor: pointer;
        backdrop-filter: blur(10px);
    }
    
    .speed-select:focus {
        outline: none;
        border-color: var(--primary-color);
    }
    
    /* Loading states */
    .video-loading {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: white;
        font-size: 2rem;
        z-index: 100;
    }
    
    .video-loading i {
        animation: spin 1s linear infinite;
    }
    
    .video-error {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: white;
        text-align: center;
        z-index: 100;
        background: rgba(0, 0, 0, 0.8);
        padding: 20px;
        border-radius: 12px;
        backdrop-filter: blur(10px);
    }
    
    .video-error i {
        font-size: 3rem;
        color: var(--danger-color);
        margin-bottom: 16px;
    }
    
    .video-error h3 {
        margin-bottom: 8px;
        font-size: 1.25rem;
    }
    
    .video-error p {
        color: rgba(255, 255, 255, 0.8);
        font-size: 0.875rem;
    }
`;

// Inject custom styles
const styleSheet = document.createElement('style');
styleSheet.textContent = customStyles;
document.head.appendChild(styleSheet);

// ===== VIDEO HELPER FUNCTIONS =====
function showVideoLoading() {
    const video = document.getElementById('videoPlayer');
    if (!video) return;
    
    hideVideoError(); // Remove any existing error
    
    const loading = document.createElement('div');
    loading.className = 'video-loading';
    loading.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    
    video.parentElement.style.position = 'relative';
    video.parentElement.appendChild(loading);
}

function hideVideoLoading() {
    const loading = document.querySelector('.video-loading');
    if (loading) {
        loading.remove();
    }
}

function showVideoError() {
    const video = document.getElementById('videoPlayer');
    if (!video) return;
    
    hideVideoLoading(); // Remove loading state
    
    const error = document.createElement('div');
    error.className = 'video-error';
    error.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        <h3>Video Tidak Dapat Dimuat</h3>
        <p>Terjadi kesalahan saat memuat video. Silakan coba lagi.</p>
        <button onclick="location.reload()" class="btn btn-primary" style="margin-top: 16px;">
            <i class="fas fa-redo"></i> Coba Lagi
        </button>
    `;
    
    video.parentElement.appendChild(error);
}

function hideVideoError() {
    const error = document.querySelector('.video-error');
    if (error) {
        error.remove();
    }
}

function updateVideoInfo(video) {
    console.log('📹 Video Info:', {
        duration: formatTime(video.duration),
        dimensions: `${video.videoWidth}x${video.videoHeight}`,
        ready: video.readyState
    });
}

function updateVideoProgress(video) {
    const progress = (video.currentTime / video.duration) * 100;
    
    // Update custom progress bar
    const progressBar = document.querySelector('.video-progress-filled');
    const progressHandle = document.querySelector('.video-progress-handle');
    
    if (progressBar) {
        progressBar.style.width = progress + '%';
    }
    
    if (progressHandle) {
        progressHandle.style.left = progress + '%';
    }
    
    // Update time display
    const currentTimeEl = document.querySelector('.current-time');
    const totalTimeEl = document.querySelector('.total-time');
    
    if (currentTimeEl) {
        currentTimeEl.textContent = formatTime(video.currentTime);
    }
    
    if (totalTimeEl && !isNaN(video.duration)) {
        totalTimeEl.textContent = formatTime(video.duration);
    }
}

function updateVolumeDisplay(video) {
    const volumeBtn = document.querySelector('.volume-btn i');
    const volumeSlider = document.querySelector('.volume-slider input');
    
    if (volumeSlider) {
        volumeSlider.value = video.volume;
    }
    
    if (volumeBtn) {
        if (video.muted || video.volume === 0) {
            volumeBtn.className = 'fas fa-volume-mute';
        } else if (video.volume < 0.5) {
            volumeBtn.className = 'fas fa-volume-down';
        } else {
            volumeBtn.className = 'fas fa-volume-up';
        }
    }
}

function setupCustomControlsEvents(video, controls) {
    // Play/pause button
    const playPauseBtn = controls.querySelector('.play-pause-btn');
    if (playPauseBtn) {
        playPauseBtn.addEventListener('click', () => {
            toggleVideoPlayback(video);
            updatePlayPauseButton(video, playPauseBtn);
        });
    }
    
    // Progress bar
    const progressBar = controls.querySelector('.video-progress-bar');
    if (progressBar) {
        progressBar.addEventListener('click', (e) => {
            const rect = progressBar.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            video.currentTime = pos * video.duration;
        });
    }
    
    // Volume controls
    const volumeBtn = controls.querySelector('.volume-btn');
    const volumeSlider = controls.querySelector('.volume-slider input');
    
    if (volumeBtn) {
        volumeBtn.addEventListener('click', () => toggleMute(video));
    }
    
    if (volumeSlider) {
        volumeSlider.addEventListener('input', (e) => {
            video.volume = e.target.value;
        });
    }
    
    // Speed control
    const speedSelect = controls.querySelector('.speed-select');
    if (speedSelect) {
        speedSelect.addEventListener('change', (e) => {
            video.playbackRate = e.target.value;
        });
    }
    
    // Fullscreen button
    const fullscreenBtn = controls.querySelector('.fullscreen-btn');
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', () => toggleFullscreen(video));
    }
    
    // Theater mode button
    const theaterBtn = controls.querySelector('.theater-btn');
    if (theaterBtn) {
        theaterBtn.addEventListener('click', () => toggleTheaterMode(video));
    }
    
    // Picture-in-picture button
    const pipBtn = controls.querySelector('.pip-btn');
    if (pipBtn && document.pictureInPictureEnabled) {
        pipBtn.addEventListener('click', () => togglePictureInPicture(video));
    }
    
    // Show/hide controls
    let controlsTimeout;
    const showControls = () => {
        controls.classList.add('active');
        clearTimeout(controlsTimeout);
        controlsTimeout = setTimeout(() => {
            if (!video.paused) {
                controls.classList.remove('active');
            }
        }, 3000);
    };
    
    video.addEventListener('mousemove', showControls);
    video.addEventListener('mouseenter', showControls);
    video.addEventListener('play', () => {
        updatePlayPauseButton(video, playPauseBtn);
        showControls();
    });
    video.addEventListener('pause', () => {
        updatePlayPauseButton(video, playPauseBtn);
        controls.classList.add('active');
    });
}

function updatePlayPauseButton(video, button) {
    const icon = button.querySelector('i');
    if (video.paused) {
        icon.className = 'fas fa-play';
    } else {
        icon.className = 'fas fa-pause';
    }
}

function toggleTheaterMode(video) {
    const container = video.closest('.video-detail-container');
    if (container) {
        container.classList.toggle('theater-mode');
        
        const theaterBtn = document.querySelector('.theater-btn i');
        if (theaterBtn) {
            if (container.classList.contains('theater-mode')) {
                theaterBtn.className = 'fas fa-compress';
            } else {
                theaterBtn.className = 'fas fa-expand';
            }
        }
    }
}

function togglePictureInPicture(video) {
    if (document.pictureInPictureElement) {
        document.exitPictureInPicture();
    } else {
        video.requestPictureInPicture().catch(err => {
            console.error('Error entering Picture-in-Picture:', err);
            showNotification('Picture-in-Picture tidak didukung', 'error');
        });
    }
}

function preloadVideoMetadata(videoId) {
    // Preload video metadata for smoother experience
    if (!videoId) return;
    
    const cacheKey = `video_metadata_${videoId}`;
    if (sessionStorage.getItem(cacheKey)) return;
    
    // You can fetch video metadata here
    fetch(`/api/video/${videoId}/metadata`)
        .then(response => response.json())
        .then(data => {
            sessionStorage.setItem(cacheKey, JSON.stringify(data));
        })
        .catch(err => {
            console.log('Could not preload metadata:', err);
        });
}

function adjustVideoForOrientation(video) {
    const isLandscape = window.orientation === 90 || window.orientation === -90;
    
    if (isLandscape && document.fullscreenElement) {
        video.style.width = '100vw';
        video.style.height = '100vh';
        video.style.objectFit = 'contain';
    } else {
        video.style.width = '';
        video.style.height = '';
        video.style.objectFit = '';
    }
}

function showVideoEndScreen() {
    const video = document.getElementById('videoPlayer');
    if (!video) return;
    
    const endScreen = document.createElement('div');
    endScreen.className = 'video-end-screen';
    endScreen.innerHTML = `
        <div class="video-end-content">
            <div class="video-end-icon">
                <i class="fas fa-check-circle"></i>
            </div>
            <h3>Video Selesai</h3>
            <p>Terima kasih telah menonton!</p>
            <div class="video-end-actions">
                <button class="btn btn-primary replay-btn">
                    <i class="fas fa-redo"></i>
                    Putar Ulang
                </button>
                <a href="/" class="btn btn-secondary">
                    <i class="fas fa-home"></i>
                    Kembali ke Beranda
                </a>
            </div>
        </div>
    `;
    
    // Style the end screen
    endScreen.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        backdrop-filter: blur(10px);
    `;
    
    video.parentElement.style.position = 'relative';
    video.parentElement.appendChild(endScreen);
    
    // Replay button functionality
    const replayBtn = endScreen.querySelector('.replay-btn');
    replayBtn.addEventListener('click', () => {
        video.currentTime = 0;
        video.play();
        endScreen.remove();
    });
    
    // Auto-remove after 15 seconds
    setTimeout(() => {
        if (endScreen.parentNode) {
            endScreen.remove();
        }
    }, 15000);
}

function addPictureInPictureButton(video) {
    // This function adds PiP button to custom controls
    // Implementation is already in createCustomVideoControls
    console.log('Picture-in-Picture support detected');
}

function addPlaybackSpeedControl(video) {
    // This function adds playback speed control
    // Implementation is already in createCustomVideoControls
    console.log('Playback speed control initialized');
}

function addQualitySelector(video) {
    // Quality selector for multiple video sources
    // This would be implemented if you have multiple quality sources
    console.log('Quality selector initialized');
}

function addTheaterModeButton(video) {
    // Theater mode button
    // Implementation is already in createCustomVideoControls
    console.log('Theater mode button initialized');
}

// Add missing CSS for dropdown selected state
const additionalStyles = `
    .search-dropdown-item.selected {
        background: rgba(99, 102, 241, 0.2) !important;
        color: var(--primary-color) !important;
    }
    
    .search-dropdown-item.selected i {
        color: var(--primary-color) !important;
    }
    
    .share-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s ease;
    }
    
    .share-modal.active {
        opacity: 1;
        visibility: visible;
    }
    
    .share-modal-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(5px);
    }
    
    .share-modal-content {
        background: var(--dark-surface);
        border-radius: 16px;
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        position: relative;
        z-index: 1;
        border: 1px solid rgba(255, 255, 255, 0.1);
        transform: scale(0.9);
        transition: transform 0.3s ease;
    }
    
    .share-modal.active .share-modal-content {
        transform: scale(1);
    }
    
    .share-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 24px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .share-modal-header h3 {
        margin: 0;
        color: var(--dark-text);
    }
    
    .share-modal-close {
        background: none;
        border: none;
        color: var(--dark-text-secondary);
        font-size: 1.25rem;
        cursor: pointer;
        padding: 8px;
        border-radius: 8px;
        transition: all 0.3s ease;
    }
    
    .share-modal-close:hover {
        color: var(--dark-text);
        background: rgba(255, 255, 255, 0.1);
    }
    
    .share-modal-body {
        padding: 24px;
    }
    
    .share-url-section,
    .share-social-section {
        margin-bottom: 24px;
    }
    
    .share-url-section:last-child,
    .share-social-section:last-child {
        margin-bottom: 0;
    }
    
    .share-url-section label,
    .share-social-section label {
        display: block;
        color: var(--dark-text);
        font-weight: 600;
        margin-bottom: 12px;
    }
    
    .share-url-container {
        display: flex;
        gap: 8px;
    }
    
    .share-url-input {
        flex: 1;
        padding: 12px 16px;
        background: var(--dark-card);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        color: var(--dark-text);
        font-size: 0.875rem;
    }
    
    .share-url-input:focus {
        outline: none;
        border-color: var(--primary-color);
    }
    
    .copy-url-btn {
        padding: 12px 16px;
        background: var(--primary-color);
        border: none;
        border-radius: 8px;
        color: white;
        cursor: pointer;
        transition: all 0.3s ease;
        min-width: 50px;
    }
    
    .copy-url-btn:hover {
        background: var(--primary-dark);
    }
    
    .share-social-buttons {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 12px;
    }
    
    .social-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 12px 16px;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.3s ease;
        font-weight: 500;
        text-decoration: none;
        color: white;
    }
    
    .whatsapp-btn {
        background: #25D366;
    }
    
    .facebook-btn {
        background: #1877F2;
    }
    
    .twitter-btn {
        background: #1DA1F2;
    }
    
    .telegram-btn {
        background: #0088CC;
    }
    
    .social-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    }
    
    .search-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
    
    .video-detail-container.theater-mode {
        grid-template-columns: 1fr;
        max-width: 100%;
    }
    
    .video-detail-container.theater-mode .related-videos-section {
        display: none;
    }
    
    .video-detail-container.theater-mode .video-player {
        height: 70vh;
    }
    
    @media (max-width: 768px) {
        .share-modal-content {
            width: 95%;
            margin: 20px;
        }
        
        .share-modal-body {
            padding: 16px;
        }
        
        .share-social-buttons {
            grid-template-columns: 1fr;
        }
        
        .share-url-container {
            flex-direction: column;
        }
    }
`;

// Append additional styles
const additionalStyleSheet = document.createElement('style');
additionalStyleSheet.textContent = additionalStyles;
document.head.appendChild(additionalStyleSheet);
// Ensure all event listeners are properly cleaned up
window.addEventListener('beforeunload', () => {
    // Clean up any remaining timers or listeners
    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }
    
    // Save any important state to localStorage
    const currentVideo = getVideoIdFromUrl();
    if (currentVideo) {
        const video = document.getElementById('videoPlayer');
        if (video && video.currentTime > 0) {
            localStorage.setItem(`video_${currentVideo}_position`, video.currentTime);
        }
    }
});

// Restore video position on page load
window.addEventListener('load', () => {
    const currentVideo = getVideoIdFromUrl();
    if (currentVideo) {
        const savedPosition = localStorage.getItem(`video_${currentVideo}_position`);
        if (savedPosition) {
            const video = document.getElementById('videoPlayer');
            if (video) {
                video.addEventListener('loadedmetadata', () => {
                    video.currentTime = parseFloat(savedPosition);
                    // Remove saved position after restoring
                    localStorage.removeItem(`video_${currentVideo}_position`);
                }, { once: true });
            }
        }
    }
});

// ===== FINAL INITIALIZATION =====
// Ensure all event listeners are properly cleaned up
window.addEventListener('beforeunload', () => {
    // Clean up any remaining timers or listeners
    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }
    
    // Save any important state to localStorage
    const currentVideo = getVideoIdFromUrl();
    if (currentVideo) {
        const video = document.getElementById('videoPlayer');
        if (video && video.currentTime > 0) {
            localStorage.setItem(`video_${currentVideo}_position`, video.currentTime);
        }
    }
});

// Restore video position on page load
window.addEventListener('load', () => {
    const currentVideo = getVideoIdFromUrl();
    if (currentVideo) {
        const savedPosition = localStorage.getItem(`video_${currentVideo}_position`);
        if (savedPosition) {
            const video = document.getElementById('videoPlayer');
            if (video) {
                video.addEventListener('loadedmetadata', () => {
                    video.currentTime = parseFloat(savedPosition);
                    // Remove saved position after restoring
                    localStorage.removeItem(`video_${currentVideo}_position`);
                }, { once: true });
            }
        }
    }
});

// Error handling for missing elements
window.addEventListener('error', (e) => {
    console.error('JavaScript Error:', e.error);
    
    // Show user-friendly error message for critical failures
    if (e.error && e.error.message && e.error.message.includes('not defined')) {
        console.warn('Some features may not work properly. Please refresh the page.');
    }
});

// Service Worker registration (optional for future PWA features)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // You can register a service worker here for offline functionality
        console.log('Service Worker support detected');
    });
}

// Performance monitoring
if ('performance' in window) {
    window.addEventListener('load', () => {
        setTimeout(() => {
            const perfData = performance.getEntriesByType('navigation')[0];
            console.log('📊 Page Load Performance:', {
                loadTime: Math.round(perfData.loadEventEnd - perfData.loadEventStart),
                domContentLoaded: Math.round(perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart),
                totalTime: Math.round(perfData.loadEventEnd - perfData.fetchStart)
            });
        }, 0);
    });
}
