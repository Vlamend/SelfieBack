const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/user.js');
const router = express.Router();
const bcrypt = require("bcrypt");

const SALT_ROUNDS = process.env.SALT_ROUNDS;

//funzione che autentica il token fornito dall'utente
const authenticateToken = async(req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({message: "Accesso negato. Token non fornito."});
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET);

    // Trova l'utente e verifica che il token esista
    const user = await User.findOne({ sessionKey: token });
    if (!user) {
      return res.status(401).json({message: "Token non valido o utente non trovato."});
    }

    req.user = user; // Passa l'utente alla prossima middleware
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      // Token scaduto
      await User.updateOne(
        { sessionKey: token },
        { $pull: {sessionKey: token}} // Rimuove il token dal db
      );
      return res.status(401).json({message: "Token scaduto. Rimosso dal database."});
    }

    console.error("Errore durante l'autenticazione:", error.message);
    return res.status(403).json({message: "Token non valido."});
  }};

// Login
router.post('/login', async (req, res) => {
  const { user, psw } = req.body;

  try {
    // Cerca l'utente nel database
    const foundUser = await User.findOne({ username: user });
    
    // Se l'utente non esiste
    if (!foundUser) {
      return res.status(400).json({ message: 'Utente non trovato' });
    }

    // Verifica la password
    const isMatch = await foundUser.comparePassword(psw);
    if (!isMatch) {
      return res.status(400).json({ message: 'Password errata' });
    }

    // Se tutto è corretto, crea un JWT
    const token = jwt.sign({ userId: foundUser._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    // Inserisci il token nel db
    foundUser.sessionKey.push(token);
    await foundUser.save();
    // Ritorna il token
    res.setHeader("Authorization", `Bearer ${token}`);
    res.json({ message: 'Login effettuato con successo',
      user:{id: foundUser._id, username: foundUser.username},
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Errore interno del server' });
  }
});

// Registrazione
router.post('/register', async (req, res) => {
  const { user, psw, nome, birth, mail } = req.body;

  try {
    // Controlla se l'utente esiste già
    const existingUser = await User.findOne({ username: user });
    if (existingUser) {
      return res.status(400).json({ message: 'Nome utente già esistente' });
    }

    // Crea un nuovo utente
    const newUser = new User({
      username: user,
      password: psw,
      Name: nome,
      birthDate: birth,
      email: !!mail? mail : undefined,
    });
    await newUser.save();
    res.status(201).json({ message: 'Utente registrato con successo' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Errore interno del server' });
  }
});

router.post("/update", async(req, res) => {
  const { user, psw, nome, birth, token } = req.body;
  const updatedData = {};
    try{
      if (user) updatedData.username = user;
      if (nome) updatedData.Name = nome;
      if (birth) updatedData.birthDate = birth;
      if (psw) {
        const salt = await bcrypt.genSalt(Number(SALT_ROUNDS));
        updatedData.password = await bcrypt.hash(psw, salt);
      }
      // Aggiorna i dati dell'utente
      await User.findOneAndUpdate({sessionKey: token}, updatedData, { new: true });

      res.json({ message: "Dati modificati con successo" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Errore interno del server" });
  }
});

// Logout (basta rimuovere il token)
router.post('/logout', async(req, res) => {
  const { token } = req.body;
  await User.findOneAndUpdate(
    { sessionKey: token }, // Trova l'utente con il token nell'array sessionKey
    { $pull: { sessionKey: token } }, // Rimuovi il token dall'array
    { new: true } // Restituisci il documento aggiornato
  );
	//rimuovere qui il token
  res.json({ message: 'Logout effettuato con successo' });
});

router.get("/protected-route", authenticateToken, (req, res) => {
  res.json({ message: "Hai accesso a questa rotta protetta!", user: req.user });
});

router.get("/getUserFullName", authenticateToken, async (req, res) => {

  const capitalizeEachWord = (string) => {
    return string
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  try {
    const sessionToken = req.headers.authorization.split(" ")[1];
    const user = await User.findOne({sessionKey: sessionToken});
    if (!user) {
      return res.status(404).json({ message: "Utente non trovato" });
    }
    const fullName = capitalizeEachWord(user.Name);
    res.status(200).json({ fullName: fullName });
  } catch (error) {
    console.error("Errore nel recupero del nome completo:", error.message);
    res.status(500).json({ message: "Errore interno del server" });
  }
});

router.get("/getUserID", authenticateToken, async (req, res) => {
  try {
    const sessionToken = req.headers.authorization.split(" ")[1];
    const user = await User.findOne({sessionKey: sessionToken});
    if (!user) {
      return res.status(404).json({ message: "Utente non trovato" });
    }
    const UserId = user._id.toString().replace(/\D/g, "");
    res.status(200).json({ id: UserId });
  } catch (error) {
    console.error("Errore nel recupero del ID utente:", error.message);
    res.status(500).json({ message: "Errore interno del server" });
  }
});

router.get("/isSubscribed", authenticateToken, async (req, res) => {
  try {
    const sessionToken = req.headers.authorization?.split(" ")[1];
    if (!sessionToken) {
      return res.status(401).json({ message: "Token mancante." });
    }

    // Recupera solo il valore di subState
    const user = await User.findOne({ sessionKey: sessionToken }).select("subState");

    if (!user) {
      return res.status(404).json({ message: "Utente non trovato" });
    }

    // Estrai il primo valore dell'array
    const isSubscribed = Array.isArray(user.subState) ? user.subState[0] : false;
    console.log(isSubscribed);
    res.status(200).json({ subscribed: isSubscribed });
  } catch (error) {
    console.error("Errore nel recupero dello stato dell'iscrizione:", error.message);
    res.status(500).json({ message: "Errore interno del server" });
  }
});


router.patch("/updateSubscriptionState", authenticateToken, async (req, res) => {
  try {
    const { subState } = req.body;
    const userID = req.user.id;
    if (typeof subState !== "boolean") {
      return res.status(400).json({ message: "Valore di sottoscrizione non valido." });
    }

    await User.findByIdAndUpdate(userID, { $set: { subState: subState } });
    res.json({ message: "Stato sottoscrizione aggiornato con successo." });
  } catch (error) {
    console.error("Errore nell'aggiornamento dello stato di sottoscrizione:", error);
    res.status(500).json({ message: "Errore del server." });
  }
});


module.exports = router;
