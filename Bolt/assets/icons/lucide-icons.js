/**
 * Lucide Icons for 8va相対音感トレーニングアプリ
 * Vanilla TypeScript implementation
 */

// Lucide icon SVG paths (from https://lucide.dev)
const LUCIDE_ICONS = {
  // Navigation & UI
  users: `<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6M23 11h-6"/>`,
  
  trophy: `<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>`,
  
  settings: `<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>`,
  
  upload: `<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16,6 12,2 8,6"/><line x1="12" y1="2" x2="12" y2="15"/>`,
  
  // Training modes
  zap: `<polygon points="13,2 3,14 12,14 11,22 21,10 12,10"/>`,
  
  target: `<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>`,
  
  // Records page icons - Lucide公式のcrownアイコン
  crown: `<path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294zM5 21h14"/>`,
  
  lock: `<rect x="3" y="11" width="18" height="10" rx="2" ry="2"/><circle cx="12" cy="7" r="4"/>`,
  
  unlock: `<rect x="3" y="11" width="18" height="10" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>`,
  
  'file-chart-column-increasing': `<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14,2 14,8 20,8"/><path d="M12 18v-6"/><path d="M8 18v-2"/><path d="M16 18v-4"/>`,
  
  'share-2': `<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>`,
  
  play: `<polygon points="5,3 19,12 5,21"/>`,
  
  'trending-up': `<polyline points="22,7 13.5,15.5 8.5,10.5 2,17"/><polyline points="16,7 22,7 22,13"/>`,
  
  'trending-down': `<polyline points="22,17 13.5,8.5 8.5,13.5 2,7"/><polyline points="16,17 22,17 22,11"/>`,
  
  activity: `<polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>`,
  
  flame: `<path d="M12 2s3-1 6 2c2 2 1 4 1 4s3-1 3 2-3 4-3 4 3 1 1 4c-1 2-4 2-4 2s-1 3-4 3-4-3-4-3-3 0-4-2c-2-3 1-4 1-4s-3-1-3-4 3-2 3-2 -1-2 1-4c3-3 6-2 6-2z"/>`,
  
  'calendar-days': `<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h0"/><path d="M12 14h0"/><path d="M16 14h0"/><path d="M8 18h0"/><path d="M12 18h0"/>`,
  
  // Evaluation icons
  'thumbs-up': `<path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z"/>`,
  
  check: `<polyline points="20,6 9,17 4,12"/>`,
  
  frown: `<circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>`,
  
  star: `<polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>`,
  
  'check-circle': `<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/>`,
  
  'book-open': `<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>`,
  
  // Statistics & Charts
  'bar-chart-3': `<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>`,
  
  'trending-up': `<polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>`,
  
  // Audio & Media  
  mic: `<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/>`,
  
  'volume-2': `<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>`,
  
  // UI Elements
  'check-circle': `<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/>`,
  
  'users-2': `<path d="M14 19a6 6 0 0 0-12 0"/><circle cx="8" cy="9" r="4"/><path d="M22 19a6 6 0 0 0-6-6 4 4 0 1 0 0-8"/>`,
  
  // Music specific
  'music-note': `<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>`,
  
  'headphones': `<path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>`,
  
  // Progress & Status
  clock: `<circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/>`,
  
  'activity': `<polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>`,
  
  // Additional UI Icons
  'arrow-up': `<line x1="12" y1="19" x2="12" y2="5"/><polyline points="5,12 12,5 19,12"/>`,
  
  'arrow-down': `<line x1="12" y1="5" x2="12" y2="19"/><polyline points="19,12 12,19 5,12"/>`,
  
  'chevron-down': `<polyline points="6,9 12,15 18,9"/>`,
  
  'chevron-up': `<polyline points="18,15 12,9 6,15"/>`,
  
  'play': `<polygon points="5,3 19,12 5,21"/>`,
  
  'pause': `<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>`,
  
  'stop': `<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>`,
  
  'rotate-ccw': `<polyline points="1,4 1,10 7,10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>`,
  
  'home': `<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/>`,
  
  'x': `<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>`,
  
  // Evaluation icons (new for v1.1.0)
  'award': `<circle cx="12" cy="8" r="7"/><polyline points="8.21,13.89 7,23 12,20 17,23 15.79,13.88"/>`,
  
  'thumbs-up': `<path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>`,
  
  'check': `<polyline points="20,6 9,17 4,12"/>`,
  
  'star': `<polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>`,
  
  'book-open': `<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>`,
  
  'frown': `<circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="15.01"/>`,
  'alert-circle': `<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>`,
  'triangle-alert': `<path d="M21.73 18L13.73 4a2 2 0 0 0-3.46 0L2.27 18a2 2 0 0 0 1.73 3h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>`,
  
  // Navigation arrows
  'chevron-left': `<polyline points="15,18 9,12 15,6"/>`,
  'chevron-right': `<polyline points="9,6 15,12 9,18"/>`,
  'arrow-left': `<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12,19 5,12 12,5"/>`,
  'arrow-right': `<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/>`,
  
  // Design & UI
  'palette': `<circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="11.5" r=".5"/><circle cx="12.5" cy="16.5" r=".5"/><circle cx="13.5" cy="13.5" r=".5"/><circle cx="9.5" cy="4.5" r=".5"/><circle cx="11.5" cy="2.5" r=".5"/><path d="M2 12s3.09-6 10-6c7.21 0 10 6 10 6s-3.09 6-10 6C5.09 18 2 12 2 12z"/>`,
};

