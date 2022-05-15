const express = require('express');
const cors = require('cors');
var jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

// Use Middleware
app.use(cors());
app.use(express.json());

function verifyJwt(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'Unauthorized Access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden Access' });
        }
        req.decoded = decoded;
        next();
    });
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pvyew.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();
        const treatmentCollection = client.db('Doctor_Portals').collection('treatments');
        const bookingCollection = client.db('Doctor_Portals').collection('bookings');
        const userCollection = client.db('Doctor_Portals').collection('users');

        app.get('/treatment', async (req, res) => {
            const query = {};
            const cursor = treatmentCollection.find(query);
            const treatment = await cursor.toArray();
            res.send(treatment);
        });

        app.put('/user/:email', async (req, res) => {
            const email = req.params?.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN, { expiresIn: '1h' });
            res.send({ result, token });
        })

        app.get('/available', async (req, res) => {
            const date = req.query.date;

            // step-1 get all treatments
            const treatments = await treatmentCollection.find().toArray();

            // step-2 get the booking of that day, output: [{}, {}, {}, {}]
            const query = { date: date };
            const bookings = await bookingCollection.find(query).toArray();

            // step-3 for each treatment
            treatments.forEach(treatment => {
                // step-4 find bookings for that treatment, output: [{}, {}, {}, {}]
                const treatmentBookings = bookings.filter(book => book.treatment === treatment.name);
                // step-5 selects slots for the treatment bookings, , output: ['', '', '', '']
                const bookedSlots = treatmentBookings.map(book => book.slot);
                // step-6 select those slots that are not in booked slots
                const available = treatment.slots.filter(slot => !bookedSlots.includes(slot));
                // step-7 set available to slots to make it easier
                treatment.slots = available;
            })

            res.send(treatments);
        });

        app.get('/booking', verifyJwt, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;
            if (email === decodedEmail) {
                const query = { patientEmail: email };
                const bookings = await bookingCollection.find(query).toArray();
                return res.send(bookings);
            } else {
                return res.status(403).send({ message: 'Forbidden Access' });
            }
        });

        app.post('/booking', async (req, res) => {
            const booking = req.body;
            const query = { treatment: booking.treatment, date: booking.date, patient: booking.patient }
            const exists = await bookingCollection.findOne(query);
            if (exists) {
                return res.send({ success: false, booking: exists });
            } else {
                const result = await bookingCollection.insertOne(booking);
                return res.send({ success: true, result });
            }
        });

        app.get('/users', verifyJwt, async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users);
        });

    } finally {

    }
}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hello for doctor uncle');
});

app.listen(port, () => {
    console.log(`Doctor app listening on port ${port}`);
});