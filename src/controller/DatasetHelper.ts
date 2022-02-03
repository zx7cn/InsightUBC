import {InsightDataset, InsightResult} from "./IInsightFacade";
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

function unzipFile(content: string): string[] {
	let zip = new JSZip();
	let filesArray: any[] = [];
	zip.loadAsync(content, {base64: true}).then(function(data) {
		zip.folder("courses")?. forEach(function (relativePath, file) {
			filesArray.push(file.async("string"));
		});
	});
	return filesArray;
}

function validJSONFile(file: any): boolean {
	try {
		JSON.parse(file);
		return true;
	} catch(e) {
		return false;
	}
}

function parseDataset(data: string): InsightResult[] {
	let parsedDatasets: InsightResult[] = [];
	let course = JSON.parse(data);
	for (let i of course.result) {
		if (course.Subject !== undefined && course.Course !== undefined
				&& course.Avg !== undefined && course.Professor !== undefined
				&& course.Title !== undefined && course.Pass !== undefined
				&& course.Fail !== undefined && course.Audit !== undefined
				&& course.id !== undefined && course.Year !== undefined) {

			if (course.Section === "overall") {
				course.Year = 1900;
			}

			let parsedData: InsightResult = {
				dept: course.Subject, id: course.Course,
				avg: course.Avg, instructor: course.Professor,
				title: course.Title, pass: course.Pass,
				fail: course.Fail, audit: course.Audit,
				uuid: course.id.toString(), year: Number(course.Year)
			};
			parsedDatasets.push(parsedData);
		}
	}
	return parsedDatasets;
}


export {datasetExists, parseDataset, validJSONFile, unzipFile};
