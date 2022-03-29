document.getElementById("findRoomButton").addEventListener("click", findRooms);
document.getElementById("findInstructorButton").addEventListener("click", findInstructors);

function findRooms() {

	let furn_type = document.getElementById("furn_type").value
	let min_seats = document.getElementById("room_cap").value

	if (min_seats.match(/^[0-9]+$/)) {
		min_seats = parseInt(min_seats)
	}

	let xhr = new XMLHttpRequest();
	xhr.open("POST", "http://localhost:4321/query");

	xhr.setRequestHeader("Content-Type", "application/json");

	let jsonQuery = {
			WHERE: {
				AND: [
					{
						IS: {
							"rooms_furniture": furn_type
						}
					},
					{
						NOT: {
							LT: {
								"rooms_seats": min_seats
							}
						}
					}
					]
			},
			OPTIONS: {
				COLUMNS: [
					"rooms_name",
					"rooms_seats",
					"rooms_type",
					"rooms_furniture"
				],
				ORDER: "rooms_seats"
			}
		}

	xhr.send(JSON.stringify(jsonQuery));

	xhr.onreadystatechange = function () {
		if (xhr.readyState === 4) {
			if (xhr.responseText.includes('error')) {
				let errorResponse = JSON.parse(xhr.responseText).error;
				document.getElementById("roomsOut").innerHTML = xhr.status + " Error: " + errorResponse;
			} else {
				createTable(JSON.parse(xhr.responseText), "roomsOut");
			}
		}
	};
}


function findInstructors() {
	let course_dept = document.getElementById("course_dept").value.toLowerCase();
	let course_id = document.getElementById("course_id").value;
	let xhr = new XMLHttpRequest();
	xhr.open("POST", "http://localhost:4321/query");

	xhr.setRequestHeader("Content-Type", "application/json");

	let jsonQuery = {
		"WHERE": {
			"AND": [
				{
					"IS": {
						"courses_id": course_id
					}
				},
				{
					"IS": {
						"courses_dept": course_dept
					}
				}
			]
		},
		"OPTIONS": {
			"COLUMNS": [
				"courses_dept",
				"courses_id",
				"courses_instructor",
				"overallAvg"
			],
			"ORDER": "overallAvg"
		},
		"TRANSFORMATIONS": {
			"GROUP": [
				"courses_id",
				"courses_dept",
				"courses_instructor"
			],
			"APPLY": [
				{
					"overallAvg": {
						"AVG": "courses_avg"
					}
				}
			]
		}
	}

	xhr.send(JSON.stringify(jsonQuery));

	xhr.onreadystatechange = function () {
		if (xhr.readyState === 4) {
			if (xhr.responseText.includes('error')) {
				let errorResponse = JSON.parse(xhr.responseText).error;
				document.getElementById("instructorOut").innerHTML = xhr.status + " Error: " + errorResponse;
			} else {
				createTable(JSON.parse(xhr.responseText), "instructorOut");
			}
		}
	}
}

// This function is adapted from
// https://www.encodedna.com/javascript/populate-json-data-to-html-table-using-javascript.htm
function createTable(response, elementId) {
	let list = [];

	for(let i in response.result) {
		list.push(response.result[i]);
	}

	let col = [];
	for (let i = 0; i < list.length; i++) {
		for (let k in list[i]) {
			if (col.indexOf(k) === -1) {
				col.push(k);
			}
		}
	}

	let table = document.createElement("table");
	let tr = table.insertRow(-1);

	for (let i = 0; i < col.length; i++) {
		let th = document.createElement("th");
		th.innerHTML = col[i];
		tr.appendChild(th);
	}

	for (let i = 0; i < list.length; i++) {
		tr = table.insertRow(-1);
		for (let j = 0; j < col.length; j++) {
			let cell = tr.insertCell(-1);
			cell.innerHTML = list[i][col[j]];
		}
	}

	let output = document.getElementById(elementId);
	let textResult = "";
	if (list.length === 0) {
		textResult = "No matches were found for your query."
	} else if (elementId === "roomsOut") {
		textResult = "Rooms matching specified criteria:";
	} else {
		textResult = "Results ordered by overall average from low to high:";
	}
	output.innerHTML = textResult;
	output.appendChild(table);
}


