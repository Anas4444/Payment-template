const express = require('express');
//const https = require('https');
//const path = require('path');
//const fs = require('fs');
require('dotenv').config();
const bodyParser = require('body-parser');
const {google} = require('googleapis');
const request = require('request');
var EventEmitter = require("events").EventEmitter;

const app = express();
const auth = new google.auth.GoogleAuth({
    keyFile: "./google_api/credentials.json",
    scopes: "https://www.googleapis.com/auth/spreadsheets",
});
const googleSheets = google.sheets({version:"v4", auth: async function() { return await auth.getClient(); }});
const spreadsheetId = process.env.SPREADSHEET_ID;

// create application/x-www-form-urlencoded parser
app.use(bodyParser.urlencoded({ extended: false }));

// create application/json parser
app.use(bodyParser.json());

app.use(express.static(__dirname + '/dist/public'));
app.set('port', process.env.PORT || 3443);
var server = app.listen(app.get('port'), function() {
  console.log('listening on port ', server.address().port);
});
/*const sslServer = https.createServer(
    {
        key: fs.readFileSync(path.join(__dirname, 'cert',  'key.pem')),
        cert: fs.readFileSync(path.join(__dirname, 'cert', 'cert.pem')),
    }, 
    app
);
sslServer.listen(process.env.PORT || 3443, () => { console.log('Secure server on port 3443'); });*/

app.post('/', function(req, res) {
    prix = getPrice(req.body.price);
    var key = new EventEmitter();
    var options = {
        'method': 'POST',
        'url': 'https://sandbox.paymee.tn/api/v1/payments/create',
        'headers': {
          'Authorization': process.env.TOKEN,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          "vendor": 2373,
          "amount": prix[1],
          "note": "Order #"+req.body.price,
        })
    };
    request(options, function (err, response, data) {
        if (err) throw new Error(err);
        key.data = JSON.parse(data);
        key.emit('update');
    });
    key.on('update', async function () {
        console.log(key.data);
        addEmailToGoogleSheets(req.body, key.data);
        var number = await getIdByEmail(req.body.email);
        res.json({token:key.data.data.token, id:number});
    });
});

app.get('/:id', async (req, res) => {
    var result = new EventEmitter();
    token = await getElementById(req.params.id, "F");
    console.log(token);
    var payment = {
        'method': 'GET',
        'url': `https://sandbox.paymee.tn/api/v1/payments/${token}/check`,
        'headers': {
          'Authorization': process.env.TOKEN,
          'Content-Type': 'application/json'
        },
    };
    request(payment, function (err, response, dt) {
        if (err) throw new Error(err);
        result.data = JSON.parse(dt);
        result.emit('update');
    });
    result.on('update', async function () {
        console.log(result.data);
        res.json({status:result.data.data.payment_status, price:result.data.data.received_amount});
    });
});

app.get('/list', async (req, res) => {
    const getRows = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId,
        range: "Sheet1!A:A",
    });
    res.send(getRows.data);
});

async function addEmailToGoogleSheets(data, key) {
    let date = getCurrentTime();
    const b = await elementInGoogleSheets(data.email, "A:A");
    var offer = getPrice(data.price);
    if (b==0) {
        await googleSheets.spreadsheets.values.append({
            auth,
            spreadsheetId,
            range: 'Sheet1!A:F',
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [[data.email, date[0], date[1], offer[0], offer[1], key.data.token]],
            },
        });
    }
    else {
        googleSheets.spreadsheets.values.update({
            auth,
            spreadsheetId,
            range: 'Sheet1!B'+b+':F'+b,
            valueInputOption: 'RAW',
            resource: {
                values: [[date[0], date[1], offer[0], offer[1], key.data.token]],
            },
        },
        (err, res) => {
          if (err) return console.log('The API returned an error: ' + err);
        });
    }
    return b;
}

function getPrice(price) {
    if (price==1) return ["Half a Day", 5];
    else if (price==2) return ["One Day", 8];
    else if (price==3) return ["One Week", 43];
    else if (price==4) return ["One Month", 115];
    else if (price==5) return ["2 Months", 205];
    return ["3 Months", 295];
}

async function elementInGoogleSheets(element, A) {
    const getRows = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId,
        range: "Sheet1!"+A,
    });
    let data = getRows.data.values;
    for (let i=1; i<data.length; i++) {
        if (data[i][0]==element) return i+1;
    }
    return 0;
}

async function getElementById(id, F) {
    const getRows = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId,
        range: "Sheet1!"+F+":"+F,
    });
    let data = getRows.data.values;
    if (id<data.length) return data[id][0];
    return "";
}

async function getIdByEmail(email) {
    const getRows = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId,
        range: "Sheet1!A:A",
    });
    let data = getRows.data.values;
    for (let i=1; i<data.length; i++) {
        if (data[i][0]==email) return i;
    }
    return 0;
}

function getCurrentTime() {
    let ts = Date.now();
    let date_ob = new Date(ts);
    let date = date_ob.getDate();
    // current month
    let month = date_ob.getMonth() + 1;
    // current year
    let year = date_ob.getFullYear();
    // current hours
    let hours = date_ob.getHours();
    // current minutes
    let minutes = date_ob.getMinutes();
    // current seconds
    let seconds = date_ob.getSeconds();
    return [year + "-" + month + "-" + date + " " + hours + ":" + minutes + ":" + seconds, time = hours + ":" + minutes];
}