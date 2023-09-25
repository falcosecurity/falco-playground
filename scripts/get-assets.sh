REPO=`git config --get remote.origin.url | grep -o "[^/]*/[^/]*$"`

curl -o "public/falco.wasm" -L "https://raw.githubusercontent.com/$REPO/assets/falco_artifact-latest/public/falco.wasm"
curl -o "src/Hooks/falco.js" -L "https://raw.githubusercontent.com/$REPO/assets/falco_artifact-latest/src/Hooks/falco.js"
