const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config()


const port = process.env.PORT || 5000
const app = express()

app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ip0tsyu.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        const appionmentOptionCollection = client.db('doctorsPortal').collection('appionmentOption')
        const bookingCollection = client.db('doctorsPortal').collection('bookings')


        app.get('/appionmentOption', async (req, res) => {
            const qurry = {}
            const date = req.query.date
            // console.log(date);
            const options = await appionmentOptionCollection.find(qurry).toArray()
            const bookingQueary = { appionmentDate: date }
            const alreadyBooked = await bookingCollection.find(bookingQueary).toArray()
            // console.log(alreadyBooked);

            options.forEach(option => {
                const optionsBooked = alreadyBooked.filter((book) => book.treatment === option.name)
                const bookSlots = optionsBooked.map(book => book.slot)

                //remining
                const remainingSlots = option.slots.filter(slot=> !bookSlots.includes(slot))
                option.slots = remainingSlots
                console.log(date, option.name,  remainingSlots.length);
            })
            res.send(options)
        })

        app.post('/bookings', async (req, res) => {
            const booking = req.body
            const queary = {
                appionmentDate: booking.appionmentDate,
                treatment: booking.treatment,
                email:booking.email
            }

            const alreadyBooking = await bookingCollection.find(queary).toArray()
            if(alreadyBooking.length){
                const message = `You have alreay booked on ${booking.appionmentDate}`
                return res.send({acknowledged:false, message})
            }

            console.log(booking)
            const result = await bookingCollection.insertOne(booking)
            res.send(result)
        })
    }
    finally {

    }

}
run().catch(console.log)


app.get('/', async (req, res) => {
    res.send('Doctors-portal server running')
})

app.listen(port, () => {
    console.log(`Running Server On ${port} `);
})