/**
 * Generate Lucide icon HTML
 * @param {string} name - Icon name
 * @param {string} className - CSS classes
 * @param {number} size - Icon size (default: 24)
 * @param {number} strokeWidth - Stroke width (default: 1.5)
 * @param {string} gradient - Gradient definition (optional)
 * @returns {string} SVG HTML string
 */
function lucideIcon(name, className = 'icon', size = 24, strokeWidth = 1.5, gradient = null) {
  const iconPath = LUCIDE_ICONS[name];
  if (!iconPath) {
    console.warn(`Lucide icon "${name}" not found`);
    return `<div class="${className}" style="width:${size}px;height:${size}px;background:#f00;"></div>`;
  }
  
  // デフォルトで1.5のストロークを使用（より洗練された見た目）
  const finalStrokeWidth = strokeWidth;
  
  // グラデーション定義
  let gradientDef = '';
  let strokeColor = 'currentColor';
  
  if (gradient) {
    const gradientId = `gradient-${name}-${Math.random().toString(36).substr(2, 9)}`;
    gradientDef = `
      <defs>
        <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
          ${gradient}
        </linearGradient>
      </defs>`;
    strokeColor = `url(#${gradientId})`;
  }
  
  // Add xmlns for better compatibility
  return `<svg xmlns="http://www.w3.org/2000/svg" class="${className}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="${finalStrokeWidth}" stroke-linecap="round" stroke-linejoin="round">${gradientDef}${iconPath}</svg>`;
}

/**
 * Replace SVG icons with Lucide icons
 * @param {string} containerSelector - Container to search for icons
 */
function replaceLucideIcons(containerSelector = 'body') {
  const container = document.querySelector(containerSelector);
  if (!container) return;
  
  // Icon mapping for automatic replacement
  const iconMappings = {
    // Users icon pattern
    'M3 14s-1 0-1-1 1-4 6-4': 'users',
    // Trophy icon pattern  
    'M6 9H4.5a2.5 2.5 0 0 1 0-5H6': 'trophy',
    // Settings icon pattern
    'M19.4 15a1.65 1.65 0 0 0 .33 1.82': 'settings',
    // Upload pattern
    'M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8': 'upload',
    // Zap pattern
    'polygon points="13,2 3,14 12,14 11,22 21,10 12,10"': 'zap',
    // Target pattern
    'circle cx="12" cy="12" r="10"': 'target',
    // Check pattern
    'M22 11.08V12a10 10 0 1 1-5.93-9.14': 'check-circle',
    // Mic pattern
    'M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z': 'mic',
    // Volume pattern
    'polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"': 'volume-2',
    // Users-2 pattern
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2': 'users-2',
    // Bar chart pattern
    'line x1="18" y1="20" x2="18" y2="10"': 'bar-chart-3',
    // Trending up pattern
    'polyline points="22,12 18,12 15,21 9,3 6,12 2,12"': 'trending-up',
    // Activity pattern  
    'polyline points="22,12 18,12 15,21 9,3 6,12 2,12"': 'activity',
    // Line patterns for arrows
    'line x1="12" y1="2" x2="12" y2="15"': 'upload',
    'polyline points="16,6 12,2 8,6"': 'arrow-up',
    // Award pattern
    'circle cx="12" cy="8" r="7"': 'award',
    // Star pattern
    'polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"': 'star'
  };
  
  // Find and replace SVG elements
  const svgElements = container.querySelectorAll('svg');
  svgElements.forEach(svg => {
    const pathContent = svg.innerHTML;
    
    // Check for pattern matches
    for (const [pattern, iconName] of Object.entries(iconMappings)) {
      if (pathContent.includes(pattern)) {
        // Get existing classes and size
        const className = svg.className.baseVal || svg.className;
        const width = svg.getAttribute('width') || '24';
        
        // Replace with Lucide icon
        svg.outerHTML = lucideIcon(iconName, className, parseInt(width));
        break;
      }
    }
  });
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { lucideIcon, replaceLucideIcons, LUCIDE_ICONS };
}

