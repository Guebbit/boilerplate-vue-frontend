/**
 * @module
 * The column definitions `DataTable` takes.
 *
 * A separate module rather than `<script setup>` exports: the two shapes below form a union, and
 * `<script setup>` accepts an exported `interface` but not an exported `type`.
 */

/**
 * A column that reads a field off the row.
 *
 * `key` is constrained to the row type's own keys, which is the whole point: a column naming a
 * field the row does not have renders the empty glyph in every row and nothing objects. `Order`
 * carries `totalItems`, `totalQuantity` and `totalPrice` and no `total` — and a `key: 'total'`
 * shipped exactly that way, with a visual baseline recording the em dashes as expected output.
 */
export interface CoreDataTableFieldHeader<T> {
    title: string;
    key: Extract<keyof T, string>;
    /**
     * Column width, when one column has to be wider than the table would choose.
     */
    width?: string | number;
}

/**
 * A column that reads no field: an actions cell, a computed badge, anything the row itself does
 * not carry. Its content comes from the matching `item.<key>` slot.
 *
 * `synthetic` is required rather than inferred, so the only way to name a key the row does not
 * have is to say you meant it. A typo cannot satisfy this shape by accident.
 */
export interface CoreDataTableSyntheticHeader {
    title: string;
    key: string;
    synthetic: true;
    /**
     * Column width, when one column has to be wider than the table would choose.
     */
    width?: string | number;
}

/**
 * One column: either a field of the row, or explicitly not one.
 */
export type CoreDataTableHeader<T> = CoreDataTableFieldHeader<T> | CoreDataTableSyntheticHeader;
