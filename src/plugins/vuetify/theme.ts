import type { ThemeDefinition } from 'vuetify';

/*
 * Light theme: indigo primary / violet secondary — professional consultant palette.
 */
export const light: ThemeDefinition = {
    dark: false,
    colors: {
        primary: '#4A5AF5',
        secondary: '#9B59B6',
        tertiary: '#00BCD4',
        surface: '#ffffff',
        background: '#F4F6FB',
        error: '#E53935',
        info: '#2196F3',
        success: '#43A047',
        warning: '#FB8C00'
    }
};

/*
 * Dark theme: lighter indigo primary / soft violet secondary.
 */
export const dark: ThemeDefinition = {
    dark: true,
    colors: {
        primary: '#738FFF',
        secondary: '#BB86FC',
        tertiary: '#4DD0E1',
        surface: '#1E1E2E',
        background: '#12121F',
        error: '#EF5350',
        info: '#42A5F5',
        success: '#66BB6A',
        warning: '#FFA726'
    }
};
