const express = require("express");
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();
const port = process.env.port || 5000;
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');

app.use(cors());
app.use(express.json());

// mongoDB config
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.nbmbmyw.mongodb.net/?retryWrites=true&w=majority`;

// Creating a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        const database = client.db('classica');
        const categoriesCollection = database.collection('categories');

        app.get('/categories', async (req, res) => {
            const sortBy = req.query.sortBy;

            let categories;

            if (sortBy === 'name') {
                categories = await categoriesCollection.find({}).sort({ name: 1 }).toArray();
            }

            if (sortBy === 'type') {
                categories = await categoriesCollection.find({}).sort({ type: 1 }).toArray();
            }

            if (sortBy === 'region') {
                categories = await categoriesCollection.find({}).sort({ region: 1 }).toArray();
            }

            console.log(categories)
            res.send(categories)
        })





    } finally {

    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Classica Server Running')
})

app.listen(port, () => {
    console.log('Classica server running on port', port)
})

