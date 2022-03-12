import {InsightError, InsightResult} from "./IInsightFacade";
import JSZip from "jszip";
import parse5 from "parse5";
import http from "http";

// function validHTMLFile(file: any): boolean {
// 	try {
// 		parse5.parse(file);
// 		return true;
// 	} catch(e) {
// 		return false;
// 	}
// }

function traverse(node: any, targetNode: string): any {
	if (!node) {
		return;
	}
	if(node.nodeName !== undefined) {
		if (node.nodeName === targetNode) {
			return node;
		}
	}
	if(node.childNodes !== undefined) {
		for (let i of node.childNodes) {
			let result = traverse(i, targetNode);
			if(result !== undefined) {
				return result;
			}
		}
	}
	return;
}


function getBuildings(content: string): Promise<InsightResult[]> {
	let zip = new JSZip();
	let buildingSet: InsightResult[] = [];
	return new Promise<InsightResult[]>((resolve, reject) => {
		try {
			zip.loadAsync(content, {base64: true}).then(function (data) {
				return zip.folder("rooms")?.file("index.htm")?.async("string").then(function (index: string) {
					return parse5.parse(index);
				}).then((parsedIndex) => {
					let buildingTbody = traverse(parsedIndex, "tbody");
					for (let node of buildingTbody.childNodes) {
						if (node.nodeName === "tr") {
							let buildingCode: string = node.childNodes[3].childNodes[0].value.toString().trim();
							let buildingName: string = node.childNodes[5].childNodes[1].childNodes[0].value
								.toString().trim();
							let buildingAddress: string = node.childNodes[7].childNodes[0].value.toString().trim();
							let buildingLink: string = node.childNodes[9].childNodes[1].attrs[0].value
								.toString().trim();

							let building: InsightResult = {
								fullname: buildingName,
								shortname: buildingCode,
								address: buildingAddress,
								herf: buildingLink
							};
							buildingSet.push(building);
						}
					}
				}).then(() => {
					resolve(buildingSet);
				});
			});
		} catch(e) {
			reject(new InsightError("Error getting buildings"));
		}
	});
}

function getRooms(content: string): Promise<any> {
	let rooms: any[] = [];
	return new Promise((resolve, reject) => {
		getBuildings(content).then(async (buildingSet: any) => {
			for (const building of buildingSet) {
				let bFullname = building.fullname;
				let bShortname = building.shortname;
				let bHerf = building.herf;
				let bAddress = building.address;
				// eslint-disable-next-line no-await-in-loop
				const parsedRoom = await setLatLon(content, bFullname, bShortname, bAddress, bHerf);
				rooms.push(parsedRoom);
			}
		}).then(() => {
			// console.log(rooms);
			resolve(rooms);
		}).catch((e: any) => {
			reject(new InsightError("Error getting rooms"));
		});
	});
}


async function parseRooms(content: string, bFullname: string, bShortname: string, bAddress: string, bHerf: string,
	bLat: number, bLon: number): Promise<any> {
	let parsedRooms: any[] = [];
	let zip = new JSZip();
	// return new Promise<InsightResult[]>((resolve, reject) => {
	try {
		return zip.loadAsync(content, {base64: true}).then(function (data) {
			zip.folder("rooms")?.file(bHerf.substring(2))?.async("string").then((room: string) => {
				return parse5.parse(room);
			}).then((parsedRoom) => {
				let roomTbody = traverse(parsedRoom, "tbody");
				for (let node of roomTbody.childNodes) {
					if (node.nodeName === "tr") {
						let roomNumber: string = node.childNodes[1].childNodes[1].childNodes[0].value
							.toString().trim();
						let roomSeats: number = Number(node.childNodes[3].childNodes[0].value.toString().trim());
						let roomType: string = node.childNodes[7].childNodes[0].value.toString().trim();
						let roomFurniture: string = node.childNodes[5].childNodes[0].value.toString().trim();

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
						parsedRooms.push(room);
					}
				}
			}).then(() => {
				// console.log(parsedRooms);
				return Promise.resolve(parsedRooms);
			});
		});
	} catch (e) {
		return Promise.reject(new InsightError("Error getting rooms"));
	}
}


