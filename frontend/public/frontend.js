document.getElementById("click-me-button").addEventListener("click", handleClickMe);
document.getElementById("findRoomButton").addEventListener("click", findRooms);

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
