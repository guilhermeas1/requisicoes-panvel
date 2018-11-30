var express = require('express');
var router = express.Router();
var moment = require('moment');

const fetch = require("node-fetch");
const header = { 'app-token': 'j8Azq04uRt7a' };

/* GET home page. */
router.get('/', (req, res, next) => {
	res.render('index', { cpf: '3761314035'});
});

router.post('/', async (req, res, next) => {
	let cpfs = [...new Set(req.body.cpf.split(';'))];
	
	let result = {
		realizado: 0,
		count: 0,
		canais: {
			internet: 0,
			alo: 0,
			filial: 0,
			desconhecido: 0
		},
		horarios: {
			manha: 0,
			tarde: 0,
			noite: 0,
			madrugada: 0
		},
		// segmentacao: [
		// 	{key: 'Manhã', val: 0},
		// 	{key: 'Tarde', val: 0},
		// 	{key: 'Noite', val: 0},
		// 	{key: 'Madrugada', val: 0}
		// ]
	};

	for (const cpf of cpfs) {
		let request = await fetch(`http://api.grupodimedservices.com.br/tst/sac/venda/v1/vendas/cpf/${cpf}`, { 
			headers: header
		})
		let vendas = await request.json();

		result.count = vendas.length;

		for (const venda of vendas) {
			//Horários
			const format = "HH:mm:ss";
			
			let timeLimits = {
				manha: [moment("08:00:00", format), moment("11:59:59", format)],
				tarde: [moment("12:00:00", format), moment("17:59:59", format)],
				noite: [moment("18:00:00", format), moment("22:59:59", format)],
				madrugada: [moment("23:00:00", format), moment("07:59:59", format)]
			}

			let time = moment(venda.dataEmissao).format(format);
			
			if (moment(time, format).isBetween(timeLimits.manha[0], timeLimits.manha[1]))
				result.horarios.manha++;

			if (moment(time, format).isBetween(timeLimits.tarde[0], timeLimits.tarde[1]))
				result.horarios.tarde++;

			if (moment(time, format).isBetween(timeLimits.noite[0], timeLimits.noite[1]))
				result.horarios.noite++;

			if (moment(time, format).isBetween(timeLimits.madrugada[0], timeLimits.madrugada[1]))
				result.horarios.madrugada++;

			//Realizado
			result.realizado += venda.valorTotalNotaFiscal;

			let promises = [];

			//Canais
			if (venda.numeroPedido) {
				let pedido = await getPedido(venda.numeroPedido);

				if (pedido) {
					switch (pedido.tipoPedido) {
						case "A":
							result.canais.alo++;
							break;
						case "I":
							result.canais.internet++;
							break;
						case "F":
							result.canais.filial++;
							break;
						case "D":
							result.canais.desconhecido++;
							break;
						default:
							result.canais.filial++;
							break;
					}
				}
				else result.canais.filial++;
			}
			else result.canais.filial++;
		}
	}

	res.render('index', { cpf: req.body.cpf, data: result });
});

let getPedido = async (id) => {
	let response = await fetch(
		`http://api.grupodimedservices.com.br/tst/pedido/v2/pedidos/${id}`, { 
			headers: header
		});

	if (response.status != 200)
		return null;

	return await response.json();
};

module.exports = router;