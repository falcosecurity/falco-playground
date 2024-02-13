import https from "https";
import fs from "fs";
import parser from "xml2json";
import path from "path";
import tar from "tar";


const S3_URL = "https://falco-distribution.s3-eu-west-1.amazonaws.com/?prefix=packages/wasm-dev/&delimiter=/";


function get_latest_wasm_zip_url(xmlstr) {
    try {
        var _raw = JSON.parse(parser.toJson(xmlstr));

    } catch (err) {
        console.error(err);
        console.log("You might be rate-limited");
        return;
    }

    var prefix = _raw["ListBucketResult"]["Prefix"];
    
    var contents = _raw["ListBucketResult"]["Contents"];
    var uri = contents[contents.length - 1]["Key"].substr(prefix.length);

    return [uri, "https://download.falco.org/" + prefix + encodeURIComponent(uri)];
}

function unzip(srcpath) {
    return tar.x({
        file: srcpath
    })
}

console.log("Indexing...\n");

https.get(S3_URL, (res) => {
    if (res.statusCode != 200) {
        console.error("Couldn't find wasms");
        return;
    }

    res.on("data", (data) => {
        var [uri, url] = get_latest_wasm_zip_url(data);
        console.log(`Downloading ${url}...`);

        https.get(url, (res) => {
            if (res.statusCode != 200) {
                console.error("Couldn't download file");
                return;
            }

            // download tgz to tgzpath
            var tgzpath = `temp-${uri}`;

            var fp = fs.createWriteStream(tgzpath);
            res.pipe(fp);

            fp.on("finish", () => {
                fp.close();
                console.log("Completed!\n");

                unzip(path.resolve(`temp-${uri}`)).then(_ => {
                    // copy files
                    var fdrpath = uri.substr(0, uri.length - ".zip.gz".length);

                    console.log("Copying files...");
                    fs.copyFile(fdrpath + "/usr/bin/falco.wasm", "public/falco.wasm", (err) => { if (err) console.error(err); });
                    fs.copyFile(fdrpath + "/usr/bin/falco.js", "src/Hooks/falco.js", (err) => { if (err) console.error(err); });
                    console.log("Completed!\n");

                    // clean files
                    fs.rmSync(tgzpath, {recursive: true})
                    fs.rmSync(fdrpath, {recursive: true})
                });
            });

        })

    });
})

