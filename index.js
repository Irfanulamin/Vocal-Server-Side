const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;
require("dotenv").config();
// const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);

app.use(cors());
app.use(express.json());

function verifyJWT(req, res, next) {
  const authorization = req.headers.authorization;
  console.log(authorization);
  if (!authorization) {
    return res.status(401).send({ error: "unauthorized access!" });
  }
  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
    console.log({ err });
    if (err) {
      return res.status(403).send({ error: "unauthorized access!" });
    }
    req.decoded = decoded;
    next();
  });
}

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.ADMIN_USER}:${process.env.ADMIN_PASS}@cluster0.miqdtcr.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const classCollection = client.db("VocalStudioDB").collection("classes");
    const selectedCollection = client
      .db("VocalStudioDB")
      .collection("selected");
    const usersCollection = client.db("VocalStudioDB").collection("users");
    const pendingCollection = client
      .db("VocalStudioDB")
      .collection("pendingClasses");

    app.post("/jwt", async (req, res) => {
      const body = req.body;
      console.log(body);
      const token = jwt.sign(body, process.env.ACCESS_TOKEN, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    app.get("/pendingClassesDetails", async (req, res) => {
      const result = await pendingCollection.find().toArray();
      res.send(result);
    });

    app.get("/pendingClasses", async (req, res) => {
      const email = req.query.email;
      console.log(email);
      const query = { email: email };
      const result = await pendingCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/pendingClasses", async (req, res) => {
      const item = req.body;
      console.log(item);
      const result = await pendingCollection.insertOne(item);
      res.send(result);
    });

    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      console.log(user);
      const query = { email: user?.email };
      const existingUser = await usersCollection.findOne(query);

      if (existingUser) {
        return res.send({ message: "user already exists" });
      }

      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };

      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.patch("/users/instructor/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "instructor",
        },
      };

      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.get("/selectedItems", verifyJWT, async (req, res) => {
      const email = req.query.userEmail;
      console.log(email);
      const query = { userEmail: email };
      const result = await selectedCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/selectedItems", async (req, res) => {
      const item = req.body;
      console.log(item);
      const result = await selectedCollection.insertOne(item);
      res.send(result);
    });

    app.delete("/selectedItems/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { _id: new ObjectId(id) };
      const result = await selectedCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/classes", async (req, res) => {
      const result = await classCollection.find().toArray();
      res.send(result);
    });

    // app.post("/create-payment-intent", async (req, res) => {
    //   const { price } = req.body;
    //   const amount = price * 100;

    //   // Create a PaymentIntent with the order amount and currency
    //   const paymentIntent = await stripe.paymentIntents.create({
    //     amount: amount,
    //     currency: "usd",
    //     payment_method_types: ["cards"],
    //   });
    //   res.send({
    //     clientSecret: paymentIntent.client_secret,
    //   });
    // });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Vocal is signing");
});

app.listen(port, () => {
  console.log(`Vocal is signing on port ${port}`);
});
