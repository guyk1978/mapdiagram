/**
 * Consent-gated third-party scripts (GA4, AdSense). Call activate() only after user consent.
 */
(function () {
  "use strict";

  var activated = false;
  var loaded = { ga: false, adsense: false };
  var customLoaders = [];

  function getConfig() {
    return window.__MD_ANALYTICS_CONFIG__ || {};
  }

  function appendScript(src, options) {
    options = options || {};
    return new Promise(function (resolve, reject) {
      var el = document.createElement("script");
      el.async = options.async !== false;
      el.src = src;
      if (options.crossOrigin) el.crossOrigin = options.crossOrigin;
      el.onload = function () {
        resolve(el);
      };
      el.onerror = function () {
        reject(new Error("Failed to load script: " + src));
      };
      (options.parent || document.head).appendChild(el);
    });
  }

  function loadGoogleAnalytics() {
    if (loaded.ga) return Promise.resolve();
    var id = getConfig().gaMeasurementId;
    if (!id) return Promise.resolve();

    loaded.ga = true;
    window.dataLayer = window.dataLayer || [];
    function gtag() {
      window.dataLayer.push(arguments);
    }
    window.gtag = gtag;

    return appendScript(
      "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(id),
      { async: true },
    )
      .then(function () {
        gtag("js", new Date());
        gtag("config", id);
      })
      .catch(function () {
        loaded.ga = false;
      });
  }

  function loadAdSense() {
    if (loaded.adsense) return Promise.resolve();
    var clientId = getConfig().adsenseClientId;
    if (!clientId) return Promise.resolve();

    loaded.adsense = true;
    return appendScript(
      "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" +
        encodeURIComponent(clientId),
      { async: true, crossOrigin: "anonymous" },
    ).catch(function () {
      loaded.adsense = false;
    });
  }

  function activate() {
    if (activated) return Promise.resolve();
    activated = true;

    var tasks = [loadGoogleAnalytics(), loadAdSense()];
    for (var i = 0; i < customLoaders.length; i++) {
      try {
        var r = customLoaders[i]();
        if (r && typeof r.then === "function") tasks.push(r);
      } catch (_) {}
    }
    return Promise.all(tasks);
  }

  window.MapDiagramConsentScripts = {
    activate: activate,
    isActivated: function () {
      return activated;
    },
    /** Register extra consent-gated loaders (e.g. future ad networks). */
    registerLoader: function (fn) {
      if (typeof fn === "function") customLoaders.push(fn);
      if (activated) activate();
    },
    loadGoogleAnalytics: loadGoogleAnalytics,
    loadAdSense: loadAdSense,
  };
})();
