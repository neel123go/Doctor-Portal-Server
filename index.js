const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

// Use Middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pvyew.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();
        const treatmentCollection = client.db('Doctor_Portals').collection('treatments');
        const bookingCollection = client.db('Doctor_Portals').collection('bookings');

        app.get('/treatment', async (req, res) => {
            const query = {};
            const cursor = treatmentCollection.find(query);
            const treatment = await cursor.toArray();
            res.send(treatment);
        });

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

        app.post('/bookings', async (req, res) => {
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