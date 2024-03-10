import path from "path";
import { describe, it, expect } from 'vitest';
import { fileURLToPath } from "url";

const __filename: string = fileURLToPath(import.meta.url);

// Vitest test suite for CSS linting
describe("LINT CSS", () => {
    it('Generic linting', async () => {
        // TODO
        return true;
    });
});


// import { describe, it } from 'mocha';
// import stylelint from "stylelint";
// import path from "path";
// import styleLintFormatter from "stylelint-config-standard-scss";
// import assert from "assert";
// import { fileURLToPath } from "url";
//
//
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);
//
//
// describe("LINT", () => {
//     it('Generic linting', async () => {
//         return stylelint.lint({
//             configFile: path.join(__dirname, '../.stylelintrc.json'),
//             ignorePath: path.join(__dirname, '../.stylelintignore'),
//             formatter: styleLintFormatter,
//             files: [
//                 path.join(__dirname, '../test.scss'),
//             ],
//         }).then(function (lintResults) {
//             // console.log("results", lintResults.results)
//             // console.log("output", lintResults.output)
//             // console.log("errored", lintResults.errored)
//             return assert.ok(!lintResults.errored);
//         }).catch(function (error) {
//             // do things with err e.g.
//             console.error("ERROR", error);
//             return false;
//         });
//     });
// });
