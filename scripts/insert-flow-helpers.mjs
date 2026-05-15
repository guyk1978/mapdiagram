import fs from "fs";
const path = "c:/mapdiagram/app/tool.html";
const helpers = fs.readFileSync("c:/mapdiagram/scripts/flow-group-helpers.js", "utf8");
let s = fs.readFileSync(path, "utf8");
const marker = "  function enableFlowchartMode() {";
const idx = s.indexOf(marker);
if (idx < 0) {
  console.error("marker not found");
  process.exit(1);
}
if (s.includes("function refreshCanvasView()")) {
  console.log("already inserted");
  process.exit(0);
}
s = s.slice(0, idx) + helpers + "\n" + s.slice(idx);
fs.writeFileSync(path, s);
console.log("inserted helpers");
