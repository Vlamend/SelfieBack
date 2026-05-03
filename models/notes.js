const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    categories: [{ type: String }],//un enum?
    //mettendo così createdAt e updatedAt posso mettere come data di default quella di oggi
    //In questo modo l'utente non deve inserirla e se l'evento viene modificato modifico solo il campo updatedAt
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  });
  
  const Note = mongoose.model("Note", noteSchema);
  
  module.exports = Note;