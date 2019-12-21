let { ipcMain } = require('electron');
const fs = require('fs');
const is_mocking = false;
const contractService = is_mocking ? require('./services/contract.mock.js') : require('./services/contract.js');
const configPath = is_mocking ?  'config.mock.json' : 'config.json';

module.exports = {
	configure: configure
}

function configure(win){
	
	let configJson = {};
	try{
		configJson = JSON.parse(fs.readFileSync(configPath));
	}
	catch(ex) {
		console.error(ex);
	}

	contractService.setConfig(configJson);

	ipcMain.on('load-cources', (e) => {
		const addrs = contractService.getContracts();
		const contracts = [];
		for(var addr in addrs) {
			const contract = {
				addr: addr
			};
			if (addrs[addr].filename) {
				contract.hasFile = true;
			}
			contracts.push(contract);
			// ToDo: rewrite all for promices and do it right.
			contractService.getInfo(addr, (info, err) => {
				console.log(info);
				console.log(err);
				if (info) {
					contract.info = info;
				} else if (err && err.isEmpty) {
					contract.isEmpty = true;
				}
				win.send('cources-loaded', contracts);
			});
		}
	});

	ipcMain.on('add-contract', (e, addr, student_id) => {
		contractService.addExistingContract(addr, student_id);
		win.send('contract-updated', addr);
	});

	ipcMain.on('forget-contract', (e, addr) => {
		contractService.forgetContract(addr);
		win.send('contract-updated', addr);
	});

	function loadMarks(addr) {
		contractService.getMarks(addr, (marks) => {
			win.send('student-marks', addr, marks);
		});
	}
	
	ipcMain.on('load-student-marks', (e, addr) => {
		loadMarks(addr);
	});
	
	ipcMain.on('validate-config', (e) => {
		const result = contractService.validateConfig();
		win.send('validate-config-result', result);
	});
}