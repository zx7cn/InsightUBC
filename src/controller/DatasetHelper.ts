import {InsightDataset, InsightError, InsightResult} from "./IInsightFacade";
import * as fs from "fs-extra";
import JSZip from "jszip";

function datasetExists(id: string, dataset: InsightDataset[]): boolean {
	for (const i of dataset) {
		if (i.id === id) {
			return true;
		}
	}
	return false;
}

function unzipFile(content: string): Promise<any> {
	let zip = new JSZip();
	let filesArray: any[] = [];
	let parsedDataArray: any[] = [];
	return zip.loadAsync(content, {base64: true}).then(function(data) {
		zip.folder("courses")?. forEach(function (relativePath, file) {
			filesArray.push(zip.file(file.name)?.async("string"));
		});
		return Promise.all(filesArray).then((items: string[]) => {
			if(items.length > 0) {
				items.forEach((course) => {
					if (validJSONFile(course)) {
						parsedDataArray.push(parseDataset(course));
					} else {
						return Promise.reject(new InsightError("not in JSON format"));
					}
				});
			} else {
				return Promise.reject(new InsightError("empty zip"));
			}
		}).then(()=> {
			return Promise.resolve(parsedDataArray);
		});
	});
}

function validJSONFile(file: any): boolean {
	try {
		JSON.parse(file);
		return true;
	} catch(e) {
		return false;
	}
}

function parseDataset(data: any): any {
	let parsedDatasets: InsightResult[] = [];
	let course = JSON.parse(data);
	for (let i of course.result) {
		if (i.Subject !== undefined && i.Course !== undefined
				&& i.Avg !== undefined && i.Professor !== undefined
				&& i.Title !== undefined && i.Pass !== undefined
				&& i.Fail !== undefined && i.Audit !== undefined
				&& i.id !== undefined && i.Year !== undefined) {

			if (i.Section === "overall") {
				i.Year = 1900;
			}

			let parsedData: InsightResult = {
				dept: i.Subject, id: i.Course,
				avg: i.Avg, instructor: i.Professor,
				title: i.Title, pass: i.Pass,
				fail: i.Fail, audit: i.Audit,
				uuid: i.id.toString(), year: Number(i.Year)
			};
			parsedDatasets.push(parsedData);
		}
	}
	return parsedDatasets;
}

function countRows(array: any[]): number {
	let numRows: number = 0;
	let i: number = 0;
	while(i < array.length) {
		numRows = numRows + array[i].length;
		i++;
	}
	return numRows;
}


export {datasetExists, parseDataset, validJSONFile, unzipFile, countRows};
