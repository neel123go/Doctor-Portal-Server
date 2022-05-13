const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

// Use Middleware
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Hello for doctor uncle');
});

app.listen(port, () => {
    console.log(`Doctor app listening on port ${port}`);
});