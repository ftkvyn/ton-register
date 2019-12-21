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
		console.log(addrs);
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
					contract.createdName = addrs[addr].createdName;
				}
				win.send('cources-loaded', contracts);
			});
			contractService.getBalance(addr, (balance) => {
				contract.balance = balance;
				win.send('cources-loaded', contracts);
			});
		}
	});

	ipcMain.on('deploy-contract', (e, info, num) => {
		console.log(`deploying contract ${info} ${num}`);
		contractService.deployContract(num, info, (addr, students) => {
			win.send('contract-updated', addr, students);
		});
	});

	ipcMain.on('deploy-boc', (e, addr) => {
		console.log(`deploying boc ${addr}`);
		contractService.deployInitMessage(addr, () => {
			win.send('contract-updated', addr);
		});
	});

	ipcMain.on('add-contract', (e, addr) => {
		contractService.addExistingContract(addr);
		win.send('contract-updated', addr);
	});

	ipcMain.on('forget-contract', (e, addr) => {
		contractService.forgetContract(addr);
		win.send('contract-updated', addr);
	});

	ipcMain.on('save-student-name', (e, addr, id, name) => {
		contractService.saveStudentName(addr, id, name);
	});

	function loadStudents(addr) {
		contractService.getStudentIds(addr, (students) => {
			win.send('students-loaded', addr, students);
		});
	}
	
	ipcMain.on('load-students', (e, addr) => {
		loadStudents(addr);
	});

	ipcMain.on('add-student', (e, addr, id) => {
		contractService.addStudent(addr, id, () => {
			setTimeout(() => {loadStudents(addr);}, 5000); // some time for catch the change
		});
	});

	function loadMarks(addr, studentId) {
		contractService.getMarks(addr, studentId, (marks) => {
			win.send('student-marks', addr, studentId, marks);
		});
	}
	
	ipcMain.on('load-student-marks', (e, addr, studentId) => {
		loadMarks(addr, studentId);
	});
	
	ipcMain.on('add-mark', (e, addr, studentId, mark, comment) => {
		contractService.addMark(addr, studentId, mark, comment, () => {
			setTimeout(() => {loadMarks(addr, studentId);}, 5000); // some time for catch the change
		});
	});
	
	ipcMain.on('validate-config', (e) => {
		const result = contractService.validateConfig();
		win.send('validate-config-result', result);
	});
}