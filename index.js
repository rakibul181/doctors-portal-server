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

async function run(){
    try{
        const appionmentOptionCollection = client.db('doctorsPortal').collection('appionmentOption')
        app.get('/appionmentOption',async(req, res)=>{
            const qurry = {}
            const options = await appionmentOptionCollection.find(qurry).toArray() 
            res.send(options)
        })
    }
    finally{

    }

}
run().catch(console.log)


app.get('/', async(req, res)=>{
    res.send('Doctors-portal server running')
})

app.listen(port,() =>{
    console.log(`Running Server On ${port} `);
})