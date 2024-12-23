import fetch from "#root/src/api/fetch.js";

let puppeteer = null;
let puppeteer_info = { module_name: "" };

const get_js_files = async (url) => {
  const browser = await puppeteer.launch({
    executablePath:
      puppeteer_info.module_name === "puppeteer-core"
        ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
        : undefined,
  });
  const page = await browser.newPage();

  // Store JavaScript files
  const jsFiles = [];

  // Intercept network requests
  await page.setRequestInterception(true);
  page.on("request", (request) => {
    if (request.resourceType() === "script") {
      jsFiles.push(request.url());
    }
    request.continue();
  });

  // Navigate to the page of interest
  await page.goto(url, { waitUntil: "networkidle0" });

  await browser.close();

  return jsFiles;
};

export const getBlackboxValidatedToken = async () => {
  // init puppeteer
  if (!puppeteer) {
    try {
      puppeteer = await import("puppeteer");
      puppeteer_info.module_name = "puppeteer";
    } catch {
      try {
        puppeteer = await import("puppeteer-core");
        puppeteer_info.module_name = "puppeteer-core";
      } catch {
        throw new Error("Puppeteer not found");
      }
    }
  }

  console.log("Using puppeteer module: ", puppeteer_info.module_name);

  const url = "https://blackbox.ai";
  let jsFiles = await get_js_files(url);

  // try to find a file that looks like https://www.blackbox.ai/_next/static/chunks/app/layout-*.js
  const layoutJs = jsFiles.find((file) => file.startsWith("https://www.blackbox.ai/_next/static/chunks/app/layout-"));
  console.log(layoutJs);

  // get content of layout.js
  const response = await fetch(layoutJs, { method: "GET" });
  const layoutJsFile = await response.text();

  // match the string using regex
  const validated = layoutJsFile.match(/p="([^"]*)"/)[1];
  console.log("validated token", validated);
  return validated;
};
