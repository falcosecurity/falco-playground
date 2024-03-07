import https from "https";
import fs from "fs";
import parser from "xml2json";
import tar from "tar";

const S3_URL =
  "https://falco-distribution.s3-eu-west-1.amazonaws.com/?prefix=packages/wasm-dev/&delimiter=/";

// downloading fs
function __callback_getm_to_buffer(url, _res, _rej, dumpto) {
  let chunks = [];

  https.get(url, (res) => {
    if (res.statusCode === 301 || res.statusCode === 302) {
      res.destroy();

      return __callback_getm_to_buffer(
        res.headers.location,
        _res,
        _rej,
        dumpto
      );
    }

    if (res.statusCode != 200) {
      _rej(`${res.StatusCode}: Invalid HTTP Response Code`);
      res.destroy();

      return;
    }

    res.on("data", (chunk) => {
      if (dumpto) dumpto.write(Buffer.from(chunk));
      else chunks.push(Buffer.from(chunk));
    });

    res.on("end", () => {
      _res(Buffer.concat(chunks));
    });

    res.on("finish", () => {
      _res(Buffer.concat(chunks));
    });

    res.on("error", (err) => {
      _rej(err);
    });
  });
}

function getm_to_buffer(url, dumpto) {
  return new Promise((resolve, reject) => {
    __callback_getm_to_buffer(url, resolve, reject, dumpto);
  });
}

// processing fs
function extract_latest_wasm_zip_url(xmlstr) {
  try {
    var _raw = JSON.parse(parser.toJson(xmlstr));
  } catch (err) {
    console.error(err);
    return;
  }

  var prefix = _raw["ListBucketResult"]["Prefix"];

  var contents = _raw["ListBucketResult"]["Contents"];
  var uri = contents[contents.length - 1]["Key"].substr(prefix.length);

  return [
    uri,
    "https://download.falco.org/" + prefix + encodeURIComponent(uri),
  ];
}

async function unzip(srcpath) {
  return await tar.x({
    file: srcpath,
  });
}

// indexing
let xmlstr = (await getm_to_buffer(S3_URL)).toString("utf8");
let [tgzuri, tgzurl] = extract_latest_wasm_zip_url(xmlstr);

let tgzname = `tmp-${tgzuri}`;

// downloading tgz
console.log(`Downloading tgz ${tgzurl} ...`);

let zipstream = fs.createWriteStream(tgzname, { flush: true });
await getm_to_buffer(tgzurl, zipstream);

zipstream.close(async (_) => {
  console.debug("Download complete!");

  // unzipping
  console.log("Unzipping tgz");
  var exrdirc = tgzuri.substr(0, tgzuri.length - ".tar.gz".length);

  if (!fs.existsSync(exrdirc)) await unzip(tgzname);

  // copying files
  console.log("Copying files");
  fs.copyFile(exrdirc + "/usr/bin/falco.wasm", "public/falco.wasm", (e) => {
    if (e) console.error(e);
  });
  fs.copyFile(exrdirc + "/usr/bin/falco.js", "src/Hooks/falco.js", (e) => {
    if (e) console.error(e);
  });

  // clean files
  console.log("Cleaning files");
  fs.rmSync(tgzname, { recursive: true });
  fs.rmSync(exrdirc, { recursive: true });

  console.log("Completed!");
});
