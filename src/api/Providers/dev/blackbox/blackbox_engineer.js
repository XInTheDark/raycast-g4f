import puppeteer from "puppeteer-core";
import fetch from "node-fetch";

const get_js_files = async (url) => {
  const browser = await puppeteer.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
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
  const url = "https://blackbox.ai";
  let jsFiles = await get_js_files(url);

  // try to find a file that looks like https://www.blackbox.ai/_next/static/chunks/app/layout-*.js
  const layoutJs = jsFiles.find((file) => file.startsWith("https://www.blackbox.ai/_next/static/chunks/app/layout-"));
  console.log(layoutJs);

  // get content of layout.js
  const response = await fetch(layoutJs, { method: "GET" });
  const layoutJsFile = await response.text();

  // match the string: h="*" and extract the value *
  const validated = layoutJsFile.match(/h="([^"]*)"/)[1];
  return validated;
};
