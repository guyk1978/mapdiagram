import fs from "node:fs";
import path from "node:path";

const src = fs.readFileSync(path.resolve("app/tool.html"), "utf8");
const dstPath = path.resolve("mapdiagram-main/app/tool.html");
let dst = fs.readFileSync(dstPath, "utf8");

function replaceBlock(text, startMark, endMark, replacement) {
  const a = text.indexOf(startMark);
  const b = text.indexOf(endMark, a);
  if (a === -1 || b === -1) throw new Error(`block not found: ${startMark}`);
  return text.slice(0, a) + replacement + text.slice(b);
}

// CSS
const cssStart = "  .auth-forgot-hint{margin:0;";
const cssEnd = "  .auth-actions{display:flex;gap:8px;flex-wrap:wrap}";
const cssBlock = src.slice(src.indexOf(cssStart), src.indexOf(cssEnd));
dst = replaceBlock(dst, cssStart, cssEnd, cssBlock);

// Auth modal inner (from authDivider through authForgotHint paragraph end)
const htmlStart = '    <motion id="authDivider"';
const htmlStart2 = '    <div id="authDivider"';
let hs = src.indexOf(htmlStart2);
let hd = dst.indexOf(htmlStart2);
const htmlEnd = '    <p id="authForgotHint"';
const he = src.indexOf(htmlEnd, hs);
const heEnd = src.indexOf("</p>", he) + 4;
const block = src.slice(hs, heEnd);
const hdEnd = dst.indexOf(htmlEnd, hd);
const hdEndClose = dst.indexOf("</p>", hdEnd) + 4;
dst = dst.slice(0, hd) + block + dst.slice(hdEndClose);

// DOM consts
const domStart = '  const authEmailRow = document.getElementById("authEmailRow");';
if (!dst.includes(domStart)) {
  dst = dst.replace(
    '  const authEmail = document.getElementById("authEmail");\n  const authPasswordRow = document.getElementById("authPasswordRow");',
    `  const authEmailRow = document.getElementById("authEmailRow");
  const authEmail = document.getElementById("authEmail");
  const authPasswordRow = document.getElementById("authPasswordRow");
  const authPassword = document.getElementById("authPassword");
  const authPasswordToggle = document.getElementById("authPasswordToggle");
  const authUpdatePasswordRow = document.getElementById("authUpdatePasswordRow");
  const authNewPassword = document.getElementById("authNewPassword");
  const authNewPasswordToggle = document.getElementById("authNewPasswordToggle");
  const authForgotPasswordRow = document.getElementById("authForgotPasswordRow");`,
  );
  dst = dst.replace(
    '  const authPassword = document.getElementById("authPassword");\n  const authForgotPasswordBtn',
    '  const authForgotPasswordBtn',
  );
}

// Toggle listeners
if (!dst.includes("authPasswordToggle.addEventListener")) {
  dst = dst.replace(
    `  if (authBackToLoginBtn) {
    authBackToLoginBtn.addEventListener("click", () => {
      initMapDiagramRuntimes();
      supabaseRuntime.handleBackToLoginClick();
    });
  }
  loginSubmitBtn.addEventListener("click", async () => {`,
    `  if (authBackToLoginBtn) {
    authBackToLoginBtn.addEventListener("click", () => {
      initMapDiagramRuntimes();
      supabaseRuntime.handleBackToLoginClick();
    });
  }
  if (authPasswordToggle) {
    authPasswordToggle.addEventListener("click", () => {
      initMapDiagramRuntimes();
      supabaseRuntime.togglePasswordVisibility("authPassword");
    });
  }
  if (authNewPasswordToggle) {
    authNewPasswordToggle.addEventListener("click", () => {
      initMapDiagramRuntimes();
      supabaseRuntime.togglePasswordVisibility("authNewPassword");
    });
  }
  loginSubmitBtn.addEventListener("click", async () => {`,
  );
}

// deps dom
if (!dst.includes("authEmailRow,")) {
  dst = dst.replace(
    `        authDivider,
        authEmail,
        authPasswordRow,
        authPassword,
        authForgotPasswordBtn,`,
    `        authDivider,
        authEmailRow,
        authEmail,
        authPasswordRow,
        authPassword,
        authPasswordToggle,
        authUpdatePasswordRow,
        authNewPassword,
        authNewPasswordToggle,
        authForgotPasswordRow,
        authForgotPasswordBtn,`,
  );
}

fs.writeFileSync(dstPath, dst);
console.log("synced mapdiagram-main");
