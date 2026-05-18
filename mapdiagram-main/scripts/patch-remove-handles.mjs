import fs from "fs";
let s = fs.readFileSync("app/tool.html", "utf8");
const start = s.indexOf("      const outH = document.createElement(\"motion\");");
const start2 = s.indexOf('      const outH = document.createElement("motion");');
const i = s.indexOf('      const outH = document.createElement("motion");');
const i2 = s.indexOf('      const outH = document.createElement("div");');
const idx = i2 >= 0 ? i2 : i;
if (idx < 0) {
  console.log("outH block not found");
  process.exit(1);
}
const j = s.indexOf("      frame.append(header);\n      bindFlowGroupFrameEvents", idx);
if (j < 0) throw new Error("end not found");
s = s.slice(0, idx) + s.slice(j);
fs.writeFileSync("app/tool.html", s);
console.log("ok");
