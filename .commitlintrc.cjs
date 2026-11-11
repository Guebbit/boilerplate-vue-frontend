'use strict';

// Stock Conventional Commits types. release-please titles are `chore: release …`, so no extra
// type is needed for them.
module.exports = {
    extends: [
        '@commitlint/config-conventional' // scoped packages are not prefixed
    ]
};
