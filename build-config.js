/* build-config.js — regenerate config.js from jurisdiction.config.json.
 *
 * config.js is the file:// fallback copy of the jurisdiction config (browsers
 * block fetch() of local JSON over file://). When the app is served over HTTP
 * the JSON is read live and wins; config.js only matters for file:// use.
 *
 * Run after editing jurisdiction.config.json:
 *     node build-config.js
 */
const fs = require("fs");
const path = require("path");

const jsonPath = path.join(__dirname, "jurisdiction.config.json");
const outPath = path.join(__dirname, "config.js");

const json = fs.readFileSync(jsonPath, "utf8");
JSON.parse(json); // validate it parses before writing

const header =
  "/* config.js — GENERATED from jurisdiction.config.json by build-config.js. Do not edit by hand.\n" +
  " * This embedded copy is the fallback used when the app runs from file:// (where\n" +
  " * fetch() of the JSON is blocked). When served over HTTP, the JSON is read live\n" +
  " * and overrides this default. Regenerate with: node build-config.js */\n";

fs.writeFileSync(outPath, header + "window.JURISDICTION_DEFAULT = " + json.trim() + ";\n");
console.log("Wrote config.js from jurisdiction.config.json");
