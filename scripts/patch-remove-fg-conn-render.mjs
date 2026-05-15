import fs from "fs";
let s = fs.readFileSync("app/tool.html", "utf8");
const start = s.indexOf("      if (c.kind === \"node-flowgroup\") {");
const end = s.indexOf("      if (isBranchFromConnection(c)) continue;", start);
if (start < 0 || end < 0) {
  console.error("markers not found", start, end);
  process.exit(1);
}
s = s.slice(0, start) + s.slice(end);
fs.writeFileSync("app/tool.html", s);
console.log("removed flowgroup connection render blocks");