function setLatLon(content: string, bFullname: string, bShortname: string, bAddress: string, bHerf: string):
	Promise<InsightResult[]> {
	return new Promise((resolve, reject) => {
		getGeolocation(bAddress).then((result) => {
			return parseRooms(content, bFullname, bShortname, bAddress, bHerf, result[0], result[1])
				.then((res) => {
					// console.log(res);
					resolve(res);
				});
		}).catch((e) => {
			reject(new InsightError("Error"));
		});
	});
}

// function getRooms(content: string): Promise<any> {
// 	let rooms: any[] = [];
// 	let zip = new JSZip();
// 	let roomPromises: any = [];
// 	return getBuildings(content).then((buildingSet: any) => {
// 		for (const building of buildingSet) {
// 				// let bFullname = building.fullname;
// 				// let bShortname = building.shortname;
// 			let bHerf = building.herf;
// 				// let bAddress = building.address;
// 			zip.loadAsync(content, {base64: true}).then(function (data) {
// 				roomPromises.push(zip.folder("rooms")?.file(bHerf.substring(2))?.async("string"));
// 			});
// 		}
// 		return Promise.all([roomPromises, buildingSet]).then(async (result) => {
// 			for (const [room, building] of result) {
// 				let bFullname = building.fullname;
// 				let bShortname = building.shortname;
// 				let bHerf = building.herf;
// 				let bAddress = building.address;
// 					// eslint-disable-next-line no-await-in-loop
// 				const roomsEachBuilding = await setLatLon(content, bFullname, bShortname, bHerf,
// 					bAddress, room);
// 				rooms.push(roomsEachBuilding);
// 			}
// 		}).then(() => {
// 			return Promise.resolve(rooms);
// 		});
// 	}).catch((e) => {
// 		console.log(e);
// 		return Promise.reject(new InsightError("Error getting rooms"));
// 	});
// }
//
//
// function parseRooms(content: string, bFullname: string, bShortname: string,
// 	bAddress: string, bHerf: string, bLat: number, bLon: number, room: string): InsightResult[] {
// 	let parsedRooms: InsightResult[] = [];
// 	// let zip = new JSZip();
// 	// return new Promise<InsightResult[]>((resolve, reject) => {
// 	try {
// 		let roomTbody = traverse(parse5.parse(room), "tbody");
// 		for (let node of roomTbody.childNodes) {
// 			if (node.nodeName === "tr") {
// 				let roomNumber: string = node.childNodes[1].childNodes[1].childNodes[0].value
// 					.toString().trim();
// 				let roomSeats: number = Number(node.childNodes[3].childNodes[0].value.toString().trim());
// 				let roomType: string = node.childNodes[7].childNodes[0].value.toString().trim();
// 				let roomFurniture: string = node.childNodes[5].childNodes[0].value.toString().trim();
//
// 				let roomInfo: InsightResult = {
// 					fullname: bFullname, shortname: bShortname,
// 					number: roomNumber, name: bShortname + "_" + roomNumber,
// 					address: bAddress, lat: bLat,
// 					lon: bLon, seats: roomSeats,
// 					type: roomType, furniture: roomFurniture,
// 					href: bHerf
// 				};
// 				parsedRooms.push(roomInfo);
// 			}
// 		}
// 		return parsedRooms;
// 	} catch (e) {
// 		throw new InsightError("Error getting rooms");
// 	}
// }
//
//
// async function setLatLon(content: string, bFullname: string, bShortname: string, bAddress: string, bHerf: string
// 	, room: any): Promise<InsightResult[]> {
// 	// let rooms: InsightResult[] = [];
// 	try {
// 		const geoLocation = await getGeolocation(bAddress);
// 		// console.log(parseRooms(content, bFullname, bShortname, bAddress, bHerf, result[0], result[1]));
// 		return parseRooms(content, bFullname, bShortname, bAddress, bHerf, geoLocation[0], geoLocation[1], room);
// 	} catch (e) {
// 		throw new InsightError("Error setting Lat Lon");
// 	}
// }


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
					if(geoResponse.lat && geoResponse.lon) {
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

export{getRooms, getBuildings};
