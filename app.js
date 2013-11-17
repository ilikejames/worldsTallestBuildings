(function (window, d3, _, $, BUILDINGS, undefined) {

  'use strict';

  var width = $(window).width(),
	  height = $(window).height(),
	  radius = Math.min(width, height) / 2,
	  centerRadius = radius * 0.2,
	  color = d3.scale.category20(),
	  max = BUILDINGS.reduce(function(memo, x) { return Math.max(parseInt(x.Height, 10), memo); }, 0),
	  svg, arc, partition, tooltip;

  function toGroup(property, memo, x) {
	  var propVal = x[property];
	  if(!memo.hasOwnProperty(propVal)) memo[propVal] = { group : propVal, children : [] };
	  memo[propVal].children.push(x);
	  return memo;
  }

  function onResize() {
  	// TODO: this doesn't work!
  	console.log('onresize', Date.now());
  	var width = $(window).width(),
	  height = $(window).height();
	d3.select("#chart svg").attr({"width" : width, "height":  height });
	onFilterViewChange();
  }

  function getDecade(year) { return (Math.floor(parseInt(year,10) / 10) * 10); }

  function groupByDecade(data) {
	return data.reduce(function(memo, x) {
		var decade = getDecade(x.Built);
		memo[decade] = memo[decade] || { group : decade, children : [] };
		memo[decade].children.push(x);
		return memo;
	}, {});
  }

  function setProperties(item) {
  	item
	.attr("display", function display(d) { return d.depth ? null : "none"; }) // hide inner ring
	.attr("d", function(d) { return d.children ? null : arc(d); })
	.style("stroke", "#fff").style("fill", function fill(d) { return color((d.children ? d : d.parent).group); })
	.on("mouseover", function(d, o, p) {
	  	this.style.stroke="#000";
	  	tooltip.html(_.template($('#tooltip-template').html(), d))
	  	console.log(this);
	 })
	.on('mouseout', function(d, o) {
	  	this.style.stroke="#fff";
	  	tooltip.html('');
	 });
  }

  function displayChart(data) {
	var eles = svg.datum(data).selectAll("path")
	  .data(partition.nodes, function(d) { return d.Building + d.Rank; })
	  .enter()
	  .append("path");
	setProperties(eles);
  }

  function redraw(data) {
	var items = svg.datum(data).selectAll("path").data(partition.nodes);

	items.transition().duration(300)
	.attr("display", function display(d) { return d.depth ? null : "none"; }) // hide inner ring
	.attr("d", function(d) { return d.children ? null : arc(d); })
	.style("stroke", "#fff").style("fill", function fill(d) { return color((d.children ? d : d.parent).group); });

	setProperties(items.enter().append("path"));
	items.exit().remove();
  }

  function filterByGroup(data, group, val) {
	var filtered;
	if(group==='Country') 
	  filtered = data.reduce(_.partial(toGroup, 'Country'), {});
	else if (group==='Decade')
	  filtered = groupByDecade(data);
	return (filtered && filtered[val].children) || data;
  }

  function groupForView(view, data) {
	switch(view) {
	  case 'city': return _.values(data.reduce(_.partial(toGroup, 'City'), {}));
	  case 'country': return  _.values(data.reduce(_.partial(toGroup, 'Country'), {})); 
	  case 'decade': return _.values(groupByDecade(data)); 
	  default: return data;
	}
  }

  function onFilterViewChange() {
	var filterType = $('select option:selected').parent().attr('label'),
	  filterValue =  $('select option:selected').val(),
	  filterHandler = _.compose(_.partial(groupForView, $('input:checked').val()), filterByGroup);

	redraw({children : filterHandler(BUILDINGS, filterType, filterValue) });
  }

  function init() {
	svg = d3.select("#chart")
	  .append("svg").attr({"width" : width, "height" : height})
	  .append("g").attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

	arc = d3.svg.arc()
	  .startAngle(function getStartAngle(d) { return d.x; })
	  .endAngle(function getEndAngle(d) { return d.x + d.dx; })
	  .innerRadius(function getInnerRadius() { return centerRadius; })
	  .outerRadius(function getOuterRadius(d) { return ((parseInt(d.Height, 10) / max) * ( radius * 0.8 ) ) + radius * 0.2; });

	partition = d3.layout.partition()
	  .sort(function sorter(a, b) { return parseInt(a.Height, 10) - parseInt(b.Height, 10); })
	  .size([2 * Math.PI, radius * radius])
	  .value(function getValue(d) { return 1; });

	// <select> filter list
	$('form').append(_.template($('#filter-template').html(), {
	  filter : BUILDINGS.reduce(function getSelectFilterGrouping(memo, x) {
		  var decade = getDecade(x.Built);
		  if(memo.Decade.indexOf(decade)==-1) memo.Decade.push(decade);
		  if(memo.Country.indexOf(x.Country)==-1) memo.Country.push(x.Country);
		  return memo; 
		}, { Country : [], Decade : [] }) 
	}));
	// event handling
	d3.selectAll('select, input').on("change", onFilterViewChange);
	// load initial chart
	displayChart({ group : 'All', children : BUILDINGS });

	// add tooltip element
	tooltip = d3.select("#chart").append("div")   
	    .attr("class", "tooltip")     
	    .attr({width : centerRadius * 2})     
	    .style({
	    	opacity : 0.6,
	    	position: 'absolute',
	    	left:  ((width/2)-centerRadius) + 'px',
	    	top : (height/2) + 'px',
	    	'text-align' : 'center',
	    	width : (centerRadius * 2) + 'px'
	    });
  }

  $(document).ready(init);

  var debouncedResize = _.debounce(onResize, 150);
  $(window).on("resize", debouncedResize);

})(window, d3, _, $, BUILDINGS);