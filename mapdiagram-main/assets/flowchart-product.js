/**
 * Flowchart productization: publish, templates, public view bootstrap.
 */
(function () {
  "use strict";

  const TEMPLATE_BASE = "/templates/flowchart/";

  async function fetchTemplate(slug) {
    const res = await fetch(TEMPLATE_BASE + encodeURIComponent(slug) + ".json");
    if (!res.ok) throw new Error("template_not_found");
    return res.json();
  }

  var MD_PUBLISH_TIMEOUT_MS = 90000;

  async function publishToSupabase(hooks, payload) {
    const urlSnap = hooks.normalizeSupabaseProjectUrl(hooks.supabaseUrl);
    if (!urlSnap.ok) throw new Error("Supabase not configured");
    const { data: sess } = await hooks.supabase.auth.getSession();
    const token = sess && sess.session ? sess.session.access_token : "";
    if (!token) throw new Error("Sign in to publish a public link");

    var controller = new AbortController();
    var tid = setTimeout(function () {
      controller.abort();
    }, MD_PUBLISH_TIMEOUT_MS);
    var res;
    try {
      res = await fetch(urlSnap.baseUrl + "/functions/v1/public-flowchart", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          apikey: hooks.supabaseAnonKey,
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({ title: payload.title, data: payload.data }),
      });
    } catch (err) {
      clearTimeout(tid);
      if (err && err.name === "AbortError") throw new Error("publish_timeout");
      throw err;
    }
    clearTimeout(tid);
    var json = await res.json().catch(function () {
      return {};
    });
    if (!res.ok) throw new Error(json.error || json.detail || "publish_failed");
    return json;
  }

  function buildSnapshot(hooks) {
    const p = hooks.getProject();
    return {
      title: p.title || p.name || "Flowchart",
      name: p.name,
      nodes: hooks.deepCopy(p.nodes || []),
      connections: hooks.deepCopy(p.connections || []),
      userGroups: hooks.deepCopy(p.userGroups || []),
      groupConnections: hooks.deepCopy(p.groupConnections || []),
      view: hooks.deepCopy(p.view || { x: 0, y: 0, zoom: 1 }),
      diagramKind: "flowchart",
      editCount: hooks.getEditCount(),
    };
  }

  async function loadFlowchartTemplate(hooks, slug) {
    const tpl = await fetchTemplate(slug);
    if (window.MapDiagramAnalytics) {
      MapDiagramAnalytics.templateApply({ slug: slug, category: tpl.category });
    }
    if (tpl.spec && hooks.compileFromSpec) {
      await hooks.compileFromSpec(tpl.spec, tpl.title);
      return;
    }
    if (tpl.canvas) {
      hooks.applyCanvasPayload(tpl.title, tpl.canvas);
      return;
    }
    throw new Error("invalid_template");
  }

  async function bootstrapPublicView(hooks, slug) {
    const key = "md-public-flowchart-" + slug;
    let row = null;
    try {
      const cached = sessionStorage.getItem(key);
      if (cached) row = JSON.parse(cached);
    } catch (e) {
      void e;
    }
    if (!row || !row.data) {
      const urlSnap = hooks.normalizeSupabaseProjectUrl(hooks.supabaseUrl);
      var ctrl = new AbortController();
      var tmr = setTimeout(function () {
        ctrl.abort();
      }, MD_PUBLISH_TIMEOUT_MS);
      var res;
      try {
        res = await fetch(urlSnap.baseUrl + "/functions/v1/public-flowchart?slug=" + encodeURIComponent(slug), {
          headers: { apikey: hooks.supabaseAnonKey, Authorization: "Bearer " + hooks.supabaseAnonKey },
          signal: ctrl.signal,
        });
      } finally {
        clearTimeout(tmr);
      }
      row = await res.json();
      if (!res.ok) throw new Error("not_found");
    }
    document.body.classList.add("public-view-mode");
    hooks.enableReadOnlyChrome();
    const data = row.data;
    const p = hooks.getProject();
    p.title = row.title || data.title || "Shared Flowchart";
    p.name = p.title;
    p.nodes = (data.nodes || []).map(function (n) {
      return hooks.normalizeNode(n);
    });
    p.connections = data.connections || [];
    p.userGroups = data.userGroups || [];
    p.groupConnections = data.groupConnections || [];
    p.view = data.view || { x: 0, y: 0, zoom: 1, grid: false };
    hooks.renderAll();
    window.setTimeout(function () {
      hooks.fitToScreen();
    }, 180);
    if (window.MapDiagramAnalytics) MapDiagramAnalytics.publicView({ slug: slug });
  }

  function renderTemplatePicker(catalog, onPick) {
    var overlay = document.getElementById("fcTemplateOverlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "fcTemplateOverlay";
      overlay.className = "fc-template-overlay";
      var modal = document.createElement("div");
      modal.className = "fc-template-modal";
      modal.setAttribute("role", "dialog");
      var head = document.createElement("div");
      head.className = "fc-template-head";
      var h2 = document.createElement("h2");
      h2.textContent = "Flowchart templates";
      var close = document.createElement("button");
      close.type = "button";
      close.className = "fc-template-close";
      close.textContent = "\u00d7";
      head.appendChild(h2);
      head.appendChild(close);
      var filters = document.createElement("div");
      filters.id = "fcTplFilters";
      filters.className = "fc-template-filters";
      var grid = document.createElement("div");
      grid.id = "fcTplGrid";
      grid.className = "fc-template-grid";
      modal.appendChild(head);
      modal.appendChild(filters);
      modal.appendChild(grid);
      overlay.appendChild(modal);
      document.body.appendChild(overlay);
      close.onclick = function () {
        overlay.classList.remove("open");
      };
      overlay.addEventListener("pointerdown", function (e) {
        if (e.target === overlay) overlay.classList.remove("open");
      });
    }
    var gridEl = overlay.querySelector("#fcTplGrid");
    var filtersEl = overlay.querySelector("#fcTplFilters");
    var cats = [];
    catalog.forEach(function (t) {
      if (cats.indexOf(t.category) === -1) cats.push(t.category);
    });
    filtersEl.innerHTML = "";
    var allBtn = document.createElement("button");
    allBtn.type = "button";
    allBtn.textContent = "All";
    allBtn.className = "active";
    filtersEl.appendChild(allBtn);
    cats.forEach(function (c) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = c;
      filtersEl.appendChild(b);
    });
    function draw(cat) {
      gridEl.innerHTML = "";
      catalog
        .filter(function (t) {
          return !cat || t.category === cat;
        })
        .forEach(function (t) {
          var card = document.createElement("button");
          card.type = "button";
          card.className = "fc-template-card";
          var strong = document.createElement("strong");
          strong.textContent = String(t.title || "");
          var span = document.createElement("span");
          span.textContent = String(t.description || "");
          var em = document.createElement("em");
          em.textContent = String(t.category || "");
          card.appendChild(strong);
          card.appendChild(span);
          card.appendChild(em);
          card.onclick = function () {
            overlay.classList.remove("open");
            onPick(t.slug);
          };
          gridEl.appendChild(card);
        });
    }
    draw(null);
    allBtn.onclick = function () {
      draw(null);
    };
    var btns = filtersEl.querySelectorAll("button:not(:first-child)");
    for (var i = 0; i < btns.length; i++) {
      btns[i].onclick = (function (label) {
        return function () {
          draw(label);
        };
      })(btns[i].textContent);
    }
    overlay.classList.add("open");
  }

  window.FlowchartProduct = {
    fetchTemplate: fetchTemplate,
    publishToSupabase: publishToSupabase,
    buildSnapshot: buildSnapshot,
    loadFlowchartTemplate: loadFlowchartTemplate,
    bootstrapPublicView: bootstrapPublicView,
    renderTemplatePicker: renderTemplatePicker,
    TEMPLATE_BASE: TEMPLATE_BASE,
  };
})();
