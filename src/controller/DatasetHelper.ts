import {InsightDataset, InsightError, InsightResult} from "./IInsightFacade";
import JSZip from "jszip";

function datasetExists(id: string, dataset: InsightDataset[]): boolean {
	for (const i of dataset) {
		if (i.id === id) {
			return true;
		}
	}
	return false;
}

function unzipFile(content: string): Promise<InsightResult[]> {
	let zip = new JSZip();
	let filesArray: any[] = [];
	// let parsedDataArray: any[] = [];

	return zip.loadAsync(content, {base64: true}).then(function (data) {
		zip.folder("courses")?.forEach(function (relativePath, file) {
			filesArray.push(zip.file(file.name)?.async("string"));
		});
		return parseCourses(filesArray);
	}).catch((e) => {
		return Promise.reject(new InsightError("not a zip file"));
	});
}

function parseCourses(filesArray: any[]): Promise<InsightResult[]> {
	let parsedSectionSet: InsightResult[] = [];
	return Promise.all(filesArray).then((items: string[]) => {
		if (items.length > 0) {
			items.forEach((course) => {
				if (validJSONFile(course)) {
					if (Object.values(JSON.parse(course) as object)[0].length !== 0) {
						// parsedDataArray.push(parseDataset(course));
						parsedSectionSet = parsedSectionSet.concat(parseDataset(course));
					}
				} else {
					return Promise.reject(new InsightError("not in JSON format"));
				}
			});
		} else {
			return Promise.reject(new InsightError("empty zip"));
		}
	}).then(() => {
		// return Promise.resolve(parsedDataArray);
		return Promise.resolve(parsedSectionSet);

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

function parseDataset(data: any): InsightResult[] {
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

function countRows (sectionSet: InsightResult[]): number {
	return sectionSet.length;
}

export {datasetExists, parseDataset, validJSONFile, unzipFile, countRows};
