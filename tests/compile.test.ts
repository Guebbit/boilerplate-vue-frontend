import { describe, it, expect, vi } from 'vitest';
import util from "util";
import * as sass from "sass";
import path from "path";
import { fileURLToPath } from "url";

const __filename: string = fileURLToPath(import.meta.url);
const __dirname: string = path.dirname(__filename);

// Configure Vitest options for the test suite
describe("COMPILE", () => {
    // Set timeout for the entire suite if needed
    // Vitest allows setting timeout per test or suite via test.setTimeout

    it("Compiles in CSS", async () => {
        // Use async for promise-based functions
        // Vitest supports async/await out of the box
        const sassRender = util.promisify(sass.render);
        const result = await sassRender({
            includePaths: ['./scss'],
            file: path.join(__dirname, '../src/assets/styles/main.scss')
        });

        // Perform your assertions here. For example, you could check if the result object
        // has a specific property, or simply ensure the promise resolves without errors.
        // This is a basic example to ensure the compiled CSS contains some expected CSS rule/string.
        expect(result?.css?.toString()).toContain('some-expected-css-rule');

    })
});


// // TypeScript version of the file
// import { describe, it } from 'mocha';
// import util from "util";
// import * as sass from "sass";
// import path from "path";
// import { fileURLToPath } from "url";
//
// // If you're working in a Node.js environment that supports ES Modules,
// // this conversion is correct. Otherwise, adjustments might be needed
// // for module resolution.
// const __filename: string = fileURLToPath(import.meta.url);
// const __dirname: string = path.dirname(__filename);
//
// describe("COMPILE", function() {
//     this.timeout(10000);
//     it("Compiles in CSS", async () => { // Use async for promise-based functions
//         // Assuming sass.render returns a promise, you can await on it directly
//         // If it does not, you'd keep using util.promisify as before.
//         const sassRender = util.promisify(sass.render);
//         return sassRender({
//             includePaths: ['./scss'],
//             file: path.join(__dirname, '../test.scss')
//         });
//     });
// });