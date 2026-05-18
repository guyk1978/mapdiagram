/**
 * Single GA4 entrypoint for marketing pages. Do not duplicate inline gtag blocks in HTML.
 */
(function () {
  window.dataLayer = window.dataLayer || [];
  function gtag() {
    dataLayer.push(arguments);
  }
  window.gtag = gtag;
  var s = document.createElement("script");
  s.async = true;
  s.src = "https://www.googletagmanager.com/gtag/js?id=G-LDVB4978S7";
  s.onload = function () {
    gtag("js", new Date());
    gtag("config", "G-LDVB4978S7");
  };
  document.head.appendChild(s);
})();