/**
 * Initialize all Lucide icons on the page
 * Replaces all elements with data-lucide attribute
 */
function initializeLucideIcons() {
  const iconElements = document.querySelectorAll('[data-lucide]');
  console.log(`🔧 [LUCIDE] Initializing ${iconElements.length} icons...`);
  
  if (iconElements.length === 0) {
    console.warn('⚠️ [LUCIDE] No elements with data-lucide attribute found');
    return;
  }
  
  let replacedCount = 0;
  iconElements.forEach((element, index) => {
    const iconName = element.getAttribute('data-lucide');
    const className = element.className || 'icon';
    const size = element.dataset.size || '24';
    const strokeWidth = element.getAttribute('data-stroke-width') || '1.5';
    
    if (iconName && LUCIDE_ICONS[iconName]) {
      element.outerHTML = lucideIcon(iconName, className, parseInt(size), parseFloat(strokeWidth));
      replacedCount++;
      console.log(`✅ [LUCIDE] "${iconName}" replaced (stroke: ${strokeWidth}) (${replacedCount}/${iconElements.length})`);
    } else {
      console.warn(`❌ [LUCIDE] Icon "${iconName}" not found`);
      // Show available icons for debugging on first failure
      if (index === 0 && iconElements.length > 1) {
        console.log('Available icons:', Object.keys(LUCIDE_ICONS).slice(0, 15));
      }
    }
  });
  
  console.log(`🎉 [LUCIDE] Initialization complete: ${replacedCount}/${iconElements.length} icons replaced`);
}

/**
 * Common gradient definitions for icons
 */
const ICON_GRADIENTS = {
  gold: '<stop offset="0%" stop-color="#ffd700"/><stop offset="100%" stop-color="#ff8c00"/>',
  royal: '<stop offset="0%" stop-color="#8b5cf6"/><stop offset="100%" stop-color="#6366f1"/>',
  success: '<stop offset="0%" stop-color="#10b981"/><stop offset="100%" stop-color="#059669"/>',
  warning: '<stop offset="0%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#d97706"/>',
  error: '<stop offset="0%" stop-color="#ef4444"/><stop offset="100%" stop-color="#dc2626"/>',
  rainbow: '<stop offset="0%" stop-color="#ff6b6b"/><stop offset="33%" stop-color="#ffd93d"/><stop offset="66%" stop-color="#6bcf7f"/><stop offset="100%" stop-color="#4d96ff"/>'
};

/**
 * Create gradient icon with predefined gradient
 * @param {string} name - Icon name
 * @param {string} gradientName - Predefined gradient name
 * @param {string} className - CSS classes
 * @param {number} size - Icon size
 * @param {number} strokeWidth - Stroke width
 * @returns {string} SVG HTML with gradient
 */
function gradientIcon(name, gradientName = 'gold', className = 'icon', size = 24, strokeWidth = 1.5) {
  const gradient = ICON_GRADIENTS[gradientName];
  if (!gradient) {
    console.warn(`Gradient "${gradientName}" not found`);
    return lucideIcon(name, className, size, strokeWidth);
  }
  return lucideIcon(name, className, size, strokeWidth, gradient);
}

// Global functions for direct HTML use
window.lucideIcon = lucideIcon;
window.gradientIcon = gradientIcon;
window.replaceLucideIcons = replaceLucideIcons;
window.initializeLucideIcons = initializeLucideIcons;
window.ICON_GRADIENTS = ICON_GRADIENTS;