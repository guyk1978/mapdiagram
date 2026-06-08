/**
 * Cookie consent banner — gates MapDiagramConsentScripts until Accept.
 * Persists choice in localStorage (mapdiagram_cookie_consent + consent_granted).
 */
(function () {
  "use strict";

  var STORAGE_KEY = "mapdiagram_cookie_consent";
  var GRANTED_KEY = "consent_granted";
  var GRANTED = "granted";
  var DENIED = "denied";
  var bannerEl = null;

  function readConsent() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (_) {
      return null;
    }
  }

  function writeConsent(value) {
    try {
      localStorage.setItem(STORAGE_KEY, value);
      if (value === GRANTED) {
        localStorage.setItem(GRANTED_KEY, "true");
      } else {
        localStorage.removeItem(GRANTED_KEY);
      }
    } catch (_) {}
  }

  function hasGrantedConsent() {
    if (readConsent() === GRANTED) return true;
    try {
      return localStorage.getItem(GRANTED_KEY) === "true";
    } catch (_) {
      return false;
    }
  }

  function hideBanner() {
    if (!bannerEl) return;
    bannerEl.classList.remove("md-cookie-consent--visible");
    bannerEl.setAttribute("aria-hidden", "true");
    window.setTimeout(function () {
      if (bannerEl && bannerEl.parentNode) bannerEl.parentNode.removeChild(bannerEl);
      bannerEl = null;
      document.body.classList.remove("md-cookie-consent-open");
    }, 280);
  }

  function grantAndActivate() {
    writeConsent(GRANTED);
    hideBanner();
    if (window.MapDiagramConsentScripts && typeof window.MapDiagramConsentScripts.activate === "function") {
      window.MapDiagramConsentScripts.activate();
    }
  }

  function decline() {
    writeConsent(DENIED);
    hideBanner();
  }

  function buildBanner() {
    if (bannerEl || document.getElementById("mdCookieConsent")) return;

    bannerEl = document.createElement("aside");
    bannerEl.id = "mdCookieConsent";
    bannerEl.className = "md-cookie-consent";
    bannerEl.setAttribute("role", "dialog");
    bannerEl.setAttribute("aria-modal", "false");
    bannerEl.setAttribute("aria-labelledby", "mdCookieConsentTitle");
    bannerEl.setAttribute("aria-describedby", "mdCookieConsentDesc");
    bannerEl.setAttribute("aria-hidden", "false");

    bannerEl.innerHTML =
      '<div class="md-cookie-consent__inner">' +
      '<div class="md-cookie-consent__copy">' +
      '<p id="mdCookieConsentTitle" class="md-cookie-consent__title">Cookies &amp; analytics</p>' +
      '<p id="mdCookieConsentDesc" class="md-cookie-consent__text">We use optional cookies for analytics to improve MapDiagram. ' +
      "Third-party scripts load only if you accept. See our " +
      '<a href="/privacy-policy/">Privacy Policy</a>.</p>' +
      "</div>" +
      '<div class="md-cookie-consent__actions">' +
      '<button type="button" class="md-cookie-consent__btn md-cookie-consent__btn--decline" data-md-consent="decline">Decline</button>' +
      '<button type="button" class="md-cookie-consent__btn md-cookie-consent__btn--accept" data-md-consent="accept">Accept</button>' +
      "</div>" +
      "</div>";

    bannerEl.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-md-consent]");
      if (!btn) return;
      if (btn.getAttribute("data-md-consent") === "accept") grantAndActivate();
      else decline();
    });

    document.body.appendChild(bannerEl);
    document.body.classList.add("md-cookie-consent-open");
    requestAnimationFrame(function () {
      if (bannerEl) bannerEl.classList.add("md-cookie-consent--visible");
    });
  }

  function init() {
    if (hasGrantedConsent()) {
      if (window.MapDiagramConsentScripts && typeof window.MapDiagramConsentScripts.activate === "function") {
        window.MapDiagramConsentScripts.activate();
      }
      return;
    }
    if (readConsent() === DENIED) return;
    buildBanner();
  }

  window.MapDiagramCookieConsent = {
    accept: grantAndActivate,
    decline: decline,
    getConsent: readConsent,
    hasGranted: hasGrantedConsent,
    showBanner: buildBanner,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
