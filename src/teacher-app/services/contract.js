const os = require('os'); 
const fs = require('fs'); 
const exec = require('child_process').exec; 

let config = {};
let storedData = {};
const workchain_id = 0; // hardcoded for now, easy to change later.
const teacher_key_name = 'teacher'; // ToDo: take from config or input
const principal_key_name = 'principal';

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

	getBalance: function(contract, cb) {
        getBalance(contract, cb);
	},


	addExistingContract: saveContract,

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

		const fifts = ['new-register.fif', 'new-mark.fif', 'new-student.fif'];

		if (!config['fift-folder']) {
			result.success = false;
			result.noFiftFolder = true;
		} else {
			fifts.forEach(scriptSrc => {
				if(!fs.existsSync(`${config['fift-folder']}/${scriptSrc}`)) {
					result.success = false;
					if (!result.missingScripts) {
						result.missingScripts = [];
					}
					result.missingScripts.push(scriptSrc);
				}
			});
		}

		return result;
	},

	deployContract: function(students_num, name, cb) {
		// <workchain-id> <students-number> <registry-name> <teacher-key> <principal-key> [<filename-base>]
		const filename = `new-contract-${+new Date()}`;
		const command = `fift -s ${config['fift-folder']}/new-register.fif ${workchain_id} ${students_num} '${name}' ${teacher_key_name} ${principal_key_name} ${filename}`;
		execute(command, (stdout, stderr) => {
			if (stderr) {
				console.error(stderr);
				cb(null, stderr);
				return;
			}
			const lines = stdout.split(os.EOL);
			let contract_addr = null; 
			let studentIds = []; // ToDo: generate student in fift and parse the result here.
			let isStudentIds = false;
			lines.forEach(line => {
				if (line.startsWith('Generating student ids')) {
					isStudentIds = true;
				} else if (line.startsWith('done generating student ids')) {
					isStudentIds = false;
				} else if (isStudentIds){
					studentIds.push(line.trim());
				}
				if (line.startsWith('Non-bounceable address (for init): ')) {
					contract_addr = line.replace('Non-bounceable address (for init): ', '').trim();
				}
			});
			if (!contract_addr) {
				console.log('==============');
				console.log(command);
				console.log(stdout);
				throw new Error('New contract address is not known');
			}
			console.log(name)
			console.log(contract_addr);
			console.log(studentIds);
			saveContract(contract_addr, studentIds, name, filename);
			cb(contract_addr, studentIds);
		});
	},

	deployInitMessage: function(addr, cb) {
		loadData();
		sendFile(storedData.contracts[addr].filename, () => {
			cb();
		});
	},

	getMarks: function(addr, student_id, cb) {
		const command = buildLiteClientCommand(`runmethod ${addr} student_marks ${student_id}`);
		execute(command, (stdout, stderr) => {
			const lines = stdout.split(os.EOL);
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

	getStudentIds: function(addr, cb) {
		const command = buildLiteClientCommand(`runmethod ${addr} students`);
		execute(command, (stdout, stderr) => {
			const lines = stdout.split(os.EOL);
			lines.forEach(line => {
				if (line.startsWith('result:  [ ')) {
					const val_str = line.replace('result:  [', '').replace(']', '').trim().replace('(','').replace(')','');
					const studentIds = val_str.split(' ');
					saveContract(addr, studentIds)
					cb(storedData.contracts[addr].students);
				}
			});
		});
	},

	saveStudentName: function(addr, id, name) {
		storedData.contracts[addr].students[id].name = name;
		saveData();
	},

	addMark: function(addr, student_id, mark, comment, cb) {
		// <register-addr-file> <teacher-key-name> <seqno> <student-id> <mark> <comment> [<savefile>]
		getSeqNo(addr, (seqno) => {
			const filename = `new-mark`;
			const command = `fift -s ${config['fift-folder']}/new-mark.fif ${storedData.contracts[addr].filename} ${teacher_key_name} ${seqno} ${student_id} ${mark} '${comment || ' '}' ${filename}`;
			execute(command, (stdout, stderr) => {
				if (stderr) {
					console.error(stderr);
					cb(null, stderr);
					return;
				}
				sendFile(filename, () => {
					cb();
				});
			});
		});
	},

	addStudent: function(addr, student_id, cb) {
		// <register-addr-file> <teacher-key-name> <seqno> <student-id> [<savefile>]
		getSeqNo(addr, (seqno) => {
			const filename = `new-student`;
			const command = `fift -s ${config['fift-folder']}/new-student.fif ${storedData.contracts[addr].filename} ${teacher_key_name} ${seqno} ${student_id} ${filename}`;
			execute(command, (stdout, stderr) => {
				if (stderr) {
					console.error(stderr);
					cb(null, stderr);
					return;
				}
				sendFile(filename, () => {
					cb();
				});
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
			(stderr.indexOf('not initialized yet (cannot run any methods)') > -1) ||
			(stdout.indexOf('is empty (cannot run method') > -1) ||
			(stdout.indexOf('not initialized yet (cannot run any methods)') > -1)) {
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

function getBalance(addr, cb){
    const command = buildLiteClientCommand(`getaccount ${addr}`);
    execute(command, (stdout, stderr) => {
        const lines = stdout.split(os.EOL);
        lines.forEach(line => {
            if (line.startsWith('account balance is ')) {
                const val_str = line.replace('account balance is ', '').replace('ng', '').trim();
                const val = +val_str / 1000000000;
                cb(val);
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

function sendFile(file, cb) {
	const command = buildLiteClientCommand(`sendfile ${file}-query.boc`);
	execute(command, (stdout, stderr) => {
		// execute(`rm ${file}.boc`, cb);
		cb();
    });
}

function getSeqNo(addr, cb){
	const command = buildLiteClientCommand(`runmethod ${addr} seqno`);
    liteClientGetNumber(command, cb);
}

function liteClientGetNumber(command, cb) {
    execute(command, (stdout, stderr) => {
        const lines = stdout.split(os.EOL);
        lines.forEach(line => {
            if (line.startsWith('result:  [ ')) {
                const val_str = line.replace('result:  [', '').replace(']', '').trim();
                const val = +val_str;
                cb(val);
            }
        });
    });
}