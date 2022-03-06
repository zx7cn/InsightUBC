import {InsightError, InsightResult} from "./IInsightFacade";
import JSZip from "jszip";
import parse5 from "parse5";
import http from "http";

function validHTMLFile(file: any): boolean {
	try {
		parse5.parse(file);
		return true;
	} catch(e) {
		return false;
	}
}

function unzipRoomFile(content: string): Promise<any> {
	let zip = new JSZip();
	return new Promise((resolve, reject) => {
		let index: any = zip.loadAsync(content, {base64: true}).then(function (data) {
			zip.folder("rooms")?.file("index.htm")?.async("string");
			resolve(index);
		}).catch((e) => {
			reject(new InsightError("Not a zip file"));
		});
	});
}

function getBuildings(content: string): Promise<any> {
	let buildingSet: any = [];
	return new Promise((resolve, reject) => {
		unzipRoomFile(content).then((index) => {
			if (validHTMLFile(index)) {
				let parsedIndex = parse5.parse(index);
				let tbody = traverse(parsedIndex, "tbody");
				for (let node of tbody.childNodes) {
					if (node.nodeName === "tr") {
						let buildingCode: string = node.childNodes[3].childNodes[0].value.toString().trim();
						let buildingName: string = node.childNodes[5].childNodes[1].childNodes[0].value
							.toString().trim();
						let buildingAddress: string = node.childNodes[7].childNodes[0].value.toString().trim();
						let buildingLink: string = node.childNodes[9].childNodes[1].attrs[0].value.toString().trim();

						let building: InsightResult = {
							fullname: buildingName,
							shortname: buildingCode,
							address: buildingAddress,
							herf: buildingLink
						};
						buildingSet.push(building);
					}
				}
				resolve(buildingSet);
			} else {
				reject(new InsightError("Not a HTML file"));
			}
		});
	});
}


function traverse(node: any,targetNode: string): any {
	if (!node) {
		return;
	}
	if(node.nodeName === targetNode) {
		return node;
	}
	for(let i of node.childNodes) {
		traverse(i, targetNode);
	}
}

function getRooms(content: any): Promise<any> {
	let rooms: any[] = [];
	return new Promise((resolve, reject) => {
		return getBuildings(content).then((buildingSet) => {
			for(let building of buildingSet) {
				let buildingFullname = building.fullname;
				let buildingShortname = building.shortname;
				let buildingHerf = building.herf;
				let buildingAddress = building.address;
				setLatLon(content, buildingFullname, buildingShortname, buildingAddress, buildingHerf)
					.then((result) => {
						rooms.push(result);
					});
			}
			resolve(rooms);
		}).catch((e) => {
			reject(new InsightError("Error getting rooms"));
		});
	});
}


function parseRooms(content: string, bFullname: string, bShortname: string, bAddress: string,
	bHerf: string, bLat: number, bLon: number): Promise<InsightResult[]> {
	let parsedRoom: any[] = [];
	let zip = new JSZip();
	return new Promise((resolve, reject) => {
		return zip.loadAsync(content, {base64: true}).then(function (data) {
			zip.folder("rooms")?.file("rooms" + bHerf.substring(2))?.async("string").then((room: string) => {
				return parse5.parse(room);
			}).then((parsedData) => {
				return traverse(parsedData, "tbody");
			}).then((roomtbody) => {
				for (let node of roomtbody.childNode) {
					if (node.nodeName === "tr") {
						let roomNumber: string = node.childNodes[1].childNodes[1].childNodes[0].value.trim();
						let roomSeats: number = Number(node.childNodes[3].childNodes[0].value.trim());
						let roomType: string = node.childNodes[7].childNodes[0].value.trim();
						let roomFurniture: string = node.childNodes[5].childNodes[0].value.trim();

						let room: InsightResult = {
							fullname: bFullname,
							shortname: bShortname,
							number: roomNumber,
							name: bShortname + "_" + roomNumber,
							address: bAddress,
							lat: bLat,
							lon: bLon,
							seats: roomSeats,
							type: roomType,
							furniture: roomFurniture,
							href: bHerf
						};
						parsedRoom.push(room);
					}
				}
				resolve(parsedRoom);
			});
		}).catch((e) => {
			reject(new InsightError("Error getting room info"));
		});
	});
}


function setLatLon(content: string, bFullname: string, bShortname: string, bAddress: string, bHerf: string):
	Promise<InsightResult[]> {
	return new Promise((resolve, reject) => {
		return getGeolocation(bAddress).then((result) => {
			let res = parseRooms(content, bFullname, bShortname, bAddress, bHerf, result[0], result[1]);
			resolve(res);
		}).catch((e) => {
			reject(new InsightError("Error"));
		});
	});
}


// This method is adapted from
// https://www.jokecamp.com/blog/code-examples-api-http-get-json-different-languages/#nodejs
function getGeolocation(address: string): Promise<any> {
	let URL = "http://cs310.students.cs.ubc.ca:11316/api/v1/project_team648/" + address.split(" ").join("%20");
	return new Promise((resolve, reject) => {
		http.get(URL, (res) => {
			let json = "";
			res.on("data", function(data) {
				json += data;
			});
			res.on("end", function () {
				try {
					let geoResponse = JSON.parse(json);
					let result: any[];
					if(!geoResponse.lat && !geoResponse.lon) {
						result = [geoResponse.lat, geoResponse.lon];
						resolve(result);
					}
				} catch(e) {
					reject(new InsightError("Error parsing JSON"));
				}
			});
		}).on("error", function(e) {
			reject(new InsightError("Error getting geolocation"));
		});
	});
}

export{getRooms};

