import type { ThemeDefinition } from 'vuetify';

/*
 * Light theme: orange primary / cyan secondary (brand colors).
 */
export const light: ThemeDefinition = {
    dark: false,
    colors: {
        primary: '#ff9800',
        secondary: '#00bcd4',
        surface: '#ffffff',
        background: '#f5f5f5',
        error: '#e53935',
        info: '#2196f3',
        success: '#43a047',
        warning: '#fb8c00'
    }
};

/*
 * Dark theme: brand colors swapped (cyan primary / orange secondary).
 */
export const dark: ThemeDefinition = {
    dark: true,
    colors: {
        primary: '#00bcd4',
        secondary: '#ff9800',
        surface: '#1e1e1e',
        background: '#121212',
        error: '#ef5350',
        info: '#42a5f5',
        success: '#66bb6a',
        warning: '#ffa726'
    }
};
