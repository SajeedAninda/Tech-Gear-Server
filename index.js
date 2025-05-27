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
    const cartCollection = client.db("TechGear").collection("cart");



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

    // API TO DELETE A PRODUCT
    app.delete("/deleteProduct/:id", async (req, res) => {
      let id = req.params.id;
      let query = { _id: new ObjectId(id) };
      let result = await productsCollection.deleteOne(query);
      res.send(result);
    })

    // API TO GET A SPECIFIC PRODUCT BASED ON ID 
    app.get("/productDetails/:id", async (req, res) => {
      let id = req.params.id;
      let query = { _id: new ObjectId(id) };
      let result = await productsCollection.findOne(query);
      res.send(result);
    })

    // API TO UPDATE PRODUCTS 
    app.patch("/updateProduct/:id", async (req, res) => {
      const id = req.params.id;
      const product = req.body;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedProduct = {
        $set: {
          name: product.name,
          shortDesc: product.shortDesc,
          longDesc: product.longDesc,
          price: product.price,
          discount: product.discount,
          tagline: product.tagline,
          rating: product.rating,
          category: product.category,
          brand: product.brand,
          productImages: product.productImages
        },
      };
      const result = await productsCollection.updateOne(
        filter,
        updatedProduct,
        options
      );
      res.send(result);
    });

    app.post("/addToCart", async (req, res) => {
  try {
    const cartData = req.body;
    const { productId, userEmail, productQuantity } = cartData;

    const existingItem = await cartCollection.findOne({
      productId: productId,
      userEmail: userEmail
    });

    let result;
    if (existingItem) {
      result = await cartCollection.updateOne(
        { productId: productId, userEmail: userEmail },
        { $inc: { productQuantity: productQuantity } }
      );
    } else {
      result = await cartCollection.insertOne(cartData);
    }

    res.send(result);
  } catch (error) {
    console.error("Error adding to cart:", error);
    res.status(500).send("Error adding to cart");
  }
});


    // API TO GET CART BASED ON USER 
    app.get("/getCart/:userEmail", async (req, res) => {
      let email = req.params.userEmail
      let query = { userEmail: email };
      let result = await cartCollection.find(query).toArray();
      res.send(result);
    })

    // API TO DELETE FROM CART
    app.delete("/deleteCartProduct/:id", async (req, res) => {
      let id = req.params.id;
      let query = { _id: new ObjectId(id) };
      let result = await cartCollection.deleteOne(query);
      res.send(result);
    })

    // API TO GET ALL REGISTERED USERS 
    app.get("/allUsers", async (req, res) => {
      let result = await userCollection.find().toArray();
      res.send(result);
    })

    // API TO DELETE AN USER
    app.delete("/deleteUser/:id", async (req, res) => {
      let id = req.params.id;
      let query = { _id: new ObjectId(id) };
      let result = await userCollection.deleteOne(query);
      res.send(result);
    })

    // API TO UPDATE USER ROLE 
    app.patch("/updateUser/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedProduct = {
        $set: {
          role: 'admin'
        }
      };
      const result = await userCollection.updateOne(filter, updatedProduct, options);
      res.send(result);
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