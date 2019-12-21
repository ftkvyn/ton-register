load_cources.addEventListener('click', (e) => {
	courcesEl.innerHTML = '';
	ipcRenderer.send('load-cources');
	e.target.classList.add('clicked');
	setTimeout(() => {
		e.target.classList.remove('clicked');
	}, 1200);
});

ipcRenderer.send('load-cources');

add_known_course.addEventListener('submit', (e) => {
	const formData = new FormData(e.target);
	e.preventDefault();
	ipcRenderer.send('add-contract', formData.get('addr'), formData.get('id'));
});

ipcRenderer.on('contract-updated', (e, addr, students) => {
	add_known_course.reset();
	ipcRenderer.send('load-cources');
});

let savedCourses = {};
let selectedAddr = null;

ipcRenderer.on('cources-loaded', (e, cources) => {
	let markup = '';
	let forgetBtns = [];
	savedCourses = {};
	cources.forEach(cource => {
		let content = `${cource.info ? `<h4 class='title'>${cource.info}</h4>` : ''} ${cource.addr ? `Address: <i>${cource.addr}</i><br/>` : ''}`;
		if (cource.isEmpty) {
			content += `<br/> <i>Contract was just created, there is no marks there yet.</i>`;
		}
		savedCourses[cource.addr] = cource;
		let fBtnId = `forget-${cource.addr}`;
		forgetBtns.push(fBtnId);
		content += `<br/><button id='${fBtnId}'} class='btn red'>Forget</button>`;
		const element = `<li class='${cource.isEmpty ? 'is-empty' : 'is-usable'}' data-addr='${cource.addr}'>${content}</li>`
		markup += element;
	});
	courcesEl.innerHTML = markup;

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
			document.querySelector('.single-course-area .title').innerText = "You marks of: " + savedCourses[addr].info || '';
			document.querySelector('.single-course-area .list').innerHTML = '';
			ipcRenderer.send('load-student-marks', addr);
		});
	});
});

ipcRenderer.on('student-marks', (e, addr, marks) => {
	if (selectedAddr == addr) {
		document.querySelector('.single-course-area').style.display = '';
		const marksUl = document.querySelector('.single-course-area .list');
		let content = '';
		for (const num in marks) {
			const mark = marks[num];
			let itemContent = `<label class='date'>${new Date(1000 * (+mark.timestamp)).toISOString()}</label> <b>${mark.mark}</b> <span>${mark.comment}</span> `;
			content += `<li>${itemContent}</li>`;
		}
		marksUl.innerHTML = content;
	}
});