require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");

const eventRoutes = require('./events/events.js'); 
const userRoutes = require("./users/user.js");

const app = express();

// Middleware
const corsOptions = {
  origin: "http://localhost:3000", // URL del frontend
  methods: "GET,POST,PUT,PATCH,DELETE",
  allowedHeaders: "Content-Type,Authorization",
  exposedHeaders: "Authorization",
};

// Connessione al database
const uri = process.env.DATABASE_URL;
mongoose.connect(uri)
  .then(() => console.log('Connessione al database riuscita'))
  .catch((err) => console.error('Errore durante la connessione al database:', err));

app.use(cors(corsOptions));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Rotte
app.use('/user', userRoutes);
app.use('/events', eventRoutes);

// Middleware per gestire errori
app.use((err, res) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Errore interno del server' });
});

// Avvio del server
app.listen(process.env.PORT, () => {
  console.log(`Server in ascolto su http://localhost:${process.env.PORT}`);
});