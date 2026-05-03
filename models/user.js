const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const cron = require("node-cron");
const SALT_ROUNDS = process.env.SALT_ROUNDS;

const userSchema = new mongoose.Schema(
  {
    username: { 
        type: String, 
        required: true, 
        unique: true
      },
    Name: { 
      type: String, 
      required: true,
    },
    email: { 
      type: String,
      unique: true,
      sparse: true,
      validate: {
        validator: function (value) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return !value || emailRegex.test(value);
        },
      message: "L'email fornita non è valida.",
    },
  },
    birthDate: { 
      type: Date,
      default: null
    },
    password: { 
      type: String,
      required: true,
    },
    sessionKey:[{type: String, default: null}],
    subState:[{type: Boolean, default: false}],
  },
  {
    timestamps: true,
  }
);

// Middleware per hashare la password prima del salvataggio
userSchema.pre("save", async function (next) {
  if (this.isModified('password') || this.isNew) {
    try {
      const salt = await bcrypt.genSalt(Number(SALT_ROUNDS));
      this.password = await bcrypt.hash(this.password, salt);
      next();
    } catch (err) {
      next(err);
    }
  } else {
    next();
  }
});

// Metodo per verificare la password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("User", userSchema);

// Funzione per rimuovere le sessioni scadute
const clearSessionKeys = async () => {
  try {
    await User.updateMany({}, { $set: { sessionKey: [] } });
  } catch (error) {
    console.error("Errore nella pulizia delle sessionKey:", error);
  }
};

// Esegue la pulizia ogni ora
cron.schedule("0 * * * *", clearSessionKeys);

module.exports = User;
