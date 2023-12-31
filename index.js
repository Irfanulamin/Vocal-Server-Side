const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;
require("dotenv").config();
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);

const corsOptions = {
  origin: "*",
  credentials: true,
  optionSuccessStatus: 200,
};

app.use(cors(corsOptions));
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

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // await client.connect();

    const classCollection = client.db("VocalStudioDB").collection("classes");
    const selectedCollection = client
      .db("VocalStudioDB")
      .collection("selected");
    const usersCollection = client.db("VocalStudioDB").collection("users");
    const pendingCollection = client
      .db("VocalStudioDB")
      .collection("pendingClasses");
    const paymentCollection = client.db("VocalStudioDB").collection("payments");

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

    app.put("/pendingClasses", async (req, res) => {
      const userEmail = req.query.email;
      const { class_name, class_image, available_seats, price } = req.body;

      await pendingCollection.findOneAndUpdate(
        { email: userEmail },
        {
          $set: {
            class_name: class_name,
            class_image: class_image,
            available_seats: available_seats,
            price: price,
          },
        }
      );

      const result = await pendingCollection.findOne({ email: userEmail });
      res.send(result);
    });

    app.patch("/pendingClass/approve/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: "Approved",
        },
      };

      const result = await pendingCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.patch("/pendingClass/deny/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: "Denied",
        },
      };

      const result = await pendingCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.patch("/pendingClass/feedback/:id", async (req, res) => {
      const id = req.params.id;
      const feedback = req.body.feedback;
      console.log(feedback);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          feedback: feedback,
        },
      };

      const result = await pendingCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.get("/users/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        return res.send({ admin: false });
      }

      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.role === "admin" };
      res.send(result);
    });

    app.get("/users/instructor/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        return res.send({ instructor: false });
      }

      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { instructor: user?.role === "instructor" };
      res.send(result);
    });

    app.get("/users/student/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        return res.send({ student: false });
      }

      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { student: user?.role === "student" };
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

      if (req.decoded.email !== email) {
        console.log(req.decoded.Usermail);
        return res.status(403).send({ error: "unauthorized access!" });
      }

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

    app.post("/classes", async (req, res) => {
      const item = req.body;
      const result = await classCollection.insertOne(item);
      res.send(result);
    });

    app.post("/create-payment-intent", verifyJWT, async (req, res) => {
      const amount = req.body.totalPrice * 100;

      if (amount === 0) {
        return;
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });
    app.post("/payments", async (req, res) => {
      const payment = req.body;
      console.log(payment);
      const paymentResult = await paymentCollection.insertOne(payment);
      res.send(paymentResult);
    });
    app.get("/payments", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await paymentCollection.find(query).toArray();
      res.send(result);
    });

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
