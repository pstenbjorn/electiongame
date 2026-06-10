/* app.js — bootstrap. Modules self-register (in script-include order) via
 * EG.register(); here we just wire the brand link and open the office hub. */
(function () {
  "use strict";
  EG.wireBrand();
  EG.hub();
})();
