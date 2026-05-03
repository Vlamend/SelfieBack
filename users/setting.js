const express = require('express');
const router = express.Router();

router.post('/update', async (req, res) => {
	const { } = req.body;

	//controllo update
	if(user === "admin" && psw === "admin")
		return res.json();
	else
		return res.status(400).json({ message: 'errore nei dati' });

});

router.post('/return', async (req, res) => {
	const {user, psw} = req.body;

	//controllo ritorno
	if(user === "admin" && psw === "admin")
		return res.json();
	else
		return res.status(400).json({ message: 'errore nei dati' });

});

module.exports = router;




