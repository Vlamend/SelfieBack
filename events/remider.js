function calculateReminders(reminders, arrayForDB, initialDate) {
    const minsToSub = [5, 10, 15, 30, 45, 60, 1440, 2880, 4320, 10080];
    
    // Assicurati che `initialDate` sia nel fuso orario desiderato (Italia, GMT+1 o GMT+2 in estate)
    const italyTimezoneOffset = 1; // GMT+1
    const initialDateInItaly = new Date(initialDate);
    initialDateInItaly.setHours(initialDateInItaly.getHours() + italyTimezoneOffset);
    
    // Calcolo dei promemoria
    for (let i = 0; i < 11; i++) {
      if (reminders[i] === 1) {
        let remindDate = new Date(initialDateInItaly); // Lavoriamo con la data in fuso orario italiano
        remindDate.setMinutes(remindDate.getMinutes() - minsToSub[i]); // Sostituisci i minuti
        arrayForDB.push(remindDate);
      }
    }
  }
  
  module.exports = {
    calculateReminders,
  };
  