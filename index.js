const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectId
const fileUpload = require('express-fileupload');
const fs = require('fs-extra');
require('dotenv').config();

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.lirp7.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;

const app = express();
app.use(cors())
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('service'));
app.use(fileUpload());

var admin = require("firebase-admin");

var serviceAccount = require("./creative-agency-shah-2020-firebase-adminsdk-8qhua-eed34d1f00.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://creative-agency-shah-2020.firebaseio.com"
});

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
client.connect(err => {

    const agencyData = client.db("agencydb").collection("services");
    const allReview = client.db("agencydb").collection("reviews");
    const adminEmail = client.db("agencydb").collection("adminemail");
    const orders = client.db("agencydb").collection("orders");


    app.post('/addService', (req, res) => {
        const file = req.files.file;
        const title = req.body.title;
        const description = req.body.description;
        const newImg = file.data;
        const encImg = newImg.toString('base64');

        let image = {
            contentType: file.mimetype,
            size: file.size,
            img: Buffer.from(encImg, 'base64')
        }
        agencyData.insertOne({ title, description, image })
            .then(result => {
                res.send(result.insertedCount > 0)
            })
    })

    app.get('/allservices', (req, res) => {
        agencyData.find({})
            .toArray((err, documents) => {
                res.send(documents)
            })
    })

    app.post('/addreview', (req, res) => {
        allReview.insertOne(req.body)
            .then(result => {
                res.send('data sent')
            })
    })

    app.get('/allreviews', (req, res) => {
        allReview.find({}).limit(6)
            .toArray((err, documents) => {
                res.send(documents)
            })
    })

    app.post('/makeAdmin', (req, res) => {
        adminEmail.insertOne(req.body)
            .then(result => {
                res.send(result.insertedCount > 0)
            })
    })

    app.post('/isAdmin', (req, res) => {
        const email = req.body.email;
        adminEmail.find({ email: email })
            .toArray((err, admin) => {
                res.send(admin.length > 0)
            })
    })

    app.post('/placedOrders', (req, res) => {
        orders.insertOne(req.body)
            .then(result => {
                res.send(result.insertedCount > 0)
            })
    })

    app.get('/allOrders', (req, res) => {
        const email = req.query.email;
        orders.find({})
            .toArray((err, orders) => {
                res.send(orders)
            })
    })
    app.get('/allOrders', (req, res) => {
        console.log(email)
        if (adminEmail.find({ email: req.query.email })) {
            orders.find({})
                .toArray((err, allOrders) => {
                    res.send(allOrders)
                })
        }
    })

    app.get('/myOrders', (req, res) => {
        const bodyEmail = req.query.email;
        const bearer = req.headers.authorization;
        if (bearer && bearer.startsWith('Bearer ')) {
            const token = bearer.split(' ')[1];
            admin.auth().verifyIdToken(token)
                .then(function (decodedToken) {
                    let email = decodedToken.email;
                    if (bodyEmail === email) {
                        orders.find({ email: bodyEmail })
                            .toArray((err, myOrders) => {
                                res.send(myOrders)
                            })
                    }
                }).catch(function (error) {
                    res.status(401).send('Un Authorized Access')
                });
        }else{
            res.status(401).send('Un Authorized Access')
        }



    })

    app.patch('/updateStatus', (req, res) => {
        const id = req.body.id;
        const status = req.body.status;
        orders.updateOne({ _id: ObjectId(req.body.id) },
            {
                $set: { status: req.body.status }
            })
            .then(result => {
                res.send(result.modifiedCount > 0)
            })
    })

});








app.get('/', (req, res) => {
    res.send('port openned')
})

app.listen(process.env.PORT || 5000)