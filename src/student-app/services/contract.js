const os = require('os'); 
const fs = require('fs'); 
const exec = require('child_process').exec; 

let config = {};
let storedData = {};

module.exports = {
    setConfig: function(data) {
		config = data;
	},
	
    getInfo: function(contract, cb) {
        getData(contract, `info`, (str, err) => {
			if (str) {
				cb(convertFromSlice(str));
			} else {
				cb(null, err)
			}
        });
	},

	getContracts: function() {
		loadData();
		return storedData.contracts || [];
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
			const liteClientPath = `${config['lite-client-bin']}`;
			if (!fs.existsSync(liteClientPath)) {
				result.success = false;
				result.liteClientNotFound = liteClientPath;
			}
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
			if (!fs.existsSync(config['lite-client-config'])) {
				result.success = false;
				result.liteClientConfigNotFound = config['lite-client-config'];
			} else {
				try {
					const configContent = fs.readFileSync(config['lite-client-config']);
					const configJson = JSON.parse(configContent);
				} 
				catch(ex) {
					result.success = false;
					result.errorReadingLiteClientConfig = ex;
				}
			}
		}

		return result;
	},

	getMarks: function(addr, cb) {
		const student_id = Object.keys(storedData.contracts[addr].students)[0];
		const command = buildLiteClientCommand(`runmethod ${addr} student_marks ${student_id}`);
		execute(command, (stdout, stderr) => {
			const lines = stderr.split(os.EOL);
			lines.forEach(line => {
				if (line.startsWith('result:  [ ')) {
					const val_str = line.replace('result:  [', '').replace(' ]', '').trim();
					const raw_vals = val_str.split(']');
					const marks = [];
					raw_vals.forEach(raw_val => {
						const data = raw_val.replace('([','').replace('[','').trim().split(' ');
							if (data && data.length > 2) {
							const mark = {
								timestamp: data[0],
								mark: data[1],
								comment: convertFromSlice(data[2])
							};
							marks.push(mark);
						}
					});
					cb(marks);
				}
			});
		});
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

function convertFromSlice(slice) {
	let str = slice.replace('CS{Cell{', '');
	const end = str.indexOf('}');
	str = str.substring(4, end);
	return convertFromHex(str);
}

function convertFromHex(hex) {
    var hex = hex.toString();//force conversion
    var str = '';
    for (var i = 0; i < hex.length; i += 2)
        str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    return str;
}

function getData(contract, params, cb) {
	const command = buildLiteClientCommand(`runmethod ${contract} ${params}`)
    execute(command, (stdout, stderr) => {
		if ( (stderr.indexOf('is empty (cannot run method') > -1) ||
			(stderr.indexOf('not initialized yet (cannot run any methods)') > -1)) {
			cb(null, {isEmpty: true});
			return;
		}
        const lines = stderr.split(os.EOL);
        lines.forEach(line => {
            if (line.startsWith('result:  [ ')) {
                const val_str = line.replace('result:  [ ', '').replace(']', '').trim();
                cb(val_str);
            }
        });
    });
}

function buildLiteClientCommand(command) {
    return `${config['lite-client-bin']} -C ${config['lite-client-config']} -rc '${command}'`;
}

function execute(command, callback){ 
    exec(command, function(error, stdout, stderr){ callback(stdout, stderr); }); 
};