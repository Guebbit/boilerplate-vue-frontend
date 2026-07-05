import { h } from 'vue';
import type { IconSet, IconProps } from 'vuetify';
import { aliases as mdiAliases, mdi } from 'vuetify/iconsets/mdi-svg';
import {
    mdiAccount,
    mdiAccountPlus,
    mdiAlertCircle,
    mdiArrowRight,
    mdiBriefcase,
    mdiCartOutline,
    mdiCheckCircle,
    mdiChevronDown,
    mdiCodeBraces,
    mdiDelete,
    mdiEmail,
    mdiEye,
    mdiGithub,
    mdiHome,
    mdiInformation,
    mdiLightningBolt,
    mdiLinkedin,
    mdiLogin,
    mdiLogout,
    mdiMagnify,
    mdiMinus,
    mdiPackageVariantClosed,
    mdiPencil,
    mdiPlus,
    mdiRobotOutline,
    mdiShieldAccount,
    mdiStar,
    mdiTag,
    mdiTranslate,
    mdiWrench
} from '@mdi/js';

/*
 * Registry of custom SVG icons.
 * Key = icon name, value = SVG path "d" string (24x24 viewBox).
 * Add your own: customSvgPaths['my-logo'] = 'M12 2L2 22h20L12 2z';
 * Use anywhere Vuetify accepts an icon: icon="custom:my-logo"
 */
export const customSvgPaths: Record<string, string> = {
    // Example custom icon: hexagon "G" placeholder
    guebbit:
        'M21 16.5v-9L12 3 3 7.5v9L12 21l9-4.5zM12 8a4 4 0 0 1 4 4h-2a2 2 0 1 0-2 2v2a4 4 0 1 1 0-8z'
};

/*
 * Custom icon set: renders any SVG path registered in customSvgPaths.
 * @param props - Vuetify icon props (props.icon = name after "custom:")
 * @returns inline <svg> vnode using currentColor
 */
export const custom: IconSet = {
    component: (props: IconProps) =>
        h('svg', { viewBox: '0 0 24 24', width: '1em', height: '1em', fill: 'currentColor' }, [
            h('path', { d: customSvgPaths[String(props.icon)] ?? '' })
        ])
};

/*
 * Icon aliases: semantic names used across the app ($home, $cart, ...).
 * Extends Vuetify's default mdi-svg aliases.
 */
export const aliases = {
    ...mdiAliases,
    account: mdiAccount,
    accountPlus: mdiAccountPlus,
    alert: mdiAlertCircle,
    admin: mdiShieldAccount,
    arrowRight: mdiArrowRight,
    briefcase: mdiBriefcase,
    cart: mdiCartOutline,
    chevronDown: mdiChevronDown,
    code: mdiCodeBraces,
    delete: mdiDelete,
    email: mdiEmail,
    eye: mdiEye,
    github: mdiGithub,
    home: mdiHome,
    info: mdiInformation,
    lightning: mdiLightningBolt,
    linkedin: mdiLinkedin,
    login: mdiLogin,
    logout: mdiLogout,
    minus: mdiMinus,
    package: mdiPackageVariantClosed,
    pencil: mdiPencil,
    plus: mdiPlus,
    robot: mdiRobotOutline,
    search: mdiMagnify,
    star: mdiStar,
    success: mdiCheckCircle,
    tag: mdiTag,
    translate: mdiTranslate,
    wrench: mdiWrench
};

/*
 * Icon sets available to Vuetify:
 * - mdi (default, SVG paths from @mdi/js, tree-shakeable)
 * - custom (your own SVGs, via customSvgPaths)
 */
export const sets = {
    mdi,
    custom
};
