const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const jwt = require('jsonwebtoken');
const { query } = require('express');
const stripe = require("stripe")('pk_test_51M7dOSBhp7WGNNpWyDmNtN2GbYYD2iLjHrO3oxDvy04Vvpjt5nmBUSfP6mJ7x1jQYBwYbTsTMFT4YOIrajioec7h00uBK7s3mk');


const port = process.env.PORT || 5000
const app = express()

app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER12}:${process.env.DB_PASS12}@cluster0.ip0tsyu.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers?.authorazation
    // console.log(authHeader);
    if (!authHeader) {
        res.status(401).send('Unothorize access')
    }
    const token = authHeader.split(' ')[1]
    // console.log(token);

    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {  
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded
        next()
    })
}

async function run() {
    try {
        const appionmentOptionCollection = client.db('doctorsPortal').collection('appionmentOption')
        const bookingCollection = client.db('doctorsPortal').collection('bookings')
        const usersCollection = client.db('doctorsPortal').collection('users')
        const doctorCollection = client.db('doctorsPortal').collection('doctor')

        //make sure you can use ----veryfy admin ---- afyer veryfiJWT

        const verifyAdmin = async (req, res, next) => {
            // console.log(req.decoded.email); 
            const decodedEmail = req.decoded.email
            const query = { email: decodedEmail }

            const user = await usersCollection.findOne(query)
            if (user?.role !== 'admin') {
                return res.status(403).send({ message: 'Forbidedden access' })
            }
            next()
        }
        app.get('/bookings', verifyJWT, async (req, res) => {
            const email = req.query.email
            const queary = { email: email }

            const decodedEmail = req.decoded.email
            if (email !== decodedEmail) {
                return res.status.send({ message: 'forbidden access' })
            } 

            const bookings = await bookingCollection.find(queary).toArray()
            res.send(bookings)
        })



        app.get('/treatmentName', async (req, res) => {
            const query = {}
            const result = await appionmentOptionCollection.find(query).project({ name: 1 }).toArray()
            res.send(result)
        })


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
                const remainingSlots = option.slots.filter(slot => !bookSlots.includes(slot))
                option.slots = remainingSlots
                // console.log(date, option.name,  remainingSlots.length);
            })
            res.send(options)
        })

        app.post('/bookings', async (req, res) => {
            const booking = req.body
            const queary = {
                appionmentDate: booking.appionmentDate,
                treatment: booking.treatment,
                email: booking.email
            }

            const alreadyBooking = await bookingCollection.find(queary).toArray()
            if (alreadyBooking.length) {
                const message = `You have alreay booked on ${booking.appionmentDate}`
                return res.send({ acknowledged: false, message })
            }

            // console.log(booking)
            const result = await bookingCollection.insertOne(booking)
            res.send(result)
        })

        app.get('/booking/:id', async (req, res) => {
            const id = req.params.id
            const query = {
                _id: ObjectId(id)
            }
            const booking = await bookingCollection.findOne(query)
            res.send(booking)

        })

        app.post('/users', async (req, res) => {
            const user = req.body
            const result = await usersCollection.insertOne(user)
            res.send(result)

        })
        app.get('/users', async (req, res) => {
            const queary = {}
            const result = usersCollection.find(queary).toArray()
            res.send(result)
        })
        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email
            const query = {   }
            // console.log(query);     
            const user = await usersCollection.findOne(query)
            // console.log(user);
            res.send({ isAdmin: user?.role === "admin" })
        })


        app.post("/create-payment-intent", async (req, res) => {
            const booking = req.body;
            const price = booking.price
            const ammount = price * 100

            const paymentIntent = await stripe.paymentIntents.create({
                amount: ammount,
                currency: "usd",
                automatic_payment_methods: {
                    enabled: true,
                },

            })
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        })

        // app.get('/addprice', async(req, res)=>{
        //     const filter   = {}
        //     const options = { upsert: true };
        //     const updateDoc = {
        //         $set: {
        //             price: 49
        //         }
        //     };
        //     const result = await bookingCollection.updateMany(filter, updateDoc, options);
        //     res.send(result)

        // })


        //set admin
        app.put('/users/admin/:id', verifyJWT, verifyAdmin, async (req, res) => {

            const id = req.params.id
            const filter = {
                _id: ObjectId(id)
            }
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    role: 'admin'
                }
            };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            res.send(result)

        })

        app.get('/jwt', async (req, res) => {
            const email = req.query.email
            const query = { email: email }
            const user = await usersCollection.findOne(query)
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '1h' })
                res.send({ accessToken: token })
            }
            else {
                res.status(403).send({ accessToken: '' })
            }
        })

        app.post('/doctors', verifyJWT, verifyAdmin, async (req, res) => {
            const doctor = req.body
            const result = await doctorCollection.insertOne(doctor)
            res.send(result)
        })

        app.get('/doctors', verifyJWT, verifyAdmin, async (req, res) => {
            const queary = {}
            const result = await doctorCollection.find(queary).toArray()
            res.send(result)
        })
        app.delete('/doctors/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) }
            const result = await doctorCollection.deleteOne(query)
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