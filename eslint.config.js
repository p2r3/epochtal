// Globals set up by node (overlap mostly with Bun)
import globals from "globals";

// Common JS rules
const jsRules = {
  "constructor-super": "error",
  "for-direction": "error",
  "getter-return": "error",
  "no-case-declarations": "warn",
  "no-class-assign": "error",
  "no-compare-neg-zero": "error",
  "no-cond-assign": "error",
  "no-const-assign": "error",
  "no-constant-binary-expression": "error",
  "no-constant-condition": "error",
  "no-control-regex": "error",
  "no-debugger": "error",
  "no-delete-var": "error",
  "no-dupe-args": "error",
  "no-dupe-class-members": "error",
  "no-dupe-else-if": "error",
  "no-dupe-keys": "error",
  "no-duplicate-case": "error",
  "no-empty-character-class": "warn",
  "no-empty-pattern": "warn",
  "no-empty-static-block": "error",
  "no-extra-boolean-cast": "warn",
  "no-fallthrough": "error",
  "no-func-assign": "error",
  "no-global-assign": "error",
  "no-import-assign": "error",
  "no-invalid-regexp": "error",
  "no-irregular-whitespace": "warn",
  "no-loss-of-precision": "error",
  "no-misleading-character-class": "error",
  "no-new-native-nonconstructor": "error",
  "no-nonoctal-decimal-escape": "error",
  "no-obj-calls": "error",
  "no-octal": "error",
  "no-prototype-builtins": "warn",
  "no-redeclare": "error",
  "no-regex-spaces": "error",
  "no-self-assign": "error",
  "no-setter-return": "error",
  "no-shadow-restricted-names": "error",
  "no-sparse-arrays": "warn",
  "no-this-before-super": "error",
  "no-undef": "error",
  "no-unexpected-multiline": "error",
  "no-unreachable": "error",
  "no-unsafe-finally": "error",
  "no-unsafe-negation": "error",
  "no-unsafe-optional-chaining": "error",
  "no-unused-labels": "error",
  "no-unused-private-class-members": "error",
  "no-useless-backreference": "error",
  "no-useless-catch": "error",
  "no-useless-escape": "error",
  "no-with": "error",
  "require-yield": "error",
  "use-isnan": "error",
  "valid-typeof": "error",
  "no-trailing-spaces": "warn",
  "semi": ["warn", "always"],
  "no-var": "warn",
  "prefer-const": "warn"
};

// Globals set up by Bun
const bunGlobals = {
  "Bun": false // readonly Bun
};

// Globals set up by epochtal
const epochtalGlobals = {
  "epochtal": true,
  "gconfig": true,
  "discordClient": true,
  "isFirstLaunch": true
};

// Globals set up by spplice
const sppliceGlobals = {
  "SendToConsole": false,
  "onConsoleOutput": false,
  "log": false,
  "fs": false,
  "fetch": false,
  "WebSocket": false
};

// Globals set up by tools.js
const toolsGlobals = {
  "ticksToString": false,
  "ticksToStringArray": false,
  "stringArrayToTicks": false,
  "toHTMLString": false,
  "showPopup": false,
  "hidePopup": false,
  "showTooltip": false,
  "hideTooltip": false,
  "inViewportPercent": false
};

// Globals specific to the stream UI
const streamUIGlobals = {
  "SC": false,
  "scWidget": false,
  "controllerWindow": false,
  "sendToGame": false,
  "standbyAnimation": false,
  "introAnimation": false,
  "musicNextTrack": false,
  "musicTogglePause": false
};

export default [
  { // Bun files
    files: ["*.js", "**/*.js"],
    ignores: ["**/pages/*.js", "**/pages/live/*.js", "**/pages/profile/*.js", "**/defaults/portal2/main.js"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...bunGlobals,
        ...epochtalGlobals
      }
    },
    rules: {
      ...jsRules,
      "no-unused-vars": ["warn", {
        "argsIgnorePattern": "^(context|args|request|_.*)$", // ignore api/util parameters and any variable starting with '_'
        "varsIgnorePattern": "^(VERDICT_SAFE|VERDICT_UNSURE|VERDICT_ILLEGAL|_.*)$" // ignore verdicts
      }],
    }
  }, { // HTML files
    files: ["**/pages/*.js", "**/pages/admin/*.js", "**/pages/live/*.js", "**/pages/profile/*.js", "**/pages/stream/*.js"],
    languageOptions: {
      sourceType: "script",
      globals: {
        ...globals.browser,
        ...toolsGlobals
      }
    }
  }, { // Spplice files
    files: ["**/defaults/portal2/main.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: {
        ...sppliceGlobals
      },
    },
    rules: {
      ...jsRules
    }
  }, { // Stream UI files
    files: ["**/pages/stream/*.js"],
    languageOptions: {
      sourceType: "script",
      globals: {
        ...streamUIGlobals
      }
    }
  }
];
