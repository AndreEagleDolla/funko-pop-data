

const puppeteer = require("puppeteer-extra");
const fs = require("fs");
const AdblockerPlugin = require("puppeteer-extra-plugin-adblocker");

const priceApiUri='hobbydb.com/api/historical_ci_values?catalog_item_id=';

let masterJsonArray = [];
let fileName = "funko_pop";



const priceData = async (pid) => {
   await fetch(priceApiUri+pid).then((res) => {return res.data} );
}


(async () => {
  const browser = await puppeteer.launch({
    headless: false,
  });
  const page = await browser.newPage();

  //turns request interceptor on
  await page.setRequestInterception(true);

  // Adblock on puppeteer
  puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

  //if the page makes a  request to a resource type of image or stylesheet then abort that request
  page.on("request", (request) => {
    if (
      request.resourceType() === "font" ||
      request.resourceType() === "stylesheet"
    )
      request.abort();
    else request.continue();
  });

  page.on("console", (msg) => console[msg._type]("PAGE LOG:", msg._text));

  const initialPageScrape = 1;
  let pageCounter = initialPageScrape;

  response = {};

  const lastPage = 2395;

  // Testing purposes
  while (pageCounter === initialPageScrape || pageCounter < lastPage) {
    // let scrapEnded = false;

    // while(!scrapEnded) {
    await page.goto(
      `https://www.hobbydb.com/marketplaces/poppriceguide/catalog_items?filters[in_collection]=all&filters[in_wishlist]=all&filters[on_sale]=all&order[name]=created_at&order[sort]=desc&page=${pageCounter}&q=funko&subvariants=true`
    );

    await sleep(3000);

    let results = await page.$eval("html", function (html) {
      let jsonArray = [];

      // if (html.querySelector('.no-search-results')) {
      //   scrapEnded = false;
      //   break;
      // }

      html.querySelectorAll(".catalog-item-card").forEach(function (element) {
        let elementName = element
          .querySelector(".catalog-item-name")
          .innerHTML.trim();
        let imageName = element.querySelector(".catalog-item-info img").src;

        let hdbID = imageName.slice(86, 92);
        let pd = priceData(hdbID)
        
        let elementSeries = [];

        element
          .querySelectorAll(".catalog-item-details li")
          .forEach(function (listElement) {
            let listElementValue = listElement.textContent
              .replace(/[\n\r]+|[\s]{2,}/g, " ")
              .trim();
            if (listElementValue.startsWith("Series:")) {
              elementSeries = listElementValue
                .replace(/ +(?= )/g, "")
                .replace("Series: ", "")
                .split(" , ");
            }
          });

        let productSeries = element.querySelector(".catalog-item-details li");
        let handle = elementName
          .toLowerCase()
          .replace(/ /g, "-")
          .replace("(", "")
          .replace(")", "");

        let jsonObj = {
          handle: handle,
          title: elementName,
          imageName: imageName,
          series: elementSeries,
          pid: hdbID,
          priceData: pd,
        };
        jsonArray.push(jsonObj);
      });

      return jsonArray;
    });

    masterJsonArray = masterJsonArray.concat(results);

    console.log(pageCounter);
    console.log(masterJsonArray.length);

    response = await page.$eval("html", (el) =>
      el.querySelectorAll(".catalog-item-card")
    );
    pageCounter++;
  }

  const data = JSON.stringify(masterJsonArray);

  fs.writeFile(`${fileName}.json`, data, (err) => {
    if (err) {
      throw err;
    }
    console.log("JSON data is saved.");
  });

  browser.close();
})();

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
