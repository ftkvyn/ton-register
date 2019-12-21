const fs = require('fs'); 

let config = {};
let storedData = {};

module.exports = {
    setConfig: function(data) {
		config = data;
	},
	
    getInfo: function(contract, cb) {
        cb('Contract name');
	},

	getContracts: function() {
		loadData();
		return Object.assign({}, storedData.contracts);
	},

	addExistingContract: function(addr, student_id) {
		saveContract(addr, [ student_id ]);
	},

	forgetContract: function(addr) {
		delete storedData.contracts[addr];
		saveData();
	},

	validateConfig: function() {
		const result = { success: true };

		if (!config['lite-client-bin']) {
			result.success = false;
			result.noBin = true;
		} else {
			// const liteClientPath = `${config['bin']}/lite-client/lite-client`;
			// if (!fs.existsSync(liteClientPath)) {
			// 	result.success = false;
			// 	result.liteClientNotFound = liteClientPath;
			// }
		}

		if (!config['data-storage']) {
			result.success = false;
			result.noData = true;
		} else {
			const dataPath = `${config['data-storage']}`;
			if (!fs.existsSync(dataPath)) {
				try {
					fs.writeFileSync(dataPath, '{}');
				}
				catch (ex) {
					result.success = false;
					result.dataSaveError = ex;
				}
			} else {
				try {
					const dataContent = fs.readFileSync(config['data-storage']);
					const dataJson = JSON.parse(dataContent);
				} 
				catch(ex) {
					result.success = false;
					result.errorReadingData = ex;
				}
			}
		}

		if (!config['lite-client-config']) {
			result.success = false;
			result.noLiteClientConfig = true;
		} else {
			// if (!fs.existsSync(config['lite-client-config'])) {
			// 	result.success = false;
			// 	result.liteClientConfigNotFound = config['lite-client-config'];
			// } else {
			// 	try {
			// 		const configContent = fs.readFileSync(config['lite-client-config']);
			// 		const configJson = JSON.parse(configContent);
			// 	} 
			// 	catch(ex) {
			// 		result.success = false;
			// 		result.errorReadingLiteClientConfig = ex;
			// 	}
			// }
		}

		return result;
	},

	getMarks: function(addr, cb) {
		const marks = [
			{
				timestamp: +new Date() / 1000,
				mark: 5,
				comment: 'Good job!'
			},
			{
				timestamp: +new Date() / 1000,
				mark: 10,
				comment: 'Good job 2!'
			},
			{
				timestamp: +new Date() / 1000,
				mark: 2,
				comment: 'Bad job!'
			},
			{
				timestamp: +new Date() / 1000,
				mark: 3,
				comment: 'Ok job!'
			},
		];
		cb(marks);
	},
}

function saveContract(addr, studentIds, createdName, filename) {
	loadData();
	if(!addr) {
		return;
	}

	if (!storedData.contracts) {
		storedData.contracts = {};
	}
	if (!storedData.contracts[addr]) {
		storedData.contracts[addr] = {};
	}
	if (createdName) {
		storedData.contracts[addr].createdName = createdName;
	}
	if (filename) {
		storedData.contracts[addr].filename = filename;
	}
	if (studentIds) {
		if (!storedData.contracts[addr].students) {
			storedData.contracts[addr].students = {};
		} 
		studentIds.forEach(si => {
			if (!storedData.contracts[addr].students[si]){
				storedData.contracts[addr].students[si] = {}
			}
		});
	}
	saveData();
}

function saveData() {
	fs.writeFileSync(config['data-storage'], JSON.stringify(storedData));
}

function loadData() {
	const dataContent = fs.readFileSync(config['data-storage']);
	storedData = JSON.parse(dataContent);
	return Object.assign({}, storedData);
}