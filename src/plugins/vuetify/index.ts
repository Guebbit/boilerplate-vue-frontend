import { createVuetify } from 'vuetify';
import 'vuetify/styles';
import { aliases, sets } from './icons';
import { light, dark } from './theme';

/*
 * Custom Vuetify instance:
 * - SVG icons (mdi via @mdi/js) + "custom" icon set for your own SVGs (see icons.ts)
 * - Light/dark brand themes (see theme.ts)
 * - Global component defaults for a consistent material look
 */
export const vuetify = createVuetify({
    icons: {
        defaultSet: 'mdi',
        aliases,
        sets
    },
    theme: {
        defaultTheme: 'light',
        themes: { light, dark }
    },
    defaults: {
        VBtn: { rounded: 'lg' },
        VCard: { rounded: 'lg' },
        VTextField: { variant: 'outlined', density: 'comfortable' },
        VTextarea: { variant: 'outlined', density: 'comfortable' },
        VSelect: { variant: 'outlined', density: 'comfortable' },
        VCheckbox: { color: 'primary' }
    }
});

export default vuetify;

export { customSvgPaths } from './icons';
