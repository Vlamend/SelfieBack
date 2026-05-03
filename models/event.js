const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
  Name: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: {
    type: Date,
    required: true,
    validate: {
      validator: function (value) {
        return value >= this.startDate;
      },
      message: "La data di fine deve essere successiva a quella di inizio.",
    },
  },
  recurrence: { type: String, enum: ["daily", "weekly", "monthly", "yearly"], default: null },
  endRecurrenceType: { type: Number, enum: [-1, 0, 1, 2], default: -1 },
  recurrenceEnd: {
    type: Date,
    validate: {
      validator: function (value) {
        if (this.endRecurrenceType === 2 && !value) return false;
        return true;
      },
      message: "Devi inserire una data di fine ricorrenza.",
    },
  },
  recurrenceCount: {
    type: Number,
    validate: {
      validator: function (value) {
        if (this.endRecurrenceType === 1 && !value) return false;
        return true;
      },
      message: "Devi inserire un numero di occorrenze.",
    },
  },
  reminders: [{ type: Date }],
  details: { type: String },
  position: { type: String, enum: ["virtual", "physical"] },
  address: {
    type: String,
    validate: {
      validator: function (value) {
        if (this.position === "virtual") {
          const URLRegex =
            /^(https?:\/\/)?([\w-]+\.)+[a-zA-Z]{2,7}(\/[\w\-]*)*(\?[;&a-zA-Z0-9%_=,./-]*)?(#[a-zA-Z0-9_-]*)?$/;
          return URLRegex.test(value);
        }
        return true;
      },
      message: "Inserisci un URL valido per la posizione virtuale",
    },
  },
  userCreator: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  otherUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User"}],
});

const Event = mongoose.model("Event", eventSchema);

module.exports = Event;
