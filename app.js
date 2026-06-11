/* app.js — bootstrap. Modules self-register (in script-include order) via
 * EG.register(); here we load the jurisdiction config, push branding into the
 * page chrome, then open the office hub. */
(function () {
  "use strict";
  EG.loadConfig().then(function () {
    EG.applyBranding();
    EG.wireBrand();
    EG.hub();
  });
})();
