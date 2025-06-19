/**
 * Template Engine for Pagination Component
 * Manages different themes and handles HTML generation
 */

import { FullTheme } from '../themes/full-theme.js';
import { CompactTheme } from '../themes/compact-theme.js';
import { MinimalTheme } from '../themes/minimal-theme.js';
import { THEMES, ERROR_MESSAGES } from '../utils/constants.js';

/**
 * Template engine for pagination themes
 */
export class TemplateEngine {
    constructor() {
        this.themes = new Map();
        this.stylesInjected = new Set();
        this._initializeDefaultThemes();
    }

    /**
     * Registers a new theme
     * @param {string} name - Theme name
     * @param {Object} theme - Theme implementation
     */
    registerTheme(name, theme) {
        if (!theme || typeof theme.render !== 'function') {
            throw new Error('Theme must have a render method');
        }

        this.themes.set(name, theme);
    }

    /**
     * Gets a theme by name
     * @param {string} name - Theme name
     * @returns {Object|null} Theme implementation or null
     */
    getTheme(name) {
        return this.themes.get(name) || null;
    }

    /**
     * Lists all available themes
     * @returns {string[]} Array of theme names
     */
    listThemes() {
        return Array.from(this.themes.keys());
    }

    /**
     * Renders pagination HTML using specified theme
     * @param {string} themeName - Theme name
     * @param {Object} state - Pagination state
     * @param {Object} options - Render options
     * @returns {string} HTML string
     */
    render(themeName, state, options = {}) {
        const theme = this.getTheme(themeName);
        if (!theme) {
            console.error(`Theme '${themeName}' not found, falling back to 'full'`);
            return this.render(THEMES.FULL, state, options);
        }

        try {
            return theme.render(state, options);
        } catch (error) {
            console.error(`Error rendering theme '${themeName}':`, error);
            throw new Error(ERROR_MESSAGES.RENDER_ERROR);
        }
    }

    /**
     * Injects theme styles into the document
     * @param {string} themeName - Theme name
     */
    injectStyles(themeName) {
        // Avoid duplicate style injection
        if (this.stylesInjected.has(themeName)) {
            return;
        }

        const theme = this.getTheme(themeName);
        if (!theme || typeof theme.getStyles !== 'function') {
            return;
        }

        try {
            const styles = theme.getStyles();
            if (styles) {
                this._addStylesToDocument(themeName, styles);
                this.stylesInjected.add(themeName);
            }
        } catch (error) {
            console.error(`Error injecting styles for theme '${themeName}':`, error);
        }
    }

    /**
     * Removes theme styles from the document
     * @param {string} themeName - Theme name
     */
    removeStyles(themeName) {
        const styleElement = document.getElementById(`pagination-theme-${themeName}`);
        if (styleElement) {
            styleElement.remove();
            this.stylesInjected.delete(themeName);
        }
    }

    /**
     * Creates a custom theme wrapper
     * @param {string} name - Custom theme name
     * @param {Function} renderFunction - Custom render function
     * @param {Function} stylesFunction - Optional custom styles function
     * @returns {Object} Custom theme object
     */
    createCustomTheme(name, renderFunction, stylesFunction = null) {
        const customTheme = {
            name,
            description: `Custom theme: ${name}`,
            render: renderFunction,
            getStyles: stylesFunction || (() => '')
        };

        this.registerTheme(name, customTheme);
        return customTheme;
    }

    /**
     * Validates theme compatibility
     * @param {string} themeName - Theme name
     * @param {Object} options - Render options
     * @returns {Object} Validation result
     */
    validateTheme(themeName, options = {}) {
        const theme = this.getTheme(themeName);
        const errors = [];

        if (!theme) {
            errors.push(`Theme '${themeName}' not found`);
        } else {
            if (typeof theme.render !== 'function') {
                errors.push(`Theme '${themeName}' missing render method`);
            }

            if (theme.getStyles && typeof theme.getStyles !== 'function') {
                errors.push(`Theme '${themeName}' getStyles is not a function`);
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            theme
        };
    }

    /**
     * Gets theme metadata
     * @param {string} themeName - Theme name
     * @returns {Object|null} Theme metadata
     */
    getThemeInfo(themeName) {
        const theme = this.getTheme(themeName);
        if (!theme) return null;

        return {
            name: theme.name || themeName,
            description: theme.description || 'No description available',
            hasStyles: typeof theme.getStyles === 'function',
            isCustom: !Object.values(THEMES).includes(themeName)
        };
    }

    /**
     * Cleans up all injected styles
     */
    cleanup() {
        this.stylesInjected.forEach(themeName => {
            this.removeStyles(themeName);
        });
        this.stylesInjected.clear();
    }

    /**
     * Initializes default themes
     * @private
     */
    _initializeDefaultThemes() {
        this.registerTheme(THEMES.FULL, new FullTheme());
        this.registerTheme(THEMES.COMPACT, new CompactTheme());
        this.registerTheme(THEMES.MINIMAL, new MinimalTheme());
    }

    /**
     * Adds styles to document head
     * @private
     * @param {string} themeName - Theme name
     * @param {string} styles - CSS styles
     */
    _addStylesToDocument(themeName, styles) {
        // Remove existing styles for this theme
        this.removeStyles(themeName);

        // Create new style element
        const styleElement = document.createElement('style');
        styleElement.id = `pagination-theme-${themeName}`;
        styleElement.type = 'text/css';
        styleElement.textContent = styles;

        // Add to document head
        document.head.appendChild(styleElement);
    }

    /**
     * Preloads all default theme styles
     */
    preloadAllStyles() {
        Object.values(THEMES).forEach(themeName => {
            this.injectStyles(themeName);
        });
    }

    /**
     * Gets recommended theme based on context
     * @param {Object} context - Usage context
     * @returns {string} Recommended theme name
     */
    getRecommendedTheme(context = {}) {
        const {
            space = 'normal',     // 'limited', 'normal', 'generous'
            position = 'main',    // 'main', 'secondary', 'inline'
            features = 'all'      // 'all', 'navigation', 'minimal'
        } = context;

        // Recommendation logic based on context
        if (space === 'limited' || position === 'inline') {
            return THEMES.MINIMAL;
        }

        if (position === 'secondary' || features === 'navigation') {
            return THEMES.COMPACT;
        }

        return THEMES.FULL;
    }
}

// Global template engine instance
export const globalTemplateEngine = new TemplateEngine();
