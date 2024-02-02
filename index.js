import fs from 'fs';

// Change the variables below to your use case
const host = 'mtls-as.ranieri.dev.br';
const port = 443;
const endpoint = '/';
const reuseSession = true; // true: enable session resumption - false: disable session resumption
let counter = 100; //Number of connections to be opened on the host

let tls;
try {
  tls = await import('node:tls');
} catch (err) {
  console.error('tls support is disabled!');
}

const connectionTimes = [];
const requestTimes = [];

let options = {
    // Necessary only if the server requires client certificate authentication.
    // Mandatory for mTLS hosts of Open Finance Brazil
    key: fs.readFileSync('client-key.pem'),
    cert: fs.readFileSync('client-cert.pem'),
    host,
    port,
    rejectUnauthorized: false
};

function saveTime(start, end, type) {
    if (type == 'conn') {
        connectionTimes.push(end - start);
    } else { //req
        requestTimes.push(end - start);
    }
}

function printResults() {
    const connAvg = (connectionTimes.reduce((acc, num) => acc + num, 0)) / connectionTimes.length;
    const reqAvg = (requestTimes.reduce((acc, num) => acc + num, 0)) / requestTimes.length;

    console.log(`The connection time average is: ${connAvg}`);
    console.log(`The request time average is: ${reqAvg}`);
}

function createConnection() {
    const startConnDate = Date.now();
    console.log(`Opening connection... (${counter})`);
    let client = tls.connect(options, () => {
        const endConnDate = Date.now();
        console.log(`Connected... (${counter})`);
        saveTime(startConnDate, endConnDate, 'conn');

        //Add current session value to the options variable to enable session reusage
        if (reuseSession) {
            options.session = client.getSession();
        }

        client.on('data', (data) => {
            const endRequestDate = Date.now();
            saveTime(startRequestDate, endRequestDate, 'req');
            console.log(`Data received... (${counter})`);
            client.end();
        });

        client.on('end', () => {
            console.log(`Connection closed... (${counter})\n`);
            if (--counter > 0) {
                createConnection();
            } else {
                printResults();
            }
        });

        const startRequestDate = Date.now();
        client.write(`GET ${endpoint} HTTP/1.1\r\nHost: ${host}\r\n\r\n`);
    });
}

createConnection();