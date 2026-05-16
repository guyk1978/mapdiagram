# Selection Direct Mutations Audit

## SAFE READS

## DIRECT CLEARS

## DIRECT ADDS

## DIRECT DELETES

## DIRECT REASSIGNMENTS

## HIGH RISK

## NEEDS MIGRATION





app\tool.html:4139:    selectedNodeIds: new Set(),
app\tool.html:4240:    for (const nid of runtime.selectedNodeIds) {
app\tool.html:4488:      runtime.selectedNodeIds.clear();
app\tool.html:4500:    runtime.selectedNodeIds.clear();
app\tool.html:4537:      runtime.selectedNodeIds.clear();
app\tool.html:4562:    runtime.selectedNodeIds.clear();
app\tool.html:5217:    const selArr = [...runtime.selectedNodeIds];
app\tool.html:5220:      if (!runtime.selectedNodeIds.has(primaryNodeId)) return [primaryNodeId];
app\tool.html:5226:    if (!runtime.selectedNodeIds.has(primaryNodeId)) return [primaryNodeId];
app\tool.html:5326:    runtime.selectedNodeIds = new Set([...runtime.selectedNodeIds].filter((id) => !ids.has(id)));
app\tool.html:5869:      runtime.selectedNodeIds.clear();
app\tool.html:5906:      runtime.selectedNodeIds.clear();
app\tool.html:5949:    runtime.selectedNodeIds.clear();
app\tool.html:6257:    runtime.selectedNodeIds.clear();
app\tool.html:6378:    runtime.selectedNodeIds.clear();
app\tool.html:6390:    runtime.selectedNodeIds = new Set(p.nodes.map((n) => n.id));
app\tool.html:6738:    runtime.selectedNodeIds.clear();
app\tool.html:6769:      runtime.selectedNodeIds = new Set(fg.nodeIds);
app\tool.html:7216:    if (runtime.selectedNodeIds.size > 1) return null;
app\tool.html:7217:    const id = runtime.selectedNodeId || [...runtime.selectedNodeIds][0] || null;
app\tool.html:7415:    runtime.selectedNodeIds.clear();
app\tool.html:7416:    runtime.selectedNodeIds.add(n.id);
app\tool.html:7533:    runtime.selectedNodeIds.clear();
app\tool.html:8569:    runtime.selectedNodeIds.clear();
app\tool.html:9271:    if (runtime.selectedNodeIds.size) {
app\tool.html:9272:      const first = [...runtime.selectedNodeIds].find((id) => getNodeById(id));
app\tool.html:9844:        runtime.selectedNodeIds.clear();
app\tool.html:9909:    if (runtime.selectedNodeIds.size < 2) {
app\tool.html:9913:    const selected = [...runtime.selectedNodeIds];
app\tool.html:10034:    runtime.selectedNodeIds.clear();
app\tool.html:10035:    runtime.selectedNodeIds.add(n.id);
app\tool.html:10084:        if (runtime.selectedNodeIds.has(n.id)) runtime.selectedNodeIds.delete(n.id);
app\tool.html:10085:        else runtime.selectedNodeIds.add(n.id);
app\tool.html:10086:        if (runtime.selectedNodeIds.size === 0) runtime.selectedNodeId = null;
app\tool.html:10087:        else if (runtime.selectedNodeIds.size === 1) runtime.selectedNodeId =
[...runtime.selectedNodeIds][0];
app\tool.html:10097:        if (runtime.selectedNodeIds.has(n.id)) runtime.selectedNodeIds.delete(n.id);
app\tool.html:10098:        else runtime.selectedNodeIds.add(n.id);
app\tool.html:10099:        runtime.selectedNodeId = runtime.selectedNodeIds.size === 1 ?
[...runtime.selectedNodeIds][0] : n.id;
app\tool.html:10100:      } else if (fcEditorCanSelect() && runtime.selectedNodeIds.has(n.id) &&
runtime.selectedNodeIds.size > 1) {
app\tool.html:10103:        if (!runtime.selectedNodeIds.has(n.id)) runtime.selectedNodeIds.clear();
app\tool.html:10104:        runtime.selectedNodeIds.add(n.id);
app\tool.html:10797:  function diagramInspectorSelectedNodeIds() {
app\tool.html:10798:    const ids = new Set(runtime.selectedNodeIds);
app\tool.html:10986:    runtime.selectedNodeIds.clear();
app\tool.html:11030:        runtime.selectedNodeIds.clear();
app\tool.html:11054:    const selIds = diagramInspectorSelectedNodeIds();
app\tool.html:11513:    runtime.selectedNodeIds.clear();
app\tool.html:11836:    if (runtime.selectedNodeIds && runtime.selectedNodeIds.size) {
app\tool.html:11837:      for (const id of runtime.selectedNodeIds) out.push(id);
app\tool.html:11928:    runtime.selectedNodeIds.clear();
app\tool.html:11931:      if (nid) runtime.selectedNodeIds.add(nid);
app\tool.html:12039:    const next = new Set(diagramInspectorSelectedNodeIds());
app\tool.html:12050:    runtime.selectedNodeIds = next;
app\tool.html:12057:    const anchor = getNodeById(runtime.selectedNodeId) ||
getNodeById([...runtime.selectedNodeIds][0]);
app\tool.html:12067:    runtime.selectedNodeIds = next;
app\tool.html:12144:    const multiCount = runtime.selectedNodeIds.size;
app\tool.html:12148:      const multi = runtime.selectedNodeIds.has(id);
app\tool.html:13222:    runtime.selectedNodeIds.clear();
app\tool.html:13330:    if (!runtime.selectedNodeIds.size) {
app\tool.html:13334:    const selected = [...runtime.selectedNodeIds];
app\tool.html:13662:    runtime.selectedNodeIds.clear();
app\tool.html:14069:    runtime.selectedNodeIds.clear();
app\tool.html:14404:      if (!m.additive) runtime.selectedNodeIds.clear();
app\tool.html:14412:          runtime.selectedNodeIds.add(n.id);
app\tool.html:14415:      runtime.selectedNodeId = runtime.selectedNodeIds.size === 1 ?
[...runtime.selectedNodeIds][0] : null;
app\tool.html:14423:      if (!isFlowchartMode() && runtime.selectionMode && runtime.selectedNodeIds.size >= 2) {
app\tool.html:14828:      (runtime.selectedNodeIds?.size || runtime.selectedNodeId) &&




- Line 7416
  runtime.selectedNodeIds.add(n.id)


  - Line 10084
  runtime.selectedNodeIds.delete(n.id)



  - Line 12050
  runtime.selectedNodeIds = next





  ## Recursion fix

Resolved infinite recursion between:

- renderSelection()
- sanitizeSelectionState()
- selectionRuntime.sanitizeSelection()

Fix:
- removed sanitizeSelectionState() call from renderSelection()

Impact:
- restored group selection
- restored undo
- restored marquee selection
- restored extended editor interactions

Root cause:
render cycle re-entered selection sanitation repeatedly after runtime extraction.