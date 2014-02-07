var http = require('http');
var XmlStream = require('xml-stream');

var nsdlHost = 'strandmaps.nsdl.org';
var nsdlAccessURL = 'http://strandmaps.nsdl.org/?id=';
var nsdlRecordsURIa = '/cms1-2/Query?Query=%3CSMS-CSIP%20xmlns=%22http://sms.dlese.org%22%3E%20%3CQuery%20DetailLevel=%22Skeleton%22%20Color=%22skyblue%22%20Format=%22SMS%22%20Scope=%22ALL%22%20ThirdPartyQuery=%22%22%3E%20%3CContent-Query%3E%20%3CObjectID%20Depth=%222%22%3E';
var nsdlRecordsURIb = '%3C/ObjectID%3E%20%3C/Content-Query%3E%20%3C/Query%3E%20%3C/SMS-CSIP%3E';

//TODO: rewrite this using Promises, Generators, or async

//fetch a given chapter's bnchmarks, fetching the maps and strands along the way.

function getRecordsURL(objectId) {
	return nsdlRecordsURIa + objectId + nsdlRecordsURIb;
}

if (!process.argv[2]) {
	console.log('Format is: node walk-nsdl.js [nsdl-id], e.g. SMS-CHP-0857');
	process.exit();
}

var request = http.get({
	host: nsdlHost,
	path: getRecordsURL(process.argv[2])
}).on('response', function(response) {
	response.setEncoding('utf8');
	var xml = new XmlStream(response);
	var chapterName, mapNames = [];
	xml.on('endElement: itemRecord', function(item) {
		if (item.Data.ObjectType === 'Chapter') {
			chapterName = item.Data.Name;
		}
		if (item.Data.ObjectType.toLowerCase() === 'map') {
			mapNames[item.Admin.IDNumber] = item.Data.Name;
			var requestMap = http.get({
				host: nsdlHost,
				path: getRecordsURL(item.Admin.IDNumber)
			}).on('response', function(response) {
				response.setEncoding('utf8');
				var xml = new XmlStream(response);
				xml.on('endElement: itemRecord', function(item) {
					if (item.Data.ObjectType.toLowerCase() === 'strand') {
						var strandId = item.Admin.IDNumber;
						var requestMap = http.get({
							host: nsdlHost,
							path: getRecordsURL(strandId)
						}).on('response', function(response) {
							response.setEncoding('utf8');
							var xml = new XmlStream(response);
							var strandName, strandId, mapId, benchmarks = [];

							xml.on('endElement: itemRecord', function(item) {
								if (item.Data.ObjectType.toLowerCase() === 'benchmark') {
									benchmarks.push(item.Admin.IDNumber);
								}
								if (item.Data.ObjectType.toLowerCase() === 'strand') {
									strandId = item.Admin.IDNumber;
									strandName = item.Data.Name;
									mapId = item.Data.InternalRelationship.CatalogID.$.CatalogNumber;
								}
							});
							xml.on('end', function(item) {
								benchmarks.forEach(function(benchmarkId) {
									// OUTPUT TO CSV
									// 1. Benchmark ID
									// 2. Chapter name (not code #)
									// 3. Map name
									// 4. Map URL
									// 5. Strand name
									// 6. Strand URL
									console.log(benchmarkId + ',"' + chapterName + '","' + mapNames[mapId] + '",' + nsdlAccessURL + mapId + ',"' + strandName + '",' + nsdlAccessURL + strandId);
								});

							});
						});
					}
				});
			});
		}
	});
});
