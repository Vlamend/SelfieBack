const { calculateReminders } = require("./remider.js");
const User = require("../models/user.js");
const Event = require("../models/event.js");
const mongoose = require("mongoose");
const express = require('express'); 
const router = express.Router();

const uri = process.env.DATABASE_URL;

async function findUserIDBySessionKey(Key) {
  try {
    const user = await User.findOne({ sessionKey: Key });
    
    if (!user) {
      throw new Error("Utente non trovato o token non valido");
    }

    // Restituisce lo username dell'utente
    return user._id;
  } catch (error) {
    console.error("Errore durante la ricerca dell'utente:", error.message);
    throw error;
  }
};


async function createEvent(eventData) {
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(uri);
    }

    const event = new Event(eventData);
    await event.save();
  } catch (error) {
    throw error;
  }
}

async function addEvent(menuData) {
  try {
    // Verifica se i dati necessari sono presenti
    if (!menuData.eventName || !menuData.startDate || !menuData.endDate) {
      throw new Error("Dati mancanti: non hai inserito i campi obbligatori (Nome evento, date di inizio e fine)");
    }

    // Verifica se repetitionEndType è un numero valido
    const repetitionEndType = Number(menuData.repetitionEndType);
    if (isNaN(repetitionEndType)) {
      throw new Error("repetitionEndType deve essere un numero valido");
    }

    // Crea un oggetto per l'evento da salvare
    let newEvent = {
      Name: menuData.eventName,
      details: menuData.details || null,
      position: menuData.position,
      address: menuData.address,
      recurrence: null,
      endRecurrenceType: -1,
      reminders: [],
      userCreator: await findUserIDBySessionKey(menuData.sessionKey),
      //Qui vanno poi trovati tutti gli username degli utenti invitati e che devono accettare l'evento. Da capire come gestirlo
    };

    let startString = menuData.startDate;
    let endString = menuData.endDate;

    // Se è un evento giornaliero, aggiungi le ore corrette
    if (menuData.allDayEvent) {
      startString = `${startString}T00:00:00`;
      endString = `${endString}T00:00:00`;
    } else {
      startString = `${startString}T${menuData.startTime}`;
      endString = `${endString}T${menuData.endTime}`;
    }

    // Converto le date in oggetti Date
    newEvent.startDate = new Date(startString);
    newEvent.endDate = new Date(endString);

    if (isNaN(newEvent.startDate.getTime()) || isNaN(newEvent.endDate.getTime())) {
      throw new Error("Le date di inizio o fine non sono valide");
    }

    // Aggiungi la logica per la ricorrenza
    switch (menuData.repType) {
      case "1":
        newEvent.recurrence = "daily";
        break;
      case "2":
      case "3":
        newEvent.recurrence = "weekly";
        break;
      case "4":
        newEvent.recurrence = "monthly";
        break;
      case "5":
        newEvent.recurrence = "yearly";
        break;
      default:
        newEvent.recurrence = null;
    }

    // Gestione della fine della ricorrenza
    if (repetitionEndType === 1) {
      newEvent.endRecurrenceType = 1;
      newEvent.recurrenceCount = menuData.repetitionCount;
    } else if (repetitionEndType === 2) {
      newEvent.endRecurrenceType = 2;
      newEvent.recurrenceEnd = menuData.endRepeatDate;
    } else if (repetitionEndType === 0) {
      newEvent.endRecurrenceType = 0;
    }
    
    // Calcola i promemoria
    calculateReminders(menuData.reminders, newEvent.reminders, newEvent.startDate);


    // Salva l'evento nel database
    await createEvent(newEvent);
  } catch (error) {
    console.error("Errore durante l'aggiunta dell'evento:", error);
    throw error;
  }
}

router.post("/add-event", async (req, res) => {
  try {
    const menuData = req.body; // Dati ricevuti dal client
    await addEvent(menuData);
    res.status(201).json({ message: "Evento creato con successo!" });
  } catch (error) {
    res.status(500).send({ message: ("Errore durante la creazione dell'evento:", error) });  // Log più dettagliato dell'errore
  }
});

// Endpoint per ottenere gli eventi
router.get("/get-events", async (req, res) => {
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(uri);
    }
    const sessionKey = req.query.Key;
    const actualUser = await findUserIDBySessionKey(sessionKey);
    // Recupera tutti gli eventi dal database
    const events = await Event.find({ userCreator: actualUser });
    
    // Formatta gli eventi per React Big Calendar
    const formattedEvents = events.map(event => {
      return {
        title: event.Name,
        start: event.startDate,
        end: event.endDate,
        resource: {
          details: event.details,
          position: event.position,
          address: event.address,
          recurrence: event.recurrence, // Puoi aggiungere ulteriori dettagli se richiesto
        },
      };
    });

    // Invia la risposta al client
    res.status(200).json(formattedEvents);
  } catch (error) {
    console.error("Errore durante il recupero degli eventi:", error);
    res.status(500).json({ message: "Errore durante il recupero degli eventi", error: error.message });
  }
});

module.exports = router;