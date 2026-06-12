/**
 * Cookie consent banner — mandatory gatekeeper with transparent blur overlay.
 * Persists choice in localStorage (mapdiagram_cookie_consent + consent_granted).
 */
(function () {
  "use strict";

  var STORAGE_KEY = "mapdiagram_cookie_consent";
  var GRANTED_KEY = "consent_granted";
  var GRANTED = "granted";
  var DENIED = "denied";
  var DEFAULT_BANNER_TEXT =
    "This site uses cookies for Google Analytics. To continue using our tools, you must accept our cookie policy.";
  var DECLINE_BANNER_TEXT =
    "Access denied: You must accept the cookie policy to use this site.";

  var bannerEl = null;
  var overlayEl = null;
  var isOverlayActive = false;

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

  function showOverlay() {
    if (overlayEl || document.getElementById("mdCookieConsentOverlay")) {
      isOverlayActive = true;
      return;
    }

    overlayEl = document.createElement("div");
    overlayEl.id = "mdCookieConsentOverlay";
    overlayEl.className = "md-cookie-consent-overlay";
    overlayEl.setAttribute("aria-hidden", "true");
    document.body.appendChild(overlayEl);
    isOverlayActive = true;
    document.body.classList.add("md-cookie-consent-open");
  }

  function hideOverlay() {
    isOverlayActive = false;
    if (!overlayEl) return;
    if (overlayEl.parentNode) overlayEl.parentNode.removeChild(overlayEl);
    overlayEl = null;
  }

  function hideBanner() {
    if (!bannerEl) return;
    bannerEl.classList.remove("md-cookie-consent--visible");
    bannerEl.setAttribute("aria-hidden", "true");
    window.setTimeout(function () {
      if (bannerEl && bannerEl.parentNode) bannerEl.parentNode.removeChild(bannerEl);
      bannerEl = null;
      if (!isOverlayActive) document.body.classList.remove("md-cookie-consent-open");
    }, 280);
  }

  function updateBannerMessage(declined) {
    var desc = document.getElementById("mdCookieConsentDesc");
    if (!desc) return;
    desc.textContent = declined ? DECLINE_BANNER_TEXT : DEFAULT_BANNER_TEXT;
  }

  function grantAndActivate() {
    writeConsent(GRANTED);
    hideOverlay();
    hideBanner();
    document.body.classList.remove("md-cookie-consent-open");
    if (window.MapDiagramConsentScripts && typeof window.MapDiagramConsentScripts.activate === "function") {
      window.MapDiagramConsentScripts.activate();
    }
  }

  function decline() {
    writeConsent(DENIED);
    updateBannerMessage(true);
  }

  function buildBanner() {
    if (bannerEl || document.getElementById("mdCookieConsent")) return;

    bannerEl = document.createElement("aside");
    bannerEl.id = "mdCookieConsent";
    bannerEl.className = "md-cookie-consent";
    bannerEl.setAttribute("role", "dialog");
    bannerEl.setAttribute("aria-modal", "true");
    bannerEl.setAttribute("aria-labelledby", "mdCookieConsentTitle");
    bannerEl.setAttribute("aria-describedby", "mdCookieConsentDesc");
    bannerEl.setAttribute("aria-hidden", "false");

    bannerEl.innerHTML =
      '<div class="md-cookie-consent__inner">' +
      '<div class="md-cookie-consent__copy">' +
      '<p id="mdCookieConsentTitle" class="md-cookie-consent__title">Cookie policy</p>' +
      '<p id="mdCookieConsentDesc" class="md-cookie-consent__text">' +
      DEFAULT_BANNER_TEXT +
      "</p>" +
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

    showOverlay();
    buildBanner();
    if (readConsent() === DENIED) updateBannerMessage(true);
  }

  window.MapDiagramCookieConsent = {
    accept: grantAndActivate,
    decline: decline,
    getConsent: readConsent,
    hasGranted: hasGrantedConsent,
    showBanner: buildBanner,
    isOverlayActive: function () {
      return isOverlayActive;
    },
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
