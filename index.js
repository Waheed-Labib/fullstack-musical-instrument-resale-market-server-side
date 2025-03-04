const express = require("express");
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();
const port = process.env.port || 5000;
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

app.use(cors());
app.use(express.json());


// mongoDB config
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.nbmbmyw.mongodb.net?retryWrites=true&w=majority`;

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
        const usersCollection = database.collection('users');
        const bookingsCollection = database.collection('bookings')
        const paymentsCollection = database.collection('payments')

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
            if (!region || region.toLowerCase() === 'all region') {
                categories = categories;
            }

            if (region?.toLowerCase() === 'asian instruments') {
                categories = categories.filter(category => category.region.toLowerCase() === 'asian')
            }

            if (region?.toLowerCase() === 'western instruments') {
                categories = categories.filter(category => category.region.toLowerCase() === 'western')
            }

            if (region?.toLowerCase() === 'mixed origin') {
                categories = categories.filter(category => category.region.toLowerCase() === 'mixed origin')
            }

            // filter the categories according to type
            if (!type || type.toLowerCase() === 'all types') {
                categories = categories
            }

            else {
                categories = categories.filter(category => category.type.toLowerCase() === type.toLowerCase())
            }

            res.send(categories)
        })

        // get products of a category
        app.get('/products/:categoryName', async (req, res) => {
            const categoryName = req.params.categoryName;
            const quantity = parseInt(req.query.quantity);
            const currentPage = parseInt(req.query.currentPage);
            const except = req.query.except;

            const totalProductsArray = await productsCollection.find({ category: categoryName }).toArray();

            // unsold products
            const totalAvailableProducts = totalProductsArray.filter(product => !product.productStatus?.soldTo?.buyerEmail)

            let products = await productsCollection.find({ category: categoryName }).sort({ _id: -1 }).skip(quantity * (currentPage - 1)).limit(quantity).toArray();

            if (except === 'sold') {
                // remove the sold products
                products = products.filter(product => !product.productStatus?.soldTo?.buyerEmail)
            }

            const productsData = {
                count: totalAvailableProducts.length,
                products: products
            }

            res.send(productsData);
        })

        // get particular user with email
        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const user = await usersCollection.findOne({ email: email })
            res.send(user)
        })

        // add new user
        app.post('/users', async (req, res) => {
            const user = req.body;

            const alreadyUser = await usersCollection.findOne({ email: user.email })

            let result;
            if (!alreadyUser) {
                result = await usersCollection.insertOne(user);
            }

            else result = alreadyUser;

            res.send(result);
        })

        //get a particular product
        app.get('/product/:id', async (req, res) => {
            const productId = req.params.id;
            const result = await productsCollection.findOne({ _id: new ObjectId(productId) })
            res.send(result)
        })

        //add a product
        app.post('/products', async (req, res) => {
            const product = req.body;

            const result = await productsCollection.insertOne(product);

            res.send(result);
        })

        // show products of a particular seller
        app.get('/products/seller/:sellerEmail', async (req, res) => {
            const sellerEmail = req.params.sellerEmail;
            const result = ((await productsCollection.find({ sellerEmail: sellerEmail }).toArray()).reverse());
            res.send(result);
        })

        // delete a product
        app.delete('/products/:productId', async (req, res) => {
            const productId = req.params.productId;
            const result = await productsCollection.deleteOne({ _id: new ObjectId(productId) })
            res.send(result);
        })

        // update particular product

        app.put('/products/:id', async (req, res) => {

            const product = req.body;

            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };

            const options = { upsert: true };
            const updatedProduct = {
                $set: {
                    name: product.name,
                    resalePrice: product.resalePrice,
                    originalPrice: product.originalPrice,
                    category: product.category,
                    purchaseYear: product.purchaseYear,
                    condition: product.condition,
                    description: product.description,
                    phoneNumber: product.phoneNumber,
                    location: product.location,
                    image: product.image,
                    datePosted: product.datePosted,
                    isAdvertised: product.isAdvertised,
                    productStatus: product.productStatus,
                    sellerName: product.sellerName,
                    sellerEmail: product.sellerEmail
                }
            }

            const result = await productsCollection.updateOne(filter, updatedProduct, options);
            res.send(result);

        })

        // get advertised products
        app.get('/advertised', async (req, res) => {
            const products = (await productsCollection.find({ isAdvertised: true }).toArray()).reverse();
            res.send(products)
        })

        // add new booking
        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            const result = await bookingsCollection.insertOne(booking);
            res.send(result);
        })

        // get bookings by a particular user
        app.get('/bookings/:buyerEmail', async (req, res) => {
            const buyerEmail = req.params.buyerEmail;
            const bookings = (await bookingsCollection.find({ buyerEmail: buyerEmail }).toArray()).reverse()
            res.send(bookings);
        })

        // delete a booking 
        app.delete('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const result = await bookingsCollection.deleteOne(filter)
            res.send(result)
        })

        // get all sellers or all buyers 
        app.get('/users', async (req, res) => {
            const userRole = req.query.role;
            const users = await usersCollection.find({ role: userRole }).toArray()
            res.send(users)
        })

        // edit particular user
        app.put('/users/:email', async (req, res) => {

            const user = req.body;

            const email = req.params.email;
            const filter = { email: email };

            const options = { upsert: true };

            const updatedUser = {
                $set: {
                    email: email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    displayName: user.displayName,
                    role: user.role,
                    isVerified: user.isVerified,
                    wishlist: user.wishlist
                }
            }

            const result = await usersCollection.updateOne(filter, updatedUser, options);
            res.send(result);

        })

        // delete particular user
        app.delete('/users/:email', async (req, res) => {
            const userEmail = req.params.email;
            const result = await usersCollection.deleteOne({ email: userEmail })
            res.send(result)
        })

        //payment
        app.post('/create-payment-intent', async (req, res) => {
            const bookingInfo = req.body;
            const price = bookingInfo.price;
            const amount = price * 100;

            const paymentIntent = await stripe.paymentIntents.create({
                currency: 'usd',
                amount: amount,
                "payment_method_types": [
                    "card"
                ]
            })
            res.send({
                clientSecret: paymentIntent.client_secret
            })
        })

        app.post('/payments', async (req, res) => {
            const payment = req.body;
            const result = await paymentsCollection.insertOne(payment);
            res.send(result);
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

