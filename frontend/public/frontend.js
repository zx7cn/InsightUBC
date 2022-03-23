document.getElementById("click-me-button").addEventListener("click", handleClickMe);
document.getElementById("findRoomButton").addEventListener("click", findRooms);
document.getElementById("findInstructorButton").addEventListener("click", findInstructors);

function handleClickMe() {
	alert("Button Clicked!");
}

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
			document.getElementById("roomsOut").innerHTML = JSON.parse(xhr.responseText);
			alert(xhr.responseText);
		}};
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
			//document.getElementById("instructorOut").innerHTML = JSON.parse(xhr.responseText);
			createTable(JSON.parse(xhr.responseText));
			//alert(xhr.responseText);
		}
		}
}

// This function is adapted from
// https://www.encodedna.com/javascript/populate-json-data-to-html-table-using-javascript.htm
function createTable(response) {
	var list = [];

	for(var i in response.result) {
		list.push(response.result[i]);
	}

	var col = [];
	for (var i = 0; i < list.length; i++) {
		for (var k in list[i]) {
			if (col.indexOf(k) === -1) {
				col.push(k);
			}
		}
	}

	var table = document.createElement("table");
	var tr = table.insertRow(-1);

	for (var i = 0; i < col.length; i++) {
		var th = document.createElement("th");
		th.innerHTML = col[i];
		tr.appendChild(th);
	}

	for (var i = 0; i < list.length; i++) {
		tr = table.insertRow(-1);
		for (var j = 0; j < col.length; j++) {
			var cell = tr.insertCell(-1);
			cell.innerHTML = list[i][col[j]];
		}
	}

	var output = document.getElementById("instructorOut");
	output.innerHTML = "Results ordered by overall average from low to high:";
	output.appendChild(table);
}


