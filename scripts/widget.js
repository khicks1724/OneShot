import { readFileSync, writeFileSync } from "node:fs";
const html = readFileSync("dist/index.html", "utf8")
  .replace(
    /<script[^>]*src="[^"]+"[^>]*><\/script>/,
    () =>
      `<script type="module">${readFileSync("dist/app.js", "utf8").replace(/<\/script/gi, "<\\/script")}</script>`,
  )
  .replace(
    /<link[^>]*href="[^"]+\.css"[^>]*>/,
    () => `<style>${readFileSync("dist/app.css", "utf8")}</style>`,
  );
writeFileSync("dist/widget.html", html);
console.log("Built self-contained ChatGPT widget.");
