import https from "https";
import fs from "fs";

const repo = "falcosecurity/falco-playground"

https.get(`https://raw.githubusercontent.com/${repo}/assets/latest.txt`, (res) => {
    if (res.statusCode != 200) {
        console.error(`latest.txt: ${res.statusCode} - ${res.statusMessage}`);
        return;
    }

    res.on('data', function (version) {
        console.log(`Latest version: ${version}`)

        https.get(`https://raw.githubusercontent.com/${repo}/assets/${version}/falco.wasm`, (res) => {
            if (res.statusCode != 200) {
                console.error(`falco.wasm: ${res.statusCode} - ${res.statusMessage}`);
                return;
            }

            const path = `public/falco.wasm`;
            const filePath = fs.createWriteStream(path);

            res.pipe(filePath);

            filePath.on('finish', () => {
                filePath.close();
                console.log("'falco.wasm' download completed");
            })
        })


        https.get(`https://raw.githubusercontent.com/${repo}/assets/${version}/falco.js`, (res) => {
            if (res.statusCode != 200) {
                console.error(`falco.js: ${res.statusCode} - ${res.statusMessage}`);
                return;
            }

            const path = `src/Hooks/falco.js`;
            const filePath = fs.createWriteStream(path);

            res.pipe(filePath);

            filePath.on('finish', () => {
                filePath.close();
                console.log("'falco.js' download completed");
            })
        })

    });
})

