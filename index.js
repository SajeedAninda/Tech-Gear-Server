const express = require('express')
const cors = require("cors");
const app = express()
require('dotenv').config()

app.use(cors());
app.use(express.json());
const port = 5000

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `${process.env.MONGO_URI}`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    // COLLECTIONS 
    const userCollection = client.db("TechGear").collection("users");
    const productsCollection = client.db("TechGear").collection("products");



    // POST USER DATA TO DB WHEN REGISTERING
    app.post("/registerUser", async (req, res) => {
      let user = req.body;
      let result = await userCollection.insertOne(user);
      res.send(result);
    })

    // POST USER DATA TO DB WHEN REGISTERING/LOGGIN WITH GOOGLE
    app.post("/googleLogin", async (req, res) => {
      const userDetails = req.body;
      let checkEmail = userDetails.email;
      const existingUser = await userCollection.findOne({ email: checkEmail });

      if (existingUser) {
        return res.status(409).json({ error: 'Email exists' });
      }

      let result = await userCollection.insertOne(userDetails);
      res.send(result);
    });

    //GET API FOR RETREIVING THE CURRENT USER DATA 
    app.get("/userData/:email", async (req, res) => {
      const email = req.params.email;
      const query = {
        email: email,
      };
      const result = await userCollection.findOne(query);
      res.send(result);
    });

    // API TO POST AND ADD ALL PRODUCTS 
    app.post("/addProducts", async (req, res) => {
      let products = req.body;
      let result = await productsCollection.insertOne(products);
      res.send(result);
    })

    // API TO GET EVERY PRODUCTS 
    app.get("/allProducts", async (req, res) => {
      let result = await productsCollection.find().toArray();
      res.send(result);
    })

    // API to Filter Products from backend
    app.get("/filteredProducts", async (req, res) => {
      try {
        const {
          search,
          minPrice,
          maxPrice,
          category,
          brand,
          tagline,
          minRating,
          sortBy,
          page = 1
        } = req.query;

        const query = {};
        const perPage = 12;

        if (search) {
          query.name = { $regex: search, $options: 'i' };
        }

        if (minPrice || maxPrice) {
          query.price = {};
          if (minPrice) query.price.$gte = Number(minPrice);
          if (maxPrice) query.price.$lte = Number(maxPrice);
        }

        if (category) query.category = category;
        if (brand) query.brand = brand;
        if (tagline) query.tagline = tagline;
        if (minRating) query.rating = { $gte: Number(minRating) };

        let sort = {};
        if (sortBy === 'low-to-high') sort.price = 1;
        else if (sortBy === 'high-to-low') sort.price = -1;
        else if (sortBy === 'rating') sort.rating = -1;
        else if (sortBy === 'newest') sort.createdAt = -1;
        else if (sortBy === 'discount') sort.discount = -1;

        const totalProducts = await productsCollection.countDocuments(query);
        const totalPages = Math.ceil(totalProducts / perPage);

        const products = await productsCollection
          .find(query)
          .sort(sort)
          .skip((Number(page) - 1) * perPage)
          .limit(perPage)
          .toArray();

        res.send({
          success: true,
          data: products,
          pagination: {
            totalProducts,
            totalPages,
            currentPage: Number(page),
            perPage
          }
        });

      } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).send({
          success: false,
          message: 'Error fetching products'
        });
      }
    });


  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('Tech Gear server running!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})