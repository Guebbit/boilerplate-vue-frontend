/**
 * @module
 * Wires lucide-vue-next into Vuetify as its icon system: `lucideAliases` maps every internal
 * name Vuetify components reference to a lucide component, and `lucideIconSet` is the render
 * function Vuetify calls to turn an alias (or a caller-supplied component) into a vnode.
 */
import { h } from 'vue';
import type { Component } from 'vue';
import type { IconAliases, IconProps, IconSet } from 'vuetify';
import {
    ArrowBigUp,
    ArrowDown,
    ArrowLeft,
    ArrowRight,
    ArrowUp,
    Calendar,
    Command,
    CornerDownLeft,
    Delete,
    Option,
    Palette,
    RectangleHorizontal,
    Check,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    ChevronsLeft,
    ChevronsRight,
    ChevronsUpDown,
    Circle,
    CircleAlert,
    CircleCheck,
    CircleDot,
    Info,
    LoaderCircle,
    Menu,
    Minus,
    Paperclip,
    Pencil,
    Pipette,
    Plus,
    Square,
    SquareCheck,
    SquareMinus,
    Star,
    StarHalf,
    Upload,
    X
} from 'lucide-vue-next';

/**
 * Lucide icon set for Vuetify.
 *
 * Keeps the app on a single icon system (lucide, already used in views) instead
 * of adding the @mdi/font icon-font payload. Vuetify internals reference icons
 * through the aliases below; views can pass lucide components directly to any
 * `icon` prop.
 */
export const lucideAliases: IconAliases = {
    collapse: ChevronUp,
    complete: Check,
    cancel: X,
    close: X,
    delete: X,
    clear: X,
    success: CircleCheck,
    info: Info,
    warning: CircleAlert,
    error: CircleAlert,
    prev: ChevronLeft,
    next: ChevronRight,
    checkboxOn: SquareCheck,
    checkboxOff: Square,
    checkboxIndeterminate: SquareMinus,
    delimiter: Circle,
    sortAsc: ArrowUp,
    sortDesc: ArrowDown,
    expand: ChevronDown,
    menu: Menu,
    subgroup: ChevronDown,
    dropdown: ChevronDown,
    radioOn: CircleDot,
    radioOff: Circle,
    edit: Pencil,
    ratingEmpty: Star,
    ratingFull: Star,
    ratingHalf: StarHalf,
    loading: LoaderCircle,
    first: ChevronsLeft,
    last: ChevronsRight,
    unfold: ChevronsUpDown,
    file: Paperclip,
    plus: Plus,
    minus: Minus,
    calendar: Calendar,
    treeviewCollapse: ChevronDown,
    treeviewExpand: ChevronRight,
    eyeDropper: Pipette,
    upload: Upload,
    // Hotkey glyphs (v-hotkey & friends)
    color: Palette,
    command: Command,
    ctrl: ChevronUp,
    space: RectangleHorizontal,
    shift: ArrowBigUp,
    alt: Option,
    enter: CornerDownLeft,
    arrowup: ArrowUp,
    arrowdown: ArrowDown,
    arrowleft: ArrowLeft,
    arrowright: ArrowRight,
    backspace: Delete
};

/**
 * Vuetify icon set that renders whatever component the alias (or the caller)
 * provided. Lucide icons are plain functional components, so this is all that is
 * needed.
 */
export const lucideIconSet: IconSet = {
    /**
     * Renders a single icon.
     *
     * @param props - Vuetify icon props; `props.icon` holds the lucide component
     *  resolved from {@link lucideAliases} or passed straight by the caller.
     * @returns The icon vnode, sized relative to the surrounding text.
     */
    // size/strokeWidth: match Vuetify's default icon-font metrics so lucide icons sit at the
    // same visual weight as the rest of the UI.
    component: (props: IconProps) => h(props.icon as Component, { size: '1.25em', strokeWidth: 2 })
};
