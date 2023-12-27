const express = require("express");
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();
const port = process.env.port || 5000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Classica Server Running')
})

app.listen(port, () => {
    console.log('Classica server running on port', port)
})