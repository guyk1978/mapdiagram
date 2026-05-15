import fs from "fs";

const path = "c:/mapdiagram/app/tool.html";
const block = fs.readFileSync("c:/mapdiagram/scripts/flow-group-block.js", "utf8");
let s = fs.readFileSync(path, "utf8");

const re = /  function renderFlowGroupOverlays\(\) \{[\s\S]*?\n  function getFlowchartSelectionBounds/;
if (!re.test(s)) {
  console.error("not found");
  process.exit(1);
}
s = s.replace(re, block.trimEnd() + "\n\n  function getFlowchartSelectionBounds");
fs.writeFileSync(path, s);
console.log("ok");
