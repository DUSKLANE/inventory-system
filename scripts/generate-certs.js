const selfsigned = require("self-signed");
const fs = require("fs");
const path = require("path");

const certsDir = path.join(__dirname, ".certs");

if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir, { recursive: true });
}

const attrs = [{ name: "commonName", value: "localhost" }];

const pems = selfsigned.generate(attrs, {
  days: 365,
  keySize: 2048,
  algorithm: "sha256",
});

fs.writeFileSync(path.join(certsDir, "cert.pem"), pems.cert);
fs.writeFileSync(path.join(certsDir, "key.pem"), pems.private);

console.log("Certificates generated in .certs/");
