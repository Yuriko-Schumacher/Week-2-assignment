const margin = { t: 50, r: 50, b: 50, l: 50 };
const size = { w: 800, h: 550 };
const svg = d3.select("svg");

// defining a container group
// which will contain everything within the SVG
// we can transform it to make things everything zoomable
const containerG = svg.append("g").classed("container", true);
let mapData, covidData, bubblesG;
let radiusScale, colorScale, projection;

let zoom = d3.zoom().scaleExtent([1, 10]).on("zoom", zoomed);

svg.call(zoom);

svg.attr("width", size.w).attr("height", size.h);

Promise.all([
	d3.json("data/maps/us-states.geo.json"),
	d3.csv("data/covid_data.csv"),
]).then(function (datasets) {
	mapData = datasets[0];
	covidData = datasets[1];
	console.log(datasets);

	// --------- DRAW MAP ----------
	let mapG = containerG.append("g").classed("map", true);

	projection = d3.geoAlbersUsa().fitSize([size.w, size.h], mapData);
	covidData = covidData.filter((d) => projection([d.long, d.lat]));

	let path = d3.geoPath(projection);

	mapG.selectAll("path")
		.data(mapData.features)
		.enter()
		.append("path")
		.attr("d", function (d) {
			return path(d);
		});

	// --------- DRAW BUBBLES ----------
	bubblesG = containerG.append("g").classed("bubbles", true);

	radiusScale = d3
		.scaleSqrt()
		.domain(d3.extent(covidData, (d) => +d.cases))
		.range([1.2, 20]);

	colorScale = d3
		.scaleSequential()
		.domain(d3.extent(covidData, (d) => +d.deaths))
		.interpolator(d3.interpolateHsl("yellow", "purple"));

	drawBubbles();
});

function drawBubbles(scale = 1) {
	let bubblesSelection = bubblesG.selectAll("circle").data(covidData);
	let bubbles = bubblesSelection
		.join("circle")
		.attr("cx", (d) => `${projection([d.long, d.lat])[0]}`)
		.attr("cy", (d) => `${projection([d.long, d.lat])[1]}`)
		.attr("r", (d) => radiusScale(+d.cases) / scale)
		// .attr("transform", (d) => `translate(${projection([d.long, d.lat])})`)
		.style("fill", (d) => colorScale(+d.deaths))
		.attr("stroke", "#ccc")
		.attr("stroke-width", 0.5 / scale);

	let tooltip = d3.select("#map-tooltip");
	bubbles
		.on("mouseover", function (e, d) {
			// d3.select(this).classed("selected", true);
			d3.select(this)
				.attr("stroke", "black")
				.attr("stroke-width", 2 / scale);
			// let rect = e.target.getBoundingClientRect();
			let r = d3.select(this).attr("r");

			tooltip
				.style("display", "block")
				.style("top", `${e.pageY}px`)
				.style("left", `${e.pageX}px`);
			tooltip.select(".county").text(`${d.county}, ${d.state}`);
			tooltip.select(".case").text(`${d3.format(",")(d.cases)}`);
			tooltip.select(".death").text(`${d3.format(",")(d.deaths)}`);
		})
		.on("mouseout", function () {
			tooltip.style("display", "none");
			d3.select(this)
				.attr("stroke", "#ccc")
				.attr("stroke-width", 0.5 / scale);
		});
}

function zoomed(e) {
	let transform = e.transform;
	containerG
		.attr("transform", transform)
		.attr("stroke-width", 0.5 / transform.k);
	drawBubbles(transform.k);
}
