import { Languages } from 'lucide-vue-next';
import type { AppModule } from '@/kernel/registry';
import routes from './routes';
import { localesResponseSchemas } from './response-schemas';

/**
 * The translation admin surface: which languages exist, and what has been edited into them.
 *
 * The CONSUMER half of the dynamic tier lives in `infrastructure/i18n/locale-overrides.ts` and
 * needs no module — every visitor's locale switch reads it. This module is the AUTHOR half: the
 * screens a translator edits through. Deleting it removes the screens and nothing else; every
 * language already translated keeps rendering, because rendering never depended on it.
 *
 * Depends on nothing. It talks only to `/locales/*`, and the two infrastructure reads it shares
 * with the boot path (`GET /locales`, `GET /locales/{tag}/messages`) stay registered by the
 * bottom tier precisely so this folder can be `rm -rf`ed without touching them.
 */
export default {
    name: 'locales',
    /*
     * Translation management is a solved problem — every CMS grows one of these screens and none
     * of them differ. The modelling effort lives server-side, where the rows are.
     */
    subdomain: 'generic',
    routes,
    /*
     * One menu entry, not two: the dictionary board is reached from the languages board's own
     * button. A second header item would be a sub-view promoted to a peer — and it moves every
     * other module's header by one slot.
     */
    navigation: [
        {
            name: 'LocalesList',
            label: 'navigation.label-locales',
            plural: 2,
            order: 43,
            section: 'admin',
            icon: Languages
        }
    ],
    responseSchemas: localesResponseSchemas,
    locales: {
        en: () => import('./locales/en.json').then(({ default: dictionary }) => dictionary),
        it: () => import('./locales/it.json').then(({ default: dictionary }) => dictionary)
    }
} satisfies AppModule;
