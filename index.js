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
        const productsCollection = database.collection('products');

        app.get('/categories', async (req, res) => {
            const sortBy = req.query.sortBy;
            const region = req.query.region;
            const type = req.query.type;
            const search = req.query.search;

            const cursor = categoriesCollection.find({});
            let categories;

            // sort the categories
            if (sortBy === 'name') {
                categories = await cursor.sort({ name: 1 }).toArray();
            }

            if (sortBy === 'type') {
                categories = await cursor.sort({ type: 1 }).toArray();
            }

            if (sortBy === 'region') {
                categories = await cursor.sort({ region: 1 }).toArray();
            }

            if (!sortBy) {
                categories = await cursor.toArray();
            }

            // search the categories
            if (search) {
                categories = categories.filter(category => category.name.toLowerCase().includes(search.toLowerCase()))

                return res.send(categories)
            }

            // filter the categories according to region
            if (!region || region.toLowerCase() === 'show all') {
                categories = categories;
            }

            if (region.toLowerCase() === 'asian instruments') {
                categories = categories.filter(category => category.region.toLowerCase() === 'asian')
            }

            if (region.toLowerCase() === 'western instruments') {
                categories = categories.filter(category => category.region.toLowerCase() === 'western')
            }

            if (region.toLowerCase() === 'mixed origin') {
                categories = categories.filter(category => category.region.toLowerCase() === 'mixed origin')
            }

            // filter the categories according to type
            if (!type || type.toLowerCase() === 'show all') {
                categories = categories
            }

            else {
                categories = categories.filter(category => category.type.toLowerCase() === type.toLowerCase())
            }

            res.send(categories)
        })

        app.get('/products/:categoryName', async (req, res) => {
            const categoryName = req.params.categoryName;
            const quantity = parseInt(req.query.quantity);
            const currentPage = parseInt(req.query.currentPage);

            const totalProductsCount = await productsCollection.estimatedDocumentCount();

            const products = await productsCollection.find({ category: categoryName }).skip(quantity * (currentPage - 1)).limit(quantity).toArray();

            const productsData = {
                count: totalProductsCount,
                products: products
            }
            console.log(productsData)
            res.send(productsData);
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

