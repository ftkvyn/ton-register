load_cources.addEventListener('click', (e) => {
	courcesEl.innerHTML = '';
	ipcRenderer.send('load-cources');
	e.target.classList.add('clicked');
	setTimeout(() => {
		e.target.classList.remove('clicked');
	}, 1200);
});

ipcRenderer.send('load-cources');

new_contract_form.addEventListener('submit', (e) => {
	const formData = new FormData(e.target);
	e.preventDefault();
	ipcRenderer.send('deploy-contract', formData.get('info'), formData.get('students_count'));
});

add_known_course.addEventListener('submit', (e) => {
	const formData = new FormData(e.target);
	e.preventDefault();
	ipcRenderer.send('add-contract', formData.get('addr'));
});

ipcRenderer.on('contract-updated', (e, addr, students) => {
	add_known_course.reset();
	ipcRenderer.send('load-cources');
});

let savedCourses = {};
let selectedAddr = null;

ipcRenderer.on('cources-loaded', (e, cources) => {
	let markup = '';
	let deployBtns = [];
	let forgetBtns = [];
	savedCourses = {};
	cources.forEach(cource => {
		let content = `${cource.info ? `<h4 class='title'>${cource.info}</h4>` : ''} ${cource.addr ? `Address: <i>${cource.addr}</i><br/>` : ''} ${cource.balance ? `Balance: <b>${cource.balance}</b>` : ''}`;
		if (cource.isEmpty) {
			if (cource.createdName) {
				content += ` (${cource.createdName})`;
			}
			content += `<br/> <i>Contract was just created. Transfer some funds to it's address and deploy the contract after that to start working with it.</i>`;
			if (cource.hasFile) {
				let btnId = `deploy-${cource.addr}`;
				deployBtns.push(btnId);
				content += `<br/><button id='${btnId}' ${cource.balance ? '' : 'disabled=disabled'} class='btn'>Deploy</button>`;
			} else {
				content += `<p>No .boc file found for this contract.</p>`;
			}
		}
		if (cource.balance && cource.balance < 1) {
			content += `<br/><b style='color:red;'>Warning, low balance!</b>`
		}
		savedCourses[cource.addr] = cource;
		let fBtnId = `forget-${cource.addr}`;
		forgetBtns.push(fBtnId);
		content += `<br/><button id='${fBtnId}'} class='btn red'>Forget</button>`;
		const element = `<li class='${cource.isEmpty ? 'is-empty' : 'is-usable'}' data-addr='${cource.addr}'>${content}</li>`
		markup += element;
	});
	courcesEl.innerHTML = markup;
	deployBtns.forEach(btnId => {
		document.getElementById(btnId).addEventListener('click', (e) => {
			ipcRenderer.send('deploy-boc', btnId.replace('deploy-', ''));
		});
	});

	forgetBtns.forEach(btnId => {
		document.getElementById(btnId).addEventListener('click', (e) => {
			const addr = btnId.replace('forget-', '');
			if (confirm(`Are you sure you want to remove contract ${addr} from application?`))
			ipcRenderer.send('forget-contract', addr);
			e.stopPropagation();
		});
	});

	[].forEach.call(courcesEl.querySelectorAll('li.is-usable'), (liEl) => {
		liEl.addEventListener('click', (e) => {
			const addr = liEl.getAttribute('data-addr');
			if (liEl.parentElement.querySelector('.active')) {
				liEl.parentElement.querySelector('.active').classList.remove('active');
			}
			liEl.classList.add('active');
			selectedAddr = addr;
			document.querySelector('.single-course-area .title').innerText = "Students of: " + savedCourses[addr].info || '';
			document.querySelector('.single-course-area .list').innerHTML = '';
			ipcRenderer.send('load-students', addr);
			add_student.style.display = '';
			document.querySelector('.single-student-area').style.display = '';
			document.querySelector('.single-student-area .list').innerHTML = '';
			document.querySelector('.single-student-area .name').innerText = 'Select a student';
		});
	});
});

ipcRenderer.on('students-loaded', (e, addr, students) => {
	if (selectedAddr == addr) {
		const studUl = document.querySelector('.single-course-area .list');
		let content = '';
		for (const id in students) {
			let itemContent = `<div class='title student-id'>Id=<b>${id}</b></div> <input type='text' value='${students[id].name || ''}'/>`;
			content += `<li data-id='${id}'>${itemContent}</li>`;
		}
		studUl.innerHTML = content;
		[].forEach.call(studUl.querySelectorAll('li input'), (nameInput => {
			nameInput.addEventListener('change', (e) => {
				let element = e.target;
				while(element.tagName != 'LI'){
					element = element.parentElement;
				}
				const studentId = element.getAttribute('data-id');
				ipcRenderer.send('save-student-name', selectedAddr, studentId, nameInput.value);
			});
		}));

		[].forEach.call(studUl.querySelectorAll('li'), (liEl => {
			liEl.addEventListener('click', (e) => {
				if (liEl.parentElement.querySelector('.active')) {
					liEl.parentElement.querySelector('.active').classList.remove('active');
				}
				liEl.classList.add('active');
				const title = liEl.querySelector('.title');
				const nameInput = liEl.querySelector('input');
				selectedStudentId = liEl.getAttribute('data-id');
				document.querySelector('.single-student-area .name').innerText = "Marks of: " + nameInput.value || title.innerText;
				ipcRenderer.send('load-student-marks', selectedAddr, selectedStudentId);
				add_mark.style.display = '';
			});
		}));
	}
});

add_student.addEventListener('submit', (e) => {
	const formData = new FormData(e.target);
	e.preventDefault();
	if (!selectedAddr) {
		return;
	}
	if (!savedCourses[selectedAddr].hasFile) {
		alert(`Can't create a student for that contract - no address file.`);
		return;
	}
	ipcRenderer.send('add-student', selectedAddr, formData.get('id'));
	add_student.reset();
});

let selectedStudentId = null;

ipcRenderer.on('student-marks', (e, addr, studentId, marks) => {
	if (selectedAddr == addr && selectedStudentId == studentId) {
		const marksUl = document.querySelector('.single-student-area .list');
		let content = '';
		for (const num in marks) {
			const mark = marks[num];
			let itemContent = `<label class='date'>${new Date(1000 * (+mark.timestamp)).toISOString()}</label> <b>${mark.mark}</b> <span>${mark.comment}</span> `;
			content += `<li>${itemContent}</li>`;
		}
		marksUl.innerHTML = content;
	}
});

add_mark.addEventListener('submit', (e) => {
	const formData = new FormData(e.target);
	e.preventDefault();
	if (!selectedAddr) {
		return;
	}
	if (!savedCourses[selectedAddr].hasFile) {
		alert(`Can't create a student for that contract - no address file.`);
		return;
	}
	if (!selectedStudentId) {
		return;
	}
	ipcRenderer.send('add-mark', selectedAddr, selectedStudentId, formData.get('mark'), formData.get('comment'));
	add_mark.reset();
